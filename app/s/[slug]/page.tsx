import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getRecap } from '@/lib/live/recap-read'
import { getSnapshot, getSessionView } from '@/lib/live/transcript'
import { LangSchema } from '@/lib/schemas'
import { LiveViewer } from '@/components/viewer/live-viewer'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps<'/s/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const view = await getSessionView(slug)
  if (!view) return { title: 'Subte' }
  return {
    title: `${view.session.title} — Subte`,
    description: `Subtítulos en vivo${view.session.speaker ? ` de ${view.session.speaker}` : ''}, en inglés y español.`,
  }
}

export default async function SessionPage({ params, searchParams }: PageProps<'/s/[slug]'>) {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const snapshot = await getSnapshot(slug)
  if (!snapshot) notFound()

  const { session, stageName, lineIndex, status, lines } = snapshot
  const initialRecap = status === 'ended' ? await getRecap(session.id) : {}
  const requested = LangSchema.safeParse(query.lang)
  const available = [session.source_lang, ...session.target_langs]
  const initialLang =
    requested.success && available.includes(requested.data) ? requested.data : session.source_lang

  return (
    <LiveViewer
      session={session}
      stageName={stageName}
      lineIndex={lineIndex}
      initialLang={initialLang}
      initial={{ status, lines }}
      initialRecap={initialRecap}
    />
  )
}
