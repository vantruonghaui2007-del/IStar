export type PaletteId = 'vuon-xuan' | 'hoang-hon' | 'dem-dom-dom'

/** A canvas point (1920×1080 space); `t` is milliseconds since the stroke started. */
export type Point = { x: number; y: number; t: number }

export type Stroke = {
  id: string
  palette: PaletteId
  /** Drives every random choice of the plant grown from this stroke. */
  seed: number
  /** Wall-clock start (ms since epoch); orders strokes on the replay timeline. */
  startedAt: number
  points: Point[]
}

export const CANVAS_WIDTH = 1920
export const CANVAS_HEIGHT = 1080
