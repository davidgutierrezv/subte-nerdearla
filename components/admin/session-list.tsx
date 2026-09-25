import Link from 'next/link'
import type { StageWithSessions } from '@/lib/agenda'
import { t } from '@/lib/i18n'
import { StatusBadge } from '@/components/agenda/status-badge'

export function SessionList({ stages }: { stages: StageWithSessions[] }) {
  return (
    <section aria-labelledby="sessions-heading" className="flex flex-col gap-4">
      <h2 id="sessions-heading" className="text-lg font-semibold">
        {t.admin.sessions}
      </h2>
      <div className="flex flex-col gap-4">
        {stages.map((stage) => {
          const sessions = [stage.current, ...stage.others].filter((s) => s !== null)
          return (
            <div key={stage.id} className="rounded-lg bg-card p-4 ring-1 ring-border">
              <h3 className="font-display text-xs uppercase tracking-widest text-muted-foreground">
                {stage.name}
              </h3>
              {sessions.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">{t.agenda.noSession}</p>
              ) : (
                <ul className="mt-2 flex flex-col divide-y divide-border">
                  {sessions.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm font-medium">{s.title}</span>
                        <span className="truncate font-display text-xs text-muted-foreground">
                          /s/{s.slug} · {s.source_lang.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <StatusBadge status={s.status} />
                        <Link
                          href={`/s/${s.slug}?lang=es`}
                          className="text-sm text-primary underline-offset-4 hover:underline"
                        >
                          {t.admin.open}
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
