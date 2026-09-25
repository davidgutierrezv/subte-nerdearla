import { getAgenda } from '@/lib/agenda'
import { t } from '@/lib/i18n'
import { lineFor } from '@/lib/lines'
import { StageCard } from '@/components/agenda/stage-card'
import { SiteHeader } from '@/components/site-header'

export const dynamic = 'force-dynamic'

export default async function AgendaPage() {
  const stages = await getAgenda()
  const liveCount = stages.filter((s) => s.current?.status === 'live').length

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader liveCount={liveCount} />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-16 pt-8 md:px-6">
        <section className="flex flex-col gap-3">
          <p className="font-display text-xs font-semibold uppercase tracking-widest text-primary">
            {t.agenda.eyebrow}
          </p>
          <h1 className="text-balance font-display text-3xl font-bold leading-tight tracking-tight md:text-5xl">
            {t.agenda.title}
          </h1>
          <p className="max-w-prose text-pretty leading-relaxed text-muted-foreground">
            {t.agenda.subtitle}
          </p>
        </section>

        {stages.length === 0 ? (
          <p className="text-muted-foreground">{t.agenda.empty}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stages.map((stage, index) => (
              <StageCard key={stage.id} stage={stage} line={lineFor(index)} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
