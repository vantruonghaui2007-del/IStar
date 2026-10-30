import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import type { Stroke } from '../artwork/types'
import { ArtworkRepository, normalizeArtwork, StorageError, storageErrorKind, type Artwork } from './artworks'

const stroke = (id: string, startedAt = 1_000): Stroke => ({ id, instrument: 'dan-bau', seed: 7, startedAt, points: [{ x: 1, y: 2, t: 0 }, { x: 10, y: 20, t: 16 }] })
const artwork = (id: string, updatedAt: number, strokes = [stroke('a')]): Artwork => ({ version: 3, id, name: `Vườn ${id}`, createdAt: updatedAt, updatedAt, width: 1920, height: 1080, strokes })
const repository = () => new ArtworkRepository({ factory: new IDBFactory(), name: `test-${Math.random()}` })

describe('ArtworkRepository', () => {
  it('saves and reopens an artwork exactly', async () => {
    const repo = repository()
    await repo.save(artwork('one', 5))
    expect(await repo.get('one')).toEqual(artwork('one', 5))
  })

  it('lists newest first', async () => {
    const repo = repository()
    await repo.save(artwork('old', 1))
    await repo.save(artwork('new', 9))
    expect((await repo.list()).map(item => item.id)).toEqual(['new', 'old'])
  })

  it('keeps the original creation time when an artwork is saved again', async () => {
    const repo = repository()
    await repo.save(artwork('one', 5))
    await repo.save({ ...artwork('one', 50), createdAt: 50 })
    expect(await repo.get('one')).toMatchObject({ createdAt: 5, updatedAt: 50 })
  })

  it('renames and deletes', async () => {
    const repo = repository()
    await repo.save(artwork('one', 5))
    await repo.rename('one', '  Vườn của Lan  ', 60)
    expect(await repo.get('one')).toMatchObject({ name: 'Vườn của Lan', updatedAt: 60 })
    await repo.remove('one')
    expect(await repo.get('one')).toBeNull()
    expect(await repo.list()).toEqual([])
  })

  it('reports an unavailable database as a StorageError', async () => {
    const broken = { open: () => { throw new DOMException('blocked', 'SecurityError') } } as unknown as IDBFactory
    const repo = new ArtworkRepository({ factory: broken, name: 'x' })
    await expect(repo.save(artwork('one', 1))).rejects.toBeInstanceOf(StorageError)
  })
})

describe('storage errors', () => {
  it('recognises a full disk', () => {
    expect(storageErrorKind(new DOMException('full', 'QuotaExceededError'))).toBe('quota')
    expect(storageErrorKind(new Error('nope'))).toBe('unavailable')
  })
})

describe('normalizeArtwork', () => {
  it('upgrades version-1 artworks (palette names, absolute timestamps)', () => {
    const legacy = {
      id: 'v1', name: 'Cũ', createdAt: 100, updatedAt: 200, width: 1920, height: 1080,
      strokes: [
        { id: 'a', palette: 'Hoàng hôn', seed: 3, points: [{ x: 1, y: 1, t: 5_000 }, { x: 9, y: 9, t: 5_040 }] },
        { id: 'b', palette: 'Đêm đom đóm', seed: 4, points: [{ x: 2, y: 2, t: 6_000 }] },
      ],
    }
    const upgraded = normalizeArtwork(legacy)!
    expect(upgraded.version).toBe(3)
    expect(upgraded.strokes.map(s => s.instrument)).toEqual(['dan-tranh', 'sao-truc'])
    expect(upgraded.strokes[0].points.map(p => p.t)).toEqual([0, 40])
    expect(upgraded.strokes[1].startedAt - upgraded.strokes[0].startedAt).toBe(1_000)
  })

  it('upgrades version-2 palettes to the instrument with the matching look', () => {
    const v2 = { version: 2, id: 'v2', name: 'Vườn', createdAt: 1, updatedAt: 2, width: 1920, height: 1080, strokes: [{ id: 'a', palette: 'vuon-xuan', seed: 1, startedAt: 5, points: [{ x: 1, y: 1, t: 0 }] }] }
    expect(normalizeArtwork(v2)!.strokes[0]).toEqual({ id: 'a', instrument: 'dan-bau', seed: 1, startedAt: 5, points: [{ x: 1, y: 1, t: 0 }] })
  })

  it('rejects records that are not artworks', () => {
    expect(normalizeArtwork(null)).toBeNull()
    expect(normalizeArtwork({ id: 'x' })).toBeNull()
    expect(normalizeArtwork({ id: 'x', name: 'y', strokes: [{ points: 'bad' }] })).toBeNull()
  })
})
