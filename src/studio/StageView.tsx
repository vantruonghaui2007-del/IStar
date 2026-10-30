import { useEffect, useRef, type PointerEvent, type RefObject } from 'react'
import type { Cursor } from '../artwork/render'
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../artwork/types'
import { INSTRUMENTS, type InstrumentId } from '../music/instruments'
import { lessonTarget, type Lesson } from '../music/lesson'
import { MELODIES } from '../music/pieces'
import { noteLabel } from '../music/scale'
import { drawStage, type StageHit } from '../stage/drawStage'

type Props = {
  instrument: InstrumentId
  /** The tracker's <video>; its stream is mirrored here, large, behind the instruments. */
  source: RefObject<HTMLVideoElement | null>
  cameraOn: boolean
  hand: RefObject<Cursor | null>
  hits: RefObject<StageHit[]>
  lesson: Lesson | null
  onLessonStop: () => void
  onLessonRestart: () => void
  onShowGarden: () => void
  onPointerDown: (event: PointerEvent<HTMLCanvasElement>) => void
  onPointerMove: (event: PointerEvent<HTMLCanvasElement>) => void
  onPointerUp: (event: PointerEvent<HTMLCanvasElement>) => void
}

const TIPS: Record<InstrumentId, string> = {
  'dan-bau': 'Chụm ngón ở làn nốt để gảy dây, giữ chụm rồi đưa tay lên xuống để luyến.',
  'sao-truc': 'Chụm và giữ để thổi; đưa tay vào làn nốt muốn thổi.',
  'dan-tranh': 'Chụm ngón ngay trên một dây để gảy, hoặc chụm rồi lướt ngang để rải.',
  'trong-com': 'Chụm nhanh trên mặt trống: trên là “tình”, dưới là “tùng”.',
}

export const targetName = (instrument: InstrumentId, note: number) => (instrument === 'trong-com' ? (note >= 5 ? 'Tình' : 'Tùng') : noteLabel(note).name)

/** Augmented-reality stage: virtual instruments over the mirrored camera, plus the play-along lesson. */
export function StageView({ instrument, source, cameraOn, hand, hits, lesson, onLessonStop, onLessonRestart, onShowGarden, onPointerDown, onPointerMove, onPointerUp }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const mouse = useRef<Cursor | null>(null)
  const state = useRef({ instrument, lesson, cameraOn })
  useEffect(() => {
    state.current = { instrument, lesson, cameraOn }
  }, [instrument, lesson, cameraOn])

  useEffect(() => {
    let raf = 0
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      const ctx = canvas.current?.getContext('2d')
      if (!ctx) return
      const { instrument: current, lesson: active, cameraOn: live } = state.current
      // Follow the tracker's stream: it only appears once the camera has actually opened.
      const element = video.current
      const stream = live ? (source.current?.srcObject ?? null) : null
      if (element && element.srcObject !== stream) {
        element.srcObject = stream
        if (stream) void element.play().catch(() => undefined)
      }
      const list = hits.current ?? []
      while (list.length && now - list[0].at > 2000) list.shift()
      const targets = active && !active.done ? active.notes.slice(active.index, active.index + 3) : []
      drawStage(ctx, { instrument: current, hand: hand.current ?? mouse.current, hits: list, targets, overVideo: live, now })
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [hand, hits, source])

  const locate = (event: PointerEvent<HTMLCanvasElement>, drawing: boolean) => {
    const box = event.currentTarget.getBoundingClientRect()
    mouse.current = { x: ((event.clientX - box.left) / box.width) * CANVAS_WIDTH, y: ((event.clientY - box.top) / box.height) * CANVAS_HEIGHT, drawing }
  }

  const target = lesson ? lessonTarget(lesson) : null
  const melody = lesson ? MELODIES[lesson.instrument] : null

  return (
    <div className="stage" data-testid="stage">
      <video ref={video} muted playsInline aria-hidden="true" hidden={!cameraOn} />
      <canvas
        ref={canvas}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        data-testid="stage-canvas"
        data-target={target ?? undefined}
        role="img"
        aria-label={`Sân khấu ${INSTRUMENTS[instrument].name}: nhạc cụ ảo trên hình camera`}
        onPointerDown={event => {
          locate(event, true)
          onPointerDown(event)
        }}
        onPointerMove={event => {
          locate(event, event.buttons > 0)
          onPointerMove(event)
        }}
        onPointerUp={event => {
          locate(event, false)
          onPointerUp(event)
        }}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => {
          mouse.current = null
        }}
      />
      {!lesson && <p className="stage-tip">{TIPS[instrument]}</p>}
      {lesson && melody && !lesson.done && (
        <div className="lesson-hud" data-testid="lesson">
          <div>
            <b>
              Tập bài “{melody.title}” · {INSTRUMENTS[lesson.instrument].name}
            </b>
            <span>
              Nốt tiếp theo: <strong data-testid="lesson-next">{target !== null ? targetName(lesson.instrument, target) : ''}</strong>
            </span>
          </div>
          <div className="lesson-progress" role="progressbar" aria-valuemin={0} aria-valuemax={lesson.notes.length} aria-valuenow={lesson.index} aria-label="Tiến độ bài tập">
            <span style={{ width: `${(lesson.index / lesson.notes.length) * 100}%` }} />
          </div>
          <span className="lesson-count" data-testid="lesson-count">
            {lesson.index} / {lesson.notes.length}
          </span>
          <button type="button" onClick={onLessonStop}>
            Dừng
          </button>
        </div>
      )}
      {lesson?.done && melody && (
        <div className="lesson-done" role="dialog" aria-label="Hoàn thành bài">
          <span aria-hidden="true">🎉</span>
          <h2>Bạn đã đánh xong bài “{melody.title}”!</h2>
          <p>
            {lesson.notes.length} nốt {INSTRUMENTS[lesson.instrument].name}
            {lesson.mistakes ? ` · ${lesson.mistakes} lần chệch nốt` : ' · không chệch nốt nào'}. Mỗi nốt bạn vừa đánh đã mọc thành {INSTRUMENTS[lesson.instrument].plant.toLowerCase()} trong khu vườn.
          </p>
          <div>
            <button type="button" onClick={onShowGarden}>
              Xem khu vườn vừa gieo
            </button>
            <button type="button" className="secondary" onClick={onLessonRestart}>
              Tập lại
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
