/// <reference lib="webworker" />
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { nextTimestamp } from './frameGate'
import type { WorkerRequest, WorkerResponse } from './protocol'

let landmarker: HandLandmarker | undefined
let loading: Promise<void> | undefined
let lastTimestamp = -Infinity

const post = (message: WorkerResponse) => self.postMessage(message)
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error))

async function init(wasmBaseUrl: string, modelUrl: string) {
  const started = performance.now()
  // `true` selects MediaPipe's ES-module loader. This file runs as a module
  // worker, where the classic loader cannot register ModuleFactory and fails
  // with "ModuleFactory not set".
  const fileset = await FilesetResolver.forVisionTasks(wasmBaseUrl, true)
  landmarker = await HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: modelUrl, delegate: 'CPU' },
    runningMode: 'VIDEO',
    numHands: 1,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })
  lastTimestamp = -Infinity
  post({ type: 'ready', loadMs: Math.round(performance.now() - started) })
}

function detect(bitmap: ImageBitmap, timestamp: number) {
  try {
    // Frames that arrive while the model is still loading are answered too,
    // otherwise the main thread would wait for a reply that never comes.
    if (!landmarker) return post({ type: 'skipped', timestamp })
    lastTimestamp = nextTimestamp(lastTimestamp, timestamp)
    const started = performance.now()
    const result = landmarker.detectForVideo(bitmap, lastTimestamp)
    const hand = result.landmarks[0]
    post({
      type: 'result',
      timestamp,
      landmarks: hand ? hand.map(({ x, y, z }) => ({ x, y, z })) : null,
      inferenceMs: performance.now() - started,
    })
  } catch (error) {
    post({ type: 'error', fatal: false, message: errorText(error) })
  } finally {
    bitmap.close()
  }
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data
  if (message.type === 'init') {
    loading ??= init(message.wasmBaseUrl, message.modelUrl).catch(error => {
      loading = undefined
      post({ type: 'error', fatal: true, message: errorText(error) })
    })
  } else if (message.type === 'frame') {
    detect(message.bitmap, message.timestamp)
  } else if (message.type === 'close') {
    landmarker?.close()
    landmarker = undefined
    loading = undefined
  }
}

export {}
