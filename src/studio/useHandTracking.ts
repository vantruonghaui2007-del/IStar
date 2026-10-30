import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { CameraError, cameraErrorMessage } from '../tracking/camera'
import { HandTracker, type TrackerStats, type TrackerStatus } from '../tracking/handTracker'
import type { HandSample } from '../tracking/protocol'

export type TrackingState = {
  status: TrackerStatus
  /** Why tracking is unavailable (camera or model error), in Vietnamese. */
  problem: string | null
  /** Set when the camera itself failed; `retry` re-opens it. */
  cameraFailed: boolean
  stats: TrackerStats | null
}

const CAMERA_LOST = 'Mất kết nối camera (webcam bị rút ra hoặc ứng dụng khác đã chiếm). Cắm lại rồi bấm Thử lại — hoặc vẽ bằng chuột.'

const initial: TrackingState = { status: 'off', problem: null, cameraFailed: false, stats: null }

/** Owns the HandTracker for a <video> element and exposes React state for it. */
export function useHandTracking(video: RefObject<HTMLVideoElement | null>, onSample: (sample: HandSample) => void) {
  const [state, setState] = useState<TrackingState>(initial)
  const tracker = useRef<HandTracker | null>(null)
  const sampleHandler = useRef(onSample)
  useEffect(() => {
    sampleHandler.current = onSample
  }, [onSample])

  const start = useCallback(async () => {
    if (!video.current) return
    tracker.current?.stop()
    const instance = new HandTracker(video.current, {
      onStatus: (status, detail) =>
        setState(previous => ({
          ...previous,
          status,
          cameraFailed: false,
          problem: status === 'error' ? `Không tải được model nhận diện (${detail ?? 'lỗi không rõ'}). Bấm Thử lại — hoặc vẽ bằng chuột.` : null,
        })),
      onSample: sample => sampleHandler.current(sample),
      onStats: stats => setState(previous => ({ ...previous, stats })),
      onLost: () => {
        tracker.current = null
        setState({ status: 'off', problem: CAMERA_LOST, cameraFailed: true, stats: null })
      },
    })
    tracker.current = instance
    try {
      await instance.start()
    } catch (error) {
      instance.stop()
      tracker.current = null
      const message = error instanceof CameraError ? error.message : cameraErrorMessage('unknown')
      setState({ status: 'off', problem: message, cameraFailed: true, stats: null })
    }
  }, [video])

  const stop = useCallback(() => {
    tracker.current?.stop()
    tracker.current = null
    setState(initial)
  }, [])

  const retry = useCallback(() => {
    if (tracker.current?.running && state.status === 'error') tracker.current.retryModel()
    else void start()
  }, [start, state.status])

  const pause = useCallback(() => tracker.current?.pause(), [])
  const resume = useCallback(() => tracker.current?.resume(), [])

  useEffect(() => () => tracker.current?.stop(), [])

  return { ...state, start, stop, retry, pause, resume }
}
