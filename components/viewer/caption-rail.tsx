import { t } from '@/lib/i18n'
import type { Line } from '@/lib/lines'
import { formatClock, type TranscriptLine } from '@/lib/live/shared'
import type { Lang } from '@/lib/schemas'
import { cn } from '@/lib/utils'

type Props = {
  lines: TranscriptLine[]
  lang: Lang
  sourceLang: Lang
  interim: string
  line: Line
  fontClass: string
  highContrast: boolean
  ended: boolean
  query?: string
  focusSeq?: number | null
}

function Highlight({ text, query }: { text: string; query?: string }) {
  const needle = query?.trim()
  if (!needle) return text
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.split(new RegExp(`(${escaped})`, 'gi')).map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded-sm bg-primary px-0.5 text-primary-foreground">
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

// The transcript is drawn as a subway line: each caption is a station on the room's colored rail.
export function CaptionRail({
  lines,
  lang,
  sourceLang,
  interim,
  line,
  fontClass,
  highContrast,
  ended,
  query,
  focusSeq,
}: Props) {
  const lastIndex = interim || query ? -1 : lines.length - 1

  return (
    <section aria-label={t.viewer.captions}>
      <ol className={cn('ml-2 flex flex-col gap-6 border-l-4 pb-1', line.rail)}>
        {lines.map((l, index) => {
          const translated = l.lang === lang ? l.text : l.translations[lang]
          const isCurrent = index === lastIndex
          const isRecent = !query && (ended ? l.seq === focusSeq : index >= lines.length - 3)

          return (
            <li
              key={l.seq}
              id={`seg-${l.seq}`}
              className={cn(
                'relative scroll-mt-24 rounded-r-md pl-6 transition-colors',
                l.seq === focusSeq && 'bg-secondary py-2',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'absolute -left-2.5 top-2 size-4 rounded-full border-4',
                  line.dot,
                  isCurrent ? line.fill : 'bg-background',
                )}
              />
              <p className="mb-1 font-display text-xs tabular-nums text-muted-foreground">
                {formatClock(l.tStartMs)}
              </p>
              {translated ? (
                <p
                  lang={lang}
                  className={cn(
                    'text-pretty font-bold leading-snug transition-colors',
                    fontClass,
                    isCurrent || isRecent
                      ? highContrast
                        ? 'text-primary'
                        : 'text-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  <Highlight text={translated} query={query} />
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  <p lang={l.lang} className={cn('text-pretty leading-snug text-muted-foreground', fontClass)}>
                    <Highlight text={l.text} query={query} />
                  </p>
                  <p className="font-display text-xs uppercase tracking-wider text-muted-foreground">
                    {index >= lines.length - 2 && !ended ? t.viewer.translating : t.viewer.originalOnly}
                  </p>
                </div>
              )}
            </li>
          )
        })}

        {interim && (
          <li className="relative pl-6">
            <span
              aria-hidden="true"
              className={cn('absolute -left-2.5 top-2 size-4 rounded-full border-4 animate-live-pulse', line.dot, line.fill)}
            />
            <p className="mb-1 font-display text-xs uppercase tracking-wider text-muted-foreground">
              {t.langName[sourceLang]} · {t.viewer.original}
            </p>
            <p lang={sourceLang} className={cn('text-pretty font-bold leading-snug text-muted-foreground', fontClass)}>
              {interim}
            </p>
          </li>
        )}

        {ended && !query && (
          <li className="relative pl-6">
            <span
              aria-hidden="true"
              className={cn('absolute -left-2.5 top-1 size-4 rounded-full border-4', line.dot, line.fill)}
            />
            <p className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t.viewer.endedNote}
            </p>
          </li>
        )}
      </ol>

      {/* Screen readers get only the newest final caption, never the flickering interim text. */}
      <p aria-live="polite" className="sr-only">
        {lines.at(-1) ? (lines.at(-1)!.lang === lang ? lines.at(-1)!.text : lines.at(-1)!.translations[lang]) : ''}
      </p>
    </section>
  )
}
