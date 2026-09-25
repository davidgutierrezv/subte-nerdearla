import type { Lang, SessionRow } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'
import type { TranscriptLine, TranscriptSnapshot } from './shared'

const SESSION_COLUMNS =
  'id, stage_id, slug, title, speaker, source_lang, target_langs, glossary, mode, status, started_at, ended_at'

const TRANSCRIPT_LIMIT = 300

export type SessionView = {
  session: SessionRow
  stageName: string | null
  lineIndex: number
}

export async function getSessionView(slug: string): Promise<SessionView | null> {
  const supabase = await createClient()
  const [sessionRes, stagesRes] = await Promise.all([
    supabase.from('sessions').select(SESSION_COLUMNS).eq('slug', slug).maybeSingle(),
    supabase.from('stages').select('id, name').order('name'),
  ])
  if (sessionRes.error) throw sessionRes.error
  const session = sessionRes.data as SessionRow | null
  if (!session) return null

  const stages = stagesRes.data ?? []
  const lineIndex = Math.max(0, stages.findIndex((s) => s.id === session.stage_id))
  const stageName = stages.find((s) => s.id === session.stage_id)?.name ?? null
  return { session, stageName, lineIndex }
}

type SegmentRow = {
  id: string
  seq: number
  lang: Lang
  text: string
  t_start_ms: number
  t_end_ms: number
  translations: { lang: Lang; text: string }[] | null
}

export async function getTranscript(sessionId: string): Promise<TranscriptLine[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('segments')
    .select('id, seq, lang, text, t_start_ms, t_end_ms, translations(lang, text)')
    .eq('session_id', sessionId)
    .order('seq', { ascending: false })
    .limit(TRANSCRIPT_LIMIT)
  if (error) throw error

  return ((data ?? []) as SegmentRow[]).reverse().map((row) => ({
    id: row.id,
    seq: row.seq,
    lang: row.lang,
    text: row.text,
    tStartMs: row.t_start_ms,
    tEndMs: row.t_end_ms,
    translations: Object.fromEntries((row.translations ?? []).map((t) => [t.lang, t.text])),
  }))
}

export async function getSnapshot(slug: string): Promise<(TranscriptSnapshot & SessionView) | null> {
  const view = await getSessionView(slug)
  if (!view) return null
  const lines = await getTranscript(view.session.id)
  return { ...view, status: view.session.status, lines }
}
