'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AudioLines, ChevronRight, Download, FileMusic, Minus, Plus } from 'lucide-react'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { useAudio } from '@/components/audio-provider'
import { NotationDocumentView } from '@/components/practice/notation-document'
import { NotationSelector } from '@/components/practice/notation-selector'
import { RetroSelect } from '@/components/practice/retro-select'
import { Transport } from '@/components/practice/transport'
import { PracticeControls } from '@/components/practice/practice-controls'
import { SessionPanel } from '@/components/practice/session-panel'
import { PitchTimeline } from '@/components/practice/pitch-timeline'
import { songs } from '@/lib/mock-data'
import { resolveStep, TONICS, type NotationMode } from '@/lib/notation'
import { buildNotationDocument, type ConfidenceDisplay, type QuantizationStrength } from '@/lib/notation-engine'
import { exportAnalysisJson } from '@/lib/local-library'
import { downloadMelodyMidi } from '@/lib/midi-export'

const song = songs[0]
function fmtClock(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function PracticePage() {
  const {
    fileName,
    duration,
    currentTime,
    isPlaying,
    volume,
    error,
    hasAudio,
    togglePlayback,
    restart,
    seek,
    setVolume,
    setPlaybackRate,
    pendingDetectedBpm,
    tonicPc,
    setTonicPc,
    analysis,
  } = useAudio()
  const [tempo, setTempo] = useState(song.bpm)
  const [speed, setSpeed] = useState(100)
  const [loopOn, setLoopOn] = useState(false)
  const [metronomeOn, setMetronomeOn] = useState(false)
  const [loopStart, setLoopStart] = useState<number | null>(null)
  const [loopEnd, setLoopEnd] = useState<number | null>(null)
  const [notationMode, setNotationMode] = useState<NotationMode>('western')
  const [notationZoom, setNotationZoom] = useState(1)
  const [timeSignature, setTimeSignature] = useState('4/4')
  const [quantization, setQuantization] = useState<QuantizationStrength>('low')
  const [keySignature, setKeySignature] = useState('')
  const [showMeasureNumbers, setShowMeasureNumbers] = useState(true)
  const [showBeatGrid, setShowBeatGrid] = useState(false)
  const [showUncertainNotes, setShowUncertainNotes] = useState(true)
  const [confidenceDisplay, setConfidenceDisplay] = useState<ConfidenceDisplay>('subtle')
  const [sessionActive, setSessionActive] = useState(false)
  const [practiceSeconds, setPracticeSeconds] = useState(0)
  const preferencesHydrated = useRef(false)

  const metronomeContext = useRef<AudioContext | null>(null)
  const metronomeTimer = useRef<number | null>(null)

  const totalSeconds = duration || 0
  const progress = totalSeconds ? (currentTime / totalSeconds) * 100 : 0

  useEffect(() => {
    setPlaybackRate(speed / 100)
  }, [setPlaybackRate, speed])

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('gane-practice-preferences-v1') || 'null')
      if (saved) {
        if (typeof saved.tempo === 'number') setTempo(saved.tempo)
        if (typeof saved.speed === 'number') setSpeed(saved.speed)
        if (typeof saved.tonicPc === 'number') setTonicPc(saved.tonicPc)
        if (saved.notationMode === 'western' || saved.notationMode === 'sargam' || saved.notationMode === 'both') setNotationMode(saved.notationMode)
        if (typeof saved.timeSignature === 'string') setTimeSignature(saved.timeSignature)
        if (saved.quantization === 'off' || saved.quantization === 'low' || saved.quantization === 'medium' || saved.quantization === 'high') setQuantization(saved.quantization)
        if (typeof saved.keySignature === 'string') setKeySignature(saved.keySignature)
      }
    } catch { /* local storage is optional */ }
    preferencesHydrated.current = true
  }, [setTonicPc])

  useEffect(() => {
    if (!preferencesHydrated.current) return
    window.localStorage.setItem('gane-practice-preferences-v1', JSON.stringify({ tempo, speed, tonicPc, notationMode, timeSignature, quantization, keySignature }))
  }, [keySignature, notationMode, quantization, setTonicPc, speed, tempo, timeSignature, tonicPc])

  useEffect(() => {
    if (pendingDetectedBpm !== null) setTempo(pendingDetectedBpm)
  }, [pendingDetectedBpm])

  // Return to A when the real audio reaches B.
  useEffect(() => {
    if (loopOn && loopEnd !== null && currentTime >= loopEnd) seek(loopStart ?? 0)
  }, [currentTime, loopEnd, loopOn, loopStart, seek])

  // Web Audio metronome click.
  useEffect(() => {
    if (!metronomeOn) {
      if (metronomeTimer.current !== null) window.clearInterval(metronomeTimer.current)
      metronomeTimer.current = null
      void metronomeContext.current?.close()
      metronomeContext.current = null
      return
    }

    const context = new AudioContext()
    metronomeContext.current = context
    const click = () => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.frequency.value = 880
      gain.gain.setValueAtTime(0.12, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.06)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.06)
    }
    void context.resume().then(click)
    metronomeTimer.current = window.setInterval(click, 60000 / tempo)

    return () => {
      if (metronomeTimer.current !== null) window.clearInterval(metronomeTimer.current)
      void context.close()
    }
  }, [metronomeOn, tempo])

  // practice clock
  useEffect(() => {
    if (!sessionActive) return
    const id = setInterval(() => setPracticeSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [sessionActive])

  const reference = resolveStep(0, undefined, tonicPc)
  const displayTitle = fileName ?? song.title
  const notationDocument = useMemo(() => {
    const melody = analysis.result?.melody
    if (!melody) return null
    const [numerator, denominator] = timeSignature.split('/').map(Number)
    return buildNotationDocument(melody.transcription.events, melody.source.duration, melody.source.bpm, melody.transcription.phrases, { numerator, denominator }, {
      quantization,
      keySignature: keySignature || null,
      showMeasureNumbers,
      showBeatGrid,
      showUncertainNotes,
      confidenceDisplay,
    })
  }, [analysis.result?.melody, confidenceDisplay, keySignature, quantization, showBeatGrid, showMeasureNumbers, showUncertainNotes, timeSignature])

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
        {/* breadcrumb + header */}
        <nav className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <Link href="/songs" className="transition-colors hover:text-foreground">
            My Songs
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-primary">Practice</span>
        </nav>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="animate-fade-up">
            <div className="flex items-center gap-2">
              <AudioLines className="h-4 w-4 text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
                Now practicing
              </span>
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {displayTitle}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {fileName ? 'Local audio file' : `${song.artist} · Import an audio file to begin`}
            </p>
          </div>

          <div className="flex gap-2 font-mono text-[10px] uppercase tracking-widest">
            {[
              ['Key', song.key],
              ['Orig BPM', String(song.bpm)],
              ['Time', '4/4'],
            ].map(([k, v]) => (
              <div key={k} className="panel px-3 py-2 text-center">
                <p className="text-muted-foreground/60">{k}</p>
                <p className="mt-1 text-sm text-foreground">{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* main grid */}
        <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_20rem]">
          <div className="flex min-w-0 flex-col gap-5">
            {/* notation */}
            <div className="panel overflow-hidden p-4 sm:p-5 animate-fade-up" style={{ animationDelay: '60ms' }}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3.5 w-[3px] rounded-full bg-primary box-glow-phosphor" />
                  <h2 className="font-display text-sm font-semibold tracking-[0.25em] text-foreground">
                    NOTATION
                  </h2>
                </div>
                <span className="rounded-sm border border-[var(--cyan)]/30 bg-[var(--cyan)]/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[var(--cyan)]">
                  Generated notation
                </span>
              </div>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <NotationSelector mode={notationMode} onChange={setNotationMode} />
                <RetroSelect
                  label="Movable Sa"
                  value={String(tonicPc)}
                  options={TONICS.map((tonic) => ({ value: String(tonic.value), label: `Sa = ${tonic.label}` }))}
                  onChange={(value) => setTonicPc(Number(value))}
                  accent="cyan"
                  className="w-full sm:w-40"
                />
              </div>
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <RetroSelect label="Time signature" value={timeSignature} options={['2/4', '3/4', '4/4', '6/8'].map((value) => ({ value, label: value }))} onChange={setTimeSignature} />
                <RetroSelect label="Quantization" value={quantization} options={['off', 'low', 'medium', 'high'].map((value) => ({ value, label: value.toUpperCase() }))} onChange={(value) => setQuantization(value as QuantizationStrength)} />
                <RetroSelect label="Key" value={keySignature} options={[['', 'None'], ...['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb'].map((value) => [value, value])].map(([value, label]) => ({ value, label }))} onChange={setKeySignature} />
                <RetroSelect label="Confidence" value={confidenceDisplay} options={['hidden', 'subtle', 'detailed'].map((value) => ({ value, label: value.toUpperCase() }))} onChange={(value) => setConfidenceDisplay(value as ConfidenceDisplay)} />
              </div>
              <div className="mb-3 flex flex-wrap gap-4 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                <label><input type="checkbox" checked={showMeasureNumbers} onChange={(event) => setShowMeasureNumbers(event.target.checked)} /> <span className="ml-1">Measure numbers</span></label>
                <label><input type="checkbox" checked={showBeatGrid} onChange={(event) => setShowBeatGrid(event.target.checked)} /> <span className="ml-1">Beat grid</span></label>
                <label><input type="checkbox" checked={showUncertainNotes} onChange={(event) => setShowUncertainNotes(event.target.checked)} /> <span className="ml-1">Uncertain notes</span></label>
              </div>
              <div className="mb-3 flex items-center justify-end gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <span className="mr-2">Zoom {Math.round(notationZoom * 100)}%</span>
                <button type="button" aria-label="Decrease notation zoom" onClick={() => setNotationZoom((value) => Math.max(0.75, Number((value - 0.25).toFixed(2))))} className="flex h-7 w-7 items-center justify-center border border-border hover:border-primary/50 hover:text-primary">
                  <Minus className="h-3 w-3" />
                </button>
                <button type="button" aria-label="Increase notation zoom" onClick={() => setNotationZoom((value) => Math.min(1.75, Number((value + 0.25).toFixed(2))))} className="flex h-7 w-7 items-center justify-center border border-border hover:border-primary/50 hover:text-primary">
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              {analysis.result && <div className="mb-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => exportAnalysisJson(analysis.result!, notationDocument?.settings)} className="inline-flex items-center gap-2 border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:border-primary/50 hover:text-primary">
                  <Download className="h-3 w-3" /> Export JSON
                </button>
                <button type="button" onClick={() => downloadMelodyMidi(analysis.result!.melody.transcription.events, analysis.result!.bpm, fileName)} className="inline-flex items-center gap-2 border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:border-primary/50 hover:text-primary">
                  <FileMusic className="h-3 w-3" /> Export estimated MIDI
                </button>
              </div>}
              <NotationDocumentView
                document={notationDocument ?? analysis.result?.notation ?? null}
                currentTime={currentTime}
                mode={notationMode}
                tonicPc={tonicPc}
                zoom={notationZoom}
              />
            </div>

            <PitchTimeline
              events={analysis.result?.melody.transcription.events ?? analysis.result?.musicalEvents.events ?? []}
              duration={totalSeconds}
              currentTime={currentTime}
              tonicPc={tonicPc}
              mode={notationMode}
              analyzing={analysis.status === 'ANALYZING'}
              progress={analysis.progress}
            />

            <div className="panel grid grid-cols-3 gap-4 p-4 sm:p-5">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Reference</p>
                <p className="mt-1 font-display text-lg font-bold text-foreground">{reference.western}</p>
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Sargam</p>
                <p className="mt-1 font-display text-lg font-bold text-foreground">{reference.sargam}</p>
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Frequency</p>
                <p className="mt-1 font-display text-lg font-bold text-foreground">{reference.freq.toFixed(2)} Hz</p>
              </div>
            </div>

            {/* transport */}
            <div className="animate-fade-up" style={{ animationDelay: '120ms' }}>
              <Transport
                isPlaying={isPlaying}
                onToggle={() => void togglePlayback()}
                onRestart={restart}
                onPrev={() => seek(Math.max(0, currentTime - 10))}
                onNext={() => seek(Math.min(totalSeconds, currentTime + 10))}
                progress={progress}
                onSeek={(pct) => seek((pct / 100) * totalSeconds)}
                totalSeconds={totalSeconds}
                volume={volume * 100}
                setVolume={(value) => setVolume(value / 100)}
                disabled={!hasAudio}
              />
            </div>

            {/* practice controls */}
            <div className="animate-fade-up" style={{ animationDelay: '180ms' }}>
              <PracticeControls
                tempo={tempo}
                setTempo={setTempo}
                speed={speed}
                setSpeed={setSpeed}
                loopOn={loopOn}
                setLoopOn={setLoopOn}
                metronomeOn={metronomeOn}
                setMetronomeOn={setMetronomeOn}
                loopStart={loopStart}
                loopEnd={loopEnd}
                onSetLoopStart={() => setLoopStart(currentTime)}
                onSetLoopEnd={() => setLoopEnd(currentTime)}
                onClearLoop={() => {
                  setLoopStart(null)
                  setLoopEnd(null)
                  setLoopOn(false)
                }}
              />
            </div>
          </div>

          {/* session panel */}
          <div className="animate-fade-up" style={{ animationDelay: '240ms' }}>
            <SessionPanel
              practiceTime={fmtClock(practiceSeconds)}
              active={sessionActive}
              onToggle={() => setSessionActive((v) => !v)}
            />
          </div>
        </div>
        {error && <p role="alert" className="mt-4 font-mono text-xs text-destructive">{error}</p>}
      </div>
    </AppShell>
  )
}
