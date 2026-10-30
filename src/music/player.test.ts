import { describe, expect, it } from 'vitest'
import type { SceneItem } from '../artwork/render'
import type { Stroke } from '../artwork/types'
import { MusicPlayer, type SoundOutput } from './player'
import { yOfDegree } from './scale'

const sao: Stroke = { id: 'a', instrument: 'sao-truc', seed: 1, startedAt: 0, points: [{ x: 0, y: yOfDegree(2), t: 0 }, { x: 10, y: yOfDegree(4), t: 300 }, { x: 20, y: yOfDegree(4), t: 600 }] }

function recorder() {
  const log: string[] = []
  const output: SoundOutput = {
    play: (instrument, strokeId, event) => log.push(`${instrument}:${strokeId}:${event.kind}${'degree' in event ? event.degree : ''}`),
    stop: strokeId => log.push(`stop:${strokeId}`),
  }
  return { log, output }
}

describe('MusicPlayer', () => {
  it('plays each event once, when the scene reaches it', () => {
    const { log, output } = recorder()
    const player = new MusicPlayer(output)
    player.sync([{ stroke: sao, finished: false, age: 100 }])
    player.sync([{ stroke: sao, finished: false, age: 200 }])
    player.sync([{ stroke: sao, finished: true, age: 650 }])
    expect(log).toEqual(['sao-truc:a:blow2', 'sao-truc:a:glide4', 'sao-truc:a:release'])
  })

  it('stays silent for strokes that finished long ago (opening a saved garden)', () => {
    const { log, output } = recorder()
    new MusicPlayer(output).sync([{ stroke: sao, finished: true, age: 60_000 }])
    expect(log).toEqual(['sao-truc:a:release'])
  })

  it('plays again when a replay restarts', () => {
    const { log, output } = recorder()
    const player = new MusicPlayer(output)
    player.sync([{ stroke: sao, finished: false, age: 50 }])
    player.sync([{ stroke: { ...sao, points: sao.points.slice(0, 1) }, finished: false, age: 10 }])
    expect(log).toEqual(['sao-truc:a:blow2', 'sao-truc:a:blow2'])
  })

  it('silences a stroke that leaves the scene (undo, new garden, end of replay)', () => {
    const { log, output } = recorder()
    const player = new MusicPlayer(output)
    const scene: SceneItem[] = [{ stroke: sao, finished: false, age: 50 }]
    player.sync(scene)
    player.sync([])
    expect(log).toEqual(['sao-truc:a:blow2', 'stop:a'])
  })
})
