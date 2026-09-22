'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Library,
  Music4,
  ListMusic,
  Mic,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/logo'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  code: string
}

const nav: NavItem[] = [
  { label: 'Home', href: '/', icon: Home, code: '01' },
  { label: 'My Songs', href: '/songs', icon: Library, code: '02' },
  { label: 'Practice', href: '/practice', icon: Music4, code: '03' },
  { label: 'Notation', href: '/notation', icon: ListMusic, code: '04' },
  { label: 'Recordings', href: '/recordings', icon: Mic, code: '05' },
  { label: 'Settings', href: '/settings', icon: Settings, code: '06' },
]

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-sidebar-border px-6 py-6">
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-primary/40 bg-primary/10 box-glow-phosphor">
          <span className="h-1.5 w-1.5 animate-pulse-ring rounded-full bg-primary" />
        </div>
        <Logo showTagline />
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-6">
        <p className="px-3 pb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
          Navigation
        </p>
        {nav.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
                active
                  ? 'bg-sidebar-accent text-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground',
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-primary box-glow-phosphor" />
              )}
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                )}
              />
              <span className="font-medium tracking-wide">{item.label}</span>
              <span className="ml-auto font-mono text-[10px] tracking-widest text-muted-foreground/50">
                {item.code}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Footer status */}
      <div className="border-t border-sidebar-border px-6 py-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          AI Music Lab
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--cyan)] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--cyan)]" />
          </span>
          <span className="font-mono text-[11px] tracking-widest text-[var(--cyan)]">
            SYSTEM READY
          </span>
        </div>
      </div>
    </div>
  )
}
