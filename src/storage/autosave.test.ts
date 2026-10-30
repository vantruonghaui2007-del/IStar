import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Autosaver, type SaveState } from './autosave'

describe('Autosaver', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('saves the latest snapshot one second after the last change', async () => {
    const saved: number[] = []
    const saver = new Autosaver<number>(async value => void saved.push(value), () => {}, 1000)
    saver.schedule(1)
    await vi.advanceTimersByTimeAsync(600)
    saver.schedule(2)
    await vi.advanceTimersByTimeAsync(999)
    expect(saved).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    expect(saved).toEqual([2])
  })

  it('reports saving, saved and failed states', async () => {
    const states: SaveState['status'][] = []
    let fail = true
    const saver = new Autosaver<number>(async () => { if (fail) throw new Error('disk full') }, state => states.push(state.status), 1000)
    saver.schedule(1)
    await vi.advanceTimersByTimeAsync(1000)
    expect(states).toEqual(['pending', 'saving', 'error'])
    fail = false
    saver.schedule(2)
    await vi.advanceTimersByTimeAsync(1000)
    expect(states.slice(3)).toEqual(['pending', 'saving', 'saved'])
  })

  it('flushes a pending save immediately', async () => {
    const saved: number[] = []
    const saver = new Autosaver<number>(async value => void saved.push(value), () => {}, 1000)
    saver.schedule(3)
    await saver.flush()
    expect(saved).toEqual([3])
    await vi.advanceTimersByTimeAsync(2000)
    expect(saved).toEqual([3])
  })

  it('can drop a pending save', async () => {
    const saved: number[] = []
    const saver = new Autosaver<number>(async value => void saved.push(value), () => {}, 1000)
    saver.schedule(4)
    saver.cancel()
    await vi.advanceTimersByTimeAsync(2000)
    expect(saved).toEqual([])
  })
})
