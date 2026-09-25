import { Contrast, Maximize, Minimize, Minus, Plus } from 'lucide-react'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export const FONT_STEPS = ['text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl'] as const
const USER_MAX_STEP = 3

type Props = {
  fontStep: number
  onFontStep: (step: number) => void
  highContrast: boolean
  onHighContrast: (value: boolean) => void
  roomMode: boolean
  onRoomMode: () => void
  className?: string
}

const buttonClass =
  'flex size-11 items-center justify-center rounded-md text-foreground transition-colors hover:bg-secondary disabled:opacity-40 aria-pressed:bg-secondary aria-pressed:text-primary focus-visible:outline-2 focus-visible:outline-ring'

export function ViewerToolbar({ fontStep, onFontStep, highContrast, onHighContrast, roomMode, onRoomMode, className }: Props) {
  return (
    <footer className={cn('border-t border-border transition-opacity', className)}>
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-2 py-1 md:px-6">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={t.viewer.fontSmaller}
            title={t.viewer.fontSmaller}
            disabled={fontStep === 0}
            onClick={() => onFontStep(Math.max(0, fontStep - 1))}
            className={buttonClass}
          >
            <Minus className="size-5" aria-hidden="true" />
          </button>
          <span aria-hidden="true" className="w-6 text-center font-display text-sm font-semibold">
            Aa
          </span>
          <button
            type="button"
            aria-label={t.viewer.fontLarger}
            title={t.viewer.fontLarger}
            disabled={fontStep === USER_MAX_STEP}
            onClick={() => onFontStep(Math.min(USER_MAX_STEP, fontStep + 1))}
            className={buttonClass}
          >
            <Plus className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={t.viewer.contrast}
            title={t.viewer.contrast}
            aria-pressed={highContrast}
            onClick={() => onHighContrast(!highContrast)}
            className={buttonClass}
          >
            <Contrast className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={roomMode ? t.viewer.exitRoomMode : t.viewer.roomMode}
            title={roomMode ? t.viewer.exitRoomMode : t.viewer.roomMode}
            aria-pressed={roomMode}
            onClick={onRoomMode}
            className={buttonClass}
          >
            {roomMode ? (
              <Minimize className="size-5" aria-hidden="true" />
            ) : (
              <Maximize className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </footer>
  )
}
