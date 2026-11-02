import { describe, expect, it } from 'vitest'
import { AudioEngine } from './audio'

describe('audio engine', () => {
  it('instantiates and reports state', () => {
    const engine = new AudioEngine()
    expect(engine.state).toBe('off')
  })

  it('can be muted and unmuted without error', () => {
    const engine = new AudioEngine()
    engine.setMuted(true)
    engine.setMuted(false)
  })

  it('ignores events gracefully when audio context is not yet running', () => {
    const engine = new AudioEngine()
    expect(() => {
      engine.play('dan-bau', 's1', { t: 0, kind: 'pluck', degree: 0 })
      engine.play('sao-truc', 's2', { t: 10, kind: 'glide', degree: 1 })
      engine.play('dan-tranh', 's3', { t: 20, kind: 'release' })
      engine.play('trong-com', 's4', { t: 30, kind: 'pluck', degree: 6 })
      engine.stop('s1')
    }).not.toThrow()
  })
})
