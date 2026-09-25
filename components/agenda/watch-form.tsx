import { Captions } from 'lucide-react'
import type { Lang, SessionRow } from '@/lib/schemas'
import { t } from '@/lib/i18n'

// Plain GET form: works before hydration and produces /s/[slug]?lang=xx.
export function WatchForm({ session }: { session: SessionRow }) {
  const langs = Array.from(new Set<Lang>([session.source_lang, ...session.target_langs]))
  const defaultLang: Lang = langs.includes('es') ? 'es' : langs[0]

  return (
    <form action={`/s/${session.slug}`} method="get" className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-display text-xs uppercase tracking-wider text-muted-foreground">
          {t.agenda.readIn}
        </legend>
        <div className="grid grid-cols-2 gap-1 rounded-md bg-secondary p-1">
          {langs.map((lang) => (
            <label
              key={lang}
              className="relative flex min-h-11 cursor-pointer items-center justify-center rounded-sm text-sm font-medium text-muted-foreground transition-colors has-checked:bg-background has-checked:text-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring"
            >
              <input
                type="radio"
                name="lang"
                value={lang}
                defaultChecked={lang === defaultLang}
                className="sr-only"
              />
              {t.langName[lang]}
            </label>
          ))}
        </div>
      </fieldset>
      <button
        type="submit"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Captions className="size-4" aria-hidden="true" />
        {t.agenda.watch}
      </button>
    </form>
  )
}
