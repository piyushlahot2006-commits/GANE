'use client'

import {
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  Maximize2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function fmt(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function Transport({
  isPlaying,
  onToggle,
  onRestart,
  onPrev,
  onNext,
  progress,
  onSeek,
  totalSeconds,
  volume,
  setVolume,
  disabled = false,
}: {
  isPlaying: boolean
  onToggle: () => void
  onRestart: () => void
  onPrev: () => void
  onNext: () => void
  progress: number
  onSeek: (pct: number) => void
  totalSeconds: number
  volume: number
  setVolume: (n: number) => void
  disabled?: boolean
}) {
  const current = (progress / 100) * totalSeconds

  return (
    <div className="panel p-4 sm:p-5">
      {/* timeline */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs tabular-nums text-primary">{fmt(current)}</span>
        <div className="group relative flex-1">
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progress}
            onChange={(e) => onSeek(Number(e.target.value))}
            aria-label="Seek"
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          />
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${progress}%`, boxShadow: '0 0 10px oklch(0.8 0.15 74 / 0.7)' }}
            />
          </div>
          <span
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary transition-transform group-hover:scale-125"
            style={{ left: `${progress}%`, boxShadow: '0 0 10px oklch(0.8 0.15 74 / 0.9)' }}
          />
        </div>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {fmt(totalSeconds)}
        </span>
      </div>

      {/* controls */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <IconBtn label="Restart" onClick={onRestart}>
            <RotateCcw className="h-4 w-4" />
          </IconBtn>
          <IconBtn label="Previous section" onClick={onPrev}>
            <SkipBack className="h-4 w-4" fill="currentColor" />
          </IconBtn>

          <button
            type="button"
            onClick={onToggle}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            disabled={disabled}
            className="mx-1 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:box-glow-phosphor active:translate-y-px"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" fill="currentColor" />
            ) : (
              <Play className="h-5 w-5 translate-x-px" fill="currentColor" />
            )}
          </button>

          <IconBtn label="Next section" onClick={onNext}>
            <SkipForward className="h-4 w-4" fill="currentColor" />
          </IconBtn>
        </div>

        {/* volume + fullscreen */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <div className="relative h-1.5 w-24">
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Volume"
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              />
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[var(--cyan)]"
                  style={{ width: `${volume}%` }}
                />
              </div>
            </div>
          </div>
          <IconBtn label="Fullscreen">
            <Maximize2 className="h-4 w-4" />
          </IconBtn>
        </div>
      </div>
    </div>
  )
}

function IconBtn({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode
  label: string
  onClick?: () => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:border-border hover:text-foreground',
        active && 'text-primary',
      )}
    >
      {children}
    </button>
  )
}
