import type { SessionRow, SessionStatus, StageRow } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'

export type StageWithSessions = StageRow & {
  current: SessionRow | null
  others: SessionRow[]
}

const SESSION_COLUMNS =
  'id, stage_id, slug, title, speaker, source_lang, target_langs, glossary, mode, status, started_at, ended_at'

const STATUS_PRIORITY: Record<SessionStatus, number> = { live: 0, scheduled: 1, ended: 2 }

export function sortSessions(sessions: SessionRow[]) {
  return [...sessions].sort(
    (a, b) =>
      STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status] || a.title.localeCompare(b.title, 'es'),
  )
}

export async function getAgenda(): Promise<StageWithSessions[]> {
  const supabase = await createClient()
  const [stagesRes, sessionsRes] = await Promise.all([
    supabase.from('stages').select('id, name').order('name'),
    supabase.from('sessions').select(SESSION_COLUMNS),
  ])
  if (stagesRes.error) throw stagesRes.error
  if (sessionsRes.error) throw sessionsRes.error

  const sessions = (sessionsRes.data ?? []) as SessionRow[]

  return (stagesRes.data ?? []).map((stage) => {
    const [current = null, ...others] = sortSessions(
      sessions.filter((s) => s.stage_id === stage.id),
    )
    return { ...stage, current, others }
  })
}
