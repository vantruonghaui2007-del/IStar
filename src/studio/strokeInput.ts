import { randomSeed } from '../artwork/random'
import { CANVAS_HEIGHT, CANVAS_WIDTH, type PaletteId } from '../artwork/types'
import type { GestureEvent } from '../tracking/gesture'
import type { EditorStore } from './editorStore'

/** Hand and mouse both draw through here: canvas-normalized gesture events → editor actions. */
export class StrokeInput {
  private readonly store: EditorStore
  private readonly palette: () => PaletteId
  private startedAt = 0

  constructor(store: EditorStore, palette: () => PaletteId) {
    this.store = store
    this.palette = palette
  }

  handle = (event: GestureEvent) => {
    if (event.type === 'stroke-start') {
      this.startedAt = event.time
      this.store.dispatch({
        type: 'begin',
        id: crypto.randomUUID(),
        seed: randomSeed(),
        palette: this.palette(),
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
