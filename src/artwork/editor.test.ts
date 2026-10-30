import { describe, expect, it } from 'vitest'
import { editorReducer, initialEditor, MAX_POINTS, totalPoints, type EditorAction, type EditorState } from './editor'

const run = (actions: EditorAction[], state: EditorState = initialEditor) => actions.reduce(editorReducer, state)
const begin = (x: number, y: number, instrument: 'dan-bau' | 'sao-truc' | 'dan-tranh' | 'trong-com' = 'dan-bau', id = 'a'): EditorAction => ({ type: 'begin', id, seed: 1, instrument, point: { x, y }, startedAt: 1_000 })
const extend = (x: number, y: number, elapsed: number): EditorAction => ({ type: 'extend', point: { x, y }, elapsed })

describe('editorReducer', () => {
  it('records a stroke with times relative to its start', () => {
    const state = run([begin(10, 10), extend(20, 10, 16), extend(30, 10, 33), { type: 'end' }])
    expect(state.current).toBeNull()
    expect(state.strokes).toHaveLength(1)
    expect(state.strokes[0]).toMatchObject({ id: 'a', startedAt: 1_000, instrument: 'dan-bau' })
    expect(state.strokes[0].points).toEqual([{ x: 10, y: 10, t: 0 }, { x: 20, y: 10, t: 16 }, { x: 30, y: 10, t: 33 }])
  })

  it('applies an instrument to the strokes drawn after choosing it only', () => {
    const state = run([begin(0, 0, 'dan-bau', 'a'), { type: 'end' }, begin(5, 5, 'dan-tranh', 'b'), { type: 'end' }])
    expect(state.strokes.map(stroke => stroke.instrument)).toEqual(['dan-bau', 'dan-tranh'])
  })

  it('ignores jitter smaller than 2 px and keeps time moving forward', () => {
    const state = run([begin(10, 10), extend(10.5, 10.5, 16), extend(20, 10, 10), { type: 'end' }])
    expect(state.strokes[0].points).toEqual([{ x: 10, y: 10, t: 0 }, { x: 20, y: 10, t: 10 }])
    const backwards = run([begin(10, 10), extend(20, 10, 30), extend(30, 10, 20)])
    expect(backwards.current!.points.map(point => point.t)).toEqual([0, 30, 30])
  })

  it('undoes and redoes whole strokes, and a new stroke clears redo', () => {
    const drawn = run([begin(0, 0, 'dan-bau', 'a'), extend(50, 0, 10), { type: 'end' }, begin(0, 50, 'dan-bau', 'b'), { type: 'end' }])
    const undone = editorReducer(drawn, { type: 'undo' })
    expect(undone.strokes.map(stroke => stroke.id)).toEqual(['a'])
    expect(editorReducer(undone, { type: 'redo' }).strokes.map(stroke => stroke.id)).toEqual(['a', 'b'])
    const branched = run([begin(9, 9, 'dan-bau', 'c'), { type: 'end' }], undone)
    expect(branched.redo).toEqual([])
  })

  it('does not undo while a stroke is being drawn', () => {
    const drawing = run([begin(0, 0, 'dan-bau', 'a'), { type: 'end' }, begin(5, 5, 'dan-bau', 'b')])
    expect(editorReducer(drawing, { type: 'undo' })).toBe(drawing)
  })

  it('clears everything when starting over', () => {
    const state = run([begin(0, 0), { type: 'end' }, { type: 'clear' }])
    expect(state.strokes).toEqual([])
    expect(state.redo).toEqual([])
  })

  it('stops at 20,000 points per artwork', () => {
    expect(MAX_POINTS).toBe(20_000)
    const actions: EditorAction[] = [begin(0, 0)]
    for (let i = 1; i < MAX_POINTS + 50; i++) actions.push(extend((i % 1000) * 3, Math.floor(i / 1000) * 3 + (i % 2) * 3, i))
    const full = run(actions)
    expect(full.current).toBeNull()
    expect(totalPoints(full)).toBe(MAX_POINTS)
    expect(full.limitReached).toBe(true)
    const refused = editorReducer(full, begin(1, 1, 'dan-bau', 'z'))
    expect(refused.current).toBeNull()
    expect(refused.strokes).toHaveLength(1)
  })

  it('loads a saved artwork with an empty history', () => {
    const saved = run([begin(0, 0), { type: 'end' }]).strokes
    const state = editorReducer(run([begin(9, 9, 'dan-bau', 'x'), { type: 'end' }, { type: 'undo' }]), { type: 'load', strokes: saved })
    expect(state.strokes).toBe(saved)
    expect(state.redo).toEqual([])
    expect(state.current).toBeNull()
  })
})
