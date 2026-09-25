import Link from 'next/link'
import { t } from '@/lib/i18n'
import { SubteWordmark } from '@/components/brand/subte-mark'

export function SiteHeader({ liveCount }: { liveCount?: number }) {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 md:px-6">
        <Link
          href="/"
          aria-label={`${t.appName} — inicio`}
          className="rounded-md focus-visible:outline-2 focus-visible:outline-ring"
        >
          <SubteWordmark />
        </Link>
        {liveCount !== undefined && liveCount > 0 && (
          <p className="flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span aria-hidden="true" className="size-2 rounded-full bg-live animate-live-pulse" />
            {liveCount} {t.status.live}
          </p>
        )}
      </div>
    </header>
  )
}
