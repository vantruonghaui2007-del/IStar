import { describe, expect, it } from 'vitest'
import { FrameGate, nextTimestamp } from './frameGate'

describe('FrameGate', () => {
  it('limits sending to one frame per interval (max 20 per second)', () => {
    const gate = new FrameGate({ minIntervalMs: 50, stallMs: 1000 })
    expect(gate.shouldSend(0)).toBe(true)
    gate.sent(0)
    gate.received()
    expect(gate.shouldSend(30)).toBe(false)
    expect(gate.shouldSend(50)).toBe(true)
  })

  it('keeps only one frame in flight until the worker answers', () => {
    const gate = new FrameGate({ minIntervalMs: 50, stallMs: 1000 })
    gate.sent(0)
    expect(gate.shouldSend(200)).toBe(false)
    gate.received()
    expect(gate.shouldSend(200)).toBe(true)
  })

  it('recovers when the worker never answers a frame', () => {
    const gate = new FrameGate({ minIntervalMs: 50, stallMs: 1000 })
    gate.sent(0)
    expect(gate.shouldSend(999)).toBe(false)
    expect(gate.shouldSend(1000)).toBe(true)
  })

  it('can be reset after the tracker restarts', () => {
    const gate = new FrameGate({ minIntervalMs: 50, stallMs: 1000 })
    gate.sent(0)
    gate.reset()
    expect(gate.shouldSend(10)).toBe(true)
  })
})

describe('nextTimestamp', () => {
  it('keeps MediaPipe VIDEO timestamps strictly increasing', () => {
    expect(nextTimestamp(-Infinity, 16.6)).toBe(16.6)
    expect(nextTimestamp(100, 100)).toBe(101)
    expect(nextTimestamp(100, 40)).toBe(101)
    expect(nextTimestamp(100, 150)).toBe(150)
  })
})
