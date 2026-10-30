import type { SceneItem } from '../artwork/render'
import type { Stroke } from '../artwork/types'
import type { InstrumentId } from './instruments'
import { scoreOf, type MusicEvent } from './score'

export interface SoundOutput {
  play(instrument: InstrumentId, strokeId: string, event: MusicEvent): void
  stop(strokeId: string): void
}

/** Events older than this when first seen are skipped (but releases always go through). */
const FRESH_MS = 400

type Progress = { played: number; age: number }

/**
 * Plays the music of whatever the canvas shows. It reads the same scene the
 * renderer draws — live drawing or replay — so sound and picture never drift.
 */
export class MusicPlayer {
  private readonly output: SoundOutput
  private readonly progress = new Map<string, Progress>()
  private readonly scores = new WeakMap<Stroke, MusicEvent[]>()
  onNote: ((instrument: InstrumentId, event: MusicEvent) => void) | null = null

  constructor(output: SoundOutput) {
    this.output = output
  }

  sync(items: SceneItem[]) {
    const seen = new Set<string>()
    for (const item of items) {
      const id = item.stroke.id
      seen.add(id)
      const events = this.scoreFor(item)
      let state = this.progress.get(id)
      if (!state || item.age < state.age) state = { played: 0, age: item.age }
      while (state.played < events.length && events[state.played].t <= item.age) {
        const event = events[state.played++]
        if (event.kind === 'release' || item.age - event.t <= FRESH_MS) {
          this.output.play(item.stroke.instrument, id, event)
          if (event.kind !== 'release') this.onNote?.(item.stroke.instrument, event)
        }
      }
      state.age = item.age
      this.progress.set(id, state)
    }
    for (const id of [...this.progress.keys()]) {
      if (seen.has(id)) continue
      this.progress.delete(id)
      this.output.stop(id)
    }
  }

  private scoreFor(item: SceneItem) {
    if (!item.finished) return scoreOf(item.stroke, false)
    let events = this.scores.get(item.stroke)
    if (!events) {
      events = scoreOf(item.stroke, true)
      this.scores.set(item.stroke, events)
    }
    return events
  }
}
