import Link from 'next/link'
import { Upload } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { SongsLibrary } from '@/components/songs/songs-library'

export default function SongsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="animate-fade-up">
            <p className="font-mono text-xs uppercase tracking-[0.4em] text-primary text-glow-phosphor">
              Library
            </p>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              MY SONGS
            </h1>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 self-start rounded-md bg-primary px-5 py-3 font-display text-sm font-semibold tracking-[0.15em] text-primary-foreground transition-all hover:box-glow-phosphor active:translate-y-px sm:self-auto"
          >
            <Upload className="h-4 w-4" />
            IMPORT SONG
          </Link>
        </div>

        <div className="mt-8 animate-fade-up" style={{ animationDelay: '80ms' }}>
          <SongsLibrary />
        </div>
      </div>
    </AppShell>
  )
}
