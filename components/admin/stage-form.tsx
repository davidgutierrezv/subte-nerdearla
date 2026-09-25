'use client'

import { useActionState } from 'react'
import { createStageAction, type FormState } from '@/app/admin/actions'
import { t } from '@/lib/i18n'
import { Field, FormMessage, SubmitButton, inputClass } from './field'

const initial: FormState = { ok: false, message: '' }

export function StageForm() {
  const [state, action, pending] = useActionState(createStageAction, initial)
  const nameErrors = state.fieldErrors?.name

  return (
    <form
      key={state.ok ? state.message + Date.now() : 'stage-form'}
      action={action}
      className="flex flex-col gap-4 rounded-lg bg-card p-5 ring-1 ring-border"
    >
      <h2 className="text-lg font-semibold">{t.admin.newStage}</h2>
      <Field id="stage-name" label={t.admin.stageName} errors={nameErrors}>
        <input
          id="stage-name"
          name="name"
          required
          maxLength={80}
          aria-invalid={Boolean(nameErrors?.length)}
          className={inputClass}
        />
      </Field>
      <FormMessage ok={state.ok} message={state.message} />
      <SubmitButton pending={pending}>{t.admin.createStage}</SubmitButton>
    </form>
  )
}
