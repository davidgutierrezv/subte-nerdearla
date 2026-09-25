'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { broadcast } from '@/lib/live/broadcast'
import { ingestSegment } from '@/lib/live/ingest'
import { logEvent } from '@/lib/log'
import { hasOperatorSession } from '@/lib/operator'
import { type ApiResult, type Lang, InterimEventSchema, SegmentInSchema } from '@/lib/schemas'
import { createAdminClient } from '@/lib/supabase/admin'

const unauthorized = { ok: false, error: { code: 'unauthorized', message: 'Operator session required' } } as const
const SessionIdSchema = z.uuid()

export async function startSessionAction(sessionId: string): Promise<ApiResult<{ startedAt: string }>> {
  if (!(await hasOperatorSession())) return unauthorized
  const id = SessionIdSchema.parse(sessionId)
  const db = createAdminClient()

  const { data: current } = await db.from('sessions').select('started_at').eq('id', id).single()
  const startedAt = current?.started_at ?? new Date().toISOString()
  const { error } = await db
    .from('sessions')
    .update({ status: 'live', started_at: startedAt, ended_at: null })
    .eq('id', id)
  if (error) return { ok: false, error: { code: 'db_error', message: error.message } }

  await broadcast(id, { type: 'status', status: 'live' }).catch(() => {})
  revalidatePath('/')
  return { ok: true, data: { startedAt } }
}

export async function endSessionAction(sessionId: string): Promise<ApiResult<null>> {
  if (!(await hasOperatorSession())) return unauthorized
  const id = SessionIdSchema.parse(sessionId)
  const { error } = await createAdminClient()
    .from('sessions')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { ok: false, error: { code: 'db_error', message: error.message } }

  await broadcast(id, { type: 'status', status: 'ended' }).catch(() => {})
  revalidatePath('/')
  return { ok: true, data: null }
}

export async function resetSessionAction(sessionId: string): Promise<ApiResult<null>> {
  if (!(await hasOperatorSession())) return unauthorized
  const id = SessionIdSchema.parse(sessionId)
  const db = createAdminClient()

  const { error: delError } = await db.from('segments').delete().eq('session_id', id)
  const { error } = await db
    .from('sessions')
    .update({ status: 'scheduled', started_at: null, ended_at: null })
    .eq('id', id)
  if (delError || error) {
    return { ok: false, error: { code: 'db_error', message: (delError ?? error)!.message } }
  }

  await logEvent('stage', 'info', 'transcript reset', { sessionId: id })
  await broadcast(id, { type: 'reset' }).catch(() => {})
  revalidatePath('/')
  return { ok: true, data: null }
}

export type DemoSession = {
  id: string
  slug: string
  title: string
  sourceLang: Lang
  startedAt: string
  nextSeq: number
}

export async function startAllDemoAction(): Promise<ApiResult<DemoSession[]>> {
  if (!(await hasOperatorSession())) return unauthorized
  const db = createAdminClient()

  const { data: sessions, error } = await db
    .from('sessions')
    .select('id, slug, title, source_lang, started_at')
    .order('title')
  if (error || !sessions) return { ok: false, error: { code: 'db_error', message: error?.message ?? 'no sessions' } }

  const now = new Date().toISOString()
  const prepared = await Promise.all(
    sessions.map(async (s) => {
      const startedAt = (s.started_at as string | null) ?? now
      await db.from('sessions').update({ status: 'live', started_at: startedAt, ended_at: null }).eq('id', s.id)
      const { data: last } = await db
        .from('segments')
        .select('seq')
        .eq('session_id', s.id)
        .order('seq', { ascending: false })
        .limit(1)
        .maybeSingle()
      await broadcast(s.id, { type: 'status', status: 'live' }).catch(() => {})
      return {
        id: s.id as string,
        slug: s.slug as string,
        title: s.title as string,
        sourceLang: s.source_lang as Lang,
        startedAt,
        nextSeq: ((last?.seq as number | undefined) ?? -1) + 1,
      }
    }),
  )

  await logEvent('stage', 'info', 'demo: all sessions live', { count: prepared.length })
  revalidatePath('/')
  return { ok: true, data: prepared }
}

export async function pushSegmentAction(input: unknown): Promise<ApiResult<{ translated: Lang[] }>> {
  if (!(await hasOperatorSession())) return unauthorized
  const parsed = SegmentInSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: { code: 'invalid_input', message: parsed.error.message } }

  const result = await ingestSegment(parsed.data)
  if (!result.ok) return { ok: false, error: { code: result.code, message: result.code } }
  return { ok: true, data: { translated: result.translated } }
}

export async function pushInterimAction(sessionId: string, interim: unknown): Promise<void> {
  if (!(await hasOperatorSession())) return
  const id = SessionIdSchema.safeParse(sessionId)
  const parsed = InterimEventSchema.safeParse(interim)
  if (!id.success || !parsed.success) return
  await broadcast(id.data, parsed.data).catch(() => {})
}
