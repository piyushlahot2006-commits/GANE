import type { MusicalEvent } from '@/lib/musical-events'

function variableLength(value: number) {
  let buffer = value & 0x7f
  const bytes: number[] = []
  while ((value >>= 7)) {
    buffer <<= 8
    buffer |= (value & 0x7f) | 0x80
  }
  while (true) {
    bytes.push(buffer & 0xff)
    if (buffer & 0x80) buffer >>= 8
    else break
  }
  return bytes
}

function uint32(value: number) {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]
}

function uint16(value: number) {
  return [(value >>> 8) & 0xff, value & 0xff]
}

function chunk(id: string, data: number[]) {
  return [...id.split('').map((char) => char.charCodeAt(0)), ...uint32(data.length), ...data]
}

export function createMelodyMidi(events: MusicalEvent[], bpm: number | null, timeSignature = { numerator: 4, denominator: 4 }) {
  const ticksPerBeat = 480
  const beatDuration = bpm && bpm > 0 ? 60 / bpm : 0.5
  const midiEvents: Array<{ tick: number; bytes: number[] }> = []
  if (bpm && bpm > 0) {
    const microsPerBeat = Math.round(60000000 / bpm)
    midiEvents.push({ tick: 0, bytes: [0xff, 0x51, 0x03, (microsPerBeat >>> 16) & 0xff, (microsPerBeat >>> 8) & 0xff, microsPerBeat & 0xff] })
  }
  midiEvents.push({ tick: 0, bytes: [0xff, 0x58, 0x04, timeSignature.numerator, Math.log2(timeSignature.denominator), 24, 8] })
  for (const event of events) {
    if (event.type !== 'note') continue
    const start = Math.max(0, Math.round((event.startTime / beatDuration) * ticksPerBeat))
    const end = Math.max(start + 1, Math.round((event.endTime / beatDuration) * ticksPerBeat))
    midiEvents.push({ tick: start, bytes: [0x90, Math.max(0, Math.min(127, event.midiNote)), 88] })
    midiEvents.push({ tick: end, bytes: [0x80, Math.max(0, Math.min(127, event.midiNote)), 0] })
  }
  midiEvents.sort((a, b) => a.tick - b.tick)
  let previousTick = 0
  const track: number[] = []
  for (const event of midiEvents) {
    track.push(...variableLength(Math.max(0, event.tick - previousTick)), ...event.bytes)
    previousTick = event.tick
  }
  track.push(0, 0xff, 0x2f, 0)
  return new Uint8Array([
    ...chunk('MThd', [...uint16(1), ...uint16(1), ...uint16(ticksPerBeat)]),
    ...chunk('MTrk', track),
  ])
}

export function downloadMelodyMidi(events: MusicalEvent[], bpm: number | null, fileName: string | null) {
  if (typeof window === 'undefined') return
  const blob = new Blob([createMelodyMidi(events, bpm)], { type: 'audio/midi' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${fileName?.replace(/\.[^.]+$/, '') || 'gane-melody'}.mid`
  anchor.click()
  URL.revokeObjectURL(url)
}
