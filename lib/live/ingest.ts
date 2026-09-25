import type { Lang, SegmentIn } from '@/lib/schemas'
import { logEvent } from '@/lib/log'
import { createAdminClient } from '@/lib/supabase/admin'
import { broadcast } from './broadcast'
import { translateSegment } from './translate'

type IngestResult =
  | { ok: true; id: string; translated: Lang[] }
  | { ok: false; code: 'not_found' | 'db_error' }

export async function ingestSegment(input: SegmentIn): Promise<IngestResult> {
  const db = createAdminClient()

  const { data: session } = await db
    .from('sessions')
    .select('id, target_langs, glossary')
    .eq('id', input.sessionId)
    .maybeSingle()
  if (!session) return { ok: false, code: 'not_found' }

  const { data: segment, error } = await db
    .from('segments')
    .upsert(
      {
        session_id: input.sessionId,
        seq: input.seq,
        lang: input.lang,
        text: input.text,
        t_start_ms: input.tStartMs,
        t_end_ms: input.tEndMs,
        speaker: input.speaker ?? null,
      },
      { onConflict: 'session_id,seq' },
    )
    .select('id')
    .single()

  if (error || !segment) {
    await logEvent('ingest', 'error', 'segment upsert failed', { error: error?.message, seq: input.seq })
    return { ok: false, code: 'db_error' }
  }

  await broadcast(input.sessionId, {
    type: 'segment',
    id: segment.id,
    seq: input.seq,
    lang: input.lang,
    text: input.text,
    tStartMs: input.tStartMs,
    tEndMs: input.tEndMs,
  }).catch((err) =>
    logEvent('ingest', 'warn', 'segment broadcast failed', { error: String(err), seq: input.seq }),
  )

  const { data: previous } = await db
    .from('segments')
    .select('text')
    .eq('session_id', input.sessionId)
    .lt('seq', input.seq)
    .order('seq', { ascending: false })
    .limit(2)
  const context = (previous ?? []).map((p) => p.text as string).reverse()

  const targets = (session.target_langs as Lang[]).filter((lang) => lang !== input.lang)
  const results = await Promise.all(
    targets.map(async (lang) => {
      try {
        const text = await translateSegment({
          text: input.text,
          from: input.lang,
          to: lang,
          context,
          glossary: (session.glossary as string[] | null) ?? [],
        })
        if (!text) return null

        const { error: tError } = await db
          .from('translations')
          .upsert({ segment_id: segment.id, lang, text }, { onConflict: 'segment_id,lang' })
        if (tError) throw tError

        await broadcast(input.sessionId, {
          type: 'translation',
          segmentId: segment.id,
          seq: input.seq,
          lang,
          text,
        })
        return lang
      } catch (err) {
        await logEvent('translate', 'error', 'translation failed', {
          error: err instanceof Error ? err.message : String(err),
          seq: input.seq,
          lang,
        })
        return null
      }
    }),
  )

  return { ok: true, id: segment.id, translated: results.filter((l): l is Lang => l !== null) }
}
