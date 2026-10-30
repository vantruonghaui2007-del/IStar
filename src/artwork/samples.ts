import { ARTWORK_VERSION, type Artwork } from '../storage/artworks'
import { seededRandom } from './random'
import type { PaletteId, Point, Stroke } from './types'

type Vec = [number, number]
type Gesture = { path: Vec[]; ms: number; palette: PaletteId; pause?: number } | { tap: Vec; palette: PaletteId; pause?: number }

const BASE_TIME = Date.UTC(2026, 9, 30, 2, 0, 0)
const FRAME_MS = 16
const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value))

/** Point on a Catmull–Rom spline through `path`, t ∈ [0, 1]. */
function along(path: Vec[], t: number): Vec {
  const segments = path.length - 1
  const scaled = Math.min(segments - 1e-9, t * segments)
  const i = Math.floor(scaled)
  const u = scaled - i
  const p0 = path[Math.max(0, i - 1)]
  const p1 = path[i]
  const p2 = path[i + 1]
  const p3 = path[Math.min(segments, i + 2)]
  const blend = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u)
  return [blend(p0[0], p1[0], p2[0], p3[0]), blend(p0[1], p1[1], p2[1], p3[1])]
}

/** Hand-like timing: slow start (thick base), quicker middle, slowing at the tip. */
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

function compose(id: string, name: string, gestures: Gesture[], seed: number): Artwork {
  const random = seededRandom(seed)
  let clock = BASE_TIME
  const strokes: Stroke[] = gestures.map((gesture, index) => {
    const startedAt = clock
    let points: Point[]
    if ('tap' in gesture) {
      points = [
        { x: gesture.tap[0], y: gesture.tap[1], t: 0 },
        { x: gesture.tap[0] + 2, y: gesture.tap[1] + 1, t: 140 },
      ]
    } else {
      const steps = Math.max(2, Math.round(gesture.ms / FRAME_MS))
      points = Array.from({ length: steps + 1 }, (_, step) => {
        const [x, y] = along(gesture.path, easeInOut(step / steps))
        const wobble = () => (random() - 0.5) * 1.6
        return { x: Math.round(clamp(x + wobble(), 1920) * 10) / 10, y: Math.round(clamp(y + wobble(), 1080) * 10) / 10, t: step * FRAME_MS }
      })
    }
    clock = startedAt + points[points.length - 1].t + (gesture.pause ?? 650)
    return { id: `${id}-${index + 1}`, palette: gesture.palette, seed: Math.floor(random() * 0xffffffff) >>> 0, startedAt, points }
  })
  return { version: ARTWORK_VERSION, id, name, createdAt: BASE_TIME, updatedAt: clock, width: 1920, height: 1080, strokes }
}

function firstSprout(): Artwork {
  return compose(
    'mau-mam-dau-tien',
    'Mầm đầu tiên',
    [
      { palette: 'vuon-xuan', ms: 2600, path: [[620, 1040], [640, 820], [590, 620], [660, 420], [700, 300]] },
      { palette: 'vuon-xuan', ms: 1300, path: [[612, 700], [720, 640], [820, 600], [900, 560]] },
      { palette: 'vuon-xuan', ms: 1500, path: [[640, 860], [520, 800], [440, 720]] },
      { palette: 'hoang-hon', ms: 2200, path: [[1240, 1050], [1270, 860], [1230, 720], [1290, 560]] },
      { palette: 'vuon-xuan', tap: [1500, 860] },
      { palette: 'hoang-hon', tap: [1580, 930] },
    ],
    11,
  )
}

function busySpring(): Artwork {
  const gestures: Gesture[] = []
  const random = seededRandom(23)
  for (let i = 0; i < 12; i++) {
    const x = 120 + i * 152 + (random() - 0.5) * 50
    const top = 260 + random() * 260
    const lean = (random() - 0.5) * 220
    const palette: PaletteId = i % 3 === 2 ? 'hoang-hon' : 'vuon-xuan'
    gestures.push({ palette, ms: 1500 + random() * 1600, path: [[x, 1060], [x + lean * 0.2, 850], [x - lean * 0.3, 650], [x + lean, top]], pause: 400 })
    if (i % 2 === 0) {
      const branchY = 640 + random() * 140
      const side = i % 4 === 0 ? 1 : -1
      gestures.push({ palette, ms: 800 + random() * 500, path: [[x + lean * 0.05 * side, branchY], [x + side * 90, branchY - 70], [x + side * 170, branchY - 110]], pause: 300 })
    }
  }
  for (let i = 0; i < 6; i++) gestures.push({ palette: i % 2 ? 'hoang-hon' : 'vuon-xuan', tap: [200 + i * 300 + random() * 80, 150 + random() * 90], pause: 250 })
  return compose('mau-vuon-xuan', 'Vườn xuân rộn rã', gestures, 37)
}

function fireflyNight(): Artwork {
  return compose(
    'mau-dem-dom-dom',
    'Đêm đom đóm',
    [
      { palette: 'dem-dom-dom', ms: 3200, path: [[160, 1040], [480, 760], [860, 560], [1240, 330], [1500, 210]] },
      { palette: 'dem-dom-dom', ms: 3000, path: [[1760, 1040], [1440, 780], [1060, 600], [700, 380], [420, 250]] },
      { palette: 'hoang-hon', ms: 2600, path: [[960, 1060], [930, 820], [1000, 620], [950, 420], [980, 200]] },
      { palette: 'dem-dom-dom', ms: 1400, path: [[660, 690], [560, 560], [520, 430]] },
      { palette: 'dem-dom-dom', ms: 1400, path: [[1300, 700], [1410, 570], [1440, 450]] },
      { palette: 'vuon-xuan', ms: 1600, path: [[960, 760], [1120, 700], [1240, 720], [1360, 820]] },
      { palette: 'dem-dom-dom', tap: [300, 420] },
      { palette: 'dem-dom-dom', tap: [1650, 520] },
      { palette: 'dem-dom-dom', tap: [760, 160] },
    ],
    59,
  )
}

/** Three demo gardens built by the same algorithm a visitor's strokes go through. */
export function sampleArtworks(): Artwork[] {
  return [firstSprout(), busySpring(), fireflyNight()]
}
