'use server'

import { revalidatePath } from 'next/cache'
import { t } from '@/lib/i18n'
import { logEvent } from '@/lib/log'
import {
  endOperatorSession,
  hasOperatorSession,
  isOperatorConfigured,
  isValidOperatorKey,
  startOperatorSession,
} from '@/lib/operator'
import { SessionInSchema, StageInSchema } from '@/lib/schemas'
import { createAdminClient } from '@/lib/supabase/admin'

export type FormState = {
  ok: boolean
  message: string
  fieldErrors?: Record<string, string[] | undefined>
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isOperatorConfigured()) return { ok: false, message: t.admin.notConfigured }
  const key = String(formData.get('key') ?? '')
  if (!isValidOperatorKey(key)) {
    await logEvent('admin', 'warn', 'invalid operator key attempt')
    return { ok: false, message: t.admin.invalidKey }
  }
  await startOperatorSession()
  revalidatePath('/admin')
  return { ok: true, message: '' }
}

export async function logoutAction() {
  await endOperatorSession()
  revalidatePath('/admin')
}

export async function createStageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await hasOperatorSession())) return { ok: false, message: t.admin.unauthorized }

  const parsed = StageInSchema.safeParse({ name: formData.get('name') })
  if (!parsed.success) {
    return {
      ok: false,
      message: t.admin.invalidInput,
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const { error } = await createAdminClient().from('stages').insert({ name: parsed.data.name })
  if (error) {
    await logEvent('admin', 'error', 'create stage failed', { code: error.code, message: error.message })
    return { ok: false, message: t.admin.unexpected }
  }

  revalidatePath('/')
  revalidatePath('/admin')
  return { ok: true, message: t.admin.stageCreated }
}

function parseGlossary(raw: FormDataEntryValue | null) {
  return Array.from(
    new Set(
      String(raw ?? '')
        .split(',')
        .map((term) => term.trim())
        .filter(Boolean),
    ),
  )
}

export async function createSessionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await hasOperatorSession())) return { ok: false, message: t.admin.unauthorized }

  const speaker = String(formData.get('speaker') ?? '').trim()
  const parsed = SessionInSchema.safeParse({
    stageId: formData.get('stageId'),
    slug: String(formData.get('slug') ?? '').trim().toLowerCase(),
    title: formData.get('title'),
    speaker: speaker || undefined,
    sourceLang: formData.get('sourceLang'),
    glossary: parseGlossary(formData.get('glossary')),
  })
  if (!parsed.success) {
    return {
      ok: false,
      message: t.admin.invalidInput,
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const s = parsed.data
  const { error } = await createAdminClient()
    .from('sessions')
    .insert({
      stage_id: s.stageId,
      slug: s.slug,
      title: s.title,
      speaker: s.speaker ?? null,
      source_lang: s.sourceLang,
      target_langs: ['es', 'en'],
      glossary: s.glossary,
    })

  if (error) {
    if (error.code === '23505') {
      return { ok: false, message: t.admin.slugTaken, fieldErrors: { slug: [t.admin.slugTaken] } }
    }
    await logEvent('admin', 'error', 'create session failed', { code: error.code, message: error.message })
    return { ok: false, message: t.admin.unexpected }
  }

  revalidatePath('/')
  revalidatePath('/admin')
  return { ok: true, message: t.admin.sessionCreated }
}
