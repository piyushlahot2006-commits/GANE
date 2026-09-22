'use client'

import { Activity } from 'lucide-react'
import { Waveform } from '@/components/waveform'

const metrics = [
  { label: 'PITCH ACCURACY', value: '--', unit: '%' },
  { label: 'RHYTHM ACCURACY', value: '--', unit: '%' },
  { label: 'TIMING', value: '--', unit: '%' },
]

export function SessionPanel({
  practiceTime,
  active,
  onToggle,
}: {
  practiceTime: string
  active: boolean
  onToggle: () => void
}) {
  return (
    <aside className="panel flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-[3px] rounded-full bg-[var(--cyan)]" />
          <h2 className="font-display text-sm font-semibold tracking-[0.25em] text-foreground">
            SESSION
          </h2>
        </div>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* metrics */}
      <div className="space-y-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-md border border-border/60 bg-background/40 px-3 py-2.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              {m.label}
            </p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-display text-2xl font-bold text-muted-foreground/70">
                {m.value}
              </span>
              <span className="font-mono text-xs text-muted-foreground/50">{m.unit}</span>
            </div>
            <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/4 bg-muted-foreground/30" />
            </div>
          </div>
        ))}
      </div>

      {/* practice time */}
      <div className="rounded-md border border-primary/25 bg-primary/5 px-3 py-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          PRACTICE TIME
        </p>
        <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-primary text-glow-phosphor">
          {practiceTime}
        </p>
      </div>

      {/* mini analyzer */}
      <div className="h-12 opacity-40">
        <Waveform bars={28} color="cyan" seed={21} animated={active} />
      </div>

      <p className="font-mono text-[9px] leading-relaxed tracking-wide text-muted-foreground/60">
        AI performance analysis is offline. Metrics populate once microphone input and pitch
        detection are connected.
      </p>

      <button
        type="button"
        onClick={onToggle}
        className="mt-auto inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-display text-sm font-semibold tracking-[0.2em] text-primary-foreground transition-all hover:box-glow-phosphor active:translate-y-px"
      >
        {active ? 'STOP PRACTICE' : 'START PRACTICE'}
      </button>
    </aside>
  )
}
