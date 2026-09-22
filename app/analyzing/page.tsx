'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronRight, Loader2, ArrowRight } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Waveform } from '@/components/waveform'
import { analysisStages, songs } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const song = songs[0]
const STAGE_MS = 1400

export default function AnalyzingPage() {
  const [stage, setStage] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (stage >= analysisStages.length) {
      const t = setTimeout(() => setDone(true), 500)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setStage((s) => s + 1), STAGE_MS)
    return () => clearTimeout(t)
  }, [stage])

  const pct = Math.min(100, Math.round((stage / analysisStages.length) * 100))

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:py-12">
        <nav className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-foreground">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-primary">Analysis</span>
        </nav>

        <div className="mt-4 animate-fade-up">
          <p className="font-mono text-xs uppercase tracking-[0.4em] text-primary text-glow-phosphor">
            {done ? 'ANALYSIS COMPLETE' : 'PROCESSING AUDIO'}
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {song.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {song.artist} · uploaded just now
          </p>
        </div>

        {/* central visualizer */}
        <div className="panel relative mt-8 overflow-hidden p-6 sm:p-10 animate-fade-up" style={{ animationDelay: '80ms' }}>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 crt-scanlines opacity-40"
          />
          <div className="relative mx-auto flex h-28 max-w-2xl items-center sm:h-36">
            <Waveform bars={72} color={done ? 'phosphor' : 'cyan'} animated={!done} seed={5} />
          </div>

          {/* overall progress */}
          <div className="relative mx-auto mt-8 max-w-2xl">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>{done ? 'Notation engraved' : analysisStages[Math.min(stage, analysisStages.length - 1)].label}</span>
              <span className="text-primary">{done ? 100 : pct}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{
                  width: `${done ? 100 : pct}%`,
                  boxShadow: '0 0 10px oklch(0.8 0.15 74 / 0.7)',
                }}
              />
            </div>
          </div>
        </div>

        {/* stage list */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 animate-fade-up" style={{ animationDelay: '160ms' }}>
          {analysisStages.map((s, i) => {
            const state = done || i < stage ? 'done' : i === stage ? 'active' : 'pending'
            return (
              <div
                key={s.id}
                className={cn(
                  'panel flex items-center gap-4 p-4 transition-colors',
                  state === 'active' && 'border-primary/40',
                )}
              >
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
                    state === 'done'
                      ? 'border-primary/50 bg-primary/15 text-primary'
                      : state === 'active'
                        ? 'border-primary/40 text-primary box-glow-phosphor'
                        : 'border-border text-muted-foreground/40',
                  )}
                >
                  {state === 'done' ? (
                    <Check className="h-4 w-4" />
                  ) : state === 'active' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="font-mono text-[10px]">{String(i + 1).padStart(2, '0')}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p
                    className={cn(
                      'font-display text-sm font-semibold tracking-wide',
                      state === 'pending' ? 'text-muted-foreground/50' : 'text-foreground',
                    )}
                  >
                    {s.label}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {s.detail}
                  </p>
                </div>
                <span
                  className={cn(
                    'ml-auto font-mono text-[10px] uppercase tracking-widest',
                    state === 'done'
                      ? 'text-primary'
                      : state === 'active'
                        ? 'text-[var(--cyan)]'
                        : 'text-muted-foreground/40',
                  )}
                >
                  {state === 'done' ? 'OK' : state === 'active' ? '···' : 'WAIT'}
                </span>
              </div>
            )
          })}
        </div>

        {/* result / CTA */}
        <div
          className={cn(
            'mt-6 overflow-hidden transition-all duration-700',
            done ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
          )}
        >
          <div className="panel flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-6">
              {[
                ['Detected key', song.key],
                ['Tempo', `${song.bpm} BPM`],
                ['Time sig', '4/4'],
                ['Confidence', '96%'],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {k}
                  </p>
                  <p className="mt-1 font-display text-xl font-bold text-foreground">{v}</p>
                </div>
              ))}
            </div>
            <Link
              href="/practice"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 font-display text-sm font-semibold tracking-[0.15em] text-primary-foreground transition-all hover:box-glow-phosphor active:translate-y-px"
            >
              OPEN IN PRACTICE
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
