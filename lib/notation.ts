import { measures, type MockNote } from '@/lib/mock-data'

export type NotationMode = 'western' | 'sargam' | 'both'

/* Movable Sa — the reference tonic. Values are pitch classes (0 = C). */
export const TONICS: { value: number; label: string }[] = [
  { value: 0, label: 'C' },
  { value: 1, label: 'C#' },
  { value: 2, label: 'D' },
  { value: 3, label: 'D#' },
  { value: 4, label: 'E' },
  { value: 5, label: 'F' },
  { value: 6, label: 'F#' },
  { value: 7, label: 'G' },
  { value: 8, label: 'G#' },
  { value: 9, label: 'A' },
  { value: 10, label: 'A#' },
  { value: 11, label: 'B' },
]

export const OCTAVE_MODES = ['Auto', 'Low', 'Mid', 'High'] as const
export type OctaveMode = (typeof OCTAVE_MODES)[number]

export const DENSITY_MODES = ['Simple', 'Detailed'] as const
export type DensityMode = (typeof DENSITY_MODES)[number]

/* Staff step 0 = E4. Diatonic letters cycle C D E F G A B by global white-key index. */
const G_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/* Sargam swaras keyed by semitone interval above Sa. Shuddha + komal/tivra variants. */
const SARGAM: Record<number, { deva: string; latin: string }> = {
  0: { deva: 'सा', latin: 'Sa' },
  1: { deva: 'रे॒', latin: 'Re\u266D' },
  2: { deva: 'रे', latin: 'Re' },
  3: { deva: 'ग॒', latin: 'Ga\u266D' },
  4: { deva: 'ग', latin: 'Ga' },
  5: { deva: 'म', latin: 'Ma' },
  6: { deva: 'म॑', latin: 'Ma\u266F' },
  7: { deva: 'प', latin: 'Pa' },
  8: { deva: 'ध॒', latin: 'Dha\u266D' },
  9: { deva: 'ध', latin: 'Dha' },
  10: { deva: 'नि॒', latin: 'Ni\u266D' },
  11: { deva: 'नि', latin: 'Ni' },
}

export interface ResolvedNote {
  western: string
  westernFull: string
  octave: number
  midi: number
  freq: number
  intervalFromTonic: number
  sargam: string
  sargamLatin: string
}

function freqForMidi(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

function buildResolved(pc: number, octave: number, western: string, tonicPc: number): ResolvedNote {
  const midi = (octave + 1) * 12 + pc
  const interval = (((pc - tonicPc) % 12) + 12) % 12
  const s = SARGAM[interval]
  return {
    western,
    westernFull: `${western}${octave}`,
    octave,
    midi,
    freq: freqForMidi(midi),
    intervalFromTonic: interval,
    sargam: s.deva,
    sargamLatin: s.latin,
  }
}

/* Resolve a staff step (+ optional accidental) into full note data for a given tonic. */
export function resolveStep(
  step: number,
  accidental: '#' | 'b' | undefined,
  tonicPc: number,
): ResolvedNote {
  const g = 30 + step // E4 = white-key index 30
  const letter = G_LETTERS[((g % 7) + 7) % 7]
  const octave = Math.floor(g / 7)
  let pc = SEMITONE[letter]
  if (accidental === '#') pc += 1
  if (accidental === 'b') pc -= 1
  pc = ((pc % 12) + 12) % 12
  const western = `${letter}${accidental ?? ''}`
  return buildResolved(pc, octave, western, tonicPc)
}

/* Resolve an absolute MIDI value (used for mock "detected" pitch). */
export function resolveMidi(midi: number, tonicPc: number): ResolvedNote {
  const pc = ((midi % 12) + 12) % 12
  const octave = Math.floor(midi / 12) - 1
  return buildResolved(pc, octave, SHARP_NAMES[pc], tonicPc)
}

export interface SeqNote extends MockNote {
  measureIndex: number
  index: number
}

/* Flat, ordered note sequence shared by the notation renderer and the timeline. */
export const noteSequence: SeqNote[] = (() => {
  const out: SeqNote[] = []
  let index = 0
  measures.forEach((m, measureIndex) => {
    m.notes.forEach((n) => {
      out.push({ ...n, measureIndex, index })
      index += 1
    })
  })
  return out
})()

export type PerfStatus = 'on' | 'flat' | 'sharp' | 'off'

export interface PerfSample {
  cents: number
  status: PerfStatus
}

/* Deterministic mock pitch deviation so the UI is stable across renders.
   Represents the future pitch-detection output — not a real measurement. */
export function mockPerformance(index: number): PerfSample {
  const seed = Math.sin((index + 1) * 12.9898) * 43758.5453
  const frac = seed - Math.floor(seed)
  const cents = Math.round((frac * 2 - 1) * 42)
  const abs = Math.abs(cents)
  let status: PerfStatus
  if (abs <= 8) status = 'on'
  else if (abs <= 26) status = cents < 0 ? 'flat' : 'sharp'
  else status = 'off'
  return { cents, status }
}

export const STATUS_META: Record<PerfStatus, { label: string; color: string; timeline: string }> = {
  on: { label: 'ON TARGET', color: 'var(--cyan)', timeline: '\u2713' },
  flat: { label: 'SLIGHTLY FLAT', color: 'var(--primary)', timeline: '\u25B3' },
  sharp: { label: 'SLIGHTLY SHARP', color: 'var(--primary)', timeline: '\u25B3' },
  off: { label: 'OFF TARGET', color: 'var(--magenta)', timeline: '\u2715' },
}

export function durationGlyph(dur: MockNote['dur']) {
  if (dur === 'e') return '\u266A' // eighth
  if (dur === 'h') return '\uD834\uDD5E' // half
  return '\u2669' // quarter
}
