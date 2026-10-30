import { CANVAS_HEIGHT as H, CANVAS_WIDTH as W } from '../artwork/types'
import type { InstrumentId } from '../music/instruments'
import { DEGREES, noteLabel, STRINGS, xOfString, yOfDegree } from '../music/scale'

type Ctx = CanvasRenderingContext2D

export type StageHit = { instrument: InstrumentId; degree: number; at: number }
export type StageFrame = {
  instrument: InstrumentId
  /** Hand or mouse position in canvas space; `drawing` while pinched / pressed. */
  hand: { x: number; y: number; drawing: boolean } | null
  /** Recent notes (for vibrating strings, drum ripples). */
  hits: StageHit[]
  /** Upcoming lesson notes; the first one is the one to play now. */
  targets: number[]
  /** Camera picture behind the instruments? Otherwise a stage backdrop is painted. */
  overVideo: boolean
  now: number
}

const GOLD = '#f2c94c'
const LANE = H / DEGREES
const TINH = { x: W / 2, y: 330, r: 170 }
const TUNG = { x: W / 2, y: 800, r: 215 }

const recent = (frame: StageFrame, test: (hit: StageHit) => boolean, within = 1400) => frame.hits.filter(hit => hit.instrument === frame.instrument && frame.now - hit.at < within && test(hit))

function backdrop(ctx: Ctx, frame: StageFrame) {
  if (frame.overVideo) {
    // Darken the camera slightly so the instruments read clearly over any room.
    ctx.fillStyle = 'rgba(20, 28, 22, 0.28)'
    ctx.fillRect(0, 0, W, H)
    return
  }
  const gradient = ctx.createRadialGradient(W / 2, H * 0.45, 100, W / 2, H / 2, W * 0.7)
  gradient.addColorStop(0, '#3b2f27')
  gradient.addColorStop(1, '#17120f')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(242, 201, 76, 0.06)'
  ctx.beginPath()
  ctx.moveTo(W * 0.3, 0)
  ctx.lineTo(W * 0.7, 0)
  ctx.lineTo(W * 0.95, H)
  ctx.lineTo(W * 0.05, H)
  ctx.fill()
}

function label(ctx: Ctx, text: string, x: number, y: number, size: number, color = '#fdf8ea', align: CanvasTextAlign = 'center') {
  ctx.font = `600 ${size}px Georgia, serif`
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 6
  ctx.strokeStyle = 'rgba(20, 20, 16, 0.55)'
  ctx.strokeText(text, x, y)
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}

function noteName(degree: number) {
  const { name, octave } = noteLabel(degree)
  return `${name}${'·'.repeat(octave)}`
}

/** Pitch lanes for the instruments played by hand height (đàn bầu, sáo trúc). */
function lanes(ctx: Ctx, frame: StageFrame, x0: number, x1: number) {
  const handLane = frame.hand ? Math.min(DEGREES - 1, Math.max(0, Math.floor((H - frame.hand.y) / LANE))) : -1
  for (let degree = 0; degree < DEGREES; degree++) {
    const y = yOfDegree(degree)
    const target = frame.targets[0] === degree
    const next = frame.targets.slice(1, 3).includes(degree)
    ctx.fillStyle = target ? 'rgba(242, 201, 76, 0.32)' : degree === handLane ? 'rgba(255, 255, 255, 0.16)' : degree % 2 ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.08)'
    ctx.fillRect(x0, y - LANE / 2 + 2, x1 - x0, LANE - 4)
    if (next) {
      ctx.strokeStyle = 'rgba(242, 201, 76, 0.55)'
      ctx.setLineDash([10, 10])
      ctx.lineWidth = 2
      ctx.strokeRect(x0 + 2, y - LANE / 2 + 4, x1 - x0 - 4, LANE - 8)
      ctx.setLineDash([])
    }
    label(ctx, noteName(degree), x1 - 70, y, target ? 40 : 28, target ? GOLD : '#fdf8ea')
    if (target) label(ctx, '▶', x0 + 40, y + Math.sin(frame.now / 160) * 6, 34, GOLD)
  }
}

function vibratingLine(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, amplitude: number, phase: number, color: string, width: number) {
  const length = Math.hypot(x1 - x0, y1 - y0)
  const nx = -(y1 - y0) / length
  const ny = (x1 - x0) / length
  ctx.beginPath()
  for (let i = 0; i <= 40; i++) {
    const k = i / 40
    const offset = Math.sin(k * Math.PI) * Math.sin(phase + k * 3) * amplitude
    const x = x0 + (x1 - x0) * k + nx * offset
    const y = y0 + (y1 - y0) * k + ny * offset
    if (i) ctx.lineTo(x, y)
    else ctx.moveTo(x, y)
  }
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.stroke()
}

function wood(ctx: Ctx, x: number, y: number, w: number, h: number, radius: number) {
  const gradient = ctx.createLinearGradient(x, y, x, y + h)
  gradient.addColorStop(0, '#b07a4c')
  gradient.addColorStop(0.5, '#8a5a35')
  gradient.addColorStop(1, '#5e3b22')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, radius)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 230, 190, 0.25)'
  ctx.lineWidth = 2
  ctx.stroke()
}

function danBau(ctx: Ctx, frame: StageFrame) {
  lanes(ctx, frame, 380, W - 60)
  // Soundbox along the bottom, the gourd and the flexible rod (vòi đàn) on the left.
  wood(ctx, 150, 985, W - 300, 70, 30)
  const hit = recent(frame, () => true)[0]
  const sounding = frame.hand?.drawing || hit
  const handY = frame.hand?.y ?? H * 0.6
  const bend = sounding ? (H * 0.6 - handY) * 0.12 : 0
  ctx.beginPath()
  ctx.moveTo(250, 985)
  ctx.quadraticCurveTo(232 - bend * 0.5, 880, 290 - bend, 770)
  ctx.strokeStyle = '#d9c39a'
  ctx.lineWidth = 12
  ctx.lineCap = 'round'
  ctx.stroke()
  const gourd = ctx.createRadialGradient(250, 900, 10, 250, 920, 80)
  gourd.addColorStop(0, '#e6c27a')
  gourd.addColorStop(1, '#a8742f')
  ctx.fillStyle = gourd
  ctx.beginPath()
  ctx.ellipse(250, 920, 70, 60, 0, 0, Math.PI * 2)
  ctx.fill()
  const age = hit ? frame.now - hit.at : Infinity
  const amplitude = sounding ? Math.max(2, 14 * Math.exp(-age / 700)) : 0
  vibratingLine(ctx, 290 - bend, 770, W - 170, 978, amplitude, frame.now / 18, sounding ? '#fff3c4' : '#efe6d0', 4)
  label(ctx, 'ĐÀN BẦU', 250, 1030, 22, '#fdf8ea')
}

function saoTruc(ctx: Ctx, frame: StageFrame) {
  lanes(ctx, frame, 260, W - 60)
  // The bamboo flute stands along the left edge, clear of the lanes and the lesson bar.
  const x = 130
  const y0 = 150
  const y1 = H - 60
  const gradient = ctx.createLinearGradient(x - 26, 0, x + 26, 0)
  gradient.addColorStop(0, '#e4d58f')
  gradient.addColorStop(0.5, '#c6b061')
  gradient.addColorStop(1, '#8e7a35')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.roundRect(x - 24, y0, 48, y1 - y0, 24)
  ctx.fill()
  for (const y of [y0 + 110, y1 - 130]) {
    ctx.fillStyle = 'rgba(90, 70, 20, 0.5)'
    ctx.fillRect(x - 24, y, 48, 6)
  }
  // Embouchure at the top, six finger holes below; how many are open follows the note.
  ctx.fillStyle = '#3d3010'
  ctx.beginPath()
  ctx.ellipse(x, y0 + 60, 10, 13, 0, 0, Math.PI * 2)
  ctx.fill()
  const blowing = frame.hand?.drawing
  const degree = frame.hand ? Math.min(DEGREES - 1, Math.max(0, Math.floor((H - frame.hand.y) / LANE))) : 0
  const open = blowing ? (degree % 5) + 1 : 0
  for (let i = 0; i < 6; i++) {
    const y = y1 - 170 - i * 100
    ctx.beginPath()
    ctx.arc(x, y, 12, 0, Math.PI * 2)
    ctx.fillStyle = i < open ? '#2a2108' : '#3d3010'
    ctx.fill()
    if (i < open) {
      ctx.strokeStyle = GOLD
      ctx.lineWidth = 3
      ctx.stroke()
    }
  }
  if (blowing) {
    for (let i = 0; i < 6; i++) {
      const t = (frame.now / 600 + i / 6) % 1
      ctx.fillStyle = `rgba(255, 255, 255, ${0.35 * (1 - t)})`
      ctx.beginPath()
      ctx.arc(x + 30 + t * 110, y0 + 50 - t * 30 + Math.sin(i) * 10, 4 + t * 10, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  label(ctx, 'SÁO TRÚC', x, y0 - 40, 22)
}

function danTranh(ctx: Ctx, frame: StageFrame) {
  // Soundboard, slightly trapezoid, with 16 strings across it and their bridges (nhạn đàn).
  ctx.save()
  ctx.globalAlpha = frame.overVideo ? 0.42 : 1
  const gradient = ctx.createLinearGradient(0, 180, 0, 1000)
  gradient.addColorStop(0, '#a06a3d')
  gradient.addColorStop(1, '#6b4123')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.moveTo(40, 230)
  ctx.lineTo(W - 40, 200)
  ctx.lineTo(W - 40, 1000)
  ctx.lineTo(40, 960)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  const target = frame.targets[0]
  for (let string = 0; string < STRINGS; string++) {
    const x = xOfString(string)
    const hits = recent(frame, hit => hit.degree === string, 1200)
    const age = hits.length ? frame.now - hits[hits.length - 1].at : Infinity
    const amplitude = 16 * Math.exp(-age / 350)
    if (string === target) {
      ctx.fillStyle = 'rgba(242, 201, 76, 0.25)'
      ctx.fillRect(x - 40, 210, 80, 770)
      label(ctx, '▼', x, 170 + Math.sin(frame.now / 160) * 8, 42, GOLD)
    } else if (frame.targets.slice(1, 3).includes(string)) {
      ctx.strokeStyle = 'rgba(242, 201, 76, 0.5)'
      ctx.setLineDash([8, 10])
      ctx.lineWidth = 2
      ctx.strokeRect(x - 36, 214, 72, 762)
      ctx.setLineDash([])
    }
    vibratingLine(ctx, x, 220, x, 980, amplitude, frame.now / 14, amplitude > 1 ? '#fff6d2' : '#e8dcc0', 2 + string / 8)
    // Bridge (nhạn đàn): positions step diagonally across the board, like the real instrument.
    const by = 760 - string * 18
    ctx.fillStyle = '#efe2c4'
    ctx.beginPath()
    ctx.moveTo(x - 14, by + 16)
    ctx.lineTo(x, by - 10)
    ctx.lineTo(x + 14, by + 16)
    ctx.closePath()
    ctx.fill()
    label(ctx, noteName(string), x, 1035, string === target ? 30 : 22, string === target ? GOLD : '#fdf8ea')
  }
}

function drumHead(ctx: Ctx, frame: StageFrame, head: { x: number; y: number; r: number }, high: boolean, name: string) {
  const hits = recent(frame, hit => hit.degree >= 5 === high, 900)
  const last = hits.length ? frame.now - hits[hits.length - 1].at : Infinity
  const target = frame.targets.length > 0 && frame.targets[0] >= 5 === high
  // Body rim with rope lacing.
  ctx.fillStyle = '#7c2f22'
  ctx.beginPath()
  ctx.arc(head.x, head.y, head.r + 34, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#e8cf95'
  ctx.lineWidth = 3
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    const b = ((i + 1.5) / 24) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(head.x + Math.cos(a) * (head.r + 30), head.y + Math.sin(a) * (head.r + 30))
    ctx.lineTo(head.x + Math.cos(b) * (head.r + 4), head.y + Math.sin(b) * (head.r + 4))
    ctx.stroke()
  }
  // Skin, flashing when struck.
  const flash = Math.exp(-last / 140)
  const skin = ctx.createRadialGradient(head.x - head.r * 0.3, head.y - head.r * 0.3, 10, head.x, head.y, head.r)
  skin.addColorStop(0, flash > 0.05 ? '#fff6dc' : '#f3e2b8')
  skin.addColorStop(1, '#cfb27a')
  ctx.fillStyle = skin
  ctx.beginPath()
  ctx.arc(head.x, head.y, head.r, 0, Math.PI * 2)
  ctx.fill()
  // The rice paste (cơm) pressed on the centre of the skin.
  ctx.fillStyle = 'rgba(250, 248, 240, 0.9)'
  ctx.beginPath()
  ctx.ellipse(head.x, head.y, head.r * 0.22, head.r * 0.18, 0.3, 0, Math.PI * 2)
  ctx.fill()
  for (const hit of hits) {
    const k = (frame.now - hit.at) / 900
    ctx.strokeStyle = `rgba(255, 245, 210, ${0.8 * (1 - k)})`
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.arc(head.x, head.y, head.r * (0.25 + k * 0.9), 0, Math.PI * 2)
    ctx.stroke()
  }
  if (target) {
    ctx.strokeStyle = GOLD
    ctx.lineWidth = 10 + Math.sin(frame.now / 120) * 4
    ctx.beginPath()
    ctx.arc(head.x, head.y, head.r + 52, 0, Math.PI * 2)
    ctx.stroke()
  }
  label(ctx, name, head.x + head.r + 120, head.y, target ? 46 : 34, target ? GOLD : '#fdf8ea', 'left')
}

function trongCom(ctx: Ctx, frame: StageFrame) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)'
  ctx.setLineDash([14, 14])
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(80, H / 2)
  ctx.lineTo(W - 80, H / 2)
  ctx.stroke()
  ctx.setLineDash([])
  drumHead(ctx, frame, TINH, true, 'TÌNH')
  drumHead(ctx, frame, TUNG, false, 'TÙNG')
  label(ctx, 'TRỐNG CƠM', 200, H / 2 - 30, 24)
}

function cursor(ctx: Ctx, frame: StageFrame) {
  const hand = frame.hand
  if (!hand) return
  ctx.save()
  ctx.lineWidth = 5
  ctx.strokeStyle = hand.drawing ? GOLD : '#ffffff'
  ctx.fillStyle = hand.drawing ? 'rgba(242, 201, 76, 0.35)' : 'rgba(255, 255, 255, 0.15)'
  ctx.beginPath()
  ctx.arc(hand.x, hand.y, hand.drawing ? 22 : 30, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

/** One frame of the AR stage: the chosen instrument drawn over the mirrored camera picture. */
export function drawStage(ctx: Ctx, frame: StageFrame) {
  ctx.clearRect(0, 0, W, H)
  backdrop(ctx, frame)
  if (frame.instrument === 'dan-bau') danBau(ctx, frame)
  else if (frame.instrument === 'sao-truc') saoTruc(ctx, frame)
  else if (frame.instrument === 'dan-tranh') danTranh(ctx, frame)
  else trongCom(ctx, frame)
  cursor(ctx, frame)
}
