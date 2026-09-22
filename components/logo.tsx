import { cn } from '@/lib/utils'

export function Logo({
  className,
  showTagline = false,
}: {
  className?: string
  showTagline?: boolean
}) {
  return (
    <div className={cn('flex flex-col', className)}>
      <span className="font-display text-2xl font-extrabold leading-none tracking-[0.35em] text-foreground text-glow-phosphor">
        GANE
      </span>
      {showTagline && (
        <span className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
          Turn Sound Into Practice
        </span>
      )}
    </div>
  )
}
