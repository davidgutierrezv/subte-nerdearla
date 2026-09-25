import { NextResponse } from 'next/server'
import { getRecap } from '@/lib/live/recap-read'
import { getSessionView } from '@/lib/live/transcript'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, ctx: RouteContext<'/api/sessions/[slug]/recap'>) {
  const { slug } = await ctx.params
  const view = await getSessionView(slug)
  if (!view) return NextResponse.json({ error: { code: 'not_found' } }, { status: 404 })
  return NextResponse.json(await getRecap(view.session.id), { headers: { 'Cache-Control': 'no-store' } })
}
