import { INSTRUMENTS, type Species } from '../music/instruments'
import { scoreOf, type MusicEvent } from '../music/score'
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

export type Segment = { x0: number; y0: number; x1: number; y1: number; width: number }
export type LeafShape = 'pad' | 'blade' | 'almond'
export type Leaf = { x: number; y: number; angle: number; length: number; width: number; color: string; side: 1 | -1; shape: LeafShape; bornAt: number }
export type FlowerKind = 'lotus' | 'lotus-bud' | 'blossom' | 'bamboo-tip' | 'panicle' | 'tuft'
export type Flower = {
  kind: FlowerKind
  x: number
  y: number
  radius: number
  /** Facing (radians): petal rotation, or the direction a tip, ear or tuft leans. */
  rotation: number
  color: string
  accent: string
  center: string
  small: boolean
  bornAt: number
}
/** A bamboo node ring across the culm. */
export type Node = { x: number; y: number; angle: number; width: number; bornAt: number }
export type Plant = {
  stem: string
  segments: Segment[]
  leaves: Leaf[]
  flowers: Flower[]
  nodes: Node[]
  /** Stroke-relative time (ms) after which nothing animates any more. */
  doneAt: number
}

type Look = { stem: string; width: number; leaves: string[]; flower: string[]; center: string; leafEvery: number }

const LOOKS: Record<Species, Look> = {
  sen: { stem: '#4f7f52', width: 1, leaves: ['#5f9a5d', '#76ad69', '#4e8a54'], flower: ['#f3a6b8', '#e9829c', '#f6c0cc'], center: '#e8c75a', leafEvery: 170 },
  tre: { stem: '#7aa043', width: 0.8, leaves: ['#6b9a3c', '#86b04f', '#5d8a35'], flower: ['#86b04f'], center: '#5b7d31', leafEvery: 150 },
  dao: { stem: '#5a3b2e', width: 0.7, leaves: ['#7aa25a', '#8db368'], flower: ['#f6b3c1', '#f29bb0', '#f9cad4'], center: '#c2185b', leafEvery: 120 },
  lua: { stem: '#9aae4a', width: 0.45, leaves: ['#8ea64a', '#a3b95a', '#7f9a40'], flower: ['#e3b94e', '#d6a93c'], center: '#b8892c', leafEvery: 90 },
}

const pick = <T,>(items: T[], random: () => number) => items[Math.floor(random() * items.length) % items.length]
const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y)

function pathLength(points: Point[]) {
  let length = 0
  for (let i = 1; i < points.length; i++) length += distance(points[i - 1], points[i])
  return length
}

function buildSegments(points: Point[], scale: number, minWidth: number): Segment[] {
  const total = pathLength(points)
  const segments: Segment[] = []
  let width = 0
  let travelled = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const step = distance(a, b)
    travelled += step
    const speed = step / Math.max(1, b.t - a.t)
    const target = MAX_WIDTH - (MAX_WIDTH - MIN_WIDTH) * Math.min(1, speed / FAST_SPEED)
    width = width ? width + (target - width) * 0.25 : target
    const taper = (0.55 + 0.45 * Math.min(1, (total - travelled) / 70)) * (0.7 + 0.3 * Math.min(1, travelled / 30))
    segments.push({ x0: a.x, y0: a.y, x1: b.x, y1: b.y, width: Math.max(minWidth, width * taper * scale) })
  }
  return segments
}

/** Where the hand was at stroke time `t`. */
function at(points: Point[], t: number): Point {
  for (let i = 1; i < points.length; i++) {
    const b = points[i]
    if (b.t < t) continue
    const a = points[i - 1]
    const k = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t)
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, t }
  }
  return points[points.length - 1]
}

/** Direction of travel at point `i`, looking only backwards so a growing stroke never changes it. */
function heading(points: Point[], i: number) {
  const from = points[Math.max(0, i - 4)]
  const to = points[Math.max(1, i)] ?? points[i]
  return Math.atan2(to.y - from.y, to.x - from.x)
}

/**
 * Grows the plant for one stroke. Its species comes from the instrument:
 * đàn bầu → lotus, sáo trúc → bamboo, đàn tranh → peach branch, trống cơm →
 * rice. Every note the stroke plays grows something (a lotus pad, a bamboo
 * leaf cluster, a peach blossom, a rice tuft), so the picture is the music.
 * All choices come from the stroke seed and only look backwards in time.
 */
export function buildPlant(stroke: Stroke, finished: boolean): Plant {
  const species = INSTRUMENTS[stroke.instrument]?.species ?? 'sen'
  const look = LOOKS[species]
  const points = stroke.points
  const last = points[points.length - 1]
  const plant: Plant = { stem: look.stem, segments: [], leaves: [], flowers: [], nodes: [], doneAt: last?.t ?? 0 }
  if (!last) return plant

  const random = seededRandom(stroke.seed)
  const endRandom = seededRandom(stroke.seed ^ 0x9e3779b9)
  const scale = 0.9 + random() * 0.25
  const tap = pathLength(points) < TAP_DISTANCE
  const events = scoreOf(stroke, finished)

  if (tap) {
    const kind: FlowerKind = { sen: 'lotus-bud', tre: 'bamboo-tip', dao: 'blossom', lua: 'tuft' }[species] as FlowerKind
    plant.flowers.push(flower(kind, points[0], -Math.PI / 2, true, last.t, look, endRandom))
  } else {
    plant.segments = buildSegments(points, scale * look.width, species === 'tre' ? 7 : species === 'lua' ? 2.5 : MIN_WIDTH * 0.8)
    decorate(plant, species, look, points, events, random, scale)
    if (finished) {
      const end = { sen: 'lotus', tre: 'bamboo-tip', dao: null, lua: 'panicle' }[species] as FlowerKind | null
      if (end) plant.flowers.push(flower(end, last, heading(points, points.length - 1), false, last.t, look, endRandom))
    }
  }

  const births = [...plant.leaves.map(leaf => leaf.bornAt), ...plant.flowers.map(item => item.bornAt)]
  plant.doneAt = Math.max(last.t, ...births.map(time => time + BLOOM_MS))
  return plant
}

function flower(kind: FlowerKind, point: Point, rotation: number, small: boolean, bornAt: number, look: Look, random: () => number): Flower {
  const sizes: Record<FlowerKind, [number, number]> = {
    lotus: [34, 12],
    'lotus-bud': [16, 5],
    blossom: [13, 5],
    'bamboo-tip': [42, 14],
    panicle: [44, 14],
    tuft: [54, 16],
  }
  const [base, spread] = sizes[kind]
  const color = pick(look.flower, random)
  return {
    kind,
    x: point.x,
    y: point.y,
    radius: (base + random() * spread) * (small && kind !== 'tuft' ? 0.85 : 1),
    rotation: kind === 'blossom' ? random() * Math.PI * 2 : rotation,
    color,
    accent: pick(look.flower.filter(other => other !== color), random) ?? color,
    center: look.center,
    small,
    bornAt,
  }
}

function decorate(plant: Plant, species: Species, look: Look, points: Point[], events: MusicEvent[], random: () => number, scale: number) {
  let side: 1 | -1 = random() < 0.5 ? 1 : -1
  let travelled = 0
  let sinceLeaf = 0
  let sinceNode = 0
  let next = 0
  const addLeaf = (point: Point, angle: number, shape: LeafShape, length: number, ratio: number) => {
    if (plant.leaves.length >= MAX_LEAVES) return
    plant.leaves.push({ x: point.x, y: point.y, angle, length, width: length * ratio, color: pick(look.leaves, random), side, shape, bornAt: point.t })
    side = side === 1 ? -1 : 1
    sinceLeaf = 0
  }

  for (let i = 0; i < points.length; i++) {
    const step = i ? distance(points[i - 1], points[i]) : 0
    travelled += step
    sinceLeaf += step
    sinceNode += step
    const tangent = heading(points, i)

    // Music first: notes reached by this point.
    while (next < events.length && events[next].t <= points[i].t) {
      const event = events[next++]
      if (event.kind === 'release') continue
      const spot = at(points, event.t)
      if (species === 'sen' && event.kind === 'glide') addLeaf(spot, tangent + side * (0.9 + random() * 0.5), 'pad', (30 + random() * 16) * scale, 0.75)
      if (species === 'tre' && event.kind === 'glide') {
        addLeaf(spot, tangent + side * (0.6 + random() * 0.4), 'blade', (52 + random() * 20) * scale, 0.17)
        addLeaf(spot, tangent + side * (0.9 + random() * 0.4), 'blade', (44 + random() * 18) * scale, 0.17)
      }
      if (species === 'dao' && event.kind === 'pluck') plant.flowers.push(flower('blossom', spot, 0, false, spot.t, look, random))
    }

    // Then growth by distance, so silent stretches are not bare.
    if (species === 'tre' && sinceNode >= 48 && travelled > 20) {
      // Ring width from the hand speed so far only — the stem's tip taper depends on the future.
      const speed = step / Math.max(1, points[i].t - points[Math.max(0, i - 1)].t)
      const width = Math.max(7, (MAX_WIDTH - (MAX_WIDTH - MIN_WIDTH) * Math.min(1, speed / FAST_SPEED)) * scale * look.width)
      plant.nodes.push({ x: points[i].x, y: points[i].y, angle: tangent, width, bornAt: points[i].t })
      sinceNode = 0
    }
    if (travelled > 40 && sinceLeaf >= look.leafEvery) {
      if (species === 'sen') addLeaf(points[i], tangent + side * (0.9 + random() * 0.5), 'pad', (26 + random() * 14) * scale, 0.75)
      else if (species === 'tre') addLeaf(points[i], tangent + side * (0.7 + random() * 0.4), 'blade', (48 + random() * 18) * scale, 0.17)
      else if (species === 'dao') addLeaf(points[i], tangent + side * (0.6 + random() * 0.4), 'almond', (22 + random() * 10) * scale, 0.42)
      else addLeaf(points[i], tangent + side * (0.35 + random() * 0.3), 'blade', (60 + random() * 24) * scale, 0.12)
    }
  }
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
