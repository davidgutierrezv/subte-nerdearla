import type { Metadata } from 'next'
import { getAgenda } from '@/lib/agenda'
import { t } from '@/lib/i18n'
import { hasOperatorSession, isOperatorConfigured } from '@/lib/operator'
import { SiteHeader } from '@/components/site-header'
import { LoginForm } from '@/components/admin/login-form'
import { StageForm } from '@/components/admin/stage-form'
import { SessionForm } from '@/components/admin/session-form'
import { SessionList } from '@/components/admin/session-list'
import { logoutAction } from './actions'

export const metadata: Metadata = {
  title: 'Administración — StageCaptions',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const authed = await hasOperatorSession()

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-16 pt-8 md:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold">{t.admin.title}</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">{t.admin.subtitle}</p>
          </div>
          {authed && (
            <form action={logoutAction}>
              <button
                type="submit"
                className="min-h-11 rounded-md px-3 text-sm text-muted-foreground ring-1 ring-border hover:text-foreground"
              >
                {t.admin.logout}
              </button>
            </form>
          )}
        </div>

        {authed ? <AdminDashboard /> : <LoginPanel />}
      </main>
    </div>
  )
}

function LoginPanel() {
  return (
    <div className="w-full max-w-sm">
      {isOperatorConfigured() ? (
        <LoginForm />
      ) : (
        <p role="alert" className="text-sm leading-relaxed text-destructive">
          {t.admin.notConfigured}
        </p>
      )}
    </div>
  )
}

async function AdminDashboard() {
  const stages = await getAgenda()

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <div className="flex flex-col gap-4">
        <SessionForm stages={stages.map(({ id, name }) => ({ id, name }))} />
        <StageForm />
      </div>
      <SessionList stages={stages} />
    </div>
  )
}
