import { Download, Sparkles } from 'lucide-react'
import { t } from '@/lib/i18n'
import type { Line } from '@/lib/lines'
import { formatClock } from '@/lib/live/shared'
import type { InsightPayload, Lang } from '@/lib/schemas'
import { cn } from '@/lib/utils'

type Props = {
  recap: InsightPayload | undefined
  lang: Lang
  line: Line
  onJump: (tStartMs: number) => void
  onDownload: () => void
}

export function RecapPanel({ recap, lang, line, onJump, onDownload }: Props) {
  if (!recap) {
    return (
      <div className="flex flex-col items-start gap-3 py-12" role="status">
        <span className={cn('size-4 rounded-full animate-live-pulse', line.fill)} aria-hidden="true" />
        <p className="font-display text-2xl font-semibold text-balance">{t.viewer.generatingTitle}</p>
        <p className="max-w-md text-base leading-relaxed text-muted-foreground text-pretty">
          {t.viewer.generatingBody}
        </p>
      </div>
    )
  }

  return (
    <article lang={lang} className="flex flex-col gap-10 py-2">
      <section aria-labelledby="recap-summary" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 id="recap-summary" className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t.viewer.summary}
          </h2>
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border px-3 font-display text-xs font-semibold text-foreground hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Download className="size-4" aria-hidden="true" />
            {t.viewer.download}
          </button>
        </div>
        <p className="text-xl font-semibold leading-relaxed text-pretty md:text-2xl">{recap.summary}</p>
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="size-4" aria-hidden="true" />
          {t.viewer.generatedBy}
        </p>
      </section>

      {recap.keyIdeas.length > 0 && (
        <section aria-labelledby="recap-ideas" className="flex flex-col gap-4">
          <h2 id="recap-ideas" className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t.viewer.keyIdeas}
          </h2>
          <ul className="flex flex-col gap-3">
            {recap.keyIdeas.map((idea) => (
              <li key={idea} className="flex gap-3 text-base leading-relaxed">
                <span className={cn('mt-2.5 size-2 shrink-0 rounded-full', line.fill)} aria-hidden="true" />
                <span className="text-pretty">{idea}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recap.chapters.length > 0 && (
        <section aria-labelledby="recap-chapters" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="recap-chapters" className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t.viewer.chapters}
            </h2>
            <p className="text-sm text-muted-foreground">{t.viewer.chaptersHint}</p>
          </div>
          <ol className={cn('ml-2 flex flex-col border-l-4', line.rail)}>
            {recap.chapters.map((chapter, index) => (
              <li key={chapter.tStartMs} className="relative">
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute -left-2.5 top-1/2 size-4 -translate-y-1/2 rounded-full border-4',
                    line.dot,
                    index === 0 ? line.fill : 'bg-background',
                  )}
                />
                <button
                  type="button"
                  onClick={() => onJump(chapter.tStartMs)}
                  className="flex min-h-12 w-full items-baseline gap-4 rounded-md py-2 pl-6 pr-2 text-left hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="font-display text-sm tabular-nums text-muted-foreground">
                    {formatClock(chapter.tStartMs)}
                  </span>
                  <span className="font-display text-base font-semibold text-pretty">{chapter.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}

      {recap.mentions.length > 0 && (
        <section aria-labelledby="recap-mentions" className="flex flex-col gap-4">
          <h2 id="recap-mentions" className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t.viewer.mentions}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {recap.mentions.map((m) => (
              <li
                key={m.name}
                className="rounded-full border border-border px-3 py-1 font-display text-sm font-medium"
              >
                {m.name}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}
