import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { buildTimeline, replayScene, type Timeline } from '../artwork/replay'
import type { SceneItem } from '../artwork/render'
import type { Stroke } from '../artwork/types'

export type ReplaySpeed = 1 | 2
export type ReplayState = { active: boolean; playing: boolean; finished: boolean; progress: number; speed: ReplaySpeed }

const idle: ReplayState = { active: false, playing: false, finished: false, progress: 0, speed: 1 }

/**
 * Replays an artwork on the shared canvas by installing a scene override.
 * The clock advances inside the render loop; React only sees coarse progress.
 */
export function useReplay(override: RefObject<(() => SceneItem[] | null) | null>) {
  const [state, setState] = useState<ReplayState>(idle)
  const clock = useRef({ timeline: null as Timeline | null, elapsed: 0, last: 0, playing: false, speed: 1 as ReplaySpeed })

  const publish = useCallback(() => {
    const c = clock.current
    const duration = c.timeline?.duration ?? 0
    setState(previous => ({
      ...previous,
      playing: c.playing,
      finished: duration > 0 && c.elapsed >= duration,
      progress: duration ? Math.min(1, c.elapsed / duration) : 1,
      speed: c.speed,
    }))
  }, [])

  const start = useCallback(
    (strokes: Stroke[]) => {
      const c = clock.current
      c.timeline = buildTimeline(strokes)
      c.elapsed = 0
      c.last = performance.now()
      c.playing = true
      override.current = () => {
        const now = performance.now()
        const timeline = c.timeline
        if (!timeline) return null
        if (c.playing) {
          c.elapsed = Math.min(timeline.duration, c.elapsed + (now - c.last) * c.speed)
          if (c.elapsed >= timeline.duration) {
            c.playing = false
            publish()
          }
        }
        c.last = now
        return replayScene(timeline, c.elapsed)
      }
      setState({ ...idle, active: true, playing: true, speed: c.speed })
    },
    [override, publish],
  )

  const toggle = useCallback(() => {
    const c = clock.current
    if (!c.timeline) return
    if (c.elapsed >= c.timeline.duration) c.elapsed = 0
    c.playing = !c.playing
    c.last = performance.now()
    publish()
  }, [publish])

  const restart = useCallback(() => {
    const c = clock.current
    c.elapsed = 0
    c.playing = true
    c.last = performance.now()
    publish()
  }, [publish])

  const setSpeed = useCallback(
    (speed: ReplaySpeed) => {
      clock.current.speed = speed
      publish()
    },
    [publish],
  )

  const stop = useCallback(() => {
    override.current = null
    clock.current.timeline = null
    clock.current.playing = false
    setState(idle)
  }, [override])

  useEffect(() => {
    if (!state.active || !state.playing) return
    const timer = window.setInterval(publish, 150)
    return () => window.clearInterval(timer)
  }, [state.active, state.playing, publish])

  useEffect(() => () => {
    override.current = null
  }, [override])

  return { ...state, start, toggle, restart, setSpeed, stop }
}
