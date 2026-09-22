'use client'

import { resolveMidi, type NotationMode } from '@/lib/notation'
import { getEventAtTime, type MusicalEvent } from '@/lib/musical-events'
import { cn } from '@/lib/utils'

export function PitchTimeline({
  events,
  duration,
  currentTime,
  tonicPc,
  mode,
  analyzing = false,
  progress = null,
}: {
  events: MusicalEvent[]
  duration: number
  currentTime: number
  tonicPc: number
  mode: NotationMode
  analyzing?: boolean
  progress?: number | null
}) {
  const timelineDuration = Math.max(duration, events.at(-1)?.endTime ?? 0, 0.1)
  const activeEvent = getEventAtTime(events, currentTime)

  return (
    <section className="panel overflow-hidden p-4 sm:p-5" aria-labelledby="pitch-timeline-heading">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="pitch-timeline-heading" className="font-display text-sm font-semibold tracking-[0.2em] text-foreground">
            ESTIMATED MELODY
          </h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Extracted from detected pitch · not perfect transcription
          </p>
        </div>
        {analyzing && progress !== null && (
          <span className="font-mono text-[10px] tabular-nums tracking-widest text-primary">
            {Math.round(progress * 100)}%
          </span>
        )}
      </div>

      {analyzing ? (
        <div className="mt-5">
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${Math.max(4, (progress ?? 0) * 100)}%` }} />
          </div>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-[var(--cyan)]">Analyzing pitch timeline...</p>
        </div>
      ) : events.length === 0 ? (
        <p className="mt-5 border border-border/60 p-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          No stable pitch events detected
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto pb-1">
          <div className="relative min-w-[640px]" style={{ width: `${Math.max(100, timelineDuration * 110)}px` }}>
            <div className="absolute inset-x-0 top-0 h-px bg-border" />
            <div className="relative h-24 pt-3">
              {events.map((event) => {
                const left = (event.startTime / timelineDuration) * 100
                const width = Math.max(1.5, ((event.endTime - event.startTime) / timelineDuration) * 100)
                const active = activeEvent?.id === event.id
                return (
                  <div
                    key={event.id}
                    className="absolute top-3"
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    <div
                      className={cn(
                        'mx-0.5 flex h-12 min-w-8 flex-col justify-center overflow-hidden border px-2 transition-all',
                        event.type === 'rest'
                          ? 'border-dashed border-border/60 bg-muted/30 text-muted-foreground'
                          : active
                          ? 'border-primary bg-primary/20 text-primary box-glow-phosphor'
                          : 'border-[var(--cyan)]/35 bg-[var(--cyan)]/10 text-foreground',
                      )}
                      title={event.type === 'rest'
                        ? `REST · ${event.startTime.toFixed(2)}s–${event.endTime.toFixed(2)}s`
                        : `${event.westernNote} · ${event.startTime.toFixed(2)}s–${event.endTime.toFixed(2)}s · ${Math.round(event.confidence * 100)}% confidence`}
                    >
                      {event.type === 'rest' ? <span className="truncate font-mono text-[10px]">REST</span> : <>
                        {mode !== 'sargam' && <span className="truncate font-display text-xs font-semibold">{event.westernNote}</span>}
                        {mode !== 'western' && <span className="truncate font-mono text-[10px]">{resolveMidi(event.midiNote, tonicPc).sargam}</span>}
                      </>}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between border-t border-border/60 pt-2 font-mono text-[9px] tabular-nums text-muted-foreground">
              <span>0.0s</span>
              <span>{timelineDuration.toFixed(1)}s</span>
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute top-0 z-10 h-[5.75rem] w-px bg-primary transition-[left] duration-100"
              style={{ left: `${Math.max(0, Math.min(100, (currentTime / timelineDuration) * 100))}%`, boxShadow: '0 0 8px oklch(0.8 0.15 74 / 0.9)' }}
            />
          </div>
        </div>
      )}
    </section>
  )
}
