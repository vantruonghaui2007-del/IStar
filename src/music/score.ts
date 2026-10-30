import type { Point, Stroke } from '../artwork/types'
import { degreeAtY, STRINGS, stringAtX, xOfString } from './scale'

export type MusicEvent =
  | { t: number; kind: 'pluck' | 'blow' | 'glide' | 'hit'; degree: number }
  | { t: number; kind: 'release' }

/** A new note counts once the hand has stayed on it this long — passing notes and jitter stay silent. */
export const SETTLE_MS = 40

/** Pitch-following instruments: one onset, then a glide each time the hand settles on another note. */
function held(points: Point[], onset: 'pluck' | 'blow', finished: boolean): MusicEvent[] {
  let degree = degreeAtY(points[0].y)
  const events: MusicEvent[] = [{ t: points[0].t, kind: onset, degree }]
  let candidate = degree
  let since = points[0].t
  for (const point of points.slice(1)) {
    const next = degreeAtY(point.y)
    if (next !== candidate) {
      candidate = next
      since = point.t
    }
    if (candidate !== degree && point.t - since >= SETTLE_MS) {
      degree = candidate
      events.push({ t: since, kind: 'glide', degree })
    }
  }
  if (finished) events.push({ t: points[points.length - 1].t, kind: 'release' })
  return events
}

/** Zither: the first touch plucks its string, then every string whose centre the hand passes. */
function zither(points: Point[]): MusicEvent[] {
  let last = stringAtX(points[0].x)
  const events: MusicEvent[] = [{ t: points[0].t, kind: 'pluck', degree: last }]
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    if (a.x === b.x) continue
    const direction = Math.sign(b.x - a.x)
    for (let string = stringAtX(a.x); string >= 0 && string < STRINGS; string += direction) {
      const centre = xOfString(string)
      const passed = direction > 0 ? centre > a.x && centre <= b.x : centre < a.x && centre >= b.x
      if (!passed) {
        if (direction > 0 ? centre > b.x : centre < b.x) break
        continue
      }
      if (string === last) continue
      last = string
      events.push({ t: Math.round(a.t + ((centre - a.x) / (b.x - a.x)) * (b.t - a.t)), kind: 'pluck', degree: string })
    }
  }
  return events
}

/**
 * The music a stroke plays, as events at stroke-relative times. The result
 * for a growing stroke is always a prefix of the result for the whole stroke
 * (apart from the final release), so live play and replay sound identical.
 */
export function scoreOf(stroke: Stroke, finished: boolean): MusicEvent[] {
  const points = stroke.points
  if (!points.length) return []
  switch (stroke.instrument) {
    case 'dan-bau':
      return held(points, 'pluck', finished)
    case 'sao-truc':
      return held(points, 'blow', finished)
    case 'dan-tranh':
      return zither(points)
    case 'trong-com':
      return [{ t: points[0].t, kind: 'hit', degree: degreeAtY(points[0].y) }]
  }
}
