import { describe, expect, it } from 'vitest'
import { normalizeArtwork } from '../storage/artworks'
import { INSTRUMENT_IDS } from './instruments'
import { MELODIES, pieceArtwork } from './pieces'
import { scoreOf } from './score'

describe('tác phẩm mẫu', () => {
  it('has one titled piece per instrument, played only on that instrument', () => {
    for (const id of INSTRUMENT_IDS) {
      const piece = pieceArtwork(id)
      expect(piece.name).toBe(MELODIES[id].title)
      expect(piece.strokes.length).toBeGreaterThan(3)
      expect(piece.strokes.every(stroke => stroke.instrument === id)).toBe(true)
    }
  })

  it('plays back exactly the written notes', () => {
    for (const id of INSTRUMENT_IDS) {
      const played = pieceArtwork(id).strokes.flatMap(stroke => scoreOf(stroke, true)).filter(event => event.kind !== 'release').map(event => ('degree' in event ? event.degree : -1))
      expect(played, id).toEqual(MELODIES[id].notes)
    }
  })

  it('are valid artworks inside the canvas, the same every time', () => {
    for (const id of INSTRUMENT_IDS) {
      const piece = pieceArtwork(id)
      expect(normalizeArtwork(piece)).toEqual(piece)
      expect(pieceArtwork(id)).toEqual(piece)
      for (const point of piece.strokes.flatMap(stroke => stroke.points)) {
        expect(point.x).toBeGreaterThanOrEqual(0)
        expect(point.x).toBeLessThanOrEqual(1920)
        expect(point.y).toBeGreaterThanOrEqual(0)
        expect(point.y).toBeLessThanOrEqual(1080)
      }
    }
  })

  it('last between 20 and 60 seconds', () => {
    for (const id of INSTRUMENT_IDS) {
      const strokes = pieceArtwork(id).strokes
      const last = strokes[strokes.length - 1]
      const seconds = (last.startedAt + last.points[last.points.length - 1].t - strokes[0].startedAt) / 1000
      expect(seconds, id).toBeGreaterThan(20)
      expect(seconds, id).toBeLessThan(60)
    }
  })
})
