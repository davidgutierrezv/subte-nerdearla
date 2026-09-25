import Link from 'next/link'
import { t } from '@/lib/i18n'

export function SiteHeader({ liveCount }: { liveCount?: number }) {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span
            aria-hidden="true"
            className="rounded-sm bg-primary px-1.5 py-0.5 font-mono text-xs font-medium text-primary-foreground"
          >
            CC
          </span>
          {t.appName}
        </Link>
        {liveCount !== undefined && liveCount > 0 && (
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            <span aria-hidden="true" className="size-2 rounded-full bg-live animate-live-pulse" />
            {liveCount} {t.status.live}
          </p>
        )}
      </div>
    </header>
  )
}
