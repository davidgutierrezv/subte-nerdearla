'use client'

import { useActionState } from 'react'
import { loginAction, type FormState } from '@/app/admin/actions'
import { t } from '@/lib/i18n'
import { Field, FormMessage, SubmitButton, inputClass } from './field'

const initial: FormState = { ok: false, message: '' }

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial)

  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg bg-card p-5 ring-1 ring-border">
      <Field id="key" label={t.admin.keyLabel}>
        <input
          id="key"
          name="key"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </Field>
      <FormMessage ok={state.ok} message={state.message} />
      <SubmitButton pending={pending}>{t.admin.enter}</SubmitButton>
    </form>
  )
}
