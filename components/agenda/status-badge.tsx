import type { SessionStatus } from '@/lib/schemas'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function StatusBadge({ status, className }: { status: SessionStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-display text-xs font-medium uppercase tracking-wider',
        status === 'live' && 'bg-live text-live-foreground',
        status === 'scheduled' && 'bg-secondary text-foreground',
        status === 'ended' && 'text-muted-foreground ring-1 ring-border',
        className,
      )}
    >
      {status === 'live' && (
        <span aria-hidden="true" className="size-1.5 rounded-full bg-live-foreground animate-live-pulse" />
      )}
      {t.status[status]}
    </span>
  )
}
