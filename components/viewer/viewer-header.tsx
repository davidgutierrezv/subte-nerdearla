import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { t } from '@/lib/i18n'
import type { Line } from '@/lib/lines'
import type { Lang, SessionRow, SessionStatus } from '@/lib/schemas'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/agenda/status-badge'

type Props = {
  session: SessionRow
  stageName: string | null
  line: Line
  status: SessionStatus
  langs: Lang[]
  lang: Lang
  onLangChange: (lang: Lang) => void
  connected: boolean
}

export function ViewerHeader({ session, stageName, line, status, langs, lang, onLangChange, connected }: Props) {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-3 md:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            aria-label={t.viewer.back}
            className="-ml-2 flex min-h-11 min-w-11 items-center gap-2 rounded-md pr-2 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <ChevronLeft className="size-5 shrink-0" aria-hidden="true" />
            <span
              aria-hidden="true"
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold text-background',
                line.badge,
              )}
            >
              {line.letter}
            </span>
            {stageName && <span className="truncate font-display text-sm font-semibold">{stageName}</span>}
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            {!connected && status === 'live' && (
              <span className="font-display text-xs text-muted-foreground">{t.viewer.connecting}</span>
            )}
            <StatusBadge status={status} />
          </div>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate text-base font-bold leading-snug md:text-lg">{session.title}</h1>
            {session.speaker && <p className="truncate text-sm text-muted-foreground">{session.speaker}</p>}
          </div>

          <div role="group" aria-label={t.viewer.language} className="flex shrink-0 gap-1 rounded-md bg-secondary p-1">
            {langs.map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={l === lang}
                onClick={() => onLangChange(l)}
                className={cn(
                  'flex min-h-9 min-w-11 flex-col items-center justify-center rounded-sm px-2 font-display text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                  l === lang ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span className="sr-only">{t.langName[l]}</span>
                <span aria-hidden="true">{l.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
