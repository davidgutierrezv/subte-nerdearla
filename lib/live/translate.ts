import { createGateway, generateText } from 'ai'
import type { Lang } from '@/lib/schemas'

// Free-tier Gateway accounts can't use newer Gemini models; 2.5 Flash Lite is available and ~500ms.
const TRANSLATION_MODEL = 'google/gemini-2.5-flash-lite'

// Without an explicit key the gateway falls back to AI_GATEWAY_API_KEY / OIDC.
const gateway = createGateway(
  process.env.VERCEL_AI_GATEWAY_KEY ? { apiKey: process.env.VERCEL_AI_GATEWAY_KEY } : {},
)

const LANGUAGE_NAME: Record<Lang, string> = {
  en: 'English',
  es: 'Rioplatense Spanish (Argentina)',
}

type TranslateInput = {
  text: string
  from: Lang
  to: Lang
  context: string[]
  glossary: string[]
}

export async function translateSegment({ text, from, to, context, glossary }: TranslateInput) {
  const glossaryRule = glossary.length
    ? `Keep these terms exactly as written: ${glossary.join(', ')}.`
    : ''
  const contextBlock = context.length
    ? `Previous captions, for context only (do not translate them):\n${context.join('\n')}\n\n`
    : ''

  const { text: output } = await generateText({
    model: gateway(TRANSLATION_MODEL),
    instructions: [
      `You translate live conference captions from ${LANGUAGE_NAME[from]} to ${LANGUAGE_NAME[to]}.`,
      'The input is speech-to-text output and may be an incomplete sentence: translate it as-is, do not complete or summarize it.',
      'Keep code identifiers, product names and acronyms unchanged.',
      glossaryRule,
      'Reply with the translation only, no quotes and no notes.',
    ]
      .filter(Boolean)
      .join(' '),
    prompt: `${contextBlock}Caption to translate:\n${text}`,
    abortSignal: AbortSignal.timeout(8000),
  })

  return output.trim()
}
