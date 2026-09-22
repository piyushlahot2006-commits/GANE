'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { resolveMidi } from '@/lib/notation'
import { compareLivePitch, frequencyToLivePitch, type LivePitch, type MicrophoneStatus } from '@/lib/practice-analysis'
import { cn } from '@/lib/utils'

export function MicrophonePractice({ referenceMidi, tonicPc }: { referenceMidi: number | null; tonicPc: number }) {
  const [status, setStatus] = useState<MicrophoneStatus>('IDLE')
  const [live, setLive] = useState<LivePitch>({ frequency: null, note: null, midi: null, cents: null, confidence: 0 })
  const [message, setMessage] = useState('Microphone input stays local to this browser.')
  const streamRef = useRef<MediaStream | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const frameRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    void contextRef.current?.close()
  }, [])

  async function toggle() {
    if (status === 'ACTIVE') {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      await contextRef.current?.close()
      streamRef.current = null
      contextRef.current = null
      setStatus('IDLE')
      setLive({ frequency: null, note: null, midi: null, cents: null, confidence: 0 })
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('UNAVAILABLE')
      setMessage('This browser does not provide microphone access.')
      return
    }
    setStatus('REQUESTING')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const context = new AudioContext()
      const source = context.createMediaStreamSource(stream)
      const analyser = context.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)
      const samples = new Float32Array(analyser.fftSize)
      streamRef.current = stream
      contextRef.current = context
      setStatus('ACTIVE')
      setMessage('Listening locally. This is dominant-pitch practice analysis.')
      const tick = () => {
        analyser.getFloatTimeDomainData(samples)
        let energy = 0
        for (const value of samples) energy += value * value
        const rms = Math.sqrt(energy / samples.length)
        if (rms < 0.01) setLive({ frequency: null, note: null, midi: null, cents: null, confidence: 0 })
        else {
          let crossings = 0
          for (let index = 1; index < samples.length; index += 1) if (samples[index - 1] <= 0 && samples[index] > 0) crossings += 1
          const frequency = crossings * context.sampleRate / samples.length
          setLive(frequencyToLivePitch(frequency, Math.min(1, rms * 20)))
        }
        frameRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch (error) {
      setStatus(error instanceof DOMException && error.name === 'NotAllowedError' ? 'DENIED' : 'ERROR')
      setMessage('Microphone access was not granted. Audio remains local.')
    }
  }

  const comparison = compareLivePitch(referenceMidi, live)
  const sargam = live.midi === null ? null : resolveMidi(live.midi, tonicPc).sargam

  return <section className="panel p-4" aria-labelledby="microphone-practice-heading">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 id="microphone-practice-heading" className="font-display text-sm tracking-[0.2em]">MIC PRACTICE</h2>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Local dominant pitch only</p>
      </div>
      <button type="button" onClick={() => void toggle()} className={cn('flex h-9 items-center gap-2 border px-3 font-mono text-[10px] uppercase tracking-widest', status === 'ACTIVE' ? 'border-destructive/50 text-destructive' : 'border-primary/40 text-primary')}>
        {status === 'ACTIVE' ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
        {status === 'ACTIVE' ? 'Stop mic' : 'Start mic'}
      </button>
    </div>
    <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">STATUS · {status}</p>
    <p className="mt-2 text-xs text-muted-foreground">{message}</p>
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div><p className="font-mono text-[9px] uppercase text-muted-foreground">Note</p><p className="font-display text-lg">{live.note || 'UNKNOWN'}</p></div>
      <div><p className="font-mono text-[9px] uppercase text-muted-foreground">Sargam</p><p className="font-display text-lg">{sargam || 'UNKNOWN'}</p></div>
      <div><p className="font-mono text-[9px] uppercase text-muted-foreground">Confidence</p><p className="font-display text-lg">{live.note ? `${Math.round(live.confidence * 100)}%` : 'LOW'}</p></div>
      <div><p className="font-mono text-[9px] uppercase text-muted-foreground">Compare</p><p className="font-display text-sm text-primary">{comparison.status}</p></div>
    </div>
  </section>
}
