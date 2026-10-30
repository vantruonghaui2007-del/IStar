import { seededRandom } from '../artwork/random'
import type { Point, Stroke } from '../artwork/types'
import { ARTWORK_VERSION, type Artwork } from '../storage/artworks'
import type { InstrumentId } from './instruments'
import { xOfString, yOfDegree } from './scale'

type Beat = number
/** One sung line: [degree, beats] pairs without immediate repeats (a held stroke only changes on a new note). */
type Line = [number, Beat][]
type ZitherItem = { note: number; beats: Beat } | { sweep: [number, number]; beats: Beat }

type Melody = { title: string; bpm: number; notes: number[] }

const BASE_TIME = Date.UTC(2026, 10, 7, 1, 0, 0)
const FRAME_MS = 16
/** How long a written melody takes to slide between two notes. */
const SLIDE_MS = 80

const BAU: Line[] = [
  [[5, 1], [6, 0.5], [7, 0.5], [6, 1], [5, 1], [3, 2]],
  [[3, 0.5], [4, 0.5], [5, 1], [4, 0.5], [3, 0.5], [2, 1], [3, 2]],
  [[5, 1], [7, 1], [8, 1], [7, 0.5], [6, 0.5], [5, 2]],
  [[4, 1], [3, 0.5], [2, 0.5], [1, 1], [2, 1], [0, 3]],
]
const SAO: Line[] = [
  [[3, 0.5], [4, 0.5], [5, 1], [6, 0.5], [7, 0.5], [6, 1], [5, 2]],
  [[7, 0.5], [8, 0.5], [7, 0.5], [6, 0.5], [5, 1], [4, 1], [3, 2]],
  [[5, 1], [6, 0.5], [5, 0.5], [3, 1], [2, 1], [1, 0.5], [2, 0.5], [3, 2]],
  [[3, 1], [5, 1], [6, 1], [5, 0.5], [3, 0.5], [2, 2]],
  [[2, 1], [1, 1], [0, 0.5], [1, 0.5], [0, 3]],
]
const n = (note: number, beats: Beat): ZitherItem => ({ note, beats })
const sweep = (from: number, to: number, beats: Beat): ZitherItem => ({ sweep: [from, to], beats })
const TRANH: ZitherItem[][] = [
  [n(5, 0.5), n(6, 0.5), n(7, 1), n(9, 0.5), n(8, 0.5), n(7, 1), n(5, 1), sweep(2, 12, 2)],
  [n(8, 0.5), n(9, 0.5), n(10, 1), n(9, 0.5), n(7, 0.5), n(8, 1), n(5, 1), sweep(13, 3, 2)],
  [n(5, 0.5), n(7, 0.5), n(8, 0.5), n(7, 0.5), n(5, 1), n(4, 0.5), n(2, 0.5), n(3, 2)],
  [n(7, 0.5), n(8, 0.5), n(10, 1), n(12, 1), n(10, 0.5), n(8, 0.5), n(7, 2), sweep(0, 15, 3)],
]
const TUNG = 1
const TINH = 6
const T = (beats: Beat): [number, Beat] => [TUNG, beats]
const t = (beats: Beat): [number, Beat] => [TINH, beats]
const BAR_A = [T(1), t(0.5), t(0.5), T(1), t(1)]
const BAR_B = [T(0.5), T(0.5), t(1), T(1), t(0.5), t(0.5)]
const TRONG: [number, Beat][] = [...BAR_A, ...BAR_A, ...BAR_B, ...BAR_A, ...BAR_A, ...BAR_A, ...BAR_B, ...BAR_B, T(1), T(1), T(2)]

const sweepNotes = ([from, to]: [number, number]) => Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => from + i * Math.sign(to - from))

export const MELODIES: Record<InstrumentId, Melody> = {
  'dan-bau': { title: 'Gió đồng', bpm: 66, notes: BAU.flat().map(([degree]) => degree) },
  'sao-truc': { title: 'Chiều quê', bpm: 80, notes: SAO.flat().map(([degree]) => degree) },
  'dan-tranh': { title: 'Mưa xuân', bpm: 92, notes: TRANH.flat().flatMap(item => ('note' in item ? [item.note] : sweepNotes(item.sweep))) },
  'trong-com': { title: 'Hội làng', bpm: 100, notes: TRONG.map(([degree]) => degree) },
}

export const PIECE_NOTE = 'Giai điệu mẫu do nhóm biên soạn trên thang âm ngũ cung (hò xự xang xê cống).'

/** Builds strokes on a running clock; each stroke starts where the previous one left off plus a rest. */
class Composer {
  readonly strokes: Stroke[] = []
  private clock = 0
  private readonly random: () => number
  private readonly instrument: InstrumentId
  private readonly beatMs: number

  constructor(instrument: InstrumentId, bpm: number, seed: number) {
    this.instrument = instrument
    this.beatMs = 60_000 / bpm
    this.random = seededRandom(seed)
  }

  ms(beats: Beat) {
    return Math.round(beats * this.beatMs)
  }

  add(points: Point[], restMs: number) {
    const id = `${this.instrument}-${this.strokes.length + 1}`
    this.strokes.push({ id, instrument: this.instrument, seed: Math.floor(this.random() * 0xffffffff) >>> 0, startedAt: BASE_TIME + this.clock, points })
    this.clock += points[points.length - 1].t + restMs
  }

  /** A held line drawn left to right; height follows pitch, sliding into each note like a hand would. */
  line(notes: Line, x0: number, width: number, restMs: number) {
    const duration = notes.reduce((sum, [, beats]) => sum + this.ms(beats), 0)
    const raw: { y: number; t: number; dx: number }[] = []
    let noteStart = 0
    let previous = notes[0][0]
    for (const [degree, beats] of notes) {
      const noteEnd = noteStart + this.ms(beats)
      const leap = Math.abs(degree - previous)
      for (let time = Math.ceil(noteStart / FRAME_MS) * FRAME_MS; time < noteEnd; time += FRAME_MS) {
        // Ease from the previous pitch over SLIDE_MS (passing notes are too brief to sound).
        const k = Math.min(1, (time - noteStart) / SLIDE_MS)
        const eased = (1 - Math.cos(k * Math.PI)) / 2
        const y = yOfDegree(previous) + (yOfDegree(degree) - yOfDegree(previous)) * eased + Math.sin(time / 320) * 20 * eased
        // While sliding the line also moves sideways, so leaps read as diagonal sweeps, not steps.
        const sliding = k < 1 && leap > 0
        raw.push({ y, t: time, dx: sliding ? (leap * 46 * FRAME_MS) / SLIDE_MS : 1 })
      }
      previous = degree
      noteStart = noteEnd
    }
    raw.push({ y: raw[raw.length - 1].y, t: duration, dx: 1 })
    const total = raw.reduce((sum, point) => sum + point.dx, 0)
    let x = x0
    const points: Point[] = raw.map((point, i) => {
      if (i) x += (point.dx / total) * width
      return { x: round(x), y: round(point.y), t: point.t }
    })
    this.add(points, restMs)
  }

  tap(x: number, y: number, holdMs: number, restMs: number) {
    this.add([{ x: round(x), y: round(y), t: 0 }, { x: round(x), y: round(y + 1.5), t: holdMs }], restMs)
  }

  glissando(from: number, to: number, y: number, durationMs: number, restMs: number) {
    const steps = Math.max(2, Math.round(durationMs / FRAME_MS))
    const points = Array.from({ length: steps + 1 }, (_, i) => {
      const k = i / steps
      return { x: round(xOfString(from) + (xOfString(to) - xOfString(from)) * k), y: round(y - Math.sin(k * Math.PI) * 70), t: Math.round(k * durationMs) }
    })
    this.add(points, restMs)
  }
}

const round = (value: number) => Math.round(value * 10) / 10

function compose(instrument: InstrumentId): Stroke[] {
  const melody = MELODIES[instrument]
  const composer = new Composer(instrument, melody.bpm, instrument.length * 7919)
  const beat = composer.ms(1)
  if (instrument === 'dan-bau' || instrument === 'sao-truc') {
    const lines = instrument === 'dan-bau' ? BAU : SAO
    const width = 1680 / lines.length
    lines.forEach((line, i) => composer.line(line, 120 + i * width, width - 60, beat))
  } else if (instrument === 'dan-tranh') {
    TRANH.forEach((phrase, row) => {
      phrase.forEach((item, i) => {
        const last = i === phrase.length - 1
        const y = 230 + row * 190
        if ('note' in item) composer.tap(xOfString(item.note), y + Math.sin(i * 1.7) * 40, Math.min(180, composer.ms(item.beats) - 40), composer.ms(item.beats) - Math.min(180, composer.ms(item.beats) - 40) + (last ? beat : 0))
        else composer.glissando(item.sweep[0], item.sweep[1], y + 70, composer.ms(item.beats), last ? beat : 0)
      })
    })
  } else {
    TRONG.forEach(([degree, beats], i) => {
      const hold = 80
      composer.tap(120 + (i / (TRONG.length - 1)) * 1680, yOfDegree(degree) + (i % 2 ? 14 : -14), hold, composer.ms(beats) - hold)
    })
  }
  return composer.strokes
}

/** The demo piece for an instrument, as an artwork that replays with sound. */
export function pieceArtwork(instrument: InstrumentId): Artwork {
  const strokes = compose(instrument)
  const last = strokes[strokes.length - 1]
  return {
    version: ARTWORK_VERSION,
    id: `mau-${instrument}`,
    name: MELODIES[instrument].title,
    createdAt: BASE_TIME,
    updatedAt: last.startedAt + last.points[last.points.length - 1].t,
    width: 1920,
    height: 1080,
    strokes,
  }
}
