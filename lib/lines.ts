const LINES = [
  { letter: 'A', badge: 'bg-line-a', ring: 'ring-line-a/70' },
  { letter: 'B', badge: 'bg-line-b', ring: 'ring-line-b/70' },
  { letter: 'C', badge: 'bg-line-c', ring: 'ring-line-c/70' },
  { letter: 'D', badge: 'bg-line-d', ring: 'ring-line-d/70' },
] as const

export type Line = (typeof LINES)[number]

export function lineFor(index: number): Line {
  return LINES[index % LINES.length]
}
