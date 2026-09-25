import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { t } from '@/lib/i18n'
import { lineFor } from '@/lib/lines'
import { getSessionView } from '@/lib/live/transcript'
import { hasOperatorSession } from '@/lib/operator'
import { createAdminClient } from '@/lib/supabase/admin'
import { cn } from '@/lib/utils'
import { Station } from '@/components/stage/station'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Estación de sala — Subte',
  robots: { index: false, follow: false },
}

export default async function StagePage({ params }: PageProps<'/stage/[slug]'>) {
  if (!(await hasOperatorSession())) redirect('/admin')

  const { slug } = await params
  const view = await getSessionView(slug)
  if (!view) notFound()
  const { session, stageName, lineIndex } = view
  const line = lineFor(lineIndex)

  const { data: last } = await createAdminClient()
    .from('segments')
    .select('seq')
    .eq('session_id', session.id)
    .order('seq', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-4 pb-16 pt-4 md:px-6">
      <Link
        href="/admin"
        className="-ml-2 inline-flex min-h-11 items-center gap-1 self-start rounded-md pr-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        {t.stage.back}
      </Link>

      <header className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'mt-1 flex size-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-background',
            line.badge,
          )}
        >
          {line.letter}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-display text-xs uppercase tracking-widest text-muted-foreground">
            {t.stage.title}
            {stageName ? ` · ${stageName}` : ''}
          </p>
          <h1 className="text-xl font-bold leading-snug text-balance">{session.title}</h1>
          <p className="text-sm text-muted-foreground">
            {session.speaker ? `${session.speaker} · ` : ''}
            {t.langName[session.source_lang]}
          </p>
        </div>
      </header>

      <Station session={session} initialNextSeq={last ? last.seq + 1 : 0} />
    </main>
  )
}
