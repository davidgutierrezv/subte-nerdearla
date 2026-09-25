import { createAdminClient } from '@/lib/supabase/admin'

type Level = 'debug' | 'info' | 'warn' | 'error'

export async function logEvent(
  source: string,
  level: Level,
  message: string,
  data?: Record<string, unknown>,
) {
  try {
    await createAdminClient().from('logs').insert({ source, level, message, data: data ?? null })
  } catch (err) {
    console.error('[log] failed to write log', source, message, err)
  }
}
