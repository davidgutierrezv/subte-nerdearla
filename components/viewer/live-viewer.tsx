'use client'

import { useEffect, useEffectEvent, useRef, useState } from 'react'
import useSWR from 'swr'
import { ArrowDown, Search, X } from 'lucide-react'
import { t } from '@/lib/i18n'
import { lineFor } from '@/lib/lines'
import { buildMarkdown, downloadText } from '@/lib/live/export'
import { LIVE_EVENT, liveTopic, type Recap, type TranscriptSnapshot, upsertLine } from '@/lib/live/shared'
import { type Lang, LiveEventSchema, type SessionRow } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { CaptionRail } from './caption-rail'
import { RecapPanel } from './recap-panel'
import { ViewerHeader } from './viewer-header'
import { ViewerToolbar, FONT_STEPS } from './viewer-toolbar'

type Props = {
  session: SessionRow
  stageName: string | null
  lineIndex: number
  initialLang: Lang
  initial: TranscriptSnapshot
  initialRecap: Recap
}

type View = 'recap' | 'transcript'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Request to ${url} failed with ${res.status}`)
  return res.json()
}

export function LiveViewer({ session, stageName, lineIndex, initialLang, initial, initialRecap }: Props) {
  const line = lineFor(lineIndex)
  const langs = Array.from(new Set<Lang>([session.source_lang, ...session.target_langs]))

  const { data = initial, mutate } = useSWR(`/api/sessions/${session.slug}/transcript`, fetchJson<TranscriptSnapshot>, {
    fallbackData: initial,
    revalidateOnFocus: true,
  })

  const ended = data.status === 'ended'
  const { data: recap = initialRecap, mutate: mutateRecap } = useSWR(
    `/api/sessions/${session.slug}/recap`,
    fetchJson<Recap>,
    {
      fallbackData: initialRecap,
      revalidateOnMount: false,
      // Poll only while waiting for the recap of a finished talk; the `insight` event usually arrives first.
      refreshInterval: (latest) => (ended && Object.keys(latest ?? {}).length === 0 ? 5000 : 0),
    },
  )

  const [view, setView] = useState<View>(ended ? 'recap' : 'transcript')
  const [query, setQuery] = useState('')
  const [focusSeq, setFocusSeq] = useState<number | null>(null)
  const [lang, setLang] = useState<Lang>(initialLang)
  const [interim, setInterim] = useState('')
  const [connected, setConnected] = useState(false)
  const [fontStep, setFontStep] = useState(1)
  const [highContrast, setHighContrast] = useState(false)
  const [roomMode, setRoomMode] = useState(false)
  const [pinned, setPinned] = useState(true)

  const rootRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const earlyTranslations = useRef(new Map<number, Partial<Record<Lang, string>>>())

  const onLiveEvent = useEffectEvent((raw: unknown) => {
    const parsed = LiveEventSchema.safeParse(raw)
    if (!parsed.success) return
    const event = parsed.data

    switch (event.type) {
      case 'segment': {
        const early = earlyTranslations.current.get(event.seq) ?? {}
        earlyTranslations.current.delete(event.seq)
        setInterim('')
        mutate(
          (cur = initial) => ({
            ...cur,
            status: 'live',
            lines: upsertLine(cur.lines, {
              id: event.id,
              seq: event.seq,
              lang: event.lang,
              text: event.text,
              tStartMs: event.tStartMs,
              tEndMs: event.tEndMs,
              translations: early,
            }),
          }),
          { revalidate: false },
        )
        break
      }
      case 'translation': {
        const current = data.lines.find((l) => l.seq === event.seq)
        if (!current) {
          const early = earlyTranslations.current.get(event.seq) ?? {}
          earlyTranslations.current.set(event.seq, { ...early, [event.lang]: event.text })
          break
        }
        mutate(
          (cur = initial) => ({
            ...cur,
            lines: cur.lines.map((l) =>
              l.seq === event.seq ? { ...l, translations: { ...l.translations, [event.lang]: event.text } } : l,
            ),
          }),
          { revalidate: false },
        )
        break
      }
      case 'interim':
        setInterim(event.text)
        break
      case 'status':
        if (event.status === 'ended') {
          setInterim('')
          setView('recap')
        } else {
          setView('transcript')
        }
        mutate((cur = initial) => ({ ...cur, status: event.status === 'ended' ? 'ended' : 'live' }), {
          revalidate: false,
        })
        break
      case 'insight':
        mutateRecap()
        break
      case 'reset':
        setInterim('')
        setView('transcript')
        setQuery('')
        setFocusSeq(null)
        earlyTranslations.current.clear()
        mutate({ status: 'scheduled', lines: [] }, { revalidate: false })
        mutateRecap({}, { revalidate: false })
        break
    }
  })

  const onSubscribed = useEffectEvent(() => {
    setConnected(true)
    // Refill anything missed while the socket was down.
    mutate()
  })

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(liveTopic(session.id))
      .on('broadcast', { event: LIVE_EVENT }, ({ payload }: { payload: unknown }) => onLiveEvent(payload))
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') onSubscribed()
        else setConnected(false)
      })
    return () => {
      supabase.removeChannel(channel)
    }
  }, [session.id])

  useEffect(() => {
    const onChange = () => setRoomMode(document.fullscreenElement === rootRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const lastLine = data.lines.at(-1)
  const lastTranslation = lastLine?.translations[lang]
  useEffect(() => {
    const el = scrollRef.current
    if (el && pinned && view === 'transcript' && !query) el.scrollTo({ top: el.scrollHeight })
  }, [pinned, view, query, lastLine?.seq, lastTranslation, interim, lang, fontStep, roomMode])

  useEffect(() => {
    if (focusSeq === null || view !== 'transcript') return
    document.getElementById(`seg-${focusSeq}`)?.scrollIntoView({ block: 'start' })
  }, [focusSeq, view])

  useEffect(() => {
    if (view === 'recap') scrollRef.current?.scrollTo({ top: 0 })
  }, [view])

  function jumpTo(tStartMs: number) {
    const target = data.lines.find((l) => l.tStartMs >= tStartMs) ?? data.lines.at(-1)
    if (!target) return
    setQuery('')
    setPinned(false)
    setFocusSeq(target.seq)
    setView('transcript')
  }

  const needle = query.trim().toLowerCase()
  const visibleLines = needle
    ? data.lines.filter((l) =>
        [l.text, l.translations[lang] ?? ''].some((text) => text.toLowerCase().includes(needle)),
      )
    : data.lines

  const currentRecap = recap[lang] ?? recap[session.source_lang] ?? Object.values(recap)[0]

  function downloadRecap() {
    downloadText(`${session.slug}-${lang}.md`, buildMarkdown(session, lang, currentRecap, data.lines))
  }

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    setPinned(el.scrollHeight - el.scrollTop - el.clientHeight < 64)
  }

  function backToLive() {
    const el = scrollRef.current
    el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    setPinned(true)
  }

  function changeLang(next: Lang) {
    setLang(next)
    const url = new URL(window.location.href)
    url.searchParams.set('lang', next)
    window.history.replaceState(null, '', url)
  }

  async function toggleRoomMode() {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await rootRef.current?.requestFullscreen?.().catch(() => setRoomMode((v) => !v))
  }

  const effectiveStep = Math.min(FONT_STEPS.length - 1, fontStep + (roomMode ? 2 : 0))
  const showInterim = lang === session.source_lang && interim.length > 0 && data.status !== 'ended'

  return (
    <div ref={rootRef} className="flex h-dvh flex-col bg-background">
      {!roomMode && (
        <ViewerHeader
          session={session}
          stageName={stageName}
          line={line}
          status={data.status}
          langs={langs}
          lang={lang}
          onLangChange={changeLang}
          connected={connected}
        />
      )}

      <main className="relative flex min-h-0 flex-1 flex-col">
        {ended && !roomMode && data.lines.length > 0 && (
          <div className="border-b border-border px-4 py-3 md:px-8">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
              <div role="tablist" aria-label={t.viewer.views} className="flex gap-1 rounded-full bg-secondary p-1">
                {(['recap', 'transcript'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="tab"
                    aria-selected={view === v}
                    onClick={() => setView(v)}
                    className={cn(
                      'min-h-10 flex-1 rounded-full font-display text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      view === v ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {v === 'recap' ? t.viewer.recapTab : t.viewer.transcriptTab}
                  </button>
                ))}
              </div>

              {view === 'transcript' && (
                <div className="flex flex-col gap-1">
                  <label htmlFor="transcript-search" className="sr-only">
                    {t.viewer.search}
                  </label>
                  <div className="flex items-center gap-2 rounded-full border border-input bg-background px-4 focus-within:outline-2 focus-within:outline-ring">
                    <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <input
                      id="transcript-search"
                      type="text"
                      role="searchbox"
                      enterKeyHint="search"
                      autoComplete="off"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value)
                        setFocusSeq(null)
                      }}
                      placeholder={t.viewer.searchPlaceholder}
                      className="min-h-11 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery('')}
                        className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-4" aria-hidden="true" />
                        <span className="sr-only">{t.viewer.clearSearch}</span>
                      </button>
                    )}
                  </div>
                  {needle && (
                    <p className="px-4 text-sm text-muted-foreground" aria-live="polite">
                      {visibleLines.length === 0
                        ? t.viewer.noResults
                        : `${visibleLines.length} ${visibleLines.length === 1 ? t.viewer.result : t.viewer.results}`}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overscroll-contain px-4 py-6 md:px-8"
        >
          <div
            className={cn(
              'mx-auto flex min-h-full w-full max-w-3xl flex-col',
              view === 'transcript' && !needle && 'justify-end',
            )}
          >
            {data.lines.length === 0 && !showInterim ? (
              <EmptyState status={data.status} />
            ) : ended && view === 'recap' ? (
              <RecapPanel recap={currentRecap} lang={lang} line={line} onJump={jumpTo} onDownload={downloadRecap} />
            ) : (
              <CaptionRail
                lines={roomMode ? visibleLines.slice(-4) : visibleLines}
                lang={lang}
                sourceLang={session.source_lang}
                interim={showInterim ? interim : ''}
                line={line}
                fontClass={FONT_STEPS[effectiveStep]}
                highContrast={highContrast}
                ended={ended}
                query={needle}
                focusSeq={focusSeq}
              />
            )}
          </div>
        </div>

        {!pinned && !ended && (
          <button
            type="button"
            onClick={backToLive}
            className="absolute bottom-4 left-1/2 inline-flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-5 font-display text-sm font-semibold text-primary-foreground shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ArrowDown className="size-4" aria-hidden="true" />
            {t.viewer.backToLive}
          </button>
        )}
      </main>

      <ViewerToolbar
        fontStep={fontStep}
        onFontStep={setFontStep}
        highContrast={highContrast}
        onHighContrast={setHighContrast}
        roomMode={roomMode}
        onRoomMode={toggleRoomMode}
        className={cn(roomMode && 'opacity-60 hover:opacity-100 focus-within:opacity-100')}
      />
    </div>
  )
}

function EmptyState({ status }: { status: TranscriptSnapshot['status'] }) {
  const title = status === 'ended' ? t.viewer.endedTitle : t.viewer.waitingTitle
  const body =
    status === 'ended'
      ? t.viewer.endedEmpty
      : status === 'live'
        ? t.viewer.waitingLive
        : t.viewer.waitingScheduled
  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-3 py-12">
      <p className="font-display text-2xl font-semibold text-balance">{title}</p>
      <p className="max-w-md text-base leading-relaxed text-muted-foreground text-pretty">{body}</p>
    </div>
  )
}
