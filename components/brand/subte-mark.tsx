import { cn } from '@/lib/utils'

const STATIONS = [
  [46, 10],
  [18, 22],
  [46, 38],
  [18, 50],
] as const

export function SubteMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-8', className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <g strokeWidth={6}>
        <path className="stroke-line-a" d="M46 10H30C23 10 18 15 18 22" />
        <path className="stroke-line-b" d="M18 22C18 27 23 30 30 30H36C42 30 46 33 46 38" />
        <path
          className="stroke-line-c"
          d="M46 38C46 43 42 46 36 46H26C21 46 18 47 18 50C18 53 21 56 26 56H28"
        />
        <path className="stroke-line-d" d="M28 56H46" />
      </g>
      {STATIONS.map(([cx, cy]) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r={4}
          className="fill-background stroke-foreground"
          strokeWidth={2.5}
        />
      ))}
    </svg>
  )
}

export function SubteWordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <SubteMark />
      <span className="font-display text-xl font-bold tracking-tight">Subte</span>
    </span>
  )
}
