import { cn } from '@/lib/utils'

export const inputClass =
  'min-h-11 w-full rounded-md bg-background px-3 text-base text-foreground ring-1 ring-input placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:ring-destructive md:text-sm'

export function Field({
  id,
  label,
  hint,
  errors,
  children,
}: {
  id: string
  label: string
  hint?: string
  errors?: string[]
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !errors?.length && (
        <p id={`${id}-hint`} className="text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      )}
      {errors?.length ? (
        <p id={`${id}-error`} className="text-xs leading-relaxed text-destructive">
          {errors[0]}
        </p>
      ) : null}
    </div>
  )
}

export function FormMessage({ ok, message }: { ok: boolean; message: string }) {
  if (!message) return null
  return (
    <p
      role={ok ? 'status' : 'alert'}
      className={cn('text-sm leading-relaxed', ok ? 'text-primary' : 'text-destructive')}
    >
      {message}
    </p>
  )
}

export function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
    >
      {children}
    </button>
  )
}
