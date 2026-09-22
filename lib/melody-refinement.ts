import type { MusicalEvent, NoteEvent, RestEvent } from '@/lib/musical-events'
import type { MelodyPhrase, MelodyTranscription } from '@/lib/melody-extraction'

export const MICRO_GAP_SECONDS = 0.04
export const ARTIFACT_MAX_DURATION = 0.18
export const MEANINGFUL_REST_SECONDS = 0.22
export const UNCERTAIN_CONFIDENCE = 0.65

export interface MelodyRefinementStats {
  inputEvents: number
  mergedSameNoteEvents: number
  removedArtifacts: number
  mergedMicroscopicRests: number
  uncertainEvents: number
  outputEvents: number
}

export interface RefinedMelodyTranscription extends MelodyTranscription {
  refinement: MelodyRefinementStats
}

function makeRest(id: string, startTime: number, endTime: number, source?: RestEvent): RestEvent {
  return {
    type: 'rest',
    id,
    startTime,
    endTime,
    duration: Math.max(0, endTime - startTime),
    beatTiming: source?.beatTiming,
  }
}

function cloneNote(note: NoteEvent, startTime = note.startTime, endTime = note.endTime): NoteEvent {
  return {
    ...note,
    startTime,
    endTime,
    duration: Math.max(0, endTime - startTime),
  }
}

function mergeNotes(first: NoteEvent, second: NoteEvent): NoteEvent {
  const endTime = Math.max(first.endTime, second.endTime)
  const weight = Math.max(0.001, first.duration + second.duration)
  return {
    ...first,
    endTime,
    duration: Math.max(0, endTime - first.startTime),
    frequency: (first.frequency * first.duration + second.frequency * second.duration) / weight,
    cents: (first.cents * first.duration + second.cents * second.duration) / weight,
    confidence: Math.min(first.confidence, second.confidence),
    uncertain: Boolean(first.uncertain || second.uncertain),
  }
}

function phraseForEvents(events: MusicalEvent[]) {
  const phrases: MelodyPhrase[] = []
  let notes: NoteEvent[] = []
  const flush = () => {
    if (!notes.length) return
    phrases.push({
      id: `phrase-${String(phrases.length + 1).padStart(2, '0')}`,
      startTime: notes[0].startTime,
      endTime: notes[notes.length - 1].endTime,
      eventIds: notes.map((note) => note.id),
    })
    notes = []
  }

  events.forEach((event, index) => {
    if (event.type === 'rest') {
      if (event.duration >= MEANINGFUL_REST_SECONDS) flush()
      return
    }
    const previous = events[index - 1]
    const priorNote = notes[notes.length - 1]
    if (priorNote && (event.startTime - priorNote.endTime > MEANINGFUL_REST_SECONDS || Math.abs(event.midiNote - priorNote.midiNote) > 24)) flush()
    if (previous?.type === 'rest' && previous.duration >= MEANINGFUL_REST_SECONDS) flush()
    notes.push(event)
  })
  flush()
  return phrases
}

function refineEvents(events: MusicalEvent[]) {
  const input = events
    .filter((event) => Number.isFinite(event.startTime) && Number.isFinite(event.endTime) && event.endTime > event.startTime)
    .sort((a, b) => a.startTime - b.startTime)
    .map((event) => event.type === 'note' ? cloneNote(event) : makeRest(event.id, event.startTime, event.endTime, event))
  let mergedSameNoteEvents = 0
  let removedArtifacts = 0
  let mergedMicroscopicRests = 0
  const output: MusicalEvent[] = []

  for (const event of input) {
    const previous = output.at(-1)
    if (event.type === 'rest' && event.duration <= MICRO_GAP_SECONDS && previous?.type === 'note') {
      mergedMicroscopicRests += 1
      continue
    }
    if (event.type === 'note' && previous?.type === 'note' && event.midiNote === previous.midiNote && event.startTime - previous.endTime <= MICRO_GAP_SECONDS) {
      output[output.length - 1] = mergeNotes(previous, event)
      mergedSameNoteEvents += 1
      continue
    }
    output.push(event)
  }

  const cleaned: MusicalEvent[] = []
  for (let index = 0; index < output.length; index += 1) {
    const event = output[index]
    const previous = cleaned.at(-1)
    const next = output[index + 1]
    if (
      event.type === 'note' &&
      previous?.type === 'note' &&
      next?.type === 'note' &&
      event.duration <= ARTIFACT_MAX_DURATION &&
      previous.midiNote === next.midiNote &&
      event.midiNote !== previous.midiNote &&
      event.confidence < Math.min(previous.confidence, next.confidence)
    ) {
      previous.endTime = next.startTime
      previous.duration = Math.max(0, previous.endTime - previous.startTime)
      removedArtifacts += 1
      continue
    }
    cleaned.push(event)
  }

  const refined: MusicalEvent[] = cleaned.map((event, index): MusicalEvent => {
    if (event.type === 'rest') return event
    const previous = cleaned[index - 1]
    const next = cleaned[index + 1]
    const continuity = previous?.type === 'note' && next?.type === 'note'
      ? Math.max(0, 1 - Math.max(Math.abs(event.midiNote - previous.midiNote), Math.abs(next.midiNote - event.midiNote)) / 24)
      : 0.75
    const timing = event.beatTiming ? 1 : 0.75
    const stability = Math.min(1, Math.max(0, continuity * 0.6 + timing * 0.4))
    const confidence = Math.min(event.confidence, event.confidence * (0.75 + stability * 0.25))
    return {
      ...event,
      confidence,
      uncertain: confidence < UNCERTAIN_CONFIDENCE || event.duration < MICRO_GAP_SECONDS,
    }
  })

  return {
    events: refined,
    stats: {
      inputEvents: events.length,
      mergedSameNoteEvents,
      removedArtifacts,
      mergedMicroscopicRests,
      uncertainEvents: refined.filter((event) => event.type === 'note' && event.uncertain).length,
      outputEvents: refined.length,
    },
  }
}

export function refineEstimatedMelody(melody: MelodyTranscription): RefinedMelodyTranscription {
  const refined = refineEvents(melody.transcription.events)
  return {
    version: 1,
    source: melody.source,
    transcription: {
      type: 'estimated-melody',
      confidence: refined.events.filter((event): event is NoteEvent => event.type === 'note').reduce(
        (sum, event, _, notes) => sum + event.confidence / Math.max(1, notes.length),
        0,
      ),
      events: refined.events,
      phrases: phraseForEvents(refined.events),
    },
    refinement: refined.stats,
  }
}
