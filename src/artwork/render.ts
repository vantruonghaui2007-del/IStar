import { BLOOM_MS, buildPlant, grownPlant, type Flower, type Leaf, type Plant } from './plant'
import { seededRandom } from './random'
import { CANVAS_HEIGHT, CANVAS_WIDTH, type Stroke } from './types'

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

/** A stroke to draw and how far it has grown: `age` is ms since the stroke started (Infinity = fully grown). */
export type SceneItem = { stroke: Stroke; finished: boolean; age: number }
export type Cursor = { x: number; y: number; drawing: boolean }

const PAPER = '#f7f4ea'
const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3
const easeOutBack = (t: number) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2
const progress = (age: number, bornAt: number) => clamp01((age - bornAt) / BLOOM_MS)

/** Ivory paper with a few fibres and a soft vignette; identical every time. */
export function drawPaper(ctx: Ctx, width = CANVAS_WIDTH, height = CANVAS_HEIGHT) {
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, width, height)
  const random = seededRandom(20251030)
  for (let i = 0; i < 1600; i++) {
    ctx.fillStyle = random() < 0.6 ? 'rgba(214, 205, 180, 0.35)' : 'rgba(255, 255, 255, 0.6)'
    const size = 0.6 + random() * 1.6
    ctx.fillRect(random() * width, random() * height, size, size * (0.4 + random()))
  }
  const ground = ctx.createLinearGradient(0, height * 0.72, 0, height)
  ground.addColorStop(0, 'rgba(150, 172, 120, 0)')
  ground.addColorStop(1, 'rgba(150, 172, 120, 0.10)')
  ctx.fillStyle = ground
  ctx.fillRect(0, height * 0.72, width, height * 0.28)
  const vignette = ctx.createRadialGradient(width / 2, height / 2, height * 0.35, width / 2, height / 2, width * 0.62)
  vignette.addColorStop(0, 'rgba(120, 104, 70, 0)')
  vignette.addColorStop(1, 'rgba(120, 104, 70, 0.10)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, width, height)
}

function drawStem(ctx: Ctx, plant: Plant) {
  const segments = plant.segments
  if (!segments.length) return
  ctx.strokeStyle = plant.stem
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const previous = segments[i - 1]
    const startX = previous ? (previous.x0 + segment.x0) / 2 : segment.x0
    const startY = previous ? (previous.y0 + segment.y0) / 2 : segment.y0
    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.quadraticCurveTo(segment.x0, segment.y0, (segment.x0 + segment.x1) / 2, (segment.y0 + segment.y1) / 2)
    if (i === segments.length - 1) ctx.lineTo(segment.x1, segment.y1)
    ctx.lineWidth = segment.width
    ctx.stroke()
  }
}

function drawLeaf(ctx: Ctx, leaf: Leaf, grown: number) {
  if (grown <= 0) return
  const scale = easeOutCubic(grown)
  ctx.save()
  ctx.translate(leaf.x, leaf.y)
  ctx.rotate(leaf.angle)
  ctx.scale(scale, scale)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(leaf.length * 0.45, -leaf.width, leaf.length, 0)
  ctx.quadraticCurveTo(leaf.length * 0.45, leaf.width, 0, 0)
  ctx.fillStyle = leaf.color
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(leaf.length * 0.08, 0)
  ctx.lineTo(leaf.length * 0.82, 0)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)'
  ctx.lineWidth = 1.4
  ctx.stroke()
  ctx.restore()
}

function drawPetals(ctx: Ctx, count: number, length: number, breadth: number, color: string, offset: number) {
  ctx.fillStyle = color
  for (let i = 0; i < count; i++) {
    const angle = offset + (i / count) * Math.PI * 2
    ctx.beginPath()
    ctx.ellipse(Math.cos(angle) * length * 0.5, Math.sin(angle) * length * 0.5, length * 0.52, breadth, angle, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawFlower(ctx: Ctx, flower: Flower, grown: number) {
  if (grown <= 0) return
  const scale = Math.max(0, easeOutBack(grown))
  const r = flower.radius
  ctx.save()
  ctx.translate(flower.x, flower.y)
  ctx.rotate(flower.rotation - (1 - grown) * 0.7)
  ctx.scale(scale, scale)
  drawPetals(ctx, flower.petals, r, r * 0.34, flower.petalColor, 0)
  ctx.globalAlpha = 0.85
  drawPetals(ctx, flower.petals, r * 0.62, r * 0.22, flower.innerColor, Math.PI / flower.petals)
  ctx.globalAlpha = 1
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.27, 0, Math.PI * 2)
  ctx.fillStyle = flower.center
  ctx.fill()
  ctx.fillStyle = 'rgba(120, 80, 30, 0.45)'
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(Math.cos(angle) * r * 0.16, Math.sin(angle) * r * 0.16, Math.max(1, r * 0.04), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/** Draws one plant as it looks `age` ms after its stroke started. */
export function drawPlant(ctx: Ctx, plant: Plant, age: number) {
  drawStem(ctx, plant)
  for (const leaf of plant.leaves) drawLeaf(ctx, leaf, progress(age, leaf.bornAt))
  if (plant.flower) drawFlower(ctx, plant.flower, progress(age, plant.flower.bornAt))
  for (const fly of plant.fireflies) {
    const grown = progress(age, fly.bornAt)
    if (grown <= 0) continue
    const reach = fly.radius * 7
    const glow = ctx.createRadialGradient(fly.x, fly.y, 0, fly.x, fly.y, reach)
    glow.addColorStop(0, `${fly.color}ff`)
    glow.addColorStop(0.25, `${fly.color}88`)
    glow.addColorStop(1, `${fly.color}00`)
    ctx.globalAlpha = grown
    ctx.fillStyle = glow
    ctx.fillRect(fly.x - reach, fly.y - reach, reach * 2, reach * 2)
    ctx.beginPath()
    ctx.arc(fly.x, fly.y, fly.radius * 0.8, 0, Math.PI * 2)
    ctx.fillStyle = '#fff6c8'
    ctx.fill()
    ctx.globalAlpha = 1
  }
}

export function drawCursor(ctx: Ctx, cursor: Cursor) {
  ctx.save()
  ctx.lineWidth = 3
  ctx.strokeStyle = cursor.drawing ? '#d9675e' : '#3b6a48'
  ctx.fillStyle = cursor.drawing ? 'rgba(224, 122, 107, 0.35)' : 'rgba(59, 106, 72, 0.12)'
  ctx.beginPath()
  ctx.arc(cursor.x, cursor.y, cursor.drawing ? 14 : 20, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cursor.x, cursor.y, 3, 0, Math.PI * 2)
  ctx.fillStyle = ctx.strokeStyle
  ctx.fill()
  ctx.restore()
}

function createSurface(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

/**
 * The one renderer used for the live studio, replay and PNG export.
 * Strokes that have finished growing are painted once onto a cached layer;
 * only plants still growing are redrawn each frame.
 */
export class GardenRenderer {
  private readonly layer: HTMLCanvasElement | OffscreenCanvas
  private readonly layerCtx: Ctx
  private baked: Stroke[] = []

  constructor(width = CANVAS_WIDTH, height = CANVAS_HEIGHT) {
    this.layer = createSurface(width, height)
    const ctx = this.layer.getContext('2d') as Ctx | null
    if (!ctx) throw new Error('Canvas 2D không khả dụng')
    this.layerCtx = ctx
    this.resetLayer()
  }

  plantOf(item: SceneItem): Plant {
    return item.finished ? grownPlant(item.stroke) : buildPlant(item.stroke, false)
  }

  render(ctx: Ctx, items: SceneItem[], cursor?: Cursor | null) {
    const stillValid = this.baked.length <= items.length && this.baked.every((stroke, i) => items[i].stroke === stroke && items[i].finished)
    if (!stillValid) this.resetLayer()
    while (this.baked.length < items.length) {
      const item = items[this.baked.length]
      if (!item.finished) break
      const plant = this.plantOf(item)
      if (item.age < plant.doneAt) break
      drawPlant(this.layerCtx, plant, Infinity)
      this.baked.push(item.stroke)
    }
    ctx.drawImage(this.layer, 0, 0)
    for (let i = this.baked.length; i < items.length; i++) drawPlant(ctx, this.plantOf(items[i]), items[i].age)
    if (cursor) drawCursor(ctx, cursor)
  }

  private resetLayer() {
    this.baked = []
    this.layerCtx.clearRect(0, 0, this.layer.width, this.layer.height)
    drawPaper(this.layerCtx, this.layer.width, this.layer.height)
  }
}

/** Fully grown artwork on a fresh 1920×1080 canvas — no cursor, no camera. */
export function renderArtwork(strokes: Stroke[]): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D không khả dụng')
  drawPaper(ctx)
  for (const stroke of strokes) drawPlant(ctx, grownPlant(stroke), Infinity)
  return canvas
}
