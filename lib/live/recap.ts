import { generateText, Output } from 'ai'
import { z } from 'zod'
import { logEvent } from '@/lib/log'
import { type InsightPayload, InsightPayloadSchema, type Lang, LANGS } from '@/lib/schemas'
import { createAdminClient } from '@/lib/supabase/admin'
import { broadcast } from './broadcast'
import { FAST_MODEL, gateway } from './gateway'
import { formatClock } from './shared'

const MAX_TRANSCRIPT_CHARS = 60_000

// The model sees "[mm:ss] text" and answers with clock strings; we map them back to real segment starts.
const RecapDraftSchema = z.object({
  summary: z.string().describe('3 to 5 sentences summarizing the talk'),
  keyIdeas: z.array(z.string()).describe('3 to 6 key takeaways, one short sentence each'),
  chapters: z
    .array(z.object({ at: z.string().describe('Timestamp from the transcript, mm:ss'), title: z.string() }))
    .describe('3 to 8 chapters in chronological order, each starting at a transcript timestamp'),
  mentions: z
    .array(z.object({ name: z.string(), kind: z.enum(['tool', 'project', 'person', 'concept']) }))
    .describe('Tools, projects, people or concepts explicitly mentioned, at most 10'),
})

const LANGUAGE_NAME: Record<Lang, string> = { en: 'English', es: 'Rioplatense Spanish (Argentina)' }

type Segment = { seq: number; lang: Lang; text: string; t_start_ms: number; translations: { lang: Lang; text: string }[] | null }

function parseClock(value: string) {
  const parts = value.trim().split(':').map(Number)
  if (parts.some((n) => Number.isNaN(n))) return null
  return parts.reduce((acc, n) => acc * 60 + n, 0) * 1000
}

function snapToSegment(ms: number, starts: number[]) {
  return starts.reduce((best, s) => (Math.abs(s - ms) < Math.abs(best - ms) ? s : best), starts[0])
}

async function draftRecap(transcript: string, lang: Lang, title: string, glossary: string[]) {
  const { output } = await generateText({
    model: gateway(FAST_MODEL),
    output: Output.object({ schema: RecapDraftSchema }),
    instructions: [
      `You write the recap of a conference talk titled "${title}" for attendees.`,
      `Write every field in ${LANGUAGE_NAME[lang]}, regardless of the transcript language.`,
      'Only use facts present in the transcript. Do not invent speakers, numbers or links.',
      glossary.length ? `Keep these terms exactly as written: ${glossary.join(', ')}.` : '',
    ]
      .filter(Boolean)
      .join(' '),
    prompt: `Transcript:\n${transcript}`,
    abortSignal: AbortSignal.timeout(45_000),
  })
  return output
}

export async function generateRecap(sessionId: string) {
  const db = createAdminClient()
  const [{ data: session }, { data: rows }] = await Promise.all([
    db.from('sessions').select('title, source_lang, target_langs, glossary').eq('id', sessionId).single(),
    db
      .from('segments')
      .select('seq, lang, text, t_start_ms, translations(lang, text)')
      .eq('session_id', sessionId)
      .order('seq'),
  ])
  const segments = (rows ?? []) as Segment[]
  if (!session || segments.length === 0) return { ok: false as const, code: 'empty_transcript' }

  const transcript = segments
    .map((s) => `[${formatClock(s.t_start_ms)}] ${s.text}`)
    .join('\n')
    .slice(-MAX_TRANSCRIPT_CHARS)
  const starts = segments.map((s) => s.t_start_ms)
  const langs = Array.from(new Set<Lang>([session.source_lang, ...(session.target_langs ?? [])])).filter((l) =>
    LANGS.includes(l),
  )

  const results = await Promise.allSettled(
    langs.map(async (lang) => {
      const draft = await draftRecap(transcript, lang, session.title, session.glossary ?? [])
      const seen = new Set<number>()
      const chapters = draft.chapters
        .map((c) => {
          const ms = parseClock(c.at)
          return ms === null ? null : { tStartMs: snapToSegment(ms, starts), title: c.title.trim() }
        })
        .filter((c): c is { tStartMs: number; title: string } => !!c && !!c.title && !seen.has(c.tStartMs) && !!seen.add(c.tStartMs))
        .sort((a, b) => a.tStartMs - b.tStartMs)

      const payload: InsightPayload = InsightPayloadSchema.parse({
        summary: draft.summary.trim(),
        keyIdeas: draft.keyIdeas.map((k) => k.trim()).filter(Boolean).slice(0, 7),
        chapters,
        mentions: draft.mentions.slice(0, 10),
      })

      const { error } = await db
        .from('session_insights')
        .upsert(
          { session_id: sessionId, kind: 'final', lang, payload, updated_at: new Date().toISOString() },
          { onConflict: 'session_id,kind,lang' },
        )
      if (error) throw error
      return lang
    }),
  )

  const done = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
  const failures = results.flatMap((r) => (r.status === 'rejected' ? [String(r.reason)] : []))
  if (failures.length) await logEvent('recap', 'error', 'recap generation failed', { sessionId, failures })
  if (done.length) {
    await logEvent('recap', 'info', 'recap generated', { sessionId, langs: done, segments: segments.length })
    await broadcast(sessionId, { type: 'insight', kind: 'final' }).catch(() => {})
  }
  return done.length ? { ok: true as const, langs: done } : { ok: false as const, code: 'generation_failed' }
}
