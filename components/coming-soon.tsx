import Link from 'next/link'
import { ArrowLeft, type LucideIcon } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Waveform } from '@/components/waveform'

export function ComingSoon({
  code,
  title,
  description,
  icon: Icon,
}: {
  code: string
  title: string
  description: string
  icon: LucideIcon
}) {
  return (
    <AppShell>
      <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col items-center justify-center px-5 py-12 text-center">
        <div className="panel relative flex w-full flex-col items-center overflow-hidden px-6 py-14 animate-fade-up">
          <div aria-hidden className="pointer-events-none absolute inset-0 crt-scanlines opacity-30" />
          <div className="pointer-events-none absolute inset-x-8 bottom-6 h-16 opacity-15">
            <Waveform bars={56} color="phosphor" seed={33} />
          </div>

          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-primary/40 bg-primary/10 box-glow-phosphor">
            <Icon className="h-6 w-6 text-primary" />
          </div>

          <p className="relative mt-6 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
            Module {code}
          </p>
          <h1 className="relative mt-3 font-display text-3xl font-bold tracking-[0.12em] text-foreground">
            {title}
          </h1>
          <p className="relative mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>

          <Link
            href="/"
            className="relative mt-8 inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
        </div>
      </div>
    </AppShell>
  )
}
