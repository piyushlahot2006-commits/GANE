'use client'

import { useEffect, useMemo, useRef } from 'react'
import { resolveMidi, type NotationMode } from '@/lib/notation'
import type { NotationDocument, NotationEvent, NotationMeasure } from '@/lib/notation-engine'
import { cn } from '@/lib/utils'

const STAFF_TOP = 34
const STAFF_GAP = 13
const STAFF_BOTTOM = STAFF_TOP + STAFF_GAP * 4
const NOTE_STEP = 3.5

function noteY(midi: number) {
  return STAFF_BOTTOM - (midi - 64) * NOTE_STEP
}

function durationMark(name: NotationEvent['durationName']) {
  if (name === 'whole') return 'WHOLE'
  if (name === 'half' || name === 'dotted-half') return 'HALF'
  if (name === 'eighth' || name === 'dotted-eighth') return 'EIGHTH'
  if (name === 'sixteenth') return '16TH'
  return 'QUARTER'
}

function eventLabel(event: NotationEvent, tonicPc: number) {
  if (event.type === 'rest') return 'REST'
  return resolveMidi(event.midiNote, tonicPc).sargam
}

function MeasureView({
  measure,
  mode,
  tonicPc,
  currentTime,
  zoom,
  settings,
}: {
  measure: NotationMeasure
  mode: NotationMode
  tonicPc: number
  currentTime: number
  zoom: number
  settings: NotationDocument['settings']
}) {
  const active = measure.events.find((event) => currentTime >= event.rawStartTime && currentTime < event.rawStartTime + event.rawDuration)
  const width = Math.max(320, measure.events.length * 92 + 54) * zoom
  const showConfidence = settings.confidenceDisplay !== 'hidden'

  return (
    <div className="shrink-0" style={{ width }} data-measure-index={measure.index}>
      <div className="relative h-44 border-r border-border/70 bg-background/20">
        {settings.showMeasureNumbers && <div className="absolute left-2 top-2 font-mono text-[9px] tracking-widest text-muted-foreground">
          {String(measure.index + 1).padStart(2, '0')}
        </div>}
        {mode !== 'sargam' && (
          <svg className="absolute inset-x-0 top-0 h-32 w-full" role="img" aria-label={`Western notation measure ${measure.index + 1}`}>
            {Array.from({ length: 5 }).map((_, index) => (
              <line key={index} x1="8" x2="100%" y1={STAFF_TOP + index * STAFF_GAP} y2={STAFF_TOP + index * STAFF_GAP} stroke="var(--border)" strokeWidth="1" />
            ))}
            {measure.events.map((event) => {
              if (event.type === 'rest') {
                const x = 28 + ((event.startBeat - measure.startBeat) / Math.max(0.01, measure.endBeat - measure.startBeat)) * (width / zoom - 46)
                const symbol = event.durationName === 'whole' ? '▬' : event.durationName === 'half' ? '▰' : event.durationName === 'eighth' || event.durationName === 'sixteenth' ? '♪' : '▰'
                return <text key={event.id} x={x} y={STAFF_TOP + STAFF_GAP * 2} fill="var(--muted-foreground)" style={{ fontSize: 18 }}>{symbol}</text>
              }
              const x = 28 + ((event.startBeat - measure.startBeat) / Math.max(0.01, measure.endBeat - measure.startBeat)) * (width / zoom - 46)
              const y = noteY(event.midiNote)
              const isActive = active?.id === event.id
              const color = isActive ? 'var(--primary)' : event.uncertain ? 'var(--magenta)' : 'var(--foreground)'
              return (
                <g key={event.id} opacity={isActive ? 1 : 0.9} style={{ filter: isActive ? 'drop-shadow(0 0 5px oklch(0.8 0.15 74 / 0.8))' : undefined }}>
                  {event.accidental !== 'natural' && <text x={x - 16} y={y + 4} fill={color} style={{ fontSize: 16 }}>{event.accidental === 'sharp' ? '♯' : '♭'}</text>}
                  <ellipse cx={x} cy={y} rx="7" ry="5" fill={event.durationName === 'whole' || event.durationName === 'half' ? 'transparent' : color} stroke={color} strokeWidth="1.5" />
                  {event.durationName !== 'whole' && <line x1={x + 6} x2={x + 6} y1={y} y2={y - 30} stroke={color} strokeWidth="1.5" />}
                  {event.tieEnd && <path d={`M ${x + 8} ${y + 8} q 20 12 38 0`} fill="none" stroke={color} strokeWidth="1.5" />}
                  {settings.showUncertainNotes && event.uncertain && <text x={x + 10} y={y - 12} fill="var(--magenta)" style={{ fontSize: 11 }}>?</text>}
                  {showConfidence && settings.confidenceDisplay === 'detailed' && <text x={x - 10} y={y + 22} fill="var(--muted-foreground)" style={{ fontSize: 8 }}>{Math.round(event.confidence * 100)}%</text>}
                </g>
              )
            })}
            {measure.events.filter((event): event is Extract<NotationEvent, { type: 'note' }> => event.type === 'note' && (event.durationName === 'eighth' || event.durationName === 'sixteenth')).length > 1 && (
              <line x1="20" x2={width / zoom - 20} y1="12" y2="12" stroke="var(--cyan)" strokeWidth="2" opacity="0.7" />
            )}
          </svg>
        )}
        {settings.showBeatGrid && <div className="absolute inset-x-2 top-7 flex justify-between font-mono text-[8px] text-muted-foreground/60">{Array.from({ length: Math.ceil(measure.endBeat - measure.startBeat) }).map((_, index) => <span key={index}>{index + 1}</span>)}</div>}
        <div className={cn('absolute inset-x-2 bottom-2 flex gap-1 overflow-hidden', mode === 'western' ? 'hidden' : '')} aria-label={`Sargam notation measure ${measure.index + 1}`}>
          {measure.events.map((event) => (
            <div key={event.id} className={cn('min-w-16 flex-1 border px-1 py-1 text-center font-mono text-[10px]', active?.id === event.id ? 'border-primary bg-primary/15 text-primary' : 'border-border/60 text-muted-foreground')}>
              <span className="block font-display text-sm">{eventLabel(event, tonicPc)}{settings.showUncertainNotes && event.type === 'note' && event.uncertain ? '?' : ''}</span>
              <span className="block text-[8px] uppercase tracking-wider">{durationMark(event.durationName)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function NotationDocumentView({
  document,
  currentTime,
  mode,
  tonicPc,
  zoom = 1,
}: {
  document: NotationDocument | null
  currentTime: number
  mode: NotationMode
  tonicPc: number
  zoom?: number
}) {
  const activeMeasureRef = useRef<HTMLDivElement | null>(null)
  const activeMeasure = useMemo(() => {
    if (!document) return null
    return document.measures.find((measure) => measure.events.some((event) => currentTime >= event.rawStartTime && currentTime < event.rawStartTime + event.rawDuration))?.index ?? null
  }, [currentTime, document])

  useEffect(() => {
    if (activeMeasureRef.current) activeMeasureRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeMeasure])

  if (!document || document.measures.length === 0) {
    return <div className="flex h-44 items-center justify-center border border-border/60 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Notation will appear after melody analysis</div>
  }

  return (
    <div className="relative overflow-x-auto border border-border/60 bg-background/30 p-2" aria-label="Generated musical notation">
      <div className="flex min-w-max gap-2">
        {document.measures.map((measure) => (
          <div key={measure.index} ref={measure.index === activeMeasure ? activeMeasureRef : undefined} className={cn('transition-opacity', activeMeasure !== null && measure.index !== activeMeasure && 'opacity-80')}>
            <MeasureView measure={measure} mode={mode} tonicPc={tonicPc} currentTime={currentTime} zoom={zoom} settings={document.settings} />
          </div>
        ))}
      </div>
    </div>
  )
}
