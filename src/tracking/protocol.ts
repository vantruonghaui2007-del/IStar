/** One MediaPipe hand landmark, normalized to the camera frame (0–1). */
export type NormalizedLandmark = { x: number; y: number; z?: number }

/** What the tracker reports for a processed frame: 21 landmarks, or no hand. */
export type HandSample = { time: number; landmarks: NormalizedLandmark[] | null; frameAspect: number }

export type WorkerRequest =
  | { type: 'init'; wasmBaseUrl: string; modelUrl: string }
  | { type: 'frame'; bitmap: ImageBitmap; timestamp: number }
  | { type: 'close' }

export type WorkerResponse =
  | { type: 'ready'; loadMs: number }
  | { type: 'result'; timestamp: number; landmarks: NormalizedLandmark[] | null; inferenceMs: number }
  | { type: 'skipped'; timestamp: number }
  | { type: 'error'; fatal: boolean; message: string }
