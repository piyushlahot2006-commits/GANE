'use client'

import { measures, type MockNote } from '@/lib/mock-data'
import { resolveStep, type NotationMode } from '@/lib/notation'
import { cn } from '@/lib/utils'

const GAP = 14 // px between staff lines
const HALF = GAP / 2
const STAFF_TOP = 24 // y of top staff line within the staff group
const BOTTOM_LINE = STAFF_TOP + GAP * 4 // step 0 = E4 sits on bottom line
const MEASURE_W = 180
const NOTE_PAD = 34

function yForStep(step: number) {
  return BOTTOM_LINE - step * HALF
}

interface FlatNote extends MockNote {
  measureIndex: number
  x: number
  y: number
  ledger: number[]
}

// Build a flat, positioned list of notes across all measures.
const flat: FlatNote[] = (() => {
  const out: FlatNote[] = []
  measures.forEach((m, mi) => {
    const measureStart = mi * MEASURE_W
    m.notes.forEach((n) => {
      const x = measureStart + NOTE_PAD + (n.beat / 4) * (MEASURE_W - NOTE_PAD - 12)
      const y = yForStep(n.step)
      // ledger lines above (step >= 10) / below (step <= -2)
      const ledger: number[] = []
      if (n.step >= 10) for (let s = 10; s <= n.step; s += 2) ledger.push(yForStep(s))
      if (n.step <= -2) for (let s = -2; s >= n.step; s -= 2) ledger.push(yForStep(s))
      out.push({ ...n, measureIndex: mi, x, y, ledger })
    })
  })
  return out
})()

export const TOTAL_NOTES = flat.length

const TOTAL_W = measures.length * MEASURE_W + 40

export function Notation({
  currentNote,
  mode = 'western',
  tonicPc = 0,
}: {
  currentNote: number
  mode?: NotationMode
  tonicPc?: number
}) {
  const height = 132
  const active = flat[currentNote]

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${TOTAL_W} ${height}`}
        className={cn(mode === 'sargam' && 'hidden', 'h-40 w-full min-w-[640px]')}
        preserveAspectRatio="xMinYMid meet"
        role="img"
        aria-label="Musical notation preview"
      >
        {mode !== 'sargam' && <>
        {/* staff lines */}
        {Array.from({ length: 5 }).map((_, i) => (
          <line
            key={i}
            x1={8}
            x2={TOTAL_W - 12}
            y1={STAFF_TOP + i * GAP}
            y2={STAFF_TOP + i * GAP}
            stroke="var(--border)"
            strokeWidth={1}
          />
        ))}

        {/* treble clef */}
        <text
          x={14}
          y={BOTTOM_LINE + 6}
          className="fill-primary"
          style={{ fontSize: 62, fontFamily: 'serif' }}
        >
          &#x1D11E;
        </text>

        {/* playhead */}
        {active && (
          <g style={{ transition: 'transform 0.25s ease-out' }} transform={`translate(${active.x}, 0)`}>
            <line
              x1={0}
              x2={0}
              y1={STAFF_TOP - 14}
              y2={BOTTOM_LINE + 22}
              stroke="var(--primary)"
              strokeWidth={1.5}
              opacity={0.8}
              style={{ filter: 'drop-shadow(0 0 6px oklch(0.8 0.15 74 / 0.7))' }}
            />
            <rect
              x={-13}
              y={STAFF_TOP - 16}
              width={26}
              height={BOTTOM_LINE - STAFF_TOP + 40}
              fill="var(--primary)"
              opacity={0.07}
            />
          </g>
        )}

        {/* barlines */}
        {measures.map((_, mi) => (
          <line
            key={`bar-${mi}`}
            x1={mi * MEASURE_W + 30}
            x2={mi * MEASURE_W + 30}
            y1={STAFF_TOP}
            y2={BOTTOM_LINE}
            stroke="var(--border)"
            strokeWidth={mi === 0 ? 1 : 1}
            opacity={0.7}
          />
        ))}
        {/* final barline */}
        <line
          x1={TOTAL_W - 14}
          x2={TOTAL_W - 14}
          y1={STAFF_TOP}
          y2={BOTTOM_LINE}
          stroke="var(--border)"
          strokeWidth={2.5}
        />

        {/* notes */}
        {flat.map((n, i) => {
          const isActive = i === currentNote
          const isPast = i < currentNote
          const stemUp = n.step < 6
          const stemX = stemUp ? n.x + 6.2 : n.x - 6.2
          const stemY2 = stemUp ? n.y - 34 : n.y + 34
          const filled = n.dur !== 'h'
          const color = isActive
            ? 'var(--primary)'
            : isPast
              ? 'var(--muted-foreground)'
              : 'var(--foreground)'
          return (
            <g
              key={i}
              style={{
                transition: 'opacity 0.2s',
                filter: isActive ? 'drop-shadow(0 0 6px oklch(0.8 0.15 74 / 0.9))' : undefined,
              }}
              opacity={isPast ? 0.45 : 1}
            >
              {/* ledger lines */}
              {n.ledger.map((ly, li) => (
                <line
                  key={li}
                  x1={n.x - 10}
                  x2={n.x + 10}
                  y1={ly}
                  y2={ly}
                  stroke="var(--border)"
                  strokeWidth={1}
                />
              ))}
              {/* accidental */}
              {n.accidental && (
                <text
                  x={n.x - 16}
                  y={n.y + 4}
                  fill={color}
                  style={{ fontSize: 16, fontFamily: 'serif' }}
                >
                  {n.accidental === '#' ? '\u266F' : '\u266D'}
                </text>
              )}
              {/* notehead */}
              <ellipse
                cx={n.x}
                cy={n.y}
                rx={6.4}
                ry={4.8}
                transform={`rotate(-20 ${n.x} ${n.y})`}
                fill={filled ? color : 'transparent'}
                stroke={color}
                strokeWidth={filled ? 0 : 1.6}
              />
              {/* stem */}
              <line x1={stemX} x2={stemX} y1={n.y} y2={stemY2} stroke={color} strokeWidth={1.4} />
              {/* eighth flag */}
              {n.dur === 'e' && (
                <path
                  d={
                    stemUp
                      ? `M ${stemX} ${stemY2} q 10 6 6 18`
                      : `M ${stemX} ${stemY2} q 10 -6 6 -18`
                  }
                  fill="none"
                  stroke={color}
                  strokeWidth={1.4}
                />
              )}
            </g>
          )
        })}

        {/* measure numbers */}
        {measures.map((m, mi) => (
          <text
            key={`n-${mi}`}
            x={mi * MEASURE_W + 34}
            y={STAFF_TOP - 8}
            className="fill-muted-foreground"
            style={{ fontSize: 9, fontFamily: 'var(--font-jetbrains), monospace' }}
          >
            {String(m.id).padStart(2, '0')}
          </text>
        ))}
        </>}
      </svg>

      {mode !== 'western' && <SargamNotation currentNote={currentNote} tonicPc={tonicPc} />}

      {/* current-note readout */}
      <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2 rounded-sm border border-border/60 bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground backdrop-blur">
        <span
          className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-primary' : 'bg-muted-foreground')}
        />
        Note {String(currentNote + 1).padStart(2, '0')} / {String(TOTAL_NOTES).padStart(2, '0')}
      </div>
    </div>
  )
}

function SargamNotation({ currentNote, tonicPc }: { currentNote: number; tonicPc: number }) {
  return (
    <div className="mt-2 border-t border-border/60 px-2 pt-3" aria-label="Sargam notation preview">
      <div className="flex min-w-[640px] gap-2 overflow-hidden">
        {flat.map((note, index) => {
          const resolved = resolveStep(note.step, note.accidental, tonicPc)
          const active = index === currentNote
          return (
            <div
              key={index}
              className={cn(
                'flex min-w-16 flex-col items-center rounded-sm border px-2 py-1.5 font-mono transition-colors',
                active
                  ? 'border-primary/60 bg-primary/15 text-primary box-glow-phosphor'
                  : 'border-border/60 text-muted-foreground',
              )}
            >
              <span className="font-display text-base">{resolved.sargam}</span>
              <span className="mt-0.5 text-[9px] uppercase tracking-widest">{resolved.sargamLatin}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
