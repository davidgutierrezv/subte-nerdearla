'use client'

import { useActionState } from 'react'
import { createSessionAction, type FormState } from '@/app/admin/actions'
import { t } from '@/lib/i18n'
import { LANGS, type StageRow } from '@/lib/schemas'
import { Field, FormMessage, SubmitButton, inputClass } from './field'

const initial: FormState = { ok: false, message: '' }

export function SessionForm({ stages }: { stages: StageRow[] }) {
  const [state, action, pending] = useActionState(createSessionAction, initial)
  const errors = state.fieldErrors ?? {}

  if (stages.length === 0) {
    return (
      <div className="rounded-lg bg-card p-5 ring-1 ring-border">
        <h2 className="text-lg font-semibold">{t.admin.newSession}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.admin.noStagesYet}</p>
      </div>
    )
  }

  return (
    <form
      key={state.ok ? state.message + Date.now() : 'session-form'}
      action={action}
      className="flex flex-col gap-4 rounded-lg bg-card p-5 ring-1 ring-border"
    >
      <h2 className="text-lg font-semibold">{t.admin.newSession}</h2>

      <Field id="session-stage" label={t.admin.stage} errors={errors.stageId}>
        <select id="session-stage" name="stageId" required className={inputClass}>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>

      <Field id="session-title" label={t.admin.sessionTitle} errors={errors.title}>
        <input
          id="session-title"
          name="title"
          required
          maxLength={200}
          aria-invalid={Boolean(errors.title?.length)}
          className={inputClass}
        />
      </Field>

      <Field id="session-slug" label={t.admin.slug} hint={t.admin.slugHint} errors={errors.slug}>
        <input
          id="session-slug"
          name="slug"
          required
          maxLength={80}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={Boolean(errors.slug?.length)}
          aria-describedby={errors.slug?.length ? 'session-slug-error' : 'session-slug-hint'}
          className={`${inputClass} font-mono`}
        />
      </Field>

      <Field id="session-speaker" label={t.admin.speaker} errors={errors.speaker}>
        <input id="session-speaker" name="speaker" maxLength={120} className={inputClass} />
      </Field>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">{t.admin.sourceLang}</legend>
        <div className="grid grid-cols-2 gap-1 rounded-md bg-secondary p-1">
          {LANGS.map((lang) => (
            <label
              key={lang}
              className="flex min-h-11 cursor-pointer items-center justify-center rounded-sm text-sm font-medium text-muted-foreground has-checked:bg-background has-checked:text-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring"
            >
              <input
                type="radio"
                name="sourceLang"
                value={lang}
                defaultChecked={lang === 'es'}
                className="sr-only"
              />
              {t.langName[lang]}
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        id="session-glossary"
        label={t.admin.glossary}
        hint={t.admin.glossaryHint}
        errors={errors.glossary}
      >
        <input
          id="session-glossary"
          name="glossary"
          placeholder="Supabase, Deepgram, Nerdearla"
          aria-describedby="session-glossary-hint"
          className={inputClass}
        />
      </Field>

      <FormMessage ok={state.ok} message={state.message} />
      <SubmitButton pending={pending}>{t.admin.createSession}</SubmitButton>
    </form>
  )
}
