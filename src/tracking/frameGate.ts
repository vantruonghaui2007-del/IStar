export type FrameGateOptions = { minIntervalMs: number; stallMs: number }

/**
 * Decides when the main thread may hand the worker a new camera frame:
 * at most one frame in flight, at most one per `minIntervalMs`, and a stalled
 * frame (worker never answered) is given up after `stallMs` so tracking can't
 * freeze forever.
 */
export class FrameGate {
  private lastSentAt = -Infinity
  private inFlight = false
  private readonly options: FrameGateOptions

  constructor(options: FrameGateOptions) {
    this.options = options
  }

  shouldSend(now: number): boolean {
    const sinceLast = now - this.lastSentAt
    if (this.inFlight && sinceLast < this.options.stallMs) return false
    return sinceLast >= this.options.minIntervalMs
  }

  sent(now: number) {
    this.lastSentAt = now
    this.inFlight = true
  }

  received() {
    this.inFlight = false
  }

  reset() {
    this.lastSentAt = -Infinity
    this.inFlight = false
  }
}

/** MediaPipe VIDEO mode rejects timestamps that do not strictly increase. */
export function nextTimestamp(previous: number, candidate: number): number {
  return candidate > previous ? candidate : previous + 1
}
