import { describe, expect, it } from 'vitest'
import { buildPlant, MAX_LEAVES } from './plant'
import type { Point, Stroke } from './types'

/** A stroke along a gentle curve: `count` points `step` px apart, `dt` ms apart. */
function curve(count: number, step = 6, dt = 16): Point[] {
  return Array.from({ length: count }, (_, i) => ({ x: 200 + i * step, y: 600 + Math.sin(i / 12) * 80, t: i * dt }))
}
const stroke = (points: Point[], seed = 42, palette: Stroke['palette'] = 'vuon-xuan'): Stroke => ({ id: 's', palette, seed, startedAt: 0, points })

describe('buildPlant', () => {
  it('is reproducible from the stroke seed', () => {
    expect(buildPlant(stroke(curve(120)), true)).toEqual(buildPlant(stroke(curve(120)), true))
    expect(buildPlant(stroke(curve(120), 7), true)).not.toEqual(buildPlant(stroke(curve(120), 8), true))
  })

  it('grows at most 20 leaves on any stroke', () => {
    const plant = buildPlant(stroke(curve(2000, 8)), true)
    expect(MAX_LEAVES).toBe(20)
    expect(plant.leaves).toHaveLength(20)
  })

  it('alternates leaves on both sides of the stem', () => {
    const sides = buildPlant(stroke(curve(200)), true).leaves.map(leaf => leaf.side)
    expect(sides.length).toBeGreaterThan(3)
    sides.slice(1).forEach((side, i) => expect(side).toBe(-sides[i]))
  })

  it('opens a flower at the end of a finished stroke only', () => {
    const points = curve(80)
    const finished = buildPlant(stroke(points), true)
    expect(finished.flower).toMatchObject({ x: points.at(-1)!.x, y: points.at(-1)!.y, small: false, bornAt: points.at(-1)!.t })
    expect(buildPlant(stroke(points), false).flower).toBeNull()
  })

  it('turns a pinch in place into one small flower', () => {
    const plant = buildPlant(stroke([{ x: 500, y: 500, t: 0 }, { x: 503, y: 501, t: 120 }]), true)
    expect(plant.segments).toEqual([])
    expect(plant.leaves).toEqual([])
    expect(plant.flower).toMatchObject({ small: true })
  })

  it('draws slow movement thicker than fast movement', () => {
    const slow = buildPlant(stroke(curve(60, 4, 40)), true)
    const fast = buildPlant(stroke(curve(60, 30, 8)), true)
    const middle = (plant: ReturnType<typeof buildPlant>) => plant.segments[Math.floor(plant.segments.length / 2)].width
    expect(middle(slow)).toBeGreaterThan(middle(fast) * 1.8)
  })

  it('keeps leaves of a growing stroke stable, so replay matches the final picture', () => {
    const points = curve(300)
    const partial = buildPlant(stroke(points.slice(0, 150)), false).leaves
    const full = buildPlant(stroke(points), true).leaves
    expect(partial.length).toBeGreaterThan(0)
    expect(full.slice(0, partial.length)).toEqual(partial)
  })

  it('adds firefly glows only in the firefly-night palette', () => {
    expect(buildPlant(stroke(curve(80), 1, 'dem-dom-dom'), true).fireflies.length).toBeGreaterThan(0)
    expect(buildPlant(stroke(curve(80), 1, 'vuon-xuan'), true).fireflies).toEqual([])
  })

  it('knows when every leaf and flower has finished blooming', () => {
    const plant = buildPlant(stroke(curve(80)), true)
    expect(plant.doneAt).toBeGreaterThan(plant.flower!.bornAt)
  })
})
