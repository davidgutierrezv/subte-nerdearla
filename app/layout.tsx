import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Atkinson_Hyperlegible, Space_Grotesk } from 'next/font/google'
import './globals.css'

const _atkinson = Atkinson_Hyperlegible({ subsets: ['latin'], weight: ['400', '700'] })
const _spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600', '700'] })

export const metadata: Metadata = {
  title: 'Subte — Cada charla, en tu idioma, en vivo',
  description:
    'Subtítulos en vivo y traducción inglés ↔ español para cada sala de Nerdearla, desde tu celular.',
  generator: 'v0.app',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    title: 'Subte',
    description: 'Cada charla, en tu idioma, en vivo.',
    images: ['/brand/subte-logo.png'],
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0b0b0d',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="dark bg-background">
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
