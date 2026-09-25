import Link from 'next/link'
import type { StageWithSessions } from '@/lib/agenda'
import { t } from '@/lib/i18n'
import type { Line } from '@/lib/lines'
import { cn } from '@/lib/utils'
import { StatusBadge } from './status-badge'
import { WatchForm } from './watch-form'

export function StageCard({ stage, line }: { stage: StageWithSessions; line: Line }) {
  const { current, others } = stage
  const isLive = current?.status === 'live'

  return (
    <article
      aria-labelledby={`stage-${stage.id}`}
      className={cn(
        'flex flex-col gap-5 rounded-lg bg-card p-5 ring-1 ring-border',
        isLive && line.ring,
      )}
    >
      <header className="flex items-center justify-between gap-3">
        <h2 id={`stage-${stage.id}`} className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-background',
              line.badge,
            )}
          >
            {line.letter}
          </span>
          <span className="flex flex-col">
            <span className="sr-only">
              {t.agenda.line} {line.letter}:{' '}
            </span>
            <span className="font-display text-sm font-semibold leading-tight">{stage.name}</span>
          </span>
        </h2>
        {current && (
          <div className="flex items-center gap-2">
            {current.mode === 'replay' && (
              <span className="font-display text-xs uppercase tracking-wider text-muted-foreground">
                {t.agenda.replay}
              </span>
            )}
            <StatusBadge status={current.status} />
          </div>
        )}
      </header>

      {current ? (
        <>
          <div className="flex flex-col gap-2">
            <p className="text-pretty text-xl font-semibold leading-snug">{current.title}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {current.speaker && <span className="text-foreground">{current.speaker}</span>}
              {current.speaker && ' · '}
              {t.agenda.speaksIn} {t.langName[current.source_lang]}
            </p>
          </div>
          <WatchForm session={current} />
        </>
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground">{t.agenda.noSession}</p>
      )}

      {others.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h3 className="font-display text-xs uppercase tracking-wider text-muted-foreground">
            {t.agenda.alsoHere}
          </h3>
          <ul className="flex flex-col">
            {others.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/s/${s.slug}?lang=es`}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-sm text-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="text-pretty">{s.title}</span>
                  <StatusBadge status={s.status} className="shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  )
}
