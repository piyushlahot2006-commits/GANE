'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { analyzeAudioFile, type AudioAnalysisState } from '@/lib/audio-analysis'
import { saveLocalSong } from '@/lib/local-library'

const ACCEPTED_TYPES = new Set(['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a'])
const ACCEPTED_EXTENSIONS = /\.(mp3|wav|m4a)$/i

interface AudioContextValue {
  fileName: string | null
  duration: number
  currentTime: number
  isPlaying: boolean
  volume: number
  playbackRate: number
  error: string | null
  hasAudio: boolean
  loadFile: (file: File) => boolean
  togglePlayback: () => Promise<void>
  pause: () => void
  restart: () => void
  seek: (seconds: number) => void
  setVolume: (value: number) => void
  setPlaybackRate: (value: number) => void
  analysis: AudioAnalysisState
  applyDetectedBpm: () => void
  pendingDetectedBpm: number | null
  tonicPc: number
  setTonicPc: (value: number) => void
}

const AudioContext = createContext<AudioContextValue | null>(null)

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const analysisRequestRef = useRef(0)
  const [fileName, setFileName] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolumeState] = useState(0.72)
  const [playbackRate, setPlaybackRateState] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<AudioAnalysisState>({
    status: 'IDLE',
    result: null,
    error: null,
    progress: null,
  })
  const [pendingDetectedBpm, setPendingDetectedBpm] = useState<number | null>(null)
  const [tonicPc, setTonicPc] = useState(0)

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.volume = 0.72
    const pitchAudio = audio as HTMLAudioElement & { preservesPitch?: boolean }
    if ('preservesPitch' in pitchAudio) pitchAudio.preservesPitch = true
    audioRef.current = audio

    const onLoadedMetadata = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => {
      setIsPlaying(false)
      setCurrentTime(audio.duration || 0)
    }
    const onError = () => setError('This audio file could not be played by the browser.')

    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.pause()
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  const loadFile = useCallback((file: File) => {
    const analysisRequest = ++analysisRequestRef.current
    const supported = ACCEPTED_TYPES.has(file.type) || ACCEPTED_EXTENSIONS.test(file.name)
    if (!supported) {
      setError('Unsupported file type. Choose an MP3, WAV, or M4A file.')
      setAnalysis({ status: 'ERROR', result: null, error: 'Unsupported file type.', progress: null })
      return false
    }

    const audio = audioRef.current
    if (!audio) return false
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)

    const objectUrl = URL.createObjectURL(file)
    objectUrlRef.current = objectUrl
    audio.src = objectUrl
    audio.load()
    setFileName(file.name)
    setDuration(0)
    setCurrentTime(0)
    setIsPlaying(false)
    setError(null)
    setPendingDetectedBpm(null)
    setAnalysis({ status: 'ANALYZING', result: null, error: null, progress: 0 })
    void analyzeAudioFile(file, (progress) => {
      if (analysisRequest === analysisRequestRef.current) {
        setAnalysis((current) => ({ ...current, status: 'ANALYZING', progress }))
      }
    })
      .then((result) => {
        if (analysisRequest === analysisRequestRef.current) {
          setAnalysis({
            status: result.pitch.confidence < 0.55 || result.pitchTimeline.length === 0 ? 'LOW_CONFIDENCE' : 'COMPLETE',
            result,
            error: null,
            progress: 1,
          })
          saveLocalSong({
            id: `${file.name}-${file.size}-${file.lastModified}`,
            fileName: file.name,
            duration: result.duration || 0,
            status: result.pitchTimeline.length ? 'complete' : 'low-confidence',
            savedAt: new Date().toISOString(),
            analysis: result,
          })
        }
      })
      .catch((analysisError: unknown) => {
        if (analysisRequest === analysisRequestRef.current) {
          setAnalysis({
            status: 'ERROR',
            result: null,
            error: analysisError instanceof Error ? analysisError.message : 'Audio metadata could not be read.',
            progress: null,
          })
        }
      })
    return true
  }, [])

  const togglePlayback = useCallback(async () => {
    const audio = audioRef.current
    if (!audio || !audio.src) {
      setError('Import an audio file before pressing play.')
      return
    }
    if (audio.paused) {
      try {
        await audio.play()
      } catch {
        setError('Playback was blocked by the browser. Press play again to retry.')
      }
    } else {
      audio.pause()
    }
  }, [])

  const pause = useCallback(() => audioRef.current?.pause(), [])

  const restart = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
    setCurrentTime(0)
  }, [])

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    const next = Math.max(0, Math.min(seconds, audio.duration || seconds))
    audio.currentTime = next
    setCurrentTime(next)
  }, [])

  const setVolume = useCallback((value: number) => {
    const next = Math.max(0, Math.min(1, value))
    setVolumeState(next)
    if (audioRef.current) audioRef.current.volume = next
  }, [])

  const setPlaybackRate = useCallback((value: number) => {
    setPlaybackRateState(value)
    if (audioRef.current) audioRef.current.playbackRate = value
  }, [])

  const applyDetectedBpm = useCallback(() => {
    const result = analysis.result
    if (result?.bpm !== null && result?.bpm !== undefined && result.bpmConfidence >= 0.35) {
      setPendingDetectedBpm(result.bpm)
    }
  }, [analysis.result])

  const value = useMemo(
    () => ({
      fileName,
      duration,
      currentTime,
      isPlaying,
      volume,
      playbackRate,
      error,
      hasAudio: Boolean(fileName),
      loadFile,
      togglePlayback,
      pause,
      restart,
      seek,
      setVolume,
      setPlaybackRate,
      analysis,
      applyDetectedBpm,
      pendingDetectedBpm,
      tonicPc,
      setTonicPc,
    }),
    [
      fileName,
      duration,
      currentTime,
      isPlaying,
      volume,
      playbackRate,
      error,
      loadFile,
      togglePlayback,
      pause,
      restart,
      seek,
      setVolume,
      setPlaybackRate,
      analysis,
      applyDetectedBpm,
      pendingDetectedBpm,
      tonicPc,
      setTonicPc,
    ],
  )

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
}

export function useAudio() {
  const value = useContext(AudioContext)
  if (!value) throw new Error('useAudio must be used inside AudioProvider')
  return value
}
