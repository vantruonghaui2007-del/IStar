import { randomSeed } from '../artwork/random'
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../artwork/types'
import type { InstrumentId } from '../music/instruments'
import type { GestureEvent } from '../tracking/gesture'
import type { EditorStore } from './editorStore'

/** Hand and mouse both draw through here: canvas-normalized gesture events → editor actions. */
export class StrokeInput {
  private readonly store: EditorStore
  private readonly instrument: () => InstrumentId
  private startedAt = 0

  constructor(store: EditorStore, instrument: () => InstrumentId) {
    this.store = store
    this.instrument = instrument
  }

  handle = (event: GestureEvent) => {
    if (event.type === 'stroke-start') {
      this.startedAt = event.time
      this.store.dispatch({
        type: 'begin',
        id: crypto.randomUUID(),
        seed: randomSeed(),
        instrument: this.instrument(),
        point: { x: event.point.x * CANVAS_WIDTH, y: event.point.y * CANVAS_HEIGHT },
        startedAt: Date.now(),
      })
    } else if (event.type === 'stroke-move') {
      this.store.dispatch({ type: 'extend', point: { x: event.point.x * CANVAS_WIDTH, y: event.point.y * CANVAS_HEIGHT }, elapsed: event.time - this.startedAt })
    } else {
      this.store.dispatch({ type: 'end' })
    }
  }
}
