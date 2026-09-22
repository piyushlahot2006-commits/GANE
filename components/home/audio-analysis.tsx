'use client'

import { Activity, AlertTriangle, Loader2 } from 'lucide-react'
import { useAudio } from '@/components/audio-provider'
import { resolveMidi } from '@/lib/notation'
import { TONICS } from '@/lib/notation'
import { cn } from '@/lib/utils'

function formatDuration(seconds: number | null) {
  if (seconds === null) return 'Unavailable'
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.floor(seconds % 60)
  return `${minutes.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`
}

function formatSampleRate(sampleRate: number | null) {
  if (!sampleRate) return 'Unavailable'
  return `${(sampleRate / 1000).toFixed(1)} kHz`
}

function formatChannels(channels: number | null) {
  if (!channels) return 'Unavailable'
  if (channels === 1) return 'MONO'
  if (channels === 2) return 'STEREO'
  return `${channels} CHANNELS`
}

export function AudioAnalysis() {
  const { analysis, applyDetectedBpm, tonicPc } = useAudio()
  const { result, status, error } = analysis
  const isAnalyzing = status === 'ANALYZING'
  const hasResult = Boolean(result)
  const hasReliableTempo = Boolean(result?.bpm && result.bpmConfidence >= 0.35)
  const detectedPitch = result?.pitch
  const detectedSargam = detectedPitch?.midi === null || detectedPitch?.midi === undefined
    ? null
    : resolveMidi(detectedPitch.midi, tonicPc).sargam

  return (
    <section className="panel relative overflow-hidden p-5 sm:p-6" aria-labelledby="audio-analysis-heading">
      {isAnalyzing && <div aria-hidden className="animate-sweep absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-primary/15 to-transparent" />}
      <div className="relative flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center border border-primary/40 bg-primary/10 text-primary">
              {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
            </span>
            <div>
              <h2 id="audio-analysis-heading" className="font-display text-sm font-semibold tracking-[0.2em] text-foreground">
                AUDIO ANALYSIS
              </h2>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Local metadata inspection
              </p>
            </div>
          </div>
          <span className={cn(
            'font-mono text-[10px] uppercase tracking-widest',
            status === 'ERROR' ? 'text-destructive' : status === 'COMPLETE' ? 'text-primary' : status === 'LOW_CONFIDENCE' ? 'text-primary' : 'text-[var(--cyan)]',
          )}>
            ● {status}
          </span>
        </div>

        {status === 'ERROR' && (
          <div role="alert" className="flex items-start gap-2 border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error || 'Audio metadata could not be read.'}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-5">
          {[
            ['File', result?.fileName || (hasResult ? 'Unavailable' : 'No audio loaded')],
            ['Duration', formatDuration(result?.duration ?? null)],
            ['Format', result?.fileType || 'Unavailable'],
            ['Sample rate', formatSampleRate(result?.sampleRate ?? null)],
            ['Channels', formatChannels(result?.channels ?? null)],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
              <p className="mt-1 truncate font-display text-sm font-semibold text-foreground" title={value}>{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-5 border-t border-border/70 pt-4 sm:grid-cols-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Tempo</p>
            <p className="mt-1 font-display text-sm font-semibold text-foreground">
              {isAnalyzing ? 'ANALYZING...' : result?.bpm ? `${result.bpm} BPM` : result ? 'UNKNOWN' : 'Unavailable'}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Confidence</p>
            <p className={cn('mt-1 font-display text-sm font-semibold', hasReliableTempo ? 'text-primary' : 'text-muted-foreground')}>
              {isAnalyzing ? 'ANALYZING...' : result?.bpm ? `${Math.round(result.bpmConfidence * 100)}%` : result ? 'LOW CONFIDENCE' : 'Unavailable'}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Key</p>
            <p className="mt-1 font-display text-sm font-semibold text-muted-foreground">NOT AVAILABLE YET</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5 border-t border-border/70 pt-4 sm:grid-cols-5">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Detected audio pitch</p>
            <p className="mt-1 font-display text-sm font-semibold text-foreground">
              {isAnalyzing ? 'ANALYZING...' : detectedPitch?.frequency ? `${detectedPitch.frequency.toFixed(1)} Hz` : result ? 'UNKNOWN' : 'Unavailable'}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Western</p>
            <p className="mt-1 font-display text-sm font-semibold text-foreground">
              {isAnalyzing ? 'ANALYZING...' : detectedPitch?.note || (result ? 'UNKNOWN' : 'Unavailable')}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Sargam · Sa {TONICS.find((tonic) => tonic.value === tonicPc)?.label}</p>
            <p className="mt-1 font-display text-sm font-semibold text-foreground">
              {isAnalyzing ? 'ANALYZING...' : detectedSargam || (result ? 'UNKNOWN' : 'Unavailable')}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Deviation</p>
            <p className="mt-1 font-display text-sm font-semibold text-foreground">
              {isAnalyzing ? 'ANALYZING...' : detectedPitch?.cents !== null && detectedPitch?.cents !== undefined ? `${detectedPitch.cents > 0 ? '+' : ''}${detectedPitch.cents.toFixed(0)} cents` : result ? 'UNKNOWN' : 'Unavailable'}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Pitch confidence</p>
            <p className={cn('mt-1 font-display text-sm font-semibold', detectedPitch && detectedPitch.confidence >= 0.55 ? 'text-primary' : 'text-muted-foreground')}>
              {isAnalyzing ? 'ANALYZING...' : detectedPitch?.frequency ? `${Math.round(detectedPitch.confidence * 100)}%` : result ? 'LOW' : 'Unavailable'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5 border-t border-border/70 pt-4 sm:grid-cols-5">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Melody transcription</p>
            <p className="mt-1 font-display text-sm font-semibold text-foreground">
              {isAnalyzing ? 'EXTRACTING...' : result?.melody.transcription.type === 'estimated-melody' ? 'ESTIMATED MELODY' : result ? 'UNAVAILABLE' : 'Unavailable'}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Melody confidence</p>
            <p className="mt-1 font-display text-sm font-semibold text-foreground">
              {isAnalyzing ? 'ANALYZING...' : result?.melody.transcription.confidence ? `${Math.round(result.melody.transcription.confidence * 100)}%` : result ? 'LOW' : 'Unavailable'}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Notes</p>
            <p className="mt-1 font-display text-sm font-semibold text-foreground">
              {isAnalyzing ? '...' : result ? result.melody.transcription.events.filter((event) => event.type === 'note').length : 'Unavailable'}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Phrases</p>
            <p className="mt-1 font-display text-sm font-semibold text-foreground">
              {isAnalyzing ? '...' : result ? result.melody.transcription.phrases.length : 'Unavailable'}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Uncertain events</p>
            <p className="mt-1 font-display text-sm font-semibold text-foreground">
              {isAnalyzing ? '...' : result ? result.melody.refinement.uncertainEvents : 'Unavailable'}
            </p>
          </div>
        </div>
        {process.env.NODE_ENV === 'development' && result && (
          <details className="border-t border-border/70 pt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <summary className="cursor-pointer text-[var(--cyan)]">Developer analysis trace</summary>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <span>Raw pitch: {result.pitchTrackingStats.finalEventCount}</span>
              <span>Canonical: {result.musicalEvents.events.length}</span>
              <span>Extracted: {result.rawMelody.transcription.events.length}</span>
              <span>Final: {result.melody.transcription.events.length}</span>
            </div>
          </details>
        )}
        {hasReliableTempo && (
          <button
            type="button"
            onClick={applyDetectedBpm}
            className="self-start border border-primary/40 bg-primary/10 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-primary transition-colors hover:bg-primary/20"
          >
            Use detected BPM
          </button>
        )}
      </div>
    </section>
  )
}