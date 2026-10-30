import { describe, expect, it } from 'vitest'
import type { Point, Stroke } from '../artwork/types'
import type { InstrumentId } from './instruments'
import { yOfDegree, xOfString } from './scale'
import { scoreOf } from './score'

const stroke = (instrument: InstrumentId, points: Point[]): Stroke => ({ id: 's', instrument, seed: 1, startedAt: 0, points })
const kinds = (events: { kind: string }[]) => events.map(event => event.kind)

describe('scoreOf — what each instrument plays for a stroke', () => {
  it('đàn bầu: pinch plucks, moving up or down glides (luyến), lifting releases', () => {
    const dwell = (degree: number, from: number) => [0, 25, 50].map(dt => ({ x: from + dt, y: yOfDegree(degree), t: from + dt }))
    const points = [...dwell(3, 0), ...dwell(5, 100), ...dwell(4, 200)]
    expect(scoreOf(stroke('dan-bau', points), true)).toEqual([
      { t: 0, kind: 'pluck', degree: 3 },
      { t: 100, kind: 'glide', degree: 5 },
      { t: 200, kind: 'glide', degree: 4 },
      { t: 250, kind: 'release' },
    ])
    expect(kinds(scoreOf(stroke('dan-bau', points), false))).toEqual(['pluck', 'glide', 'glide'])
  })

  it('a note only sounds once the hand settles on it, so passing notes and jitter stay silent', () => {
    const points = [{ x: 0, y: yOfDegree(2), t: 0 }, { x: 5, y: yOfDegree(3), t: 16 }, { x: 10, y: yOfDegree(4), t: 32 }, { x: 15, y: yOfDegree(5), t: 48 }, { x: 20, y: yOfDegree(5), t: 96 }]
    expect(scoreOf(stroke('sao-truc', points), false)).toEqual([
      { t: 0, kind: 'blow', degree: 2 },
      { t: 48, kind: 'glide', degree: 5 },
    ])
  })

  it('sáo trúc: holding blows a sustained note that follows the hand', () => {
    const points = [{ x: 0, y: yOfDegree(2), t: 0 }, { x: 10, y: yOfDegree(2), t: 400 }, { x: 20, y: yOfDegree(6), t: 800 }, { x: 22, y: yOfDegree(6), t: 850 }]
    expect(scoreOf(stroke('sao-truc', points), true)).toEqual([
      { t: 0, kind: 'blow', degree: 2 },
      { t: 800, kind: 'glide', degree: 6 },
      { t: 850, kind: 'release' },
    ])
  })

  it('đàn tranh: sweeping across plucks every string crossed, in order', () => {
    const points = [{ x: xOfString(2), y: 500, t: 0 }, { x: xOfString(5), y: 500, t: 90 }]
    const events = scoreOf(stroke('dan-tranh', points), true)
    expect(events.map(event => ('degree' in event ? event.degree : null))).toEqual([2, 3, 4, 5])
    expect(events.map(event => event.t)).toEqual([0, 30, 60, 90])
    const back = scoreOf(stroke('dan-tranh', [{ x: xOfString(9), y: 0, t: 0 }, { x: xOfString(7), y: 0, t: 40 }]), true)
    expect(back.map(event => ('degree' in event ? event.degree : null))).toEqual([9, 8, 7])
  })

  it('trống cơm: a pinch is one drum hit, high or low by hand height', () => {
    expect(scoreOf(stroke('trong-com', [{ x: 0, y: 900, t: 0 }, { x: 300, y: 100, t: 200 }]), true)).toEqual([{ t: 0, kind: 'hit', degree: 1 }])
  })

  it('is stable as a stroke grows, so live play and replay sound the same', () => {
    const points = Array.from({ length: 60 }, (_, i) => ({ x: 100 + i * 25, y: 540 + Math.sin(i / 4) * 400, t: i * 16 }))
    for (const instrument of ['dan-bau', 'sao-truc', 'dan-tranh', 'trong-com'] as const) {
      const full = scoreOf(stroke(instrument, points), false)
      const half = scoreOf(stroke(instrument, points.slice(0, 30)), false)
      expect(full.slice(0, half.length)).toEqual(half)
    }
  })
})
