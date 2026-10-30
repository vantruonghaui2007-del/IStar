import { grownPlant } from './plant'
import type { SceneItem } from './render'
import type { Stroke } from './types'

/** Pauses between strokes longer than this are shortened in replay. */
export const MAX_REPLAY_GAP = 1000

export type TimelineEntry = { stroke: Stroke; offset: number; duration: number }
export type Timeline = { entries: TimelineEntry[]; duration: number }

const strokeDuration = (stroke: Stroke) => stroke.points[stroke.points.length - 1]?.t ?? 0

/**
 * Lays strokes out on the replay clock: each stroke plays at its recorded
 * speed (point timestamps) and the pause before it is the real one, capped
 * at `maxGap` so long breaks don't stall the replay.
 */
export function buildTimeline(strokes: Stroke[], maxGap = MAX_REPLAY_GAP): Timeline {
  const entries: TimelineEntry[] = []
  let duration = 0
  strokes.forEach((stroke, index) => {
    const previous = entries[index - 1]
    const length = strokeDuration(stroke)
    let offset = 0
    if (previous) {
      const realGap = stroke.startedAt - (previous.stroke.startedAt + previous.duration)
      offset = previous.offset + previous.duration + Math.min(maxGap, Math.max(0, realGap))
    }
    entries.push({ stroke, offset, duration: length })
    duration = Math.max(duration, offset + grownPlant(stroke).doneAt)
  })
  return { entries, duration }
}

/** What the canvas shows `elapsed` ms into the replay. At `timeline.duration` it is the saved artwork, fully grown. */
export function replayScene(timeline: Timeline, elapsed: number): SceneItem[] {
  const scene: SceneItem[] = []
  for (const entry of timeline.entries) {
    if (entry.offset > elapsed) break
    const local = elapsed - entry.offset
    if (local >= entry.duration) {
      scene.push({ stroke: entry.stroke, finished: true, age: local })
    } else {
      const points = entry.stroke.points.filter(point => point.t <= local)
      scene.push({ stroke: { ...entry.stroke, points }, finished: false, age: local })
    }
  }
  return scene
}
