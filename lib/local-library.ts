import type { AudioAnalysisResult } from '@/lib/audio-analysis'
import type { NotationSettings } from '@/lib/notation-engine'

const LIBRARY_KEY = 'gane-local-library-v1'

export interface LocalSongRecord {
  id: string
  fileName: string
  duration: number
  status: 'complete' | 'low-confidence' | 'error'
  savedAt: string
  analysis: AudioAnalysisResult
  notationSettings?: NotationSettings
}

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

export function getLocalLibrary(): LocalSongRecord[] {
  if (!canUseStorage()) return []
  try {
    const value = JSON.parse(window.localStorage.getItem(LIBRARY_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export function saveLocalSong(record: LocalSongRecord) {
  if (!canUseStorage()) return
  const current = getLocalLibrary().filter((song) => song.id !== record.id)
  try {
    window.localStorage.setItem(LIBRARY_KEY, JSON.stringify([record, ...current].slice(0, 20)))
  } catch {
    // Browser storage can be unavailable or full; analysis remains usable in memory.
  }
}

export function exportAnalysisJson(analysis: AudioAnalysisResult, notationSettings?: NotationSettings) {
  if (typeof window === 'undefined') return
  const payload = {
    version: 1,
    source: {
      fileName: analysis.fileName,
      fileType: analysis.fileType,
      duration: analysis.duration,
      sampleRate: analysis.sampleRate,
      channels: analysis.channels,
      bpm: analysis.bpm,
    },
    musicalEvents: analysis.musicalEvents,
    rawMelody: analysis.rawMelody,
    refinedMelody: analysis.melody,
    notation: analysis.notation,
    notationSettings: notationSettings || analysis.notation.settings,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${analysis.fileName?.replace(/\.[^.]+$/, '') || 'gane-analysis'}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
