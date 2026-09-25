import type { InsightPayload, Lang, SessionStatus } from '@/lib/schemas'

export type Recap = Partial<Record<Lang, InsightPayload>>

export const LIVE_EVENT = 'live'

export function liveTopic(sessionId: string) {
  return `live:${sessionId}`
}

export type TranscriptLine = {
  id: string
  seq: number
  lang: Lang
  text: string
  tStartMs: number
  tEndMs: number
  translations: Partial<Record<Lang, string>>
}

export type TranscriptSnapshot = {
  status: SessionStatus
  lines: TranscriptLine[]
}

export function upsertLine(lines: TranscriptLine[], line: TranscriptLine) {
  const index = lines.findIndex((l) => l.seq === line.seq)
  if (index === -1) return [...lines, line].sort((a, b) => a.seq - b.seq)
  const next = [...lines]
  next[index] = {
    ...line,
    translations: line.text === lines[index].text ? { ...lines[index].translations, ...line.translations } : line.translations,
  }
  return next
}

export function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
