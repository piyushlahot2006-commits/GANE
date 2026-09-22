'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { useAudio } from '@/components/audio-provider'
import { Waveform } from '@/components/waveform'
import { cn } from '@/lib/utils'

export function UploadPanel() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const { fileName, duration, error, loadFile } = useAudio()

  function selectFile(file: File | undefined) {
    if (file) loadFile(file)
  }

  function formatDuration(seconds: number) {
    if (!seconds) return 'Reading duration...'
    const minutes = Math.floor(seconds / 60)
    const remaining = Math.floor(seconds % 60)
    return `${minutes}:${remaining.toString().padStart(2, '0')}`
  }

  function begin() {
    if (fileName) router.push('/practice')
    else inputRef.current?.click()
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        selectFile(e.dataTransfer.files[0])
      }}
      className={cn(
        'panel relative flex flex-col items-center justify-center overflow-hidden px-6 py-14 text-center transition-all',
        dragging ? 'border-primary box-glow-phosphor' : 'border-dashed border-border',
      )}
    >
      {/* corner registration marks */}
      {['left-3 top-3', 'right-3 top-3', 'left-3 bottom-3', 'right-3 bottom-3'].map((pos) => (
        <span
          key={pos}
          aria-hidden
          className={cn(
            'absolute h-3 w-3 border-primary/40',
            pos,
            pos.includes('left') ? 'border-l' : 'border-r',
            pos.includes('top') ? 'border-t' : 'border-b',
          )}
        />
      ))}

      {/* background waveform */}
      <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 opacity-[0.12]">
        <Waveform bars={64} color="phosphor" seed={13} />
      </div>

      <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-primary/40 bg-primary/10 box-glow-phosphor">
        <Upload className="h-6 w-6 text-primary" />
      </div>

      <h2 className="relative mt-6 font-display text-2xl font-bold tracking-[0.15em] text-foreground sm:text-3xl">
        DROP A SONG HERE
      </h2>
      <p className="relative mt-2 font-mono text-xs uppercase tracking-[0.35em] text-muted-foreground">
        MP3 · WAV · M4A
      </p>

      {fileName && (
        <p className="relative mt-4 max-w-full truncate font-mono text-xs uppercase tracking-widest text-[var(--cyan)]">
          {fileName} · {formatDuration(duration)}
        </p>
      )}
      {error && (
        <p role="alert" className="relative mt-4 max-w-md text-xs text-destructive">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="audio/mpeg,audio/wav,audio/mp4,.mp3,.wav,.m4a"
        className="sr-only"
        onChange={(e) => selectFile(e.target.files?.[0])}
      />

      <button
        type="button"
        onClick={begin}
        className="relative mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-display text-sm font-semibold tracking-[0.2em] text-primary-foreground transition-all hover:box-glow-phosphor active:translate-y-px"
      >
        <Upload className="h-4 w-4" />
        {fileName ? 'OPEN IN PRACTICE' : 'IMPORT SONG'}
      </button>
    </div>
  )
}
