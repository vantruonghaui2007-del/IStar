import type { Point, Stroke } from '../artwork/types'
import { isInstrumentId, type InstrumentId } from '../music/instruments'

export const ARTWORK_VERSION = 3
export const DEFAULT_ARTWORK_NAME = 'Khu vườn chưa đặt tên'

export type Artwork = {
  version: typeof ARTWORK_VERSION
  id: string
  name: string
  createdAt: number
  updatedAt: number
  width: 1920
  height: 1080
  strokes: Stroke[]
}

export type StorageErrorKind = 'quota' | 'unavailable'

export function storageErrorKind(error: unknown): StorageErrorKind {
  const name = error instanceof DOMException || error instanceof Error ? error.name : ''
  return name === 'QuotaExceededError' ? 'quota' : 'unavailable'
}

export class StorageError extends Error {
  readonly kind: StorageErrorKind
  constructor(cause: unknown) {
    const kind = storageErrorKind(cause)
    super(
      kind === 'quota'
        ? 'Bộ nhớ trình duyệt đã đầy nên chưa lưu được. Tác phẩm vẫn ở trên màn hình — hãy xuất PNG hoặc xóa bớt tác phẩm cũ.'
        : 'Trình duyệt không cho lưu (chế độ ẩn danh hoặc bộ nhớ bị chặn). Tác phẩm vẫn ở trên màn hình — hãy xuất PNG.',
      { cause },
    )
    this.name = 'StorageError'
    this.kind = kind
  }
}

/** Before instruments, strokes carried a colour palette (v2 id or v1 display name). */
const PALETTE_INSTRUMENTS: Record<string, InstrumentId> = {
  'vuon-xuan': 'dan-bau',
  'Vườn xuân': 'dan-bau',
  'hoang-hon': 'dan-tranh',
  'Hoàng hôn': 'dan-tranh',
  'dem-dom-dom': 'sao-truc',
  'Đêm đom đóm': 'sao-truc',
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const isPoint = (value: unknown): value is Point => isRecord(value) && [value.x, value.y, value.t].every(Number.isFinite)

/**
 * Validates a stored record and upgrades older versions. Version 1 kept
 * palette display names and absolute `performance.now()` timestamps; version
 * 2 kept palette ids, stroke-relative times and a wall-clock `startedAt`;
 * version 3 replaces the palette with the instrument the stroke plays.
 */
export function normalizeArtwork(raw: unknown): Artwork | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || !Array.isArray(raw.strokes)) return null
  const createdAt = Number.isFinite(raw.createdAt) ? (raw.createdAt as number) : Date.now()
  const updatedAt = Number.isFinite(raw.updatedAt) ? (raw.updatedAt as number) : createdAt
  const legacy = raw.version !== 2 && raw.version !== ARTWORK_VERSION
  const firstLegacyTime = legacy ? Math.min(...raw.strokes.map(s => (isRecord(s) && Array.isArray(s.points) && isPoint(s.points[0]) ? s.points[0].t : Infinity))) : 0
  const strokes: Stroke[] = []
  for (const [index, item] of raw.strokes.entries()) {
    if (!isRecord(item) || !Array.isArray(item.points) || !item.points.every(isPoint) || !item.points.length) return null
    const points = item.points as Point[]
    const instrument = isInstrumentId(item.instrument) ? item.instrument : (PALETTE_INSTRUMENTS[String(item.palette)] ?? 'dan-bau')
    const seed = Number.isFinite(item.seed) ? (item.seed as number) >>> 0 : index + 1
    const id = typeof item.id === 'string' ? item.id : `${raw.id}-${index}`
    if (legacy) {
      const start = points[0].t
      strokes.push({ id, instrument, seed, startedAt: createdAt + (start - firstLegacyTime), points: points.map(p => ({ x: p.x, y: p.y, t: Math.max(0, p.t - start) })) })
    } else {
      if (!Number.isFinite(item.startedAt)) return null
      strokes.push({ id, instrument, seed, startedAt: item.startedAt as number, points })
    }
  }
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : DEFAULT_ARTWORK_NAME
  return { version: ARTWORK_VERSION, id: raw.id, name, createdAt, updatedAt, width: 1920, height: 1080, strokes }
}

type Options = { factory?: IDBFactory; name?: string }
const STORE = 'artworks'

/** Artworks on this device (IndexedDB). Every failure surfaces as a StorageError. */
export class ArtworkRepository {
  private readonly factory: () => IDBFactory
  private readonly name: string

  constructor(options: Options = {}) {
    this.factory = () => options.factory ?? indexedDB
    this.name = options.name ?? 'mua-net-ai'
  }

  async save(artwork: Artwork): Promise<void> {
    await this.run('readwrite', async store => {
      const existing = normalizeArtwork(await request(store.get(artwork.id)))
      await request(store.put({ ...artwork, createdAt: existing?.createdAt ?? artwork.createdAt }))
    })
  }

  async get(id: string): Promise<Artwork | null> {
    return this.run('readonly', async store => normalizeArtwork(await request(store.get(id))))
  }

  async list(): Promise<Artwork[]> {
    const rows = await this.run('readonly', store => request(store.getAll()))
    return (rows as unknown[])
      .map(normalizeArtwork)
      .filter((artwork): artwork is Artwork => artwork !== null)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }

  async rename(id: string, name: string, now = Date.now()): Promise<void> {
    await this.run('readwrite', async store => {
      const artwork = normalizeArtwork(await request(store.get(id)))
      if (artwork) await request(store.put({ ...artwork, name: name.trim() || DEFAULT_ARTWORK_NAME, updatedAt: now }))
    })
  }

  async remove(id: string): Promise<void> {
    await this.run('readwrite', store => request(store.delete(id)))
  }

  private async run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => Promise<T>): Promise<T> {
    let db: IDBDatabase | undefined
    try {
      db = await this.open()
      const tx = db.transaction(STORE, mode)
      const done = new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error ?? new DOMException('Transaction aborted', 'AbortError'))
      })
      done.catch(() => undefined) // reported through `work` or the await below
      const result = await work(tx.objectStore(STORE))
      await done
      return result
    } catch (error) {
      throw error instanceof StorageError ? error : new StorageError(error)
    } finally {
      db?.close()
    }
  }

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const open = this.factory().open(this.name, 1)
      open.onupgradeneeded = () => {
        if (!open.result.objectStoreNames.contains(STORE)) open.result.createObjectStore(STORE, { keyPath: 'id' })
      }
      open.onsuccess = () => resolve(open.result)
      open.onerror = () => reject(open.error)
      open.onblocked = () => reject(new DOMException('Database blocked', 'InvalidStateError'))
    })
  }
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
