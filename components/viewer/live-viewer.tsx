'use client'

import { useEffect, useEffectEvent, useRef, useState } from 'react'
import useSWR from 'swr'
import { ArrowDown } from 'lucide-react'
import { t } from '@/lib/i18n'
import { lineFor } from '@/lib/lines'
import { LIVE_EVENT, liveTopic, type TranscriptSnapshot, upsertLine } from '@/lib/live/shared'
import { type Lang, LiveEventSchema, type SessionRow } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { CaptionRail } from './caption-rail'
import { ViewerHeader } from './viewer-header'
import { ViewerToolbar, FONT_STEPS } from './viewer-toolbar'

type Props = {
  session: SessionRow
  stageName: string | null
  lineIndex: number
  initialLang: Lang
  initial: TranscriptSnapshot
}

const fetchSnapshot = async (url: string): Promise<TranscriptSnapshot> => {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Transcript request failed with ${res.status}`)
  return res.json()
}

export function LiveViewer({ session, stageName, lineIndex, initialLang, initial }: Props) {
  const line = lineFor(lineIndex)
  const langs = Array.from(new Set<Lang>([session.source_lang, ...session.target_langs]))

  const { data = initial, mutate } = useSWR(`/api/sessions/${session.slug}/transcript`, fetchSnapshot, {
    fallbackData: initial,
    revalidateOnFocus: true,
  })

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
        if (event.status === 'ended') setInterim('')
        mutate((cur = initial) => ({ ...cur, status: event.status === 'ended' ? 'ended' : 'live' }), {
          revalidate: false,
        })
        break
      case 'reset':
        setInterim('')
        earlyTranslations.current.clear()
        mutate({ status: 'scheduled', lines: [] }, { revalidate: false })
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
    if (el && pinned) el.scrollTo({ top: el.scrollHeight })
  }, [pinned, lastLine?.seq, lastTranslation, interim, lang, fontStep, roomMode])

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
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overscroll-contain px-4 py-6 md:px-8"
        >
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-end">
            {data.lines.length === 0 && !showInterim ? (
              <EmptyState status={data.status} />
            ) : (
              <CaptionRail
                lines={roomMode ? data.lines.slice(-4) : data.lines}
                lang={lang}
                sourceLang={session.source_lang}
                interim={showInterim ? interim : ''}
                line={line}
                fontClass={FONT_STEPS[effectiveStep]}
                highContrast={highContrast}
                ended={data.status === 'ended'}
              />
            )}
          </div>
        </div>

        {!pinned && (
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
