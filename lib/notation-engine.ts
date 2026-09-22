import type { MusicalEvent, NoteEvent, RestEvent } from '@/lib/musical-events'
import type { MelodyPhrase } from '@/lib/melody-extraction'

export const NOTATION_VERSION = 1
export const DEFAULT_TIME_SIGNATURE: { numerator: number; denominator: number } = { numerator: 4, denominator: 4 }
const QUANTIZATION_SUBDIVISION = 0.25
const QUANTIZATION_TOLERANCE = 0.18

export type DurationName = 'whole' | 'dotted-half' | 'half' | 'dotted-quarter' | 'quarter' | 'dotted-eighth' | 'eighth' | 'sixteenth'
export type Accidental = 'natural' | 'sharp' | 'flat'
export type QuantizationStrength = 'off' | 'low' | 'medium' | 'high'
export type ConfidenceDisplay = 'hidden' | 'subtle' | 'detailed'

export interface NotationSettings {
  timeSignature: { numerator: number; denominator: number }
  quantization: QuantizationStrength
  keySignature: string | null
  showMeasureNumbers: boolean
  showBeatGrid: boolean
  showUncertainNotes: boolean
  confidenceDisplay: ConfidenceDisplay
}

export interface NotationTiming {
  rawStartTime: number
  rawDuration: number
  startBeat: number
  durationBeats: number
  quantizedStartBeat: number | null
  quantizedDurationBeats: number | null
}

interface NotationEventBase extends NotationTiming {
  id: string
  sourceEventId: string
  measureIndex: number
}

export interface NotationNote extends NotationEventBase {
  type: 'note'
  midiNote: number
  westernNote: string
  octave: number
  pitchClass: number
  accidental: Accidental
  durationName: DurationName
  confidence: number
  uncertain: boolean
  tieStart: boolean
  tieEnd: boolean
}

export interface NotationRest extends NotationEventBase {
  type: 'rest'
  durationName: DurationName
}

export type NotationEvent = NotationNote | NotationRest

export interface NotationMeasure {
  index: number
  startBeat: number
  endBeat: number
  events: NotationEvent[]
}

export interface NotationDocument {
  version: number
  timeSignature: { numerator: number; denominator: number }
  tempo: { bpm: number | null }
  keySignature: string | null
  measures: NotationMeasure[]
  phrases: MelodyPhrase[]
  settings: NotationSettings
}

const DURATIONS: Array<{ beats: number; name: DurationName }> = [
  { beats: 4, name: 'whole' },
  { beats: 3, name: 'dotted-half' },
  { beats: 2, name: 'half' },
  { beats: 1.5, name: 'dotted-quarter' },
  { beats: 1, name: 'quarter' },
  { beats: 0.75, name: 'dotted-eighth' },
  { beats: 0.5, name: 'eighth' },
  { beats: 0.25, name: 'sixteenth' },
]

function durationName(beats: number): DurationName {
  return DURATIONS.reduce((closest, candidate) =>
    Math.abs(candidate.beats - beats) < Math.abs(closest.beats - beats) ? candidate : closest,
  ).name
}

function quantize(value: number, strength: QuantizationStrength) {
  if (strength === 'off') return null
  const tolerance = strength === 'low' ? 0.12 : strength === 'medium' ? 0.22 : 0.35
  const subdivision = strength === 'high' ? 0.25 : 0.5
  const quantized = Math.round(value / subdivision) * subdivision
  return Math.abs(value - quantized) <= tolerance ? quantized : null
}

function accidentalFor(note: NoteEvent, keySignature: string | null): Accidental {
  if (keySignature && ['F', 'Bb', 'Eb'].includes(keySignature)) {
    if (['C#4', 'C#5', 'C#3'].includes(note.westernNote)) return 'flat'
  }
  if (note.westernNote.includes('#')) return 'sharp'
  if (note.westernNote.includes('b')) return 'flat'
  return 'natural'
}

function makeNote(
  source: NoteEvent,
  segmentStart: number,
  segmentEnd: number,
  measureIndex: number,
  beatDuration: number,
  settings: NotationSettings,
  tieStart: boolean,
  tieEnd: boolean,
): NotationNote {
  const startBeat = segmentStart / beatDuration
  const durationBeats = Math.max(0, (segmentEnd - segmentStart) / beatDuration)
  return {
    type: 'note',
    id: `${source.id}-m${measureIndex}`,
    sourceEventId: source.id,
    measureIndex,
    rawStartTime: segmentStart,
    rawDuration: Math.max(0, segmentEnd - segmentStart),
    startBeat,
    durationBeats,
    quantizedStartBeat: quantize(startBeat, settings.quantization),
    quantizedDurationBeats: quantize(durationBeats, settings.quantization),
    midiNote: source.midiNote,
    westernNote: source.westernNote,
    octave: source.octave,
    pitchClass: ((source.midiNote % 12) + 12) % 12,
    accidental: accidentalFor(source, settings.keySignature),
    durationName: durationName(durationBeats),
    confidence: source.confidence,
    uncertain: Boolean(source.uncertain),
    tieStart,
    tieEnd,
  }
}

function makeRest(source: RestEvent, segmentStart: number, segmentEnd: number, measureIndex: number, beatDuration: number, settings: NotationSettings): NotationRest {
  const startBeat = segmentStart / beatDuration
  const durationBeats = Math.max(0, (segmentEnd - segmentStart) / beatDuration)
  return {
    type: 'rest',
    id: `${source.id}-m${measureIndex}`,
    sourceEventId: source.id,
    measureIndex,
    rawStartTime: segmentStart,
    rawDuration: Math.max(0, segmentEnd - segmentStart),
    startBeat,
    durationBeats,
    quantizedStartBeat: quantize(startBeat, settings.quantization),
    quantizedDurationBeats: quantize(durationBeats, settings.quantization),
    durationName: durationName(durationBeats),
  }
}

export function buildNotationDocument(
  events: MusicalEvent[],
  duration: number,
  bpm: number | null,
  phrases: MelodyPhrase[] = [],
  timeSignature = DEFAULT_TIME_SIGNATURE,
  settings?: Partial<NotationSettings>,
): NotationDocument {
  const notationSettings: NotationSettings = {
    timeSignature,
    quantization: 'low',
    keySignature: null,
    showMeasureNumbers: true,
    showBeatGrid: false,
    showUncertainNotes: true,
    confidenceDisplay: 'subtle',
    ...settings,
  }
  const beatDuration = bpm && bpm > 0 ? 60 / bpm : 1
  const beatsPerMeasure = timeSignature.numerator * (4 / timeSignature.denominator)
  const totalBeats = Math.max(1, duration / beatDuration)
  const measureCount = Math.max(1, Math.ceil(totalBeats / beatsPerMeasure))
  const measures: NotationMeasure[] = Array.from({ length: measureCount }, (_, index) => ({
    index,
    startBeat: index * beatsPerMeasure,
    endBeat: (index + 1) * beatsPerMeasure,
    events: [],
  }))

  for (const source of events) {
    const sourceStart = Math.max(0, source.startTime)
    const sourceEnd = Math.min(duration, Math.max(sourceStart, source.endTime))
    if (sourceEnd <= sourceStart) continue
    let segmentStart = sourceStart
    while (segmentStart < sourceEnd) {
      const measureIndex = Math.min(measures.length - 1, Math.floor(segmentStart / beatDuration / beatsPerMeasure))
      const measure = measures[measureIndex]
      const boundaryTime = Math.min(sourceEnd, (measure.endBeat * beatDuration))
      const segmentEnd = Math.max(segmentStart, boundaryTime)
      if (source.type === 'note') {
        measure.events.push(makeNote(source, segmentStart, segmentEnd, measureIndex, beatDuration, notationSettings, segmentStart > sourceStart, segmentEnd < sourceEnd))
      } else {
        measure.events.push(makeRest(source, segmentStart, segmentEnd, measureIndex, beatDuration, notationSettings))
      }
      if (segmentEnd <= segmentStart) break
      segmentStart = segmentEnd
    }
  }

  return {
    version: NOTATION_VERSION,
    timeSignature,
    tempo: { bpm },
    keySignature: notationSettings.keySignature,
    measures,
    phrases,
    settings: notationSettings,
  }
}
