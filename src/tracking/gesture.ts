import type { HandSample, NormalizedLandmark } from './protocol'

export type Vec = { x: number; y: number }
export type HandState = 'absent' | 'ready' | 'drawing'
export type GestureEvent =
  | { type: 'stroke-start'; point: Vec; time: number }
  | { type: 'stroke-move'; point: Vec; time: number }
  | { type: 'stroke-end'; time: number }
/** `cursor` and event points are normalized to the canvas (0–1 on both axes). */
export type GestureUpdate = { state: HandState; cursor: Vec | null; events: GestureEvent[] }
export type MapOptions = { margin: number; canvasAspect: number }

export const GESTURE = {
  /** Pen goes down when thumb–index distance / palm width drops below this… */
  startRatio: 0.28,
  /** …and lifts only once it rises above this. In between, the state holds. */
  releaseRatio: 0.42,
  /** Weight of the newest sample in exponential smoothing. */
  smoothing: 0.35,
  /** A lost hand ends the open stroke after this long. */
  lostHandMs: 200,
  /** Palms smaller than this (frame-height units) are too far away to trust. */
  minPalm: 0.025,
  /** A hand that returns within the grace period farther than this (canvas-height units) starts a new stroke. */
  rejoinDistance: 0.12,
}

export const CANVAS_MAPPING: MapOptions = { margin: 0.1, canvasAspect: 16 / 9 }

const THUMB_TIP = 4
const INDEX_TIP = 8
const INDEX_BASE = 5
const PINKY_BASE = 17

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** Thumb–index distance divided by palm width, measured in pixels; null for unusable samples. */
export function pinchRatio(landmarks: NormalizedLandmark[], frameAspect: number): number | null {
  if (landmarks.length < 21 || landmarks.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y))) return null
  const distance = (a: NormalizedLandmark, b: NormalizedLandmark) => Math.hypot((a.x - b.x) * frameAspect, a.y - b.y)
  const palm = distance(landmarks[INDEX_BASE], landmarks[PINKY_BASE])
  if (palm < GESTURE.minPalm) return null
  return distance(landmarks[THUMB_TIP], landmarks[INDEX_TIP]) / palm
}

/**
 * The part of the camera frame that maps onto the canvas: the frame is
 * cropped to the canvas aspect ratio (like `object-fit: cover`) and then
 * inset by `margin`, so a fingertip can reach the canvas edges while the
 * whole hand stays visible to the camera.
 */
export function activeZone(frameAspect: number, options: MapOptions = CANVAS_MAPPING) {
  const width = frameAspect > options.canvasAspect ? options.canvasAspect / frameAspect : 1
  const height = frameAspect < options.canvasAspect ? frameAspect / options.canvasAspect : 1
  return {
    left: (1 - width) / 2 + options.margin * width,
    top: (1 - height) / 2 + options.margin * height,
    width: width * (1 - 2 * options.margin),
    height: height * (1 - 2 * options.margin),
  }
}

/** Camera landmark → canvas point, mirrored horizontally like the preview. */
export function mapToCanvas(point: NormalizedLandmark, frameAspect: number, options: MapOptions = CANVAS_MAPPING): Vec {
  const zone = activeZone(frameAspect, options)
  return { x: clamp01((1 - point.x - zone.left) / zone.width), y: clamp01((point.y - zone.top) / zone.height) }
}

/** Turns hand samples into pen-down / move / pen-up events. */
export class PinchController {
  private readonly options: MapOptions
  private drawing = false
  private armed = true
  private present = false
  private lastSeen = -Infinity
  private smoothed: Vec | null = null
  private lastStrokePoint: Vec | null = null

  constructor(options: MapOptions = CANVAS_MAPPING) {
    this.options = options
  }

  update(sample: HandSample): GestureUpdate {
    const events: GestureEvent[] = []
    const landmarks = sample.landmarks
    const ratio = landmarks ? pinchRatio(landmarks, sample.frameAspect) : null
    this.expire(sample.time, events)

    if (!landmarks || ratio === null) {
      // Stop adding points at once; the stroke itself ends after lostHandMs.
      this.present = false
      this.smoothed = null
      this.armed = true
      return { state: 'absent', cursor: null, events }
    }

    const returning = this.drawing && !this.present
    const raw = mapToCanvas(landmarks[INDEX_TIP], sample.frameAspect, this.options)
    const previous = this.smoothed
    const point = previous
      ? { x: previous.x + (raw.x - previous.x) * GESTURE.smoothing, y: previous.y + (raw.y - previous.y) * GESTURE.smoothing }
      : raw
    this.smoothed = point
    this.present = true
    this.lastSeen = sample.time
    if (ratio > GESTURE.releaseRatio) this.armed = true

    if (this.drawing) {
      if (ratio > GESTURE.releaseRatio) this.end(sample.time, events)
      else if (returning && this.farFromStroke(point)) {
        this.end(sample.time, events)
        if (ratio < GESTURE.startRatio) this.start(point, sample.time, events)
      } else {
        this.lastStrokePoint = point
        events.push({ type: 'stroke-move', point, time: sample.time })
      }
    } else if (this.armed && ratio < GESTURE.startRatio) {
      this.start(point, sample.time, events)
    }
    return { state: this.drawing ? 'drawing' : 'ready', cursor: point, events }
  }

  /** Call every animation frame so a stroke ends even when samples stop arriving. */
  tick(time: number): GestureUpdate {
    const events: GestureEvent[] = []
    this.expire(time, events)
    return { state: this.present ? (this.drawing ? 'drawing' : 'ready') : 'absent', cursor: this.present ? this.smoothed : null, events }
  }

  /** Camera off, hidden tab or replay: end any stroke; drawing again needs a fresh pinch. */
  reset(time = performance.now()): GestureEvent[] {
    const events: GestureEvent[] = []
    if (this.drawing) this.end(time, events)
    this.armed = false
    this.present = false
    this.smoothed = null
    this.lastSeen = -Infinity
    return events
  }

  private start(point: Vec, time: number, events: GestureEvent[]) {
    this.drawing = true
    this.lastStrokePoint = point
    events.push({ type: 'stroke-start', point, time })
  }

  private end(time: number, events: GestureEvent[]) {
    this.drawing = false
    this.lastStrokePoint = null
    events.push({ type: 'stroke-end', time })
  }

  private expire(time: number, events: GestureEvent[]) {
    if (this.drawing && time - this.lastSeen >= GESTURE.lostHandMs) this.end(time, events)
  }

  private farFromStroke(point: Vec) {
    const last = this.lastStrokePoint
    if (!last) return true
    return Math.hypot((point.x - last.x) * this.options.canvasAspect, point.y - last.y) > GESTURE.rejoinDistance
  }
}
