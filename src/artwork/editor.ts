import type { InstrumentId } from '../music/instruments'
import type { Stroke } from './types'

export const MAX_POINTS = 20_000
/** Points closer than this to the previous one are jitter and are dropped. */
const MIN_POINT_DISTANCE = 2

export type EditorState = {
  strokes: Stroke[]
  redo: Stroke[]
  current: Stroke | null
  /** The artwork holds MAX_POINTS points; no new strokes are accepted. */
  limitReached: boolean
}

export type EditorAction =
  | { type: 'begin'; id: string; seed: number; instrument: InstrumentId; point: { x: number; y: number }; startedAt: number }
  | { type: 'extend'; point: { x: number; y: number }; elapsed: number }
  | { type: 'end' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'clear' }
  | { type: 'load'; strokes: Stroke[] }

export const initialEditor: EditorState = { strokes: [], redo: [], current: null, limitReached: false }

const round = (value: number) => Math.round(value * 10) / 10

export const countPoints = (strokes: Stroke[]) => strokes.reduce((sum, stroke) => sum + stroke.points.length, 0)
export const totalPoints = (state: EditorState) => countPoints(state.strokes) + (state.current?.points.length ?? 0)

function commit(state: EditorState): EditorState {
  if (!state.current) return state
  return { ...state, strokes: [...state.strokes, state.current], redo: [], current: null }
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'begin': {
      const base = commit(state)
      if (countPoints(base.strokes) >= MAX_POINTS) return { ...base, limitReached: true }
      const point = { x: round(action.point.x), y: round(action.point.y), t: 0 }
      return { ...base, current: { id: action.id, instrument: action.instrument, seed: action.seed, startedAt: action.startedAt, points: [point] } }
    }
    case 'extend': {
      const current = state.current
      if (!current) return state
      const last = current.points[current.points.length - 1]
      if (Math.hypot(action.point.x - last.x, action.point.y - last.y) < MIN_POINT_DISTANCE) return state
      const point = { x: round(action.point.x), y: round(action.point.y), t: Math.max(last.t, Math.round(action.elapsed)) }
      const next = { ...state, current: { ...current, points: [...current.points, point] } }
      if (totalPoints(next) >= MAX_POINTS) return { ...commit(next), limitReached: true }
      return next
    }
    case 'end':
      return commit(state)
    case 'undo': {
      const last = state.strokes[state.strokes.length - 1]
      if (state.current || !last) return state
      const strokes = state.strokes.slice(0, -1)
      return { ...state, strokes, redo: [...state.redo, last], limitReached: countPoints(strokes) >= MAX_POINTS }
    }
    case 'redo': {
      const next = state.redo[state.redo.length - 1]
      if (state.current || !next) return state
      const strokes = [...state.strokes, next]
      return { ...state, strokes, redo: state.redo.slice(0, -1), limitReached: countPoints(strokes) >= MAX_POINTS }
    }
    case 'clear':
      return initialEditor
    case 'load':
      return { strokes: action.strokes, redo: [], current: null, limitReached: countPoints(action.strokes) >= MAX_POINTS }
  }
}
