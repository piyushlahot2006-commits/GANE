'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface WaveformProps {
  bars?: number
  className?: string
  animated?: boolean
  color?: 'phosphor' | 'cyan' | 'muted'
  /** deterministic seed so SSR and client match */
  seed?: number
}

const colorMap = {
  phosphor: 'bg-primary',
  cyan: 'bg-[var(--cyan)]',
  muted: 'bg-muted-foreground/50',
}

// Deterministic pseudo-random so server and client render identically.
function pseudo(i: number, seed: number) {
  const x = Math.sin((i + 1) * (seed + 0.5)) * 10000
  return x - Math.floor(x)
}

export function Waveform({
  bars = 48,
  className,
  animated = true,
  color = 'phosphor',
  seed = 7,
}: WaveformProps) {
  const heights = useMemo(
    () =>
      Array.from({ length: bars }, (_, i) => {
        const base = pseudo(i, seed)
        // Emphasize a centered, waveform-like envelope
        const env = Math.sin((i / bars) * Math.PI)
        return 0.25 + base * 0.55 * (0.5 + env * 0.5)
      }),
    [bars, seed],
  )

  return (
    <div
      aria-hidden
      className={cn('flex h-full w-full items-center justify-between gap-[2px]', className)}
    >
      {heights.map((h, i) => (
        <span
          key={i}
          className={cn('w-full rounded-full origin-center', colorMap[color])}
          style={{
            height: `${Math.round(h * 100)}%`,
            animation: animated
              ? `eq-bounce ${(1.1 + pseudo(i, seed + 3) * 1.4).toFixed(2)}s ease-in-out ${(
                  pseudo(i, seed + 9) * 1.2
                ).toFixed(2)}s infinite`
              : undefined,
          }}
        />
      ))}
    </div>
  )
}
