import { NextResponse } from 'next/server'
import { getSnapshot } from '@/lib/live/transcript'
import type { TranscriptSnapshot } from '@/lib/live/shared'

export async function GET(_req: Request, ctx: RouteContext<'/api/sessions/[slug]/transcript'>) {
  const { slug } = await ctx.params
  const snapshot = await getSnapshot(slug)
  if (!snapshot) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const body: TranscriptSnapshot = { status: snapshot.status, lines: snapshot.lines }
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } })
}
