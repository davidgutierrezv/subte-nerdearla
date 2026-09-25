import { createClient } from '@supabase/supabase-js'

// Service-role client: bypasses RLS. Only import from server code (route handlers, server actions).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase service role configuration')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
