import type { InstrumentId } from './instruments'
import { MELODIES } from './pieces'

/**
 * “Wait mode” play-along: the next note lights up and the lesson waits until
 * the player hits it, so anyone can get through a whole piece at their own pace.
 */
export type Lesson = { instrument: InstrumentId; notes: number[]; index: number; mistakes: number; done: boolean }

export const createLesson = (instrument: InstrumentId): Lesson => ({ instrument, notes: MELODIES[instrument].notes, index: 0, mistakes: 0, done: false })

export const lessonTarget = (lesson: Lesson): number | null => (lesson.done ? null : lesson.notes[lesson.index])

/** The drum only has two voices: anything in the lower half is tùng, the upper half tình. */
const same = (instrument: InstrumentId, played: number, wanted: number) => (instrument === 'trong-com' ? played >= 5 === wanted >= 5 : played === wanted)

export function advanceLesson(lesson: Lesson, instrument: InstrumentId, degree: number): Lesson {
  if (lesson.done || instrument !== lesson.instrument) return lesson
  if (!same(instrument, degree, lesson.notes[lesson.index])) return { ...lesson, mistakes: lesson.mistakes + 1 }
  const index = lesson.index + 1
  return { ...lesson, index, done: index >= lesson.notes.length }
}
