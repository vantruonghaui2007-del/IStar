import { describe, expect, it } from 'vitest'
import type { InstrumentId } from '../music/instruments'
import { xOfString, yOfDegree } from '../music/scale'
import { scoreOf } from '../music/score'
import { buildPlant, MAX_LEAVES } from './plant'
import type { Point, Stroke } from './types'

/** A stroke along a gentle curve: `count` points `step` px apart, `dt` ms apart. */
function curve(count: number, step = 6, dt = 16): Point[] {
  return Array.from({ length: count }, (_, i) => ({ x: 200 + i * step, y: 600 + Math.sin(i / 12) * 80, t: i * dt }))
}
const stroke = (points: Point[], instrument: InstrumentId = 'dan-bau', seed = 42): Stroke => ({ id: 's', instrument, seed, startedAt: 0, points })
const tap = (instrument: InstrumentId) => stroke([{ x: 500, y: 500, t: 0 }, { x: 503, y: 501, t: 120 }], instrument)
const INSTRUMENTS: InstrumentId[] = ['dan-bau', 'sao-truc', 'dan-tranh', 'trong-com']

describe('buildPlant', () => {
  it('is reproducible from the stroke seed', () => {
    for (const instrument of INSTRUMENTS) {
      expect(buildPlant(stroke(curve(120), instrument), true)).toEqual(buildPlant(stroke(curve(120), instrument), true))
    }
    expect(buildPlant(stroke(curve(120), 'dan-bau', 7), true)).not.toEqual(buildPlant(stroke(curve(120), 'dan-bau', 8), true))
  })

  it('never grows more than 20 leaves on a stroke', () => {
    expect(MAX_LEAVES).toBe(20)
    for (const instrument of INSTRUMENTS) expect(buildPlant(stroke(curve(2000, 8), instrument), true).leaves.length).toBeLessThanOrEqual(MAX_LEAVES)
  })

  it('đàn bầu grows a lotus pad on every note it glides to, and a lotus flower when the hand lifts', () => {
    const points = [0, 1, 2, 3, 4, 5].map(i => ({ x: 300 + i * 80, y: yOfDegree([2, 2, 4, 5, 3, 3][i]), t: i * 200 }))
    const glides = scoreOf(stroke(points), true).filter(event => event.kind === 'glide').length
    const plant = buildPlant(stroke(points), true)
    expect(plant.leaves.filter(leaf => leaf.shape === 'pad').length).toBeGreaterThanOrEqual(glides)
    expect(plant.flowers.at(-1)).toMatchObject({ kind: 'lotus', x: points[5].x, y: points[5].y, bornAt: points[5].t })
    expect(buildPlant(stroke(points), false).flowers).toEqual([])
  })

  it('đàn tranh opens one peach blossom for every string plucked', () => {
    const sweep = stroke([{ x: xOfString(2), y: 500, t: 0 }, { x: xOfString(9), y: 520, t: 400 }], 'dan-tranh')
    const plucks = scoreOf(sweep, true).length
    expect(buildPlant(sweep, true).flowers.filter(flower => flower.kind === 'blossom')).toHaveLength(plucks)
  })

  it('sáo trúc grows a bamboo culm with nodes and blade leaves', () => {
    const plant = buildPlant(stroke(curve(120), 'sao-truc'), true)
    expect(plant.nodes.length).toBeGreaterThan(5)
    expect(plant.leaves.every(leaf => leaf.shape === 'blade')).toBe(true)
  })

  it('a drum hit grows a small tuft of rice; a pinch in place is a small flower on the other instruments', () => {
    expect(buildPlant(tap('trong-com'), true).flowers).toEqual([expect.objectContaining({ kind: 'tuft', small: true })])
    for (const instrument of ['dan-bau', 'sao-truc', 'dan-tranh'] as const) {
      const plant = buildPlant(tap(instrument), true)
      expect(plant.segments).toEqual([])
      expect(plant.flowers).toHaveLength(1)
      expect(plant.flowers[0].small).toBe(true)
    }
  })

  it('draws slow movement thicker than fast movement', () => {
    const slow = buildPlant(stroke(curve(60, 4, 40)), true)
    const fast = buildPlant(stroke(curve(60, 30, 8)), true)
    const middle = (plant: ReturnType<typeof buildPlant>) => plant.segments[Math.floor(plant.segments.length / 2)].width
    expect(middle(slow)).toBeGreaterThan(middle(fast) * 1.8)
  })

  it('keeps what a growing stroke has shown, so replay matches the final picture', () => {
    const points = Array.from({ length: 300 }, (_, i) => ({ x: 100 + i * 5, y: 540 + Math.sin(i / 20) * 300, t: i * 16 }))
    for (const instrument of INSTRUMENTS) {
      const partial = buildPlant(stroke(points.slice(0, 150), instrument), false)
      const full = buildPlant(stroke(points, instrument), true)
      expect(full.leaves.slice(0, partial.leaves.length), instrument).toEqual(partial.leaves)
      expect(full.nodes.slice(0, partial.nodes.length), instrument).toEqual(partial.nodes)
      expect(full.flowers.slice(0, partial.flowers.length), instrument).toEqual(partial.flowers)
    }
  })

  it('knows when everything has finished blooming', () => {
    const plant = buildPlant(stroke(curve(80)), true)
    expect(plant.doneAt).toBeGreaterThan(Math.max(...plant.flowers.map(flower => flower.bornAt)))
  })
})
