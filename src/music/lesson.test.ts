import { describe, expect, it } from 'vitest'
import { advanceLesson, createLesson, lessonTarget } from './lesson'
import { MELODIES } from './pieces'

describe('tập đánh cả bài (chờ đúng nốt)', () => {
  it('follows the written melody of the instrument piece', () => {
    const lesson = createLesson('dan-bau')
    expect(lesson.notes).toEqual(MELODIES['dan-bau'].notes)
    expect(lesson.index).toBe(0)
    expect(lessonTarget(lesson)).toBe(MELODIES['dan-bau'].notes[0])
  })

  it('moves on only when the right note is played on the right instrument', () => {
    let lesson = createLesson('dan-tranh')
    const [first, second] = lesson.notes
    lesson = advanceLesson(lesson, 'dan-tranh', first === 0 ? 1 : 0)
    expect(lesson.index).toBe(0)
    expect(lesson.mistakes).toBe(1)
    lesson = advanceLesson(lesson, 'dan-tranh', first)
    expect(lesson.index).toBe(1)
    expect(lessonTarget(lesson)).toBe(second)
    expect(lesson.mistakes).toBe(1)

    lesson = advanceLesson(lesson, 'dan-bau', second)
    expect(lesson.index).toBe(1)
    expect(lesson.mistakes).toBe(1)
    lesson = advanceLesson(lesson, 'dan-tranh', second === 0 ? 1 : 0)
    expect(lesson.index).toBe(1)
    expect(lesson.mistakes).toBe(2)
  })

  it('treats any low hit as tùng and any high hit as tình on the drum', () => {
    let lesson = createLesson('trong-com')
    expect(lesson.notes[0]).toBeLessThan(5)
    lesson = advanceLesson(lesson, 'trong-com', 0)
    expect(lesson.index).toBe(1)
    const high = lesson.notes[1] >= 5
    lesson = advanceLesson(lesson, 'trong-com', high ? 9 : 2)
    expect(lesson.index).toBe(2)
  })
})
