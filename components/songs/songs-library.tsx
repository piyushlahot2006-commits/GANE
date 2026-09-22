'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Grid2x2, Rows3, Play, Loader2, Clock } from 'lucide-react'
import { SongCard } from '@/components/song-card'
import { songs, type Song, type NotationStatus } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import { getLocalLibrary } from '@/lib/local-library'

const FILTERS: { label: string; value: NotationStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Ready', value: 'ready' },
  { label: 'Analyzing', value: 'analyzing' },
  { label: 'Queued', value: 'queued' },
]

const statusStyle: Record<NotationStatus, string> = {
  ready: 'border-primary/40 bg-primary/10 text-primary',
  analyzing: 'border-[var(--cyan)]/40 bg-[var(--cyan)]/10 text-[var(--cyan)]',
  queued: 'border-border bg-muted text-muted-foreground',
}

export function SongsLibrary() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<NotationStatus | 'all'>('all')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [localSongs, setLocalSongs] = useState<Song[]>([])

  useEffect(() => {
    setLocalSongs(getLocalLibrary().map((record) => ({
      id: `local-${record.id}`,
      title: record.fileName.replace(/\.[^.]+$/, ''),
      artist: 'Local analysis',
      duration: `${Math.floor(record.duration / 60).toString().padStart(2, '0')}:${Math.floor(record.duration % 60).toString().padStart(2, '0')}`,
      bpm: record.analysis.bpm || 0,
      key: 'Key unavailable',
      lastPracticed: 'Recently analyzed',
      progress: 0,
      status: record.status === 'complete' ? 'ready' : 'analyzing',
    })))
  }, [])

  const filtered = useMemo(() => {
    return [...localSongs, ...songs].filter((s) => {
      const matchesFilter = filter === 'all' || s.status === filter
      const q = query.trim().toLowerCase()
      const matchesQuery =
        !q || s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
      return matchesFilter && matchesQuery
    })
  }, [localSongs, query, filter])

  return (
    <div>
      {/* toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title or artist"
            className="h-10 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary/50 focus:box-glow-phosphor"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={cn(
                  'rounded-md border px-3 py-2 font-mono text-[10px] uppercase tracking-widest transition-all',
                  filter === f.value
                    ? 'border-primary/50 bg-primary/15 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex overflow-hidden rounded-md border border-border">
            <button
              type="button"
              aria-label="Grid view"
              onClick={() => setView('grid')}
              className={cn(
                'flex h-9 w-9 items-center justify-center transition-colors',
                view === 'grid' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Grid2x2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="List view"
              onClick={() => setView('list')}
              className={cn(
                'flex h-9 w-9 items-center justify-center border-l border-border transition-colors',
                view === 'list' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Rows3 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* count */}
      <p className="mt-5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {String(filtered.length).padStart(2, '0')} {filtered.length === 1 ? 'track' : 'tracks'}
      </p>

      {/* results */}
      {filtered.length === 0 ? (
        <div className="panel mt-3 flex flex-col items-center justify-center gap-2 py-16 text-center">
          <p className="font-display text-sm tracking-widest text-foreground">NO MATCHES</p>
          <p className="font-mono text-xs text-muted-foreground">Try a different search or filter.</p>
        </div>
      ) : view === 'grid' ? (
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <SongCard key={s.id} song={s} />
          ))}
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {filtered.map((s) => (
            <SongRow key={s.id} song={s} />
          ))}
        </div>
      )}
    </div>
  )
}

function SongRow({ song }: { song: Song }) {
  return (
    <div className="panel group flex items-center gap-4 p-3 pr-4 transition-colors hover:border-primary/40">
      <Link
        href="/practice"
        aria-label={`Play ${song.title}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary transition-all hover:bg-primary hover:text-primary-foreground"
      >
        <Play className="h-4 w-4 translate-x-px" fill="currentColor" />
      </Link>

      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-semibold tracking-wide text-foreground">
          {song.title}
        </p>
        <p className="truncate text-xs text-muted-foreground">{song.artist}</p>
      </div>

      <div className="hidden items-center gap-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:flex">
        <span className="w-14">{song.key}</span>
        <span className="w-12">{song.bpm} BPM</span>
        <span className="flex w-16 items-center gap-1">
          <Clock className="h-3 w-3" />
          {song.duration}
        </span>
      </div>

      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest',
          statusStyle[song.status],
        )}
      >
        {song.status === 'analyzing' && <Loader2 className="h-3 w-3 animate-spin" />}
        {song.status}
      </span>
    </div>
  )
}
