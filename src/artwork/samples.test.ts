import { describe, expect, it } from 'vitest'
import { normalizeArtwork } from '../storage/artworks'
import { MAX_POINTS, countPoints } from './editor'
import { grownPlant } from './plant'
import { sampleArtworks } from './samples'

describe('sample gardens', () => {
  const samples = sampleArtworks()

  it('ships three named samples: few strokes, many strokes, crossing strokes', () => {
    expect(samples.map(sample => sample.name)).toEqual(['Mầm đầu tiên', 'Vườn xuân rộn rã', 'Đêm đom đóm'])
    expect(samples[0].strokes.length).toBeLessThan(8)
    expect(samples[1].strokes.length).toBeGreaterThan(15)
  })

  it('are valid, storable artworks under the point limit', () => {
    for (const sample of samples) {
      expect(normalizeArtwork(sample)).toEqual(sample)
      expect(countPoints(sample.strokes)).toBeLessThan(MAX_POINTS)
    }
  })

  it('are generated the same way every time', () => {
    expect(sampleArtworks()).toEqual(samples)
  })

  it('show every palette, small flowers and fireflies', () => {
    const strokes = samples.flatMap(sample => sample.strokes)
    expect(new Set(strokes.map(stroke => stroke.palette))).toEqual(new Set(['vuon-xuan', 'hoang-hon', 'dem-dom-dom']))
    expect(strokes.some(stroke => grownPlant(stroke).flower?.small)).toBe(true)
    expect(samples[2].strokes.some(stroke => grownPlant(stroke).fireflies.length > 0)).toBe(true)
  })

  it('keep strokes inside the canvas', () => {
    for (const point of samples.flatMap(sample => sample.strokes.flatMap(stroke => stroke.points))) {
      expect(point.x).toBeGreaterThanOrEqual(0)
      expect(point.x).toBeLessThanOrEqual(1920)
      expect(point.y).toBeGreaterThanOrEqual(0)
      expect(point.y).toBeLessThanOrEqual(1080)
    }
  })
})
