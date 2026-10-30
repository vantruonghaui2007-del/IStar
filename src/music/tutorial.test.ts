import { describe, expect, it } from 'vitest'
import type { Point, Stroke } from '../artwork/types'
import type { InstrumentId } from './instruments'
import { xOfString, yOfDegree } from './scale'
import { TUTORIALS } from './tutorial'

let n = 0
const stroke = (instrument: InstrumentId, points: Point[]): Stroke => ({ id: `s${n++}`, instrument, seed: 1, startedAt: n * 1000, points })
const tap = (instrument: InstrumentId, x: number, y: number) => stroke(instrument, [{ x, y, t: 0 }, { x: x + 1, y, t: 100 }])
const passes = (instrument: InstrumentId, step: number, strokes: Stroke[]) => TUTORIALS[instrument][step].check(strokes)

describe('hướng dẫn từng bước', () => {
  it('has three steps for every instrument', () => {
    for (const steps of Object.values(TUTORIALS)) expect(steps).toHaveLength(3)
  })

  it('đàn bầu: gảy → luyến → thả cho ngân', () => {
    expect(passes('dan-bau', 0, [])).toBe(false)
    expect(passes('dan-bau', 0, [tap('dan-bau', 500, 500)])).toBe(true)
    const bend = stroke('dan-bau', [{ x: 0, y: yOfDegree(2), t: 0 }, { x: 50, y: yOfDegree(4), t: 300 }, { x: 60, y: yOfDegree(4), t: 400 }, { x: 90, y: yOfDegree(6), t: 600 }, { x: 95, y: yOfDegree(6), t: 700 }])
    expect(passes('dan-bau', 1, [tap('dan-bau', 500, 500)])).toBe(false)
    expect(passes('dan-bau', 1, [bend])).toBe(true)
    expect(passes('dan-bau', 2, [bend])).toBe(true)
  })

  it('sáo trúc: ngân dài → lên cao → ngắt hơi', () => {
    const long = stroke('sao-truc', [{ x: 0, y: yOfDegree(3), t: 0 }, { x: 40, y: yOfDegree(3), t: 1200 }])
    expect(passes('sao-truc', 0, [tap('sao-truc', 10, 500)])).toBe(false)
    expect(passes('sao-truc', 0, [long])).toBe(true)
    const rising = stroke('sao-truc', [{ x: 0, y: yOfDegree(2), t: 0 }, { x: 40, y: yOfDegree(7), t: 500 }, { x: 45, y: yOfDegree(7), t: 600 }])
    expect(passes('sao-truc', 1, [long])).toBe(false)
    expect(passes('sao-truc', 1, [rising])).toBe(true)
    expect(passes('sao-truc', 2, [rising])).toBe(true)
  })

  it('đàn tranh: gảy từng dây → rải → rải ngược', () => {
    expect(passes('dan-tranh', 0, [tap('dan-tranh', 300, 400), tap('dan-tranh', 600, 400)])).toBe(false)
    expect(passes('dan-tranh', 0, [tap('dan-tranh', 300, 400), tap('dan-tranh', 600, 400), tap('dan-tranh', 900, 400)])).toBe(true)
    const up = stroke('dan-tranh', [{ x: xOfString(2), y: 500, t: 0 }, { x: xOfString(9), y: 520, t: 400 }])
    const down = stroke('dan-tranh', [{ x: xOfString(12), y: 500, t: 0 }, { x: xOfString(6), y: 520, t: 400 }])
    expect(passes('dan-tranh', 1, [up])).toBe(true)
    expect(passes('dan-tranh', 2, [up])).toBe(false)
    expect(passes('dan-tranh', 2, [down])).toBe(true)
  })

  it('trống cơm: tùng → tình → bốn tiếng đều nhịp', () => {
    expect(passes('trong-com', 0, [tap('trong-com', 500, 950)])).toBe(true)
    expect(passes('trong-com', 1, [tap('trong-com', 500, 950)])).toBe(false)
    expect(passes('trong-com', 1, [tap('trong-com', 500, 200)])).toBe(true)
    const steady = [0, 1, 2, 3].map(i => ({ ...tap('trong-com', 300 + i * 100, 900), startedAt: 10_000 + i * 500 }))
    const ragged = [0, 1, 2, 3].map(i => ({ ...tap('trong-com', 300 + i * 100, 900), startedAt: 10_000 + [0, 200, 1100, 1300][i] }))
    expect(passes('trong-com', 2, steady)).toBe(true)
    expect(passes('trong-com', 2, ragged)).toBe(false)
  })

  it('ignores strokes of other instruments', () => {
    expect(passes('dan-bau', 0, [tap('trong-com', 500, 500)])).toBe(false)
  })
})
