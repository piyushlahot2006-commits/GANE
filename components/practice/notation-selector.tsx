'use client'

import type { NotationMode } from '@/lib/notation'
import { cn } from '@/lib/utils'

const MODES: { value: NotationMode; label: string }[] = [
  { value: 'western', label: 'WESTERN' },
  { value: 'sargam', label: 'SARGAM' },
  { value: 'both', label: 'BOTH' },
]

export function NotationSelector({
  mode,
  onChange,
}: {
  mode: NotationMode
  onChange: (mode: NotationMode) => void
}) {
  return (
    <div
      role="group"
      aria-label="Notation system"
      className="inline-flex rounded-md border border-border bg-background/50 p-0.5"
    >
      {MODES.map((m) => {
        const active = mode === m.value
        return (
          <button
            key={m.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(m.value)}
            className={cn(
              'rounded-[5px] px-3 py-1.5 font-display text-[11px] font-semibold tracking-[0.18em] transition-all sm:px-4',
              active
                ? 'bg-primary/15 text-primary box-glow-phosphor'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {m.label}
          </button>
        )
      })}
    </div>
  )
}
