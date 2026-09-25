import type { LiveEvent } from '@/lib/schemas'
import { LIVE_EVENT, liveTopic } from './shared'

// Server-side publish through the Realtime REST API: no socket to keep open per request.
export async function broadcast(sessionId: string, event: LiveEvent) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase service role configuration')

  const res = await fetch(`${url}/realtime/v1/api/broadcast`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [{ topic: liveTopic(sessionId), event: LIVE_EVENT, payload: event, private: false }],
    }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`Realtime broadcast failed with ${res.status}`)
}
