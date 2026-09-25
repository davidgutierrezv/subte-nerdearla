import { t } from '@/lib/i18n'
import type { InsightPayload, Lang, SessionRow } from '@/lib/schemas'
import { formatClock, type TranscriptLine } from './shared'

export function buildMarkdown(session: SessionRow, lang: Lang, recap: InsightPayload | undefined, lines: TranscriptLine[]) {
  const out = [`# ${session.title}`]
  if (session.speaker) out.push(`_${session.speaker}_`)

  if (recap) {
    out.push('', `## ${t.viewer.summary}`, '', recap.summary)
    if (recap.keyIdeas.length) out.push('', `## ${t.viewer.keyIdeas}`, '', ...recap.keyIdeas.map((i) => `- ${i}`))
    if (recap.chapters.length) {
      out.push('', `## ${t.viewer.chapters}`, '', ...recap.chapters.map((c) => `- \`${formatClock(c.tStartMs)}\` ${c.title}`))
    }
  }

  out.push('', `## ${t.viewer.transcriptTab}`, '')
  for (const l of lines) {
    const text = l.lang === lang ? l.text : (l.translations[lang] ?? l.text)
    out.push(`**${formatClock(l.tStartMs)}** ${text}`, '')
  }
  return out.join('\n')
}

export function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
