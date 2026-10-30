import { useEffect, useRef, type RefObject } from 'react'
import { activeZone, type HandState } from '../tracking/gesture'
import type { HandSample } from '../tracking/protocol'

// MediaPipe hand topology: wrist, thumb, four fingers and the palm.
const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
]

type Props = {
  video: RefObject<HTMLVideoElement | null>
  sample: RefObject<HandSample | null>
  handState: HandState
  visible: boolean
  hidden: boolean
  onToggle: () => void
}

/** Small mirrored webcam view with the guide frame and what the AI sees (21 landmarks). */
export function CameraPreview({ video, sample, handState, visible, hidden, onToggle }: Props) {
  const overlay = useRef<HTMLCanvasElement>(null)
  const state = useRef(handState)
  useEffect(() => {
    state.current = handState
  }, [handState])

  useEffect(() => {
    if (!visible || hidden) return
    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const canvas = overlay.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)
      const current = sample.current
      const aspect = current?.frameAspect ?? 4 / 3
      const zone = activeZone(aspect)
      ctx.setLineDash([6, 5])
      ctx.lineWidth = 2
      ctx.strokeStyle = state.current === 'absent' ? '#f4d27acc' : '#ffffffcc'
      ctx.strokeRect(zone.left * width, zone.top * height, zone.width * width, zone.height * height)
      ctx.setLineDash([])
      const landmarks = current?.landmarks
      if (!landmarks || performance.now() - current.time > 400) return
      const at = (index: number) => ({ x: (1 - landmarks[index].x) * width, y: landmarks[index].y * height })
      ctx.strokeStyle = '#ffffffd9'
      ctx.lineWidth = 2
      ctx.beginPath()
      for (const [a, b] of CONNECTIONS) {
        const p = at(a)
        const q = at(b)
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(q.x, q.y)
      }
      ctx.stroke()
      ctx.fillStyle = '#7fb069'
      for (let index = 0; index < landmarks.length; index++) {
        const p = at(index)
        ctx.beginPath()
        ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2)
        ctx.fill()
      }
      const thumb = at(4)
      const tip = at(8)
      ctx.strokeStyle = state.current === 'drawing' ? '#e07a6b' : '#f4d27a'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(thumb.x, thumb.y)
      ctx.lineTo(tip.x, tip.y)
      ctx.stroke()
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [visible, hidden, sample])

  return (
    <div className={`camera-preview ${hidden ? 'collapsed' : ''}`} hidden={!visible}>
      <video ref={video} muted playsInline aria-hidden="true" />
      <canvas ref={overlay} width={320} height={240} aria-hidden="true" />
      <span className="camera-caption">CAMERA · XỬ LÝ TRÊN MÁY</span>
      <button type="button" className="camera-toggle" onClick={onToggle} aria-label={hidden ? 'Hiện camera' : 'Ẩn camera'}>
        {hidden ? '◉' : '–'}
      </button>
    </div>
  )
}
