export type SaveState = { status: 'idle' | 'pending' | 'saving' | 'saved' | 'error'; at?: number; error?: unknown }

/** Debounced saving: the latest snapshot is written `delayMs` after the last change. */
export class Autosaver<T> {
  private readonly save: (snapshot: T) => Promise<void>
  private readonly onState: (state: SaveState) => void
  private readonly delayMs: number
  private timer: ReturnType<typeof setTimeout> | undefined
  private pending: { snapshot: T } | null = null

  constructor(save: (snapshot: T) => Promise<void>, onState: (state: SaveState) => void, delayMs = 1000) {
    this.save = save
    this.onState = onState
    this.delayMs = delayMs
  }

  schedule(snapshot: T) {
    this.pending = { snapshot }
    clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.flush(), this.delayMs)
    this.onState({ status: 'pending' })
  }

  async flush() {
    clearTimeout(this.timer)
    const pending = this.pending
    if (!pending) return
    this.pending = null
    this.onState({ status: 'saving' })
    try {
      await this.save(pending.snapshot)
      this.onState({ status: 'saved', at: Date.now() })
    } catch (error) {
      this.onState({ status: 'error', error })
    }
  }

  cancel() {
    clearTimeout(this.timer)
    this.pending = null
  }
}
