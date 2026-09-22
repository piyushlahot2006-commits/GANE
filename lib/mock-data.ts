export type NotationStatus = 'ready' | 'analyzing' | 'queued'

export interface Song {
  id: string
  title: string
  artist: string
  duration: string
  bpm: number
  key: string
  lastPracticed: string
  progress: number
  status: NotationStatus
}

export const songs: Song[] = [
  {
    id: 'neon-meridian',
    title: 'Neon Meridian',
    artist: 'Cassette Ghosts',
    duration: '03:42',
    bpm: 82,
    key: 'C Major',
    lastPracticed: '2h ago',
    progress: 68,
    status: 'ready',
  },
  {
    id: 'analog-dreams',
    title: 'Analog Dreams',
    artist: 'Violet Circuit',
    duration: '04:15',
    bpm: 96,
    key: 'A Minor',
    lastPracticed: 'Yesterday',
    progress: 41,
    status: 'ready',
  },
  {
    id: 'phosphor-city',
    title: 'Phosphor City',
    artist: 'Midnight Protocol',
    duration: '05:08',
    bpm: 124,
    key: 'E Minor',
    lastPracticed: '3 days ago',
    progress: 23,
    status: 'ready',
  },
  {
    id: 'chrome-horizon',
    title: 'Chrome Horizon',
    artist: 'The Oscillators',
    duration: '03:20',
    bpm: 110,
    key: 'G Major',
    lastPracticed: 'Last week',
    progress: 87,
    status: 'ready',
  },
  {
    id: 'static-bloom',
    title: 'Static Bloom',
    artist: 'Halogen',
    duration: '04:47',
    bpm: 74,
    key: 'D Minor',
    lastPracticed: '—',
    progress: 0,
    status: 'analyzing',
  },
  {
    id: 'cathode-sunrise',
    title: 'Cathode Sunrise',
    artist: 'Waveform Theory',
    duration: '02:58',
    bpm: 138,
    key: 'F# Minor',
    lastPracticed: '—',
    progress: 0,
    status: 'queued',
  },
]

export const recentSessions = songs.slice(0, 4)

export const analysisStages = [
  { id: 'input', label: 'AUDIO INPUT', detail: '44.1kHz · 16-bit stereo' },
  { id: 'signal', label: 'SIGNAL ANALYSIS', detail: 'FFT spectral decomposition' },
  { id: 'tempo', label: 'TEMPO DETECTION', detail: 'Beat-grid alignment' },
  { id: 'pitch', label: 'PITCH DETECTION', detail: 'Monophonic + polyphonic' },
  { id: 'notes', label: 'NOTE EXTRACTION', detail: 'Onset & duration mapping' },
  { id: 'notation', label: 'NOTATION', detail: 'Engraving score' },
] as const

/* Mock notation: staff positions 0 = bottom line (E4) upward in diatonic steps.
   Each measure holds a set of notes with a beat position and duration weight. */
export interface MockNote {
  step: number // diatonic step from E4
  beat: number // 0-based beat within the measure
  dur: 'q' | 'h' | 'e' // quarter / half / eighth
  accidental?: '#' | 'b'
}

export interface Measure {
  id: number
  notes: MockNote[]
}

export const measures: Measure[] = [
  { id: 1, notes: [
    { step: 2, beat: 0, dur: 'q' },
    { step: 4, beat: 1, dur: 'q' },
    { step: 5, beat: 2, dur: 'q' },
    { step: 4, beat: 3, dur: 'q' },
  ]},
  { id: 2, notes: [
    { step: 7, beat: 0, dur: 'h' },
    { step: 5, beat: 2, dur: 'e' },
    { step: 6, beat: 2.5, dur: 'e' },
    { step: 7, beat: 3, dur: 'q' },
  ]},
  { id: 3, notes: [
    { step: 9, beat: 0, dur: 'q' },
    { step: 7, beat: 1, dur: 'q' },
    { step: 5, beat: 2, dur: 'q', accidental: '#' },
    { step: 4, beat: 3, dur: 'q' },
  ]},
  { id: 4, notes: [
    { step: 2, beat: 0, dur: 'h' },
    { step: 0, beat: 2, dur: 'h' },
  ]},
]

export const practiceMetrics = [
  { label: 'PITCH ACCURACY', value: '--', unit: '%' },
  { label: 'RHYTHM ACCURACY', value: '--', unit: '%' },
  { label: 'TIMING', value: '--', unit: '%' },
  { label: 'PRACTICE TIME', value: '00:00', unit: '' },
]
