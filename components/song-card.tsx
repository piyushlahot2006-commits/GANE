import Link from 'next/link'
import { Play } from 'lucide-react'
import type { Song } from '@/lib/mock-data'
import { Waveform } from '@/components/waveform'

function seedFromId(id: string) {
  return id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 50
}

export function SongCard({ song }: { song: Song }) {
  return (
    <div className="group panel relative overflow-hidden p-4 transition-colors hover:border-primary/40">
      {/* mini waveform strip */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 opacity-15 transition-opacity group-hover:opacity-30">
        <Waveform bars={40} color="phosphor" seed={seedFromId(song.id)} className="px-2" />
      </div>

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-sm font-semibold tracking-wide text-foreground">
            {song.title}
          </h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{song.artist}</p>
        </div>
        <Link
          href="/practice"
          aria-label={`Play ${song.title}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary transition-all hover:bg-primary hover:text-primary-foreground hover:box-glow-phosphor"
        >
          <Play className="h-4 w-4 translate-x-px" fill="currentColor" />
        </Link>
      </div>

      {/* technical meta grid */}
      <dl className="relative mt-4 grid grid-cols-3 gap-y-3 border-t border-border/60 pt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <div>
          <dt className="text-muted-foreground/60">BPM</dt>
          <dd className="mt-0.5 text-sm text-foreground">{song.bpm}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground/60">Key</dt>
          <dd className="mt-0.5 text-sm text-foreground">{song.key}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground/60">Length</dt>
          <dd className="mt-0.5 text-sm text-foreground">{song.duration}</dd>
        </div>
      </dl>

      {/* progress */}
      <div className="relative mt-4">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>Progress</span>
          <span className="text-primary">{song.progress}%</span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${song.progress}%`, boxShadow: '0 0 8px oklch(0.8 0.15 74 / 60%)' }}
          />
        </div>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
          Last practiced · {song.lastPracticed}
        </p>
      </div>
    </div>
  )
}
