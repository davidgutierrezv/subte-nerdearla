'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Play, Square } from 'lucide-react'
import { type DemoSession, pushInterimAction, pushSegmentAction, startAllDemoAction } from '@/app/stage/actions'
import { t } from '@/lib/i18n'
import { DEMO_SCRIPTS } from '@/lib/stage/demo-scripts'
import { cn } from '@/lib/utils'

type LaneState = { sent: number; translated: number; last: string }

const WORD_MS = 280
const PAUSE_MS = 1200
const INTERIM_EVERY = 3

export function LiveDemo() {
  const [running, setRunning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessions, setSessions] = useState<DemoSession[]>([])
  const [lanes, setLanes] = useState<Record<string, LaneState>>({})
  const runningRef = useRef(false)

  useEffect(() => () => void (runningRef.current = false), [])

  async function runLane(session: DemoSession, offset: number) {
    const script = DEMO_SCRIPTS[session.sourceLang]
    const startedAt = Date.parse(session.startedAt)
    let seq = session.nextSeq
    let index = offset % script.length

    await wait(offset * 1500)
    while (runningRef.current) {
      const sentence = script[index]
      const words = sentence.split(' ')
      const tStart = Math.max(0, Date.now() - startedAt)
      for (let i = 1; i <= words.length && runningRef.current; i++) {
        if (i % INTERIM_EVERY === 0 || i === words.length) {
          void pushInterimAction(session.id, {
            type: 'interim',
            lang: session.sourceLang,
            text: words.slice(0, i).join(' '),
            tStartMs: tStart,
          })
        }
        await wait(WORD_MS)
      }
      if (!runningRef.current) return

      const res = await pushSegmentAction({
        sessionId: session.id,
        seq: seq++,
        lang: session.sourceLang,
        text: sentence,
        tStartMs: tStart,
        tEndMs: Math.max(tStart, Date.now() - startedAt),
      }).catch(() => null)

      const translated = res?.ok ? res.data.translated.length > 0 : false
      setLanes((prev) => {
        const lane = prev[session.id] ?? { sent: 0, translated: 0, last: '' }
        return {
          ...prev,
          [session.id]: {
            sent: lane.sent + (res?.ok ? 1 : 0),
            translated: lane.translated + (translated ? 1 : 0),
            last: sentence,
          },
        }
      })

      index = (index + 1) % script.length
      await wait(PAUSE_MS)
    }
  }

  async function start() {
    setError(null)
    setBusy(true)
    const res = await startAllDemoAction().catch(() => null)
    setBusy(false)
    if (!res?.ok) {
      setError(t.demo.error)
      return
    }
    setSessions(res.data)
    setLanes({})
    runningRef.current = true
    setRunning(true)
    res.data.forEach((session, i) => void runLane(session, i * 3))
  }

  function stop() {
    runningRef.current = false
    setRunning(false)
  }

  const noTranslation =
    running && Object.values(lanes).some((l) => l.sent >= 2) && Object.values(lanes).every((l) => l.translated === 0)

  return (
    <section aria-labelledby="demo-heading" className="flex flex-col gap-4 rounded-lg bg-card p-4 ring-1 ring-border">
      <div className="flex flex-col gap-1">
        <h2 id="demo-heading" className="font-display text-sm font-semibold">
          {t.demo.title}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{t.demo.hint}</p>
      </div>

      {running ? (
        <button
          type="button"
          onClick={stop}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-secondary px-4 font-display font-semibold ring-1 ring-border hover:bg-secondary/80 focus-visible:outline-2 focus-visible:outline-ring sm:self-start"
        >
          <Square className="size-4" aria-hidden="true" />
          {t.demo.stop}
        </button>
      ) : (
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-primary px-4 font-display font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:self-start"
        >
          <Play className="size-5" aria-hidden="true" />
          {busy ? t.demo.starting : t.demo.start}
        </button>
      )}

      <div aria-live="polite" className="flex flex-col gap-1 text-sm">
        {running && <p className="text-muted-foreground">{t.demo.keepOpen}</p>}
        {noTranslation && (
          <p role="alert" className="leading-relaxed text-destructive">
            {t.demo.noTranslation}
          </p>
        )}
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
      </div>

      {sessions.length > 0 && (
        <ul className="flex flex-col divide-y divide-border rounded-md ring-1 ring-border">
          {sessions.map((s) => {
            const lane = lanes[s.id]
            return (
              <li key={s.id} className="flex flex-col gap-1 p-3">
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href={`/s/${s.slug}?lang=${s.sourceLang === 'es' ? 'en' : 'es'}`}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 truncate text-sm font-medium underline-offset-4 hover:underline"
                  >
                    {s.title}
                  </Link>
                  <span
                    className={cn(
                      'shrink-0 font-display text-xs tabular-nums',
                      lane && lane.translated > 0 ? 'text-line-d' : 'text-muted-foreground',
                    )}
                  >
                    {lane ? `${lane.translated}/${lane.sent} ${t.demo.translatedShort}` : t.demo.waiting}
                  </span>
                </div>
                {lane?.last && <p className="truncate text-xs text-muted-foreground">{lane.last}</p>}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
