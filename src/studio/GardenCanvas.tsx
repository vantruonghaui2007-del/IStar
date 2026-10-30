import { useEffect, useMemo, useRef, type PointerEvent, type RefObject } from 'react'
import { GardenRenderer, type Cursor, type SceneItem } from '../artwork/render'
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../artwork/types'
import type { EditorState } from '../artwork/editor'
import type { EditorStore } from './editorStore'

/** The live scene: every committed stroke plus the one being drawn, aged by wall clock. */
export function liveScene(state: EditorState, now = Date.now()): SceneItem[] {
  const items: SceneItem[] = state.strokes.map(stroke => ({ stroke, finished: true, age: now - stroke.startedAt }))
  if (state.current) items.push({ stroke: state.current, finished: false, age: now - state.current.startedAt })
  return items
}

type Props = {
  store: EditorStore
  cursor: RefObject<Cursor | null>
  /** When it returns a scene (replay), that scene is drawn instead of the live one. */
  override: RefObject<(() => SceneItem[] | null) | null>
  onFrame: (now: number) => void
  onPointerDown: (event: PointerEvent<HTMLCanvasElement>) => void
  onPointerMove: (event: PointerEvent<HTMLCanvasElement>) => void
  onPointerUp: (event: PointerEvent<HTMLCanvasElement>) => void
}

/** 1920×1080 logical canvas scaled by CSS; redrawn on requestAnimationFrame, independent of tracking rate. */
export function GardenCanvas({ store, cursor, override, onFrame, onPointerDown, onPointerMove, onPointerUp }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const renderer = useMemo(() => new GardenRenderer(), [])
  const frame = useRef(onFrame)
  useEffect(() => {
    frame.current = onFrame
  }, [onFrame])

  useEffect(() => {
    let raf = 0
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      frame.current(now)
      const element = canvas.current
      const ctx = element?.getContext('2d')
      if (!element || !ctx) return
      const replay = override.current?.() ?? null
      const pointer = replay ? null : cursor.current
      renderer.render(ctx, replay ?? liveScene(store.getState()), pointer)
      const marker = pointer ? `${Math.round(pointer.x)},${Math.round(pointer.y)}` : ''
      if (element.dataset.cursor !== marker) {
        if (marker) element.dataset.cursor = marker
        else delete element.dataset.cursor
      }
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [renderer, store, cursor, override])

  return (
    <canvas
      ref={canvas}
      data-testid="art-canvas"
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      aria-label="Vùng vẽ khu vườn. Kéo chuột hoặc chụm ngón tay trước camera để gieo nét."
      role="img"
    />
  )
}
