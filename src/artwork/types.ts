import type { InstrumentId } from '../music/instruments'

/** A canvas point (1920×1080 space); `t` is milliseconds since the stroke started. */
export type Point = { x: number; y: number; t: number }

export type Stroke = {
  id: string
  /** Which traditional instrument the stroke plays — and which plant it grows. */
  instrument: InstrumentId
  /** Drives every random choice of the plant grown from this stroke. */
  seed: number
  /** Wall-clock start (ms since epoch); orders strokes on the replay timeline. */
  startedAt: number
  points: Point[]
}

export const CANVAS_WIDTH = 1920
export const CANVAS_HEIGHT = 1080
