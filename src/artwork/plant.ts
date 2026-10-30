import { PALETTES } from './palettes'
import { seededRandom } from './random'
import type { Point, Stroke } from './types'

export const MAX_LEAVES = 20
/** How long a leaf or flower takes to unfold, in ms. */
export const BLOOM_MS = 650

const TAP_DISTANCE = 14
const MIN_WIDTH = 4.5
const MAX_WIDTH = 17
/** Speed (px/ms) at which the stem reaches its thinnest. */
const FAST_SPEED = 2.6
const FIRST_LEAF_AT = 46

export type Segment = { x0: number; y0: number; x1: number; y1: number; width: number }
export type Leaf = { x: number; y: number; angle: number; length: number; width: number; color: string; side: 1 | -1; bornAt: number }
export type Flower = {
  x: number
  y: number
  radius: number
  petals: number
  rotation: number
  petalColor: string
  innerColor: string
  center: string
  small: boolean
  bornAt: number
}
export type Firefly = { x: number; y: number; radius: number; color: string; bornAt: number }
export type Plant = {
  stem: string
  segments: Segment[]
  leaves: Leaf[]
  flower: Flower | null
  fireflies: Firefly[]
  /** Stroke-relative time (ms) after which nothing animates any more. */
  doneAt: number
}

const pick = <T,>(items: T[], random: () => number) => items[Math.floor(random() * items.length) % items.length]

function pathLength(points: Point[]) {
  let length = 0
  for (let i = 1; i < points.length; i++) length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
  return length
}

function buildSegments(points: Point[], scale: number): Segment[] {
  const total = pathLength(points)
  const segments: Segment[] = []
  let width = 0
  let travelled = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const distance = Math.hypot(b.x - a.x, b.y - a.y)
    travelled += distance
    const speed = distance / Math.max(1, b.t - a.t)
    const target = MAX_WIDTH - (MAX_WIDTH - MIN_WIDTH) * Math.min(1, speed / FAST_SPEED)
    width = width ? width + (target - width) * 0.25 : target
    const taper = (0.55 + 0.45 * Math.min(1, (total - travelled) / 70)) * (0.7 + 0.3 * Math.min(1, travelled / 30))
    segments.push({ x0: a.x, y0: a.y, x1: b.x, y1: b.y, width: Math.max(MIN_WIDTH * 0.8, width * taper * scale) })
  }
  return segments
}

function buildLeaves(points: Point[], colors: string[], random: () => number, scale: number): Leaf[] {
  const leaves: Leaf[] = []
  let side: 1 | -1 = random() < 0.5 ? 1 : -1
  let travelled = 0
  let nextAt = FIRST_LEAF_AT + random() * 20
  for (let i = 1; i < points.length && leaves.length < MAX_LEAVES; i++) {
    travelled += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    if (travelled < nextAt) continue
    // Direction from a few points back: only the past is used, so a growing
    // stroke never re-places leaves it has already shown.
    const from = points[Math.max(0, i - 4)]
    const tangent = Math.atan2(points[i].y - from.y, points[i].x - from.x)
    const length = (36 + random() * 20) * scale
    leaves.push({
      x: points[i].x,
      y: points[i].y,
      angle: tangent + side * (0.55 + random() * 0.45),
      length,
      width: length * (0.36 + random() * 0.12),
      color: pick(colors, random),
      side,
      bornAt: points[i].t,
    })
    side = side === 1 ? -1 : 1
    nextAt = travelled + 62 + random() * 34
  }
  return leaves
}

/**
 * Grows the plant for one stroke: a stem whose width follows hand speed,
 * alternating leaves, a flower once the pen lifts (a small one for a pinch in
 * place) and, at night, fireflies. Every choice comes from the stroke seed.
 */
export function buildPlant(stroke: Stroke, finished: boolean): Plant {
  const palette = PALETTES[stroke.palette] ?? PALETTES['vuon-xuan']
  const points = stroke.points
  const last = points.at(-1)
  const plant: Plant = { stem: palette.stem, segments: [], leaves: [], flower: null, fireflies: [], doneAt: last?.t ?? 0 }
  if (!last) return plant

  const leafRandom = seededRandom(stroke.seed)
  const flowerRandom = seededRandom(stroke.seed ^ 0x9e3779b9)
  const scale = 0.9 + leafRandom() * 0.25
  const tap = pathLength(points) < TAP_DISTANCE
  if (!tap) {
    plant.segments = buildSegments(points, scale)
    plant.leaves = buildLeaves(points, palette.leaves, leafRandom, scale)
  }

  if (finished) {
    const petalColor = pick(palette.petals, flowerRandom)
    const flower: Flower = {
      x: last.x,
      y: last.y,
      radius: tap ? 16 + flowerRandom() * 6 : (30 + flowerRandom() * 14) * scale,
      petals: tap ? 5 : 5 + Math.floor(flowerRandom() * 4),
      rotation: flowerRandom() * Math.PI * 2,
      petalColor,
      innerColor: pick(palette.petals.filter(color => color !== petalColor), flowerRandom) ?? petalColor,
      center: palette.center,
      small: tap,
      bornAt: last.t,
    }
    plant.flower = flower
    if (palette.glow) {
      const count = 2 + Math.floor(flowerRandom() * 3)
      for (let i = 0; i < count; i++) {
        const angle = flowerRandom() * Math.PI * 2
        const distance = flower.radius * 1.5 + flowerRandom() * 70
        plant.fireflies.push({
          x: flower.x + Math.cos(angle) * distance,
          y: flower.y + Math.sin(angle) * distance,
          radius: 3.5 + flowerRandom() * 2.5,
          color: palette.glow,
          bornAt: flower.bornAt + 200 + i * 180,
        })
      }
    }
  }

  const births = [...plant.leaves.map(leaf => leaf.bornAt), plant.flower?.bornAt ?? -Infinity, ...plant.fireflies.map(fly => fly.bornAt)]
  plant.doneAt = Math.max(last.t, ...births.map(time => time + BLOOM_MS))
  return plant
}

const grown = new WeakMap<Stroke, Plant>()

/** The finished plant for a committed stroke, built once and cached (strokes are immutable). */
export function grownPlant(stroke: Stroke): Plant {
  let plant = grown.get(stroke)
  if (!plant) {
    plant = buildPlant(stroke, true)
    grown.set(stroke, plant)
  }
  return plant
}
