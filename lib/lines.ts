const LINES = [
  { letter: 'A', badge: 'bg-line-a', ring: 'ring-line-a/70', rail: 'border-line-a', dot: 'border-line-a', fill: 'bg-line-a' },
  { letter: 'B', badge: 'bg-line-b', ring: 'ring-line-b/70', rail: 'border-line-b', dot: 'border-line-b', fill: 'bg-line-b' },
  { letter: 'C', badge: 'bg-line-c', ring: 'ring-line-c/70', rail: 'border-line-c', dot: 'border-line-c', fill: 'bg-line-c' },
  { letter: 'D', badge: 'bg-line-d', ring: 'ring-line-d/70', rail: 'border-line-d', dot: 'border-line-d', fill: 'bg-line-d' },
] as const

export type Line = (typeof LINES)[number]

export function lineFor(index: number): Line {
  return LINES[index % LINES.length]
}
