import { NextResponse } from 'next/server'
import { ingestSegment } from '@/lib/live/ingest'
import { hasOperatorSession, isValidOperatorKey } from '@/lib/operator'
import { SegmentInSchema } from '@/lib/schemas'

// For external stations (scripts, hardware). The in-app station uses server actions.
export async function POST(req: Request) {
  const authorized =
    isValidOperatorKey(req.headers.get('x-operator-key')) || (await hasOperatorSession())
  if (!authorized) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const parsed = SegmentInSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', issues: parsed.error.issues }, { status: 400 })
  }

  const result = await ingestSegment(parsed.data)
  if (!result.ok) {
    return NextResponse.json({ error: result.code }, { status: result.code === 'not_found' ? 404 : 500 })
  }
  return NextResponse.json({ ok: true, id: result.id, translated: result.translated })
}
