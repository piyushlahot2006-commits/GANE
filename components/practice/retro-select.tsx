'use client'

import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RetroSelectProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  accent?: 'phosphor' | 'cyan'
  className?: string
}

/* Native-select-backed dropdown styled as vintage instrument readout. */
export function RetroSelect({
  label,
  value,
  options,
  onChange,
  accent = 'phosphor',
  className,
}: RetroSelectProps) {
  const accentColor = accent === 'cyan' ? 'var(--cyan)' : 'var(--primary)'
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-md border border-border bg-background/60 px-3 py-2 pr-8 font-mono text-sm tabular-nums text-foreground outline-none transition-colors hover:border-border focus:border-[color:var(--sel-accent)] focus:ring-1 focus:ring-[color:var(--sel-accent)]/40"
          style={{ ['--sel-accent' as string]: accentColor }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-popover text-popover-foreground">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
          style={{ color: accentColor }}
        />
      </div>
    </label>
  )
}
