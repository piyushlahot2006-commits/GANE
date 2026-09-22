import type { BeatTiming, MusicalEvent, NoteEvent, RestEvent } from '@/lib/musical-events'

const MIN_MELODY_CONFIDENCE = 0.5
const SHORT_NOTE_SECONDS = 0.2
const REST_PHRASE_THRESHOLD = 0.45
const MAX_CONTINUITY_JUMP = 24
const MELODY_GAP_TOLERANCE = 0.22

export interface MelodyPhrase {
  id: string
  startTime: number
  endTime: number
  eventIds: string[]
}

export interface MelodyTranscription {
  version: 1
  source: {
    duration: number
    bpm: number | null
  }
  transcription: {
    type: 'estimated-melody'
    confidence: number
    events: MusicalEvent[]
    phrases: MelodyPhrase[]
  }
}

function rest(id: string, startTime: number, endTime: number, beatTiming?: BeatTiming): RestEvent {
  return {
    type: 'rest',
    id,
    startTime,
    endTime,
    duration: Math.max(0, endTime - startTime),
    beatTiming,
  }
}

function cloneNote(note: NoteEvent, id: string): NoteEvent {
  return { ...note, id, duration: Math.max(0, note.endTime - note.startTime) }
}

function noteEvidence(note: NoteEvent, previous: NoteEvent | null, next: NoteEvent | null) {
  const durationEvidence = Math.min(1, note.duration / SHORT_NOTE_SECONDS)
  const previousJump = previous ? Math.abs(note.midiNote - previous.midiNote) : 0
  const nextJump = next ? Math.abs(next.midiNote - note.midiNote) : 0
  const continuity = Math.max(0, 1 - Math.max(previousJump, nextJump) / MAX_CONTINUITY_JUMP)
  return note.confidence * 0.65 + durationEvidence * 0.2 + continuity * 0.15
}

function extractPhrases(events: MusicalEvent[]) {
  const phrases: MelodyPhrase[] = []
  let phraseNotes: NoteEvent[] = []
  const flush = () => {
    if (!phraseNotes.length) return
    phrases.push({
      id: `phrase-${phrases.length}`,
      startTime: phraseNotes[0].startTime,
      endTime: phraseNotes[phraseNotes.length - 1].endTime,
      eventIds: phraseNotes.map((note) => note.id),
    })
    phraseNotes = []
  }

  for (const event of events) {
    if (event.type === 'rest') {
      if (event.duration >= REST_PHRASE_THRESHOLD) flush()
      continue
    }
    phraseNotes.push(event)
  }
  flush()
  return phrases
}

export function extractEstimatedMelody(events: MusicalEvent[], duration: number, bpm: number | null): MelodyTranscription {
  const notes = events.filter((event): event is NoteEvent => event.type === 'note')
  const accepted = new Set<string>()

  notes.forEach((note, index) => {
    const previous = notes[index - 1] ?? null
    const next = notes[index + 1] ?? null
    const evidence = noteEvidence(note, previous, next)
    const supportedShortNote = note.duration < SHORT_NOTE_SECONDS && (
      note.confidence >= 0.78 ||
      (previous !== null && next !== null && Math.abs(note.midiNote - previous.midiNote) <= 12 && Math.abs(next.midiNote - note.midiNote) <= 12)
    )
    if (note.confidence >= MIN_MELODY_CONFIDENCE && (note.duration >= SHORT_NOTE_SECONDS || supportedShortNote || evidence >= 0.7)) accepted.add(note.id)
  })

  const selected: MusicalEvent[] = []
  let cursor = 0
  let eventIndex = 0
  for (const event of events) {
    if (event.type === 'rest') continue
    if (!accepted.has(event.id)) continue
    if (event.startTime - cursor >= MELODY_GAP_TOLERANCE) selected.push(rest(`melody-rest-${eventIndex++}`, cursor, event.startTime, event.beatTiming))
    selected.push(cloneNote(event, `melody-note-${eventIndex++}`))
    cursor = event.endTime
  }
  if (duration - cursor >= MELODY_GAP_TOLERANCE) selected.push(rest(`melody-rest-${eventIndex}`, cursor, duration))

  const noteEvents = selected.filter((event): event is NoteEvent => event.type === 'note')
  const confidence = noteEvents.length
    ? noteEvents.reduce((sum, event) => sum + event.confidence, 0) / noteEvents.length
    : 0
  return {
    version: 1,
    source: { duration, bpm },
    transcription: {
      type: 'estimated-melody',
      confidence,
      events: selected,
      phrases: extractPhrases(selected),
    },
  }
}
