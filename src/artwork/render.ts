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
  if (leaf.shape === 'pad') drawLotusPad(ctx, leaf)
  else if (leaf.shape === 'blade') drawBlade(ctx, leaf)
  else drawAlmond(ctx, leaf)
  ctx.restore()
}

function drawAlmond(ctx: Ctx, leaf: Leaf) {
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
}

/** Long, narrow bamboo / rice leaf that droops a little towards its tip. */
function drawBlade(ctx: Ctx, leaf: Leaf) {
  const droop = leaf.side * leaf.length * 0.12
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(leaf.length * 0.5, -leaf.width + droop, leaf.length, droop * 1.6)
  ctx.quadraticCurveTo(leaf.length * 0.5, leaf.width + droop, 0, 0)
  ctx.fillStyle = leaf.color
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(leaf.length * 0.05, 0)
  ctx.quadraticCurveTo(leaf.length * 0.5, droop * 0.6, leaf.length * 0.9, droop * 1.4)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
  ctx.lineWidth = 1.2
  ctx.stroke()
}

/** Round lotus pad on a short petiole, seen slightly from above, with its notch and veins. */
function drawLotusPad(ctx: Ctx, leaf: Leaf) {
  const r = leaf.length / 2
  ctx.strokeStyle = '#4f7f52'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(r * 0.9, 0)
  ctx.stroke()
  ctx.save()
  ctx.translate(r * 1.7, 0)
  ctx.rotate(-leaf.angle)
  ctx.scale(1, 0.72)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.arc(0, 0, r, -Math.PI / 2 + 0.22, (3 * Math.PI) / 2 - 0.22)
  ctx.closePath()
  ctx.fillStyle = leaf.color
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)'
  ctx.lineWidth = 1.2
  for (let i = 0; i < 9; i++) {
    const angle = -Math.PI / 2 + 0.5 + (i / 8) * (2 * Math.PI - 1)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(Math.cos(angle) * r * 0.9, Math.sin(angle) * r * 0.9)
    ctx.stroke()
  }
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

/** A pointed petal standing on (0,0), `length` tall, leaning by `tilt`. */
function lotusPetal(ctx: Ctx, length: number, breadth: number, tilt: number, color: string) {
  ctx.save()
  ctx.rotate(tilt)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(-breadth, -length * 0.35, -breadth * 0.6, -length * 0.8, 0, -length)
  ctx.bezierCurveTo(breadth * 0.6, -length * 0.8, breadth, -length * 0.35, 0, 0)
  ctx.fillStyle = color
  ctx.fill()
  ctx.restore()
}

function drawGrains(ctx: Ctx, length: number, lean: number, color: string, accent: string, count: number) {
  // A drooping ear: grains along a curve that bends over and down.
  for (let i = 0; i < count; i++) {
    const k = (i + 1) / count
    const x = Math.sin(k * 1.4) * length * 0.55 * lean
    const y = -length * 0.5 + k * k * length * 0.9
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(lean * (0.4 + k))
    ctx.beginPath()
    ctx.ellipse(0, 0, length * 0.05 + 1.5, length * 0.1 + 2, 0, 0, Math.PI * 2)
    ctx.fillStyle = i % 2 ? accent : color
    ctx.fill()
    ctx.restore()
  }
}

function drawFlower(ctx: Ctx, flower: Flower, grown: number) {
  if (grown <= 0) return
  const pop = Math.max(0, easeOutBack(grown))
  const r = flower.radius
  ctx.save()
  ctx.translate(flower.x, flower.y)
  switch (flower.kind) {
    case 'lotus': {
      // Lotus flowers always face up, whatever direction the stroke ended in.
      ctx.scale(pop, pop)
      const open = 0.35 + 0.65 * grown
      for (const [tilt, color] of [[-1.25, flower.accent], [1.25, flower.accent], [-0.75, flower.color], [0.75, flower.color]] as const) lotusPetal(ctx, r * 1.05, r * 0.42, tilt * open, color)
      lotusPetal(ctx, r * 1.15, r * 0.45, -0.32 * open, flower.color)
      lotusPetal(ctx, r * 1.15, r * 0.45, 0.32 * open, flower.color)
      lotusPetal(ctx, r * 1.2, r * 0.4, 0, flower.accent)
      ctx.beginPath()
      ctx.ellipse(0, -r * 0.25, r * 0.28, r * 0.14, 0, 0, Math.PI * 2)
      ctx.fillStyle = flower.center
      ctx.fill()
      break
    }
    case 'lotus-bud':
      ctx.scale(pop, pop)
      lotusPetal(ctx, r * 1.6, r * 0.6, 0, flower.color)
      lotusPetal(ctx, r * 1.3, r * 0.45, -0.25, flower.accent)
      lotusPetal(ctx, r * 1.3, r * 0.45, 0.25, flower.accent)
      break
    case 'blossom':
      ctx.rotate(flower.rotation - (1 - grown) * 0.7)
      ctx.scale(pop, pop)
      drawPetals(ctx, 5, r, r * 0.42, flower.color, 0)
      ctx.beginPath()
      ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2)
      ctx.fillStyle = flower.center
      ctx.fill()
      ctx.fillStyle = '#f7e08a'
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2
        ctx.beginPath()
        ctx.arc(Math.cos(angle) * r * 0.42, Math.sin(angle) * r * 0.42, Math.max(1, r * 0.07), 0, Math.PI * 2)
        ctx.fill()
      }
      break
    case 'bamboo-tip':
      ctx.rotate(flower.rotation)
      ctx.scale(pop, pop)
      for (const [angle, length] of [[-0.55, 1], [0.15, 1.15], [0.7, 0.9]] as const) {
        drawBlade(ctx, { x: 0, y: 0, angle, length: r * length, width: r * length * 0.17, color: angle > 0 ? flower.color : '#6b9a3c', side: angle > 0 ? 1 : -1, shape: 'blade', bornAt: 0 })
      }
      break
    case 'panicle': {
      ctx.scale(pop, pop)
      const lean = Math.cos(flower.rotation) >= 0 ? 1 : -1
      drawGrains(ctx, r, lean, flower.color, flower.accent, 11)
      break
    }
    case 'tuft': {
      // A clump of young rice: three stalks rising from where the drum was struck, ears nodding.
      const height = r * pop
      for (const [dx, lean, k] of [[-6, -1, 0.85], [0, 1, 1], [6, 1, 0.75]] as const) {
        const top = { x: dx * 2.2 + lean * height * 0.15, y: -height * k }
        ctx.beginPath()
        ctx.moveTo(dx, 0)
        ctx.quadraticCurveTo(dx, -height * k * 0.6, top.x, top.y)
        ctx.strokeStyle = '#8ea64a'
        ctx.lineWidth = 2.6
        ctx.stroke()
        ctx.save()
        ctx.translate(top.x, top.y + height * 0.22)
        drawGrains(ctx, height * 0.45, lean, flower.color, flower.accent, 7)
        ctx.restore()
      }
      break
    }
  }
  ctx.restore()
}

function drawNodes(ctx: Ctx, plant: Plant) {
  ctx.lineCap = 'round'
  for (const node of plant.nodes) {
    const nx = Math.cos(node.angle + Math.PI / 2) * node.width * 0.62
    const ny = Math.sin(node.angle + Math.PI / 2) * node.width * 0.62
    ctx.beginPath()
    ctx.moveTo(node.x - nx, node.y - ny)
    ctx.lineTo(node.x + nx, node.y + ny)
    ctx.strokeStyle = '#557a2e'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(node.x - nx * 0.7 + Math.cos(node.angle) * 3, node.y - ny * 0.7 + Math.sin(node.angle) * 3)
    ctx.lineTo(node.x + nx * 0.7 + Math.cos(node.angle) * 3, node.y + ny * 0.7 + Math.sin(node.angle) * 3)
    ctx.strokeStyle = 'rgba(232, 240, 190, 0.6)'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
}

/** Draws one plant as it looks `age` ms after its stroke started. */
export function drawPlant(ctx: Ctx, plant: Plant, age: number) {
  drawStem(ctx, plant)
  drawNodes(ctx, plant)
  for (const leaf of plant.leaves) drawLeaf(ctx, leaf, progress(age, leaf.bornAt))
  for (const flower of plant.flowers) drawFlower(ctx, flower, progress(age, flower.bornAt))
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
