import type { Lang } from '@/lib/schemas'

// The Web Speech API is not in TypeScript's DOM lib; this is the subset the station uses.
type SpeechAlternative = { transcript: string }
type SpeechResult = { isFinal: boolean; 0: SpeechAlternative; length: number }
export type SpeechResultEvent = { resultIndex: number; results: ArrayLike<SpeechResult> }
export type SpeechErrorEvent = { error: string }

export interface SpeechRecognizer {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechResultEvent) => void) | null
  onerror: ((event: SpeechErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

type SpeechRecognizerCtor = new () => SpeechRecognizer

export function getSpeechRecognizer(): SpeechRecognizerCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognizerCtor
    webkitSpeechRecognition?: SpeechRecognizerCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const SPEECH_LOCALE: Record<Lang, string> = { es: 'es-AR', en: 'en-US' }
