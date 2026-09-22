'use client'

import { Minus, Plus, Repeat } from 'lucide-react'
import { cn } from '@/lib/utils'

const SPEEDS = [50, 75, 100, 125]

function ControlCard({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="panel flex flex-col gap-3 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  )
}

export function PracticeControls({
  tempo,
  setTempo,
  speed,
  setSpeed,
  loopOn,
  setLoopOn,
  metronomeOn,
  setMetronomeOn,
  loopStart,
  loopEnd,
  onSetLoopStart,
  onSetLoopEnd,
  onClearLoop,
}: {
  tempo: number
  setTempo: (n: number) => void
  speed: number
  setSpeed: (n: number) => void
  loopOn: boolean
  setLoopOn: (b: boolean) => void
  metronomeOn: boolean
  setMetronomeOn: (b: boolean) => void
  loopStart: number | null
  loopEnd: number | null
  onSetLoopStart: () => void
  onSetLoopEnd: () => void
  onClearLoop: () => void
}) {
  const formatTime = (seconds: number | null) =>
    seconds === null ? '--:--' : `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* Tempo */}
      <ControlCard label="Tempo">
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Decrease tempo"
            onClick={() => setTempo(Math.max(40, tempo - 1))}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Minus className="h-4 w-4" />
          </button>
          <div className="text-center">
            <span className="font-display text-2xl font-bold tabular-nums text-foreground">
              {tempo}
            </span>
            <span className="ml-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              BPM
            </span>
          </div>
          <button
            type="button"
            aria-label="Increase tempo"
            onClick={() => setTempo(Math.min(240, tempo + 1))}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </ControlCard>

      {/* Speed */}
      <ControlCard label="Speed">
        <div className="grid grid-cols-4 gap-1.5">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={cn(
                'rounded-md border py-2 font-mono text-[11px] tabular-nums transition-all',
                speed === s
                  ? 'border-primary/50 bg-primary/15 text-primary box-glow-phosphor'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {s}%
            </button>
          ))}
        </div>
      </ControlCard>

      {/* Loop */}
      <ControlCard label="Loop">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-1.5">
            {([
              ['A', onSetLoopStart, loopStart],
              ['B', onSetLoopEnd, loopEnd],
            ] as [string, () => void, number | null][]).map(([p, handler, value]) => (
              <button
                key={p}
                type="button"
                onClick={handler}
                className="flex-1 rounded-md border border-border py-2 font-display text-sm font-semibold text-foreground transition-colors hover:border-[var(--cyan)]/50 hover:text-[var(--cyan)]"
              >
                <span className="block">{p}</span>
                <span className="mt-0.5 block font-mono text-[9px] font-normal text-muted-foreground">
                  {formatTime(value as number | null)}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setLoopOn(!loopOn)}
            aria-pressed={loopOn}
            className={cn(
              'flex h-9 items-center gap-1.5 rounded-md border px-3 font-mono text-[10px] uppercase tracking-widest transition-all',
              loopOn
                ? 'border-[var(--cyan)]/50 bg-[var(--cyan)]/15 text-[var(--cyan)]'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            <Repeat className="h-3.5 w-3.5" />
            {loopOn ? 'ON' : 'OFF'}
          </button>
        </div>
        <button
          type="button"
          onClick={onClearLoop}
          className="self-end font-mono text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          Clear A/B
        </button>
      </ControlCard>

      {/* Metronome */}
      <ControlCard label="Metronome">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-display text-xl font-bold tabular-nums text-foreground">
              {tempo}
            </span>
            <span className="ml-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              BPM
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMetronomeOn(!metronomeOn)}
            aria-pressed={metronomeOn}
            className={cn(
              'relative flex h-9 w-16 items-center rounded-full border px-1 transition-colors',
              metronomeOn ? 'border-primary/50 bg-primary/15' : 'border-border bg-muted',
            )}
          >
            <span
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full transition-transform',
                metronomeOn
                  ? 'translate-x-7 bg-primary box-glow-phosphor'
                  : 'translate-x-0 bg-muted-foreground/50',
              )}
            >
              <span
                className={cn(
                  'font-mono text-[8px] font-bold',
                  metronomeOn ? 'text-primary-foreground' : 'text-background',
                )}
              >
                {metronomeOn ? 'ON' : 'OFF'}
              </span>
            </span>
          </button>
        </div>
      </ControlCard>
    </div>
  )
}
