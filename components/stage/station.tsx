'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Check, Copy, ExternalLink, Mic, Pause, Play, Radio, Sparkles, Square, Trash2 } from 'lucide-react'
import {
  endSessionAction,
  generateRecapAction,
  pushInterimAction, pushSegmentAction, resetSessionAction, startSessionAction } from '@/app/stage/actions'
import { t } from '@/lib/i18n'
import { formatClock } from '@/lib/live/shared'
import type { SessionRow, SessionStatus } from '@/lib/schemas'
import { DEMO_SCRIPTS } from '@/lib/stage/demo-scripts'
import { getSpeechRecognizer, SPEECH_LOCALE, type SpeechRecognizer } from '@/lib/stage/speech'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/agenda/status-badge'

type Source = 'sim' | 'mic'
type SentLine = { seq: number; text: string; state: 'sending' | 'ok' | 'untranslated' | 'error'; ms?: number }

type Props = {
  session: SessionRow
  initialNextSeq: number
}

const INTERIM_INTERVAL_MS = 600
const SIM_WORD_MS = 260
const SIM_PAUSE_MS = 900
const MAX_ATTEMPTS = 3

const noopSubscribe = () => () => {}

export function Station({ session, initialNextSeq }: Props) {
  const [status, setStatus] = useState<SessionStatus>(session.status)
  const [startedAt, setStartedAt] = useState<number | null>(
    session.started_at ? Date.parse(session.started_at) : null,
  )
  const [source, setSource] = useState<Source>('sim')
  const [running, setRunning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<SentLine[]>([])
  const [stats, setStats] = useState({ ok: 0, failed: 0, lastMs: null as number | null })
  const [now, setNow] = useState(() => Date.now())
  const [copied, setCopied] = useState(false)

  const micSupported = useSyncExternalStore(noopSubscribe, () => getSpeechRecognizer() !== null, () => true)

  const seqRef = useRef(initialNextSeq)
  const startedAtRef = useRef(startedAt)
  const runningRef = useRef(false)
  const recognizerRef = useRef<SpeechRecognizer | null>(null)
  const lastInterimRef = useRef(0)
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null)

  const viewerPath = `/s/${session.slug}?lang=${session.target_langs.find((l) => l !== session.source_lang) ?? session.source_lang}`

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [running])

  useEffect(() => () => stopAll(), [])

  function clock() {
    return startedAtRef.current ? Math.max(0, Date.now() - startedAtRef.current) : 0
  }

  function sendInterim(text: string, tStartMs: number, force = false) {
    const nowMs = Date.now()
    if (!force && nowMs - lastInterimRef.current < INTERIM_INTERVAL_MS) return
    lastInterimRef.current = nowMs
    void pushInterimAction(session.id, { type: 'interim', lang: session.source_lang, text, tStartMs })
  }

  async function sendFinal(text: string, tStartMs: number, tEndMs: number) {
    const clean = text.trim()
    if (!clean) return
    const seq = seqRef.current++
    setSent((prev) => [{ seq, text: clean, state: 'sending' as const }, ...prev].slice(0, 8))

    const t0 = performance.now()
    let ok = false
    let translated = false
    for (let attempt = 0; attempt < MAX_ATTEMPTS && !ok; attempt++) {
      try {
        const res = await pushSegmentAction({
          sessionId: session.id,
          seq,
          lang: session.source_lang,
          text: clean,
          tStartMs,
          tEndMs: Math.max(tEndMs, tStartMs),
        })
        ok = res.ok
        translated = res.ok && res.data.translated.length > 0
      } catch {
        ok = false
      }
      if (!ok) await wait(500 * (attempt + 1))
    }
    const ms = Math.round(performance.now() - t0)
    const state: SentLine['state'] = !ok ? 'error' : translated ? 'ok' : 'untranslated'

    setSent((prev) => prev.map((l) => (l.seq === seq ? { ...l, state, ms } : l)))
    setStats((s) => (ok ? { ...s, ok: s.ok + 1, lastMs: ms } : { ...s, failed: s.failed + 1 }))
  }

  async function runSimulation() {
    const script = DEMO_SCRIPTS[session.source_lang]
    for (const sentence of script) {
      const words = sentence.split(' ')
      const tStart = clock()
      for (let i = 1; i <= words.length; i++) {
        if (!runningRef.current) return
        sendInterim(words.slice(0, i).join(' '), tStart)
        await wait(SIM_WORD_MS)
      }
      if (!runningRef.current) return
      void sendFinal(sentence, tStart, clock())
      await wait(SIM_PAUSE_MS)
    }
    if (runningRef.current) {
      stopAll()
      setNotice(t.stage.simDone)
    }
  }

  function startMic() {
    const Recognizer = getSpeechRecognizer()
    if (!Recognizer) {
      setError(t.stage.micUnsupported)
      stopAll()
      return
    }
    const rec = new Recognizer()
    rec.lang = SPEECH_LOCALE[session.source_lang]
    rec.continuous = true
    rec.interimResults = true

    let segmentStart: number | null = null
    rec.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        segmentStart ??= clock()
        if (result.isFinal) {
          void sendFinal(result[0].transcript, segmentStart, clock())
          segmentStart = null
        } else {
          interim += result[0].transcript
        }
      }
      if (interim && segmentStart !== null) sendInterim(interim.trim(), segmentStart)
    }
    rec.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError(t.stage.micDenied)
        stopAll()
      }
    }
    // Browsers end recognition after silence; restart while broadcasting.
    rec.onend = () => {
      if (runningRef.current && recognizerRef.current === rec) {
        try {
          rec.start()
        } catch {}
      }
    }
    recognizerRef.current = rec
    rec.start()
  }

  function stopAll() {
    runningRef.current = false
    setRunning(false)
    const rec = recognizerRef.current
    recognizerRef.current = null
    rec?.abort()
    void wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
  }

  async function handleStart() {
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      if (status !== 'live') {
        const res = await startSessionAction(session.id)
        if (!res.ok) throw new Error(res.error.message)
        const ts = Date.parse(res.data.startedAt)
        startedAtRef.current = ts
        setStartedAt(ts)
        setStatus('live')
      }
      startedAtRef.current ??= Date.now()

      const nav = navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } }
      wakeLockRef.current = (await nav.wakeLock?.request('screen').catch(() => null)) ?? null

      runningRef.current = true
      setRunning(true)
      if (source === 'sim') void runSimulation()
      else startMic()
    } catch {
      setError(t.stage.unexpected)
    } finally {
      setBusy(false)
    }
  }

  async function handleFinish() {
    if (!window.confirm(t.stage.finishConfirm)) return
    stopAll()
    setBusy(true)
    const res = await endSessionAction(session.id).catch(() => null)
    setBusy(false)
    if (res?.ok) setStatus('ended')
    else setError(t.stage.unexpected)
  }

  async function handleRecap() {
    setBusy(true)
    setError(null)
    setNotice(null)
    const res = await generateRecapAction(session.id).catch(() => null)
    setBusy(false)
    if (res?.ok) setNotice(t.stage.recapDone)
    else setError(t.stage.recapFailed)
  }

  async function handleReset() {
    if (!window.confirm(t.stage.resetConfirm)) return
    stopAll()
    setBusy(true)
    const res = await resetSessionAction(session.id).catch(() => null)
    setBusy(false)
    if (!res?.ok) {
      setError(t.stage.unexpected)
      return
    }
    seqRef.current = 0
    startedAtRef.current = null
    setStartedAt(null)
    setStatus('scheduled')
    setSent([])
    setStats({ ok: 0, failed: 0, lastMs: null })
    setNotice(null)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(new URL(viewerPath, window.location.origin).toString())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const elapsed = startedAt ? (running ? now : Date.now()) - startedAt : 0

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-lg bg-card p-4 ring-1 ring-border">
        <div className="flex items-center justify-between gap-3">
          <StatusBadge status={status} />
          <p className="font-display text-sm tabular-nums text-muted-foreground">
            <span className="sr-only">{t.stage.clock}: </span>
            {formatClock(status === 'scheduled' ? 0 : elapsed)}
          </p>
        </div>

        <fieldset disabled={running || busy} className="flex flex-col gap-2">
          <legend className="mb-2 font-display text-xs uppercase tracking-widest text-muted-foreground">
            {t.stage.source}
          </legend>
          <div className="grid grid-cols-2 gap-2">
            <SourceOption
              active={source === 'sim'}
              onSelect={() => setSource('sim')}
              icon={<Radio className="size-4" aria-hidden="true" />}
              label={t.stage.sim}
            />
            <SourceOption
              active={source === 'mic'}
              onSelect={() => setSource('mic')}
              icon={<Mic className="size-4" aria-hidden="true" />}
              label={t.stage.mic}
            />
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {source === 'sim' ? t.stage.simHint : micSupported ? t.stage.micHint : t.stage.micUnsupported}
          </p>
        </fieldset>

        <div className="flex flex-col gap-2 sm:flex-row">
          {running ? (
            <button
              type="button"
              onClick={stopAll}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md bg-secondary px-4 font-display font-semibold text-foreground ring-1 ring-border hover:bg-secondary/80 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Pause className="size-5" aria-hidden="true" />
              {t.stage.pause}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStart}
              disabled={busy || (source === 'mic' && !micSupported)}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 font-display font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Play className="size-5" aria-hidden="true" />
              {t.stage.start}
            </button>
          )}
          <button
            type="button"
            onClick={handleFinish}
            disabled={busy || status !== 'live'}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-4 font-display text-sm font-semibold text-foreground ring-1 ring-border hover:bg-secondary disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Square className="size-4" aria-hidden="true" />
            {t.stage.finish}
          </button>
        </div>

        {status === 'ended' && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleRecap}
              disabled={busy}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-primary px-4 font-display font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Sparkles className="size-5" aria-hidden="true" />
              {busy ? t.stage.recapWorking : t.stage.recap}
            </button>
            <p className="text-sm leading-relaxed text-muted-foreground">{t.stage.recapHint}</p>
          </div>
        )}

        <div aria-live="polite" className="flex flex-col gap-1 text-sm">
          {running && (
            <p className="flex items-center gap-2 text-foreground">
              <span aria-hidden="true" className="size-2 rounded-full bg-live animate-live-pulse" />
              {t.stage.listening} <span className="text-muted-foreground">{t.stage.keepAwake}</span>
            </p>
          )}
          {notice && <p className="text-muted-foreground">{notice}</p>}
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-lg bg-card p-4 ring-1 ring-border">
        <div className="flex flex-wrap gap-2">
          <Link
            href={viewerPath}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-secondary px-3 text-sm font-medium hover:bg-secondary/80 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            {t.stage.openViewer}
          </Link>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium ring-1 ring-border hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring"
          >
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied ? t.stage.copied : t.stage.copyLink}
          </button>
        </div>

        <dl className="grid grid-cols-3 gap-2">
          <Stat label={t.stage.sent} value={String(stats.ok)} />
          <Stat label={t.stage.failed} value={String(stats.failed)} danger={stats.failed > 0} />
          <Stat label={t.stage.latency} value={stats.lastMs === null ? '—' : `${(stats.lastMs / 1000).toFixed(1)} s`} />
        </dl>
      </section>

      <section aria-labelledby="recent-heading" className="flex flex-col gap-3">
        <h2 id="recent-heading" className="font-display text-xs uppercase tracking-widest text-muted-foreground">
          {t.stage.recent}
        </h2>
        {sent.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.stage.noneYet}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-lg bg-card ring-1 ring-border">
            {sent.map((line) => (
              <li key={line.seq} className="flex items-start gap-3 p-3">
                <span className="w-6 shrink-0 pt-0.5 font-display text-xs tabular-nums text-muted-foreground">
                  {line.seq}
                </span>
                <p className="min-w-0 flex-1 text-sm leading-relaxed">{line.text}</p>
                <span
                  className={cn(
                    'shrink-0 pt-0.5 font-display text-xs',
                    line.state === 'ok' && 'text-line-d',
                    line.state === 'sending' && 'text-muted-foreground',
                    line.state === 'untranslated' && 'text-line-a',
                    line.state === 'error' && 'text-destructive',
                  )}
                >
                  {line.state === 'ok'
                    ? `${t.stage.translated} ${((line.ms ?? 0) / 1000).toFixed(1)}s`
                    : line.state === 'untranslated'
                      ? t.stage.untranslated
                      : line.state === 'sending'
                      ? t.stage.pending
                      : t.stage.error}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        type="button"
        onClick={handleReset}
        disabled={busy || running}
        className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-md px-3 text-sm text-destructive ring-1 ring-destructive/40 hover:bg-destructive/10 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        {t.stage.reset}
      </button>
    </div>
  )
}

function SourceOption({
  active,
  onSelect,
  icon,
  label,
}: {
  active: boolean
  onSelect: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 font-display text-sm font-semibold ring-1 transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-ring',
        active ? 'bg-foreground text-background ring-foreground' : 'text-foreground ring-border hover:bg-secondary',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex flex-col gap-1 rounded-md bg-secondary p-3">
      <dt className="font-display text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={cn('font-display text-lg font-semibold tabular-nums', danger && 'text-destructive')}>{value}</dd>
    </div>
  )
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
