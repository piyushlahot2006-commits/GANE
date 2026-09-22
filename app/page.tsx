import Link from 'next/link'
import { ChevronRight, Activity, Music4, Clock } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { UploadPanel } from '@/components/home/upload-panel'
import { AudioAnalysis } from '@/components/home/audio-analysis'
import { SongCard } from '@/components/song-card'
import { recentSessions, songs } from '@/lib/mock-data'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'GOOD MORNING'
  if (h < 18) return 'GOOD AFTERNOON'
  return 'GOOD EVENING'
}

const overview = [
  { label: 'Songs in library', value: songs.length.toString().padStart(2, '0'), icon: Music4 },
  { label: 'Notation ready', value: songs.filter((s) => s.status === 'ready').length.toString().padStart(2, '0'), icon: Activity },
  { label: 'Practice streak', value: '07', icon: Clock },
]

export default function HomePage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
        {/* Header */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="animate-fade-up">
            <p className="font-mono text-xs uppercase tracking-[0.4em] text-primary text-glow-phosphor">
              {greeting()}
            </p>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              WHAT ARE WE
              <br />
              PRACTICING?
            </h1>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {overview.map((o) => {
              const Icon = o.icon
              return (
                <div key={o.label} className="panel px-4 py-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <p className="mt-3 font-display text-2xl font-bold text-foreground">{o.value}</p>
                  <p className="mt-1 font-mono text-[9px] uppercase leading-tight tracking-widest text-muted-foreground">
                    {o.label}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Upload */}
        <div className="mt-8 animate-fade-up" style={{ animationDelay: '80ms' }}>
          <UploadPanel />
        </div>

        <div className="mt-5 animate-fade-up" style={{ animationDelay: '120ms' }}>
          <AudioAnalysis />
        </div>

        {/* Recent sessions */}
        <section className="mt-12 animate-fade-up" style={{ animationDelay: '160ms' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="h-4 w-[3px] rounded-full bg-primary box-glow-phosphor" />
              <h2 className="font-display text-lg font-semibold tracking-[0.2em] text-foreground">
                RECENT SESSIONS
              </h2>
            </div>
            <Link
              href="/songs"
              className="group inline-flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {recentSessions.map((song) => (
              <SongCard key={song.id} song={song} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  )
}
