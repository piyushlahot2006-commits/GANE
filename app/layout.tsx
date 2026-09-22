import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Orbitron, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import { AudioProvider } from '@/components/audio-provider'
import './globals.css'

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  weight: ['400', '500', '600', '700', '800', '900'],
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  weight: ['300', '400', '500', '600', '700'],
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'GANE — Turn Sound Into Practice',
  description:
    'GANE is an AI-powered music notation and practice workstation. Upload a song, turn it into notation, and practice it with synchronized playback.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#100f14',
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${orbitron.variable} ${spaceGrotesk.variable} ${jetbrains.variable}`}
    >
      <body className="antialiased">
        <AudioProvider>{children}</AudioProvider>
        {/* Global CRT scanline + flicker overlay */}
        <div
          aria-hidden
          className="crt-scanlines animate-crt-flicker pointer-events-none fixed inset-0 z-[100] mix-blend-soft-light"
        />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
