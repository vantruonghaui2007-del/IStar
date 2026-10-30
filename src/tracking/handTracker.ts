import { openCamera, stopStream } from './camera'
import { FrameGate } from './frameGate'
import { averageLuma } from './light'
import type { HandSample, NormalizedLandmark, WorkerRequest, WorkerResponse } from './protocol'

export type TrackerStatus = 'off' | 'loading' | 'ready' | 'error'
export type TrackerStats = { detectionsPerSecond: number; inferenceMs: number; luma: number | null }
export type TrackerEvents = {
  onStatus: (status: TrackerStatus, detail?: string) => void
  onSample: (sample: HandSample) => void
  onStats: (stats: TrackerStats) => void
  /** The camera went away (unplugged, taken by another app). The tracker has already stopped. */
  onLost: () => void
}

const MAX_DETECTIONS_PER_SECOND = 20
const MAX_FRAME_WIDTH = 640

const assetUrl = (path: string) => new URL(`${import.meta.env.BASE_URL}${path}`, location.href).href

/**
 * Webcam → ImageBitmap → MediaPipe worker → HandSample.
 * Drawing happens elsewhere on requestAnimationFrame; this loop only feeds the
 * worker, at most 20 frames per second with one frame in flight.
 */
export class HandTracker {
  private readonly video: HTMLVideoElement
  private readonly events: TrackerEvents
  private stream: MediaStream | null = null
  private worker: Worker | null = null
  private raf = 0
  private paused = false
  private ready = false
  private readonly gate = new FrameGate({ minIntervalMs: 1000 / MAX_DETECTIONS_PER_SECOND, stallMs: 1500 })
  private detections: number[] = []
  private inferenceMs = 0
  private luma: number | null = null
  private lastStatsAt = 0
  private lightCanvas: OffscreenCanvas | null = null

  constructor(video: HTMLVideoElement, events: TrackerEvents) {
    this.video = video
    this.events = events
  }

  get running() {
    return this.stream !== null
  }

  /** Opens the camera and loads the model. Throws CameraError when the camera can't be used. */
  async start() {
    if (this.stream) return
    this.events.onStatus('loading')
    const stream = await openCamera()
    this.stream = stream
    stream.getVideoTracks().forEach(track => track.addEventListener('ended', this.lost, { once: true }))
    this.video.srcObject = stream
    this.video.muted = true
    this.video.playsInline = true
    await this.video.play().catch(() => undefined)
    this.startWorker()
    this.paused = false
    this.raf = requestAnimationFrame(this.tick)
  }

  /** Re-creates the worker after a model error, keeping the camera open. */
  retryModel() {
    if (!this.stream) return
    this.stopWorker()
    this.startWorker()
  }

  /** Stops sending frames (replay, hidden tab) without releasing the camera. */
  pause() {
    this.paused = true
  }

  resume() {
    this.paused = false
    this.gate.reset()
  }

  /** Releases camera and worker. */
  stop() {
    cancelAnimationFrame(this.raf)
    this.stopWorker()
    stopStream(this.stream)
    this.stream = null
    this.video.srcObject = null
    this.detections = []
    this.events.onStatus('off')
  }

  private lost = () => {
    if (!this.stream) return
    this.stop()
    this.events.onLost()
  }

  private startWorker() {
    this.ready = false
    this.gate.reset()
    const worker = new Worker(new URL('./hand.worker.ts', import.meta.url), { type: 'module', name: 'hand-tracker' })
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => this.handle(event.data)
    worker.onerror = event => {
      event.preventDefault()
      this.events.onStatus('error', event.message || 'Worker nhận diện gặp lỗi.')
    }
    this.worker = worker
    this.events.onStatus('loading')
    this.post({ type: 'init', wasmBaseUrl: assetUrl('wasm'), modelUrl: assetUrl('models/hand_landmarker.task') })
  }

  private stopWorker() {
    if (!this.worker) return
    this.post({ type: 'close' })
    this.worker.terminate()
    this.worker = null
    this.ready = false
  }

  private post(message: WorkerRequest, transfer: Transferable[] = []) {
    this.worker?.postMessage(message, transfer)
  }

  private handle(message: WorkerResponse) {
    if (message.type === 'ready') {
      this.ready = true
      this.events.onStatus('ready')
      return
    }
    if (message.type === 'error') {
      this.gate.received()
      if (message.fatal) {
        this.ready = false
        this.events.onStatus('error', message.message)
      }
      return
    }
    this.gate.received()
    if (message.type === 'skipped' || this.paused) return
    const now = performance.now()
    this.detections.push(now)
    this.inferenceMs = this.inferenceMs ? this.inferenceMs * 0.8 + message.inferenceMs * 0.2 : message.inferenceMs
    this.events.onSample({ time: now, landmarks: message.landmarks as NormalizedLandmark[] | null, frameAspect: this.frameAspect() })
  }

  private frameAspect() {
    const { videoWidth, videoHeight } = this.video
    return videoWidth && videoHeight ? videoWidth / videoHeight : 4 / 3
  }

  private tick = (now: number) => {
    this.raf = requestAnimationFrame(this.tick)
    const video = this.video
    const hasFrame = video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0
    if (hasFrame && this.ready && !this.paused && !document.hidden && this.gate.shouldSend(now)) {
      this.gate.sent(now)
      const scale = Math.min(1, MAX_FRAME_WIDTH / video.videoWidth)
      const options: ImageBitmapOptions = scale < 1 ? { resizeWidth: Math.round(video.videoWidth * scale), resizeHeight: Math.round(video.videoHeight * scale) } : {}
      createImageBitmap(video, options)
        .then(bitmap => {
          if (!this.worker) return bitmap.close()
          this.post({ type: 'frame', bitmap, timestamp: now }, [bitmap])
        })
        .catch(() => this.gate.received())
    }
    if (now - this.lastStatsAt >= 1000) {
      this.lastStatsAt = now
      if (hasFrame) this.luma = this.measureLight()
      this.detections = this.detections.filter(time => now - time < 1000)
      this.events.onStats({ detectionsPerSecond: this.paused ? 0 : this.detections.length, inferenceMs: this.inferenceMs, luma: this.luma })
    }
  }

  private measureLight(): number | null {
    try {
      this.lightCanvas ??= new OffscreenCanvas(32, 24)
      const ctx = this.lightCanvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return null
      ctx.drawImage(this.video, 0, 0, 32, 24)
      return averageLuma(ctx.getImageData(0, 0, 32, 24).data)
    } catch {
      return null
    }
  }
}
