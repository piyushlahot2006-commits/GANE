export type MicrophoneStatus = 'IDLE' | 'REQUESTING' | 'ACTIVE' | 'DENIED' | 'UNAVAILABLE' | 'ERROR'

export interface LivePitch {
  frequency: number | null
  note: string | null
  midi: number | null
  cents: number | null
  confidence: number
}

export function frequencyToLivePitch(frequency: number, confidence: number): LivePitch {
  if (!Number.isFinite(frequency) || frequency <= 0 || confidence < 0.55) return { frequency: null, note: null, midi: null, cents: null, confidence }
  const midiFloat = 69 + 12 * Math.log2(frequency / 440)
  const midi = Math.round(midiFloat)
  const target = 440 * Math.pow(2, (midi - 69) / 12)
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  return { frequency, midi, note: `${names[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`, cents: 1200 * Math.log2(frequency / target), confidence }
}

export function compareLivePitch(referenceMidi: number | null, live: LivePitch) {
  if (referenceMidi === null || live.midi === null || live.confidence < 0.55) return { status: 'NO DETECTED NOTE' as const, cents: null }
  const cents = 1200 * Math.log2((live.frequency || 1) / (440 * Math.pow(2, (referenceMidi - 69) / 12)))
  if (live.midi !== referenceMidi) return { status: 'WRONG NOTE' as const, cents }
  if (Math.abs(cents) <= 25) return { status: 'CORRECT' as const, cents }
  return { status: cents > 0 ? 'SHARP' as const : 'FLAT' as const, cents }
}
