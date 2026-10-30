import { describe, expect, it } from 'vitest'
import { grownPlant } from './plant'
import { buildTimeline, replayScene } from './replay'
import type { Stroke } from './types'

const stroke = (id: string, startedAt: number, duration: number): Stroke => ({
  id, palette: 'vuon-xuan', seed: 1, startedAt,
  points: Array.from({ length: 11 }, (_, i) => ({ x: 100 + i * 20, y: 500, t: (duration * i) / 10 })),
})

describe('replay timeline', () => {
  it('plays strokes in order at their original speed, capping long pauses', () => {
    const a = stroke('a', 0, 500)
    const b = stroke('b', 800, 400) // 300 ms after a ends
    const c = stroke('c', 60_000, 100) // a minute later
    const timeline = buildTimeline([a, b, c], 1000)
    expect(timeline.entries.map(entry => entry.offset)).toEqual([0, 800, 2200])
  })

  it('never lets an overlapping clock move a stroke backwards', () => {
    const timeline = buildTimeline([stroke('a', 5_000, 500), stroke('b', 1_000, 200)], 1000)
    expect(timeline.entries[1].offset).toBe(500)
  })

  it('shows a partly drawn stroke mid-way and nothing that has not started', () => {
    const a = stroke('a', 0, 1000)
    const b = stroke('b', 1500, 1000)
    const scene = replayScene(buildTimeline([a, b]), 500)
    expect(scene).toHaveLength(1)
    expect(scene[0].finished).toBe(false)
    expect(scene[0].stroke.points.every(point => point.t <= 500)).toBe(true)
    expect(scene[0].stroke.points.length).toBe(6)
  })

  it('ends on exactly the saved artwork, fully grown', () => {
    const strokes = [stroke('a', 0, 300), stroke('b', 400, 300)]
    const timeline = buildTimeline(strokes)
    const scene = replayScene(timeline, timeline.duration)
    expect(scene.map(item => item.stroke)).toEqual(strokes)
    expect(scene.every((item, i) => item.finished && item.age >= grownPlant(strokes[i]).doneAt)).toBe(true)
  })

  it('handles an empty artwork', () => {
    expect(buildTimeline([]).duration).toBe(0)
    expect(replayScene(buildTimeline([]), 100)).toEqual([])
  })
})
