import { useSyncExternalStore } from 'react'
import { editorReducer, initialEditor, type EditorAction, type EditorState } from '../artwork/editor'

/**
 * Editor state outside React: the hand pipeline and the render loop read it
 * every frame, while components subscribe only to the slices they show.
 */
export class EditorStore {
  private state: EditorState = initialEditor
  private readonly listeners = new Set<() => void>()

  getState = () => this.state

  dispatch = (action: EditorAction) => {
    const next = editorReducer(this.state, action)
    if (next === this.state) return
    this.state = next
    this.listeners.forEach(listener => listener())
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}

export function useEditor<T>(store: EditorStore, select: (state: EditorState) => T): T {
  return useSyncExternalStore(store.subscribe, () => select(store.getState()))
}
