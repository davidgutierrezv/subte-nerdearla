import { InsightPayloadSchema, LangSchema } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'
import type { Recap } from './shared'

export async function getRecap(sessionId: string): Promise<Recap> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('session_insights')
    .select('lang, payload')
    .eq('session_id', sessionId)
    .eq('kind', 'final')
  if (error) throw error

  const recap: Recap = {}
  for (const row of data ?? []) {
    const lang = LangSchema.safeParse(row.lang)
    const payload = InsightPayloadSchema.safeParse(row.payload)
    if (lang.success && payload.success) recap[lang.data] = payload.data
  }
  return recap
}
