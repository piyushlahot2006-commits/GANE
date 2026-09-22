'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { SidebarNav } from '@/components/sidebar'
import { Logo } from '@/components/logo'
import { cn } from '@/lib/utils'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-sidebar-border lg:block">
        <SidebarNav />
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-border bg-sidebar/95 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <button
          type="button"
          aria-label="Toggle navigation"
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden',
          open ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      >
        <div
          onClick={() => setOpen(false)}
          className={cn(
            'absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity',
            open ? 'opacity-100' : 'opacity-0',
          )}
        />
        <div
          className={cn(
            'absolute inset-y-0 left-0 w-72 border-r border-sidebar-border transition-transform duration-300',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
      </div>

      {/* Main workspace */}
      <main className="min-w-0 flex-1 pt-16 lg:pl-64 lg:pt-0">{children}</main>
    </div>
  )
}
