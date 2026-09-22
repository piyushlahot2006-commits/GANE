import {
  buildMusicalEvents,
  createMusicalEventDocument,
  type MusicalEventDocument,
} from '@/lib/musical-events'
import { extractEstimatedMelody, type MelodyTranscription } from '@/lib/melody-extraction'
import { refineEstimatedMelody, type RefinedMelodyTranscription } from '@/lib/melody-refinement'
import { buildNotationDocument, type NotationDocument } from '@/lib/notation-engine'

export type AudioAnalysisStatus = 'IDLE' | 'ANALYZING' | 'COMPLETE' | 'LOW_CONFIDENCE' | 'ERROR'

export interface PitchDetectionResult {
  frequency: number | null
  note: string | null
  cents: number | null
  confidence: number
  midi: number | null
}

export interface PitchNoteEvent {
  startTime: number
  endTime: number
  frequency: number
  midiNote: number
  westernNote: string
  confidence: number
  cents: number
}

export interface PitchTrackingStats {
  rawFrameCount: number
  finalEventCount: number
  lowConfidenceFrames: number
  discardedTransitionArtifacts: number
  averageConfidence: number
}

export interface AudioAnalysisResult {
  duration: number | null
  sampleRate: number | null
  channels: number | null
  fileType: string | null
  fileName: string | null
  bpm: number | null
  bpmConfidence: number
  pitch: PitchDetectionResult
  pitchTimeline: PitchNoteEvent[]
  pitchTrackingStats: PitchTrackingStats
  musicalEvents: MusicalEventDocument
  rawMelody: MelodyTranscription
  melody: RefinedMelodyTranscription
  notation: NotationDocument
  key?: string
}

export interface AudioAnalysisState {
  status: AudioAnalysisStatus
  result: AudioAnalysisResult | null
  error: string | null
  progress: number | null
}

function formatFileType(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension === 'mp3' || file.type === 'audio/mpeg') return 'MP3'
  if (extension === 'wav' || file.type === 'audio/wav' || file.type === 'audio/x-wav') return 'WAV'
  if (extension === 'm4a' || file.type === 'audio/mp4' || file.type === 'audio/x-m4a') return 'M4A'
  return file.type ? file.type.toUpperCase() : null
}

const ANALYSIS_WINDOW_SECONDS = 90
const ENVELOPE_BLOCK_SIZE = 1024
const MIN_BPM = 40
const MAX_BPM = 240

function estimateTempo(buffer: AudioBuffer) {
  const sampleCount = Math.min(buffer.length, Math.floor(buffer.sampleRate * ANALYSIS_WINDOW_SECONDS))
  const blockCount = Math.floor(sampleCount / ENVELOPE_BLOCK_SIZE)
  if (blockCount < 8) return { bpm: null, confidence: 0 }

  const envelope = new Float32Array(blockCount)
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const samples = buffer.getChannelData(channel)
    for (let block = 0; block < blockCount; block += 1) {
      const start = block * ENVELOPE_BLOCK_SIZE
      let energy = 0
      for (let index = start; index < start + ENVELOPE_BLOCK_SIZE; index += 1) energy += samples[index] ** 2
      envelope[block] += Math.sqrt(energy / ENVELOPE_BLOCK_SIZE)
    }
  }
  for (let index = 0; index < envelope.length; index += 1) envelope[index] /= buffer.numberOfChannels

  const onset = new Float32Array(envelope.length)
  let mean = 0
  for (const value of envelope) mean += value
  mean /= envelope.length
  let variance = 0
  for (let index = 0; index < envelope.length; index += 1) {
    const delta = envelope[index] - (envelope[index - 1] ?? envelope[index])
    onset[index] = Math.max(0, delta)
    variance += (envelope[index] - mean) ** 2
  }
  if (variance < 1e-8) return { bpm: null, confidence: 0 }

  const blockRate = buffer.sampleRate / ENVELOPE_BLOCK_SIZE
  const minLag = Math.max(1, Math.floor((blockRate * 60) / MAX_BPM))
  const maxLag = Math.min(onset.length - 2, Math.ceil((blockRate * 60) / MIN_BPM))
  const scores: Array<{ lag: number; score: number }> = []
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let score = 0
    let energy = 0
    for (let index = lag; index < onset.length; index += 1) {
      score += onset[index] * onset[index - lag]
      energy += onset[index] ** 2
    }
    scores.push({ lag, score: energy ? score / energy : 0 })
  }
  scores.sort((a, b) => b.score - a.score)
  const best = scores[0]
  if (!best || best.score <= 0) return { bpm: null, confidence: 0 }

  const maxOnset = Math.max(...onset)
  const peaks: number[] = []
  for (let index = 1; index < onset.length - 1; index += 1) {
    if (onset[index] >= onset[index - 1] && onset[index] >= onset[index + 1] && onset[index] > maxOnset * 0.25) {
      if (peaks.length === 0 || index - peaks[peaks.length - 1] > 2) peaks.push(index)
    }
  }
  const intervals = new Map<number, number>()
  for (let index = 1; index < peaks.length; index += 1) {
    const interval = peaks[index] - peaks[index - 1]
    if (interval >= minLag && interval <= maxLag) intervals.set(interval, (intervals.get(interval) ?? 0) + 1)
  }
  const intervalWinner = [...intervals.entries()].sort((a, b) => b[1] - a[1])[0]
  if (intervalWinner && intervalWinner[1] >= 3) {
    const bpm = Math.round((blockRate * 60) / intervalWinner[0])
    const confidence = Math.min(1, intervalWinner[1] / Math.max(4, peaks.length - 1))
    return { bpm: bpm >= MIN_BPM && bpm <= MAX_BPM ? bpm : null, confidence }
  }

  const candidates = [best.lag / 2, best.lag, best.lag * 2]
    .filter((lag) => lag >= minLag && lag <= maxLag)
    .map((lag) => ({ lag, score: scores.find((candidate) => Math.abs(candidate.lag - lag) <= 1)?.score ?? 0 }))
    .sort((a, b) => b.score - a.score)
  const strongest = candidates[0] ?? best
  const selected = candidates.find((candidate) => candidate.score >= strongest.score * 0.85) ?? strongest
  const runnerUp = scores.find((candidate) => Math.abs(candidate.lag - selected.lag) > 2)
  const separation = runnerUp ? Math.max(0, selected.score - runnerUp.score) / selected.score : 1
  const confidence = Math.min(1, Math.max(0, separation * Math.min(1, selected.score * 5)))
  const bpm = Math.round((blockRate * 60) / selected.lag)
  return { bpm: bpm >= MIN_BPM && bpm <= MAX_BPM ? bpm : null, confidence }
}

const MIN_PITCH_HZ = 70
const MAX_PITCH_HZ = 1000
const PITCH_ANALYSIS_SECONDS = 0.8
const PITCH_ANALYSIS_RATE = 12000

function unknownPitch(): PitchDetectionResult {
  return { frequency: null, note: null, cents: null, confidence: 0, midi: null }
}

function detectPitch(buffer: AudioBuffer, startSample = 0, windowSeconds = PITCH_ANALYSIS_SECONDS): PitchDetectionResult {
  const availableSamples = Math.max(0, buffer.length - startSample)
  const sourceCount = Math.min(availableSamples, Math.floor(buffer.sampleRate * windowSeconds))
  if (sourceCount < 256 || buffer.numberOfChannels === 0) return unknownPitch()

  const step = Math.max(1, Math.ceil(buffer.sampleRate / PITCH_ANALYSIS_RATE))
  const sampleRate = buffer.sampleRate / step
  const sampleCount = Math.floor(sourceCount / step)
  const samples = new Float32Array(sampleCount)
  for (let index = 0; index < sampleCount; index += 1) {
    const sourceIndex = startSample + index * step
    let value = 0
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) value += buffer.getChannelData(channel)[sourceIndex]
    samples[index] = value / buffer.numberOfChannels
  }

  let mean = 0
  for (const value of samples) mean += value
  mean /= samples.length
  let energy = 0
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] -= mean
    energy += samples[index] ** 2
  }
  const rms = Math.sqrt(energy / samples.length)
  if (rms < 0.002) return unknownPitch()

  const minLag = Math.floor(sampleRate / MAX_PITCH_HZ)
  const maxLag = Math.min(samples.length - 2, Math.ceil(sampleRate / MIN_PITCH_HZ))
  let bestLag = 0
  let bestCorrelation = 0
  const correlationByLag = new Map<number, number>()
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let numerator = 0
    let leftEnergy = 0
    let rightEnergy = 0
    for (let index = lag; index < samples.length; index += 1) {
      numerator += samples[index] * samples[index - lag]
      leftEnergy += samples[index] ** 2
      rightEnergy += samples[index - lag] ** 2
    }
    const correlation = numerator / Math.sqrt((leftEnergy * rightEnergy) || 1)
    correlationByLag.set(lag, correlation)
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation
      bestLag = lag
    }
  }
  if (!bestLag || bestCorrelation < 0.55) return unknownPitch()

  let selectedLag = bestLag
  for (let lag = minLag + 1; lag < maxLag; lag += 1) {
    const correlation = correlationByLag.get(lag) ?? 0
    if (
      correlation >= bestCorrelation * 0.65 &&
      correlation >= (correlationByLag.get(lag - 1) ?? 0) &&
      correlation >= (correlationByLag.get(lag + 1) ?? 0)
    ) {
      selectedLag = lag
      break
    }
  }
  const selected = { lag: selectedLag, correlation: correlationByLag.get(selectedLag) ?? bestCorrelation }
  const previous = correlationByLag.get(selected.lag - 1) ?? selected.correlation
  const next = correlationByLag.get(selected.lag + 1) ?? selected.correlation
  const curve = previous - 2 * selected.correlation + next
  const offset = curve < 0 ? 0.5 * (previous - next) / curve : 0
  const refinedLag = selected.lag + Math.max(-0.5, Math.min(0.5, offset))
  const frequency = sampleRate / refinedLag
  const midiFloat = 69 + 12 * Math.log2(frequency / 440)
  const midi = Math.round(midiFloat)
  const targetFrequency = 440 * Math.pow(2, (midi - 69) / 12)
  const cents = 1200 * Math.log2(frequency / targetFrequency)
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const note = `${noteNames[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`
  return {
    frequency,
    note,
    cents,
    confidence: Math.min(1, Math.max(0, (selected.correlation - 0.55) / 0.45)),
    midi,
  }
}

const PITCH_TRACK_WINDOW_SECONDS = 0.24
const PITCH_TRACK_HOP_SECONDS = 0.1
const MIN_NOTE_DURATION = 0.15
const PITCH_CHANGE_CONFIRMATION_FRAMES = 2
const PITCH_CONFIDENCE_THRESHOLD = 0.55
const PITCH_SMOOTHING_RADIUS = 1

interface PitchFrame {
  time: number
  detection: PitchDetectionResult
}

async function trackPitch(buffer: AudioBuffer, onProgress?: (progress: number) => void) {
  const windowSeconds = PITCH_TRACK_WINDOW_SECONDS
  const hopSeconds = PITCH_TRACK_HOP_SECONDS
  const endTime = Math.min(buffer.duration, ANALYSIS_WINDOW_SECONDS)
  const frameCount = Math.max(1, Math.floor(Math.max(0, endTime - windowSeconds) / hopSeconds) + 1)
  const frames: PitchFrame[] = []
  let lowConfidenceFrames = 0
  let confidenceTotal = 0

  for (let frame = 0; frame < frameCount; frame += 1) {
    const startTime = frame * hopSeconds
    const detection = detectPitch(buffer, Math.floor(startTime * buffer.sampleRate), windowSeconds)
    frames.push({ time: startTime, detection })
    confidenceTotal += detection.confidence
    if (detection.midi === null || detection.confidence < PITCH_CONFIDENCE_THRESHOLD) lowConfidenceFrames += 1
    onProgress?.(0.2 + ((frame + 1) / frameCount) * 0.75)
    if (frame % 8 === 0) await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
  }

  const events: PitchNoteEvent[] = []
  let active: PitchNoteEvent | null = null
  let candidateMidi: number | null = null
  let candidateFrames = 0

  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index]
    const nearby = frames.slice(Math.max(0, index - PITCH_SMOOTHING_RADIUS), index + PITCH_SMOOTHING_RADIUS + 1)
    const confidence = nearby.reduce((sum, item) => sum + item.detection.confidence, 0) / nearby.length
    const detection = { ...frame.detection, confidence }
    const reliable = detection.midi !== null && detection.frequency !== null && confidence >= PITCH_CONFIDENCE_THRESHOLD

    if (!reliable) {
      candidateMidi = null
      candidateFrames = 0
      if (active && frame.time - active.startTime >= MIN_NOTE_DURATION) {
        active.endTime = frame.time
        events.push(active)
        active = null
      }
      continue
    }

    if (!active) {
      active = {
        startTime: frame.time,
        endTime: Math.min(endTime, frame.time + hopSeconds),
        frequency: detection.frequency!,
        midiNote: detection.midi!,
        westernNote: detection.note!,
        confidence,
        cents: detection.cents ?? 0,
      }
      continue
    }

    if (detection.midi === active.midiNote) {
      candidateMidi = null
      candidateFrames = 0
      active.endTime = Math.min(endTime, frame.time + hopSeconds)
      active.frequency = (active.frequency + detection.frequency!) / 2
      active.confidence = (active.confidence + confidence) / 2
      active.cents = (active.cents + (detection.cents ?? 0)) / 2
      continue
    }

    if (candidateMidi === detection.midi) candidateFrames += 1
    else {
      candidateMidi = detection.midi
      candidateFrames = 1
    }
    if (candidateFrames < PITCH_CHANGE_CONFIRMATION_FRAMES) continue

    const transitionStart = frame.time - (candidateFrames - 1) * hopSeconds
    active.endTime = Math.max(active.startTime, transitionStart)
    if (active.endTime - active.startTime >= MIN_NOTE_DURATION) events.push(active)
    active = {
      startTime: transitionStart,
      endTime: Math.min(endTime, frame.time + hopSeconds),
      frequency: detection.frequency!,
      midiNote: detection.midi!,
      westernNote: detection.note!,
      confidence,
      cents: detection.cents ?? 0,
    }
    candidateMidi = null
    candidateFrames = 0
  }

  if (active) {
    active.endTime = endTime
    if (active.endTime - active.startTime >= MIN_NOTE_DURATION) events.push(active)
  }

  const cleanedEvents = events.filter((event, index) => {
    if (event.endTime - event.startTime >= 0.25) return true
    const previous = events[index - 1]
    const next = events[index + 1]
    const boundaryTolerance = PITCH_TRACK_HOP_SECONDS * 0.25
    const bracketed = previous && next && Math.abs(previous.endTime - event.startTime) <= boundaryTolerance && Math.abs(next.startTime - event.endTime) <= boundaryTolerance
    const transitional = bracketed && event.midiNote > Math.min(previous.midiNote, next.midiNote) && event.midiNote < Math.max(previous.midiNote, next.midiNote)
    return !transitional
  })
  const discardedTransitionArtifacts = events.length - cleanedEvents.length
  return {
    events: cleanedEvents,
    stats: {
      rawFrameCount: frames.length,
      finalEventCount: cleanedEvents.length,
      lowConfidenceFrames,
      discardedTransitionArtifacts,
      averageConfidence: frames.length ? confidenceTotal / frames.length : 0,
    },
  }
}

export async function analyzeAudioFile(file: File, onProgress?: (progress: number) => void): Promise<AudioAnalysisResult> {
  if (typeof window === 'undefined') {
    throw new Error('Audio analysis is only available in the browser.')
  }

  const AudioContextConstructor = window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextConstructor) {
    throw new Error('This browser does not support local audio analysis.')
  }

  const context = new AudioContextConstructor()
  try {
    onProgress?.(0.05)
    const buffer = await context.decodeAudioData(await file.arrayBuffer())
    onProgress?.(0.15)
    const tempo = estimateTempo(buffer)
    const pitch = detectPitch(buffer)
    const tracking = await trackPitch(buffer, onProgress)
    const musicalEvents = createMusicalEventDocument(
      buildMusicalEvents(tracking.events, Number.isFinite(buffer.duration) ? buffer.duration : 0, tempo.bpm),
      Number.isFinite(buffer.duration) ? buffer.duration : 0,
      tempo.bpm,
    )
    onProgress?.(0.98)
    const rawMelody = extractEstimatedMelody(musicalEvents.events, musicalEvents.source.duration, tempo.bpm)
    const melody = refineEstimatedMelody(rawMelody)
    const notation = buildNotationDocument(
      melody.transcription.events,
      musicalEvents.source.duration,
      tempo.bpm,
      melody.transcription.phrases,
    )
    if (process.env.NODE_ENV === 'development') console.debug('[GANE] pitch tracking', tracking.stats)
    return {
      duration: Number.isFinite(buffer.duration) ? buffer.duration : null,
      sampleRate: buffer.sampleRate || null,
      channels: buffer.numberOfChannels || null,
      fileType: formatFileType(file),
      fileName: file.name,
      bpm: tempo.bpm,
      bpmConfidence: tempo.confidence,
      pitch,
      pitchTimeline: tracking.events,
      pitchTrackingStats: tracking.stats,
      musicalEvents,
      rawMelody,
      melody,
      notation,
    }
  } finally {
    await context.close()
  }
}