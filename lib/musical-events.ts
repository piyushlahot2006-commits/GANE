import type { PitchNoteEvent } from '@/lib/audio-analysis'

export const MUSICAL_EVENT_VERSION = 1
export const REST_MERGE_THRESHOLD = 0.08
export const MIN_EVENT_DURATION = 0.15

export interface BeatTiming {
  beatPosition: number
  beatDuration: number
}

export interface NoteEvent {
  type: 'note'
  id: string
  startTime: number
  endTime: number
  duration: number
  frequency: number
  midiNote: number
  westernNote: string
  octave: number
  cents: number
  confidence: number
  uncertain?: boolean
  beatTiming?: BeatTiming
}

export interface RestEvent {
  type: 'rest'
  id: string
  startTime: number
  endTime: number
  duration: number
  beatTiming?: BeatTiming
}

export type MusicalEvent = NoteEvent | RestEvent

export interface MusicalEventDocument {
  version: number
  source: {
    duration: number
    bpm: number | null
  }
  events: MusicalEvent[]
}

function durationFor(startTime: number, endTime: number) {
  return Math.max(0, endTime - startTime)
}

function beatTimingFor(startTime: number, bpm: number | null): BeatTiming | undefined {
  if (!bpm || !Number.isFinite(bpm) || bpm <= 0) return undefined
  const beatDuration = 60 / bpm
  return { beatPosition: startTime / beatDuration, beatDuration }
}

function makeRest(id: string, startTime: number, endTime: number, bpm: number | null): RestEvent {
  return {
    type: 'rest',
    id,
    startTime,
    endTime,
    duration: durationFor(startTime, endTime),
    beatTiming: beatTimingFor(startTime, bpm),
  }
}

function noteFromPitch(id: string, pitch: PitchNoteEvent, bpm: number | null): NoteEvent {
  const octaveMatch = pitch.westernNote.match(/(-?\d+)$/)
  return {
    type: 'note',
    id,
    startTime: pitch.startTime,
    endTime: pitch.endTime,
    duration: durationFor(pitch.startTime, pitch.endTime),
    frequency: pitch.frequency,
    midiNote: pitch.midiNote,
    westernNote: pitch.westernNote,
    octave: octaveMatch ? Number(octaveMatch[1]) : Math.floor(pitch.midiNote / 12) - 1,
    cents: pitch.cents,
    confidence: pitch.confidence,
    beatTiming: beatTimingFor(pitch.startTime, bpm),
  }
}

export function buildMusicalEvents(
  pitchEvents: PitchNoteEvent[],
  duration: number,
  bpm: number | null,
): MusicalEvent[] {
  const source = pitchEvents
    .filter((event) => Number.isFinite(event.startTime) && Number.isFinite(event.endTime))
    .sort((a, b) => a.startTime - b.startTime)
  const events: MusicalEvent[] = []
  let cursor = 0

  for (const pitch of source) {
    const startTime = Math.max(cursor, pitch.startTime)
    const endTime = Math.min(Math.max(startTime, pitch.endTime), duration)
    if (startTime - cursor >= REST_MERGE_THRESHOLD) events.push(makeRest(`rest-${events.length}`, cursor, startTime, bpm))
    if (endTime - startTime >= MIN_EVENT_DURATION) {
      events.push(noteFromPitch(`note-${events.length}`, { ...pitch, startTime, endTime }, bpm))
      cursor = endTime
    }
  }

  if (duration - cursor >= REST_MERGE_THRESHOLD) events.push(makeRest(`rest-${events.length}`, cursor, duration, bpm))
  return events
}

export function getEventAtTime(events: MusicalEvent[], time: number): MusicalEvent | null {
  let low = 0
  let high = events.length - 1
  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    const event = events[middle]
    if (time < event.startTime) high = middle - 1
    else if (time >= event.endTime) low = middle + 1
    else return event
  }
  return null
}

export function getNextEvent(events: MusicalEvent[], event: MusicalEvent): MusicalEvent | null {
  const index = events.findIndex((candidate) => candidate.id === event.id)
  return index >= 0 ? events[index + 1] ?? null : null
}

export function getPreviousEvent(events: MusicalEvent[], event: MusicalEvent): MusicalEvent | null {
  const index = events.findIndex((candidate) => candidate.id === event.id)
  return index > 0 ? events[index - 1] : null
}

export function getEventsInRange(events: MusicalEvent[], startTime: number, endTime: number) {
  return events.filter((event) => event.endTime > startTime && event.startTime < endTime)
}

export interface QuantizedTiming {
  rawStartTime: number
  rawEndTime: number
  beat: number | null
  beatDuration: number | null
}

export function quantizeEventTiming(event: MusicalEvent, bpm: number | null, tolerance = 0.12): QuantizedTiming {
  if (!bpm || !Number.isFinite(bpm) || bpm <= 0) return { rawStartTime: event.startTime, rawEndTime: event.endTime, beat: null, beatDuration: null }
  const beatDuration = 60 / bpm
  const rawBeat = event.startTime / beatDuration
  const beat = Math.round(rawBeat)
  return {
    rawStartTime: event.startTime,
    rawEndTime: event.endTime,
    beat: Math.abs(rawBeat - beat) <= tolerance ? beat : null,
    beatDuration,
  }
}

export function validateMusicalEvents(events: MusicalEvent[]) {
  const errors: string[] = []
  let previousEnd = 0
  events.forEach((event, index) => {
    if (!Number.isFinite(event.startTime) || !Number.isFinite(event.endTime) || !Number.isFinite(event.duration)) errors.push(`event ${index}: non-finite timing`)
    if (event.startTime < 0 || event.endTime < 0) errors.push(`event ${index}: negative timestamp`)
    if (event.endTime < event.startTime || event.duration < 0) errors.push(`event ${index}: invalid duration`)
    if (Math.abs(event.duration - (event.endTime - event.startTime)) > 0.001) errors.push(`event ${index}: duration mismatch`)
    if (event.startTime < previousEnd - 0.001) errors.push(`event ${index}: overlaps previous event`)
    if (event.type === 'note') {
      if (!Number.isFinite(event.frequency) || event.frequency <= 0) errors.push(`event ${index}: invalid frequency`)
      if (!Number.isInteger(event.midiNote) || event.midiNote < 0 || event.midiNote > 127) errors.push(`event ${index}: invalid MIDI note`)
      if (!Number.isFinite(event.cents)) errors.push(`event ${index}: invalid cents`)
      if (!Number.isFinite(event.confidence) || event.confidence < 0 || event.confidence > 1) errors.push(`event ${index}: invalid confidence`)
    }
    previousEnd = Math.max(previousEnd, event.endTime)
  })
  return { valid: errors.length === 0, errors }
}

export function createMusicalEventDocument(events: MusicalEvent[], duration: number, bpm: number | null): MusicalEventDocument {
  const validation = validateMusicalEvents(events)
  if (!validation.valid) throw new Error(`Invalid musical events: ${validation.errors.join('; ')}`)
  return { version: MUSICAL_EVENT_VERSION, source: { duration, bpm }, events }
}
