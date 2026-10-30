import { describe, expect, it } from 'vitest'
import { activeZone, mapToCanvas, PinchController, pinchRatio, type GestureEvent } from './gesture'
import type { HandSample, NormalizedLandmark } from './protocol'

/** A square-frame hand whose palm (points 5–17) is 0.2 wide; thumb/index tips sit `ratio × palm` apart around (x, y). */
function hand(ratio: number, x = 0.5, y = 0.5): NormalizedLandmark[] {
  const points = Array.from({ length: 21 }, () => ({ x, y: y + 0.1 }))
  points[5] = { x: x - 0.1, y: y + 0.1 }
  points[17] = { x: x + 0.1, y: y + 0.1 }
  const gap = ratio * 0.2
  points[4] = { x: x - gap / 2, y }
  points[8] = { x: x + gap / 2, y }
  return points
}

const sample = (time: number, landmarks: NormalizedLandmark[] | null): HandSample => ({ time, landmarks, frameAspect: 1 })
const types = (events: GestureEvent[]) => events.map(event => event.type)
const square = { margin: 0, canvasAspect: 1 }

describe('pinch ratio', () => {
  it('divides thumb–index distance by palm width', () => {
    expect(pinchRatio(hand(0.3), 1)).toBeCloseTo(0.3)
  })

  it('measures in pixels, not in stretched normalized units', () => {
    // On a 4:3 frame a horizontal gap of 0.1 is 4/3 times longer than a vertical one.
    const points = hand(0.5)
    points[4] = { x: 0.5, y: 0.45 }
    points[8] = { x: 0.5, y: 0.55 }
    expect(pinchRatio(points, 4 / 3)).toBeCloseTo(0.1 / (0.2 * 4 / 3))
  })

  it('rejects invalid samples and palms that are too small', () => {
    expect(pinchRatio([{ x: Number.NaN, y: 0 }], 1)).toBeNull()
    const tiny = hand(0.1)
    tiny[5] = { x: 0.5, y: 0.6 }
    tiny[17] = { x: 0.51, y: 0.6 }
    expect(pinchRatio(tiny, 1)).toBeNull()
  })
})

describe('mapping the camera frame to the 16:9 canvas', () => {
  it('mirrors horizontally so the cursor moves the way the user sees it', () => {
    expect(mapToCanvas({ x: 0.2, y: 0.5 }, 1, square).x).toBeCloseTo(0.8)
  })

  it('crops a 4:3 frame to 16:9 and clamps to the canvas', () => {
    const options = { margin: 0, canvasAspect: 16 / 9 }
    expect(mapToCanvas({ x: 0.5, y: 0.125 }, 4 / 3, options).y).toBeCloseTo(0)
    expect(mapToCanvas({ x: 0.5, y: 0.875 }, 4 / 3, options).y).toBeCloseTo(1)
    expect(mapToCanvas({ x: 0.5, y: 0.02 }, 4 / 3, options).y).toBe(0)
  })

  it('maps an inner active zone to the full canvas so edges are reachable', () => {
    const point = mapToCanvas({ x: 0.9, y: 0.5 }, 1, { margin: 0.1, canvasAspect: 1 })
    expect(point.x).toBeCloseTo(0)
    expect(point.y).toBeCloseTo(0.5)
  })

  it('describes that active zone for the camera guide frame', () => {
    const zone = activeZone(4 / 3, { margin: 0.1, canvasAspect: 16 / 9 })
    expect(zone.left).toBeCloseTo(0.1)
    expect(zone.width).toBeCloseTo(0.8)
    expect(zone.top).toBeCloseTo(0.2)
    expect(zone.height).toBeCloseTo(0.6)
  })
})

describe('PinchController', () => {
  it('starts below 0.28, holds between thresholds, releases above 0.42', () => {
    const controller = new PinchController(square)
    expect(controller.update(sample(0, hand(0.35))).state).toBe('ready')
    const start = controller.update(sample(50, hand(0.2)))
    expect(start.state).toBe('drawing')
    expect(types(start.events)).toEqual(['stroke-start'])
    expect(controller.update(sample(100, hand(0.4))).state).toBe('drawing')
    const end = controller.update(sample(150, hand(0.45)))
    expect(end.state).toBe('ready')
    expect(types(end.events)).toEqual(['stroke-end'])
  })

  it('does not flap while the ratio jitters around the thresholds', () => {
    const controller = new PinchController(square)
    const events: GestureEvent[] = []
    const ratios = [0.27, 0.3, 0.41, 0.29, 0.4, 0.31, 0.39, 0.33]
    ratios.forEach((ratio, index) => events.push(...controller.update(sample(index * 50, hand(ratio))).events))
    expect(types(events).filter(type => type !== 'stroke-move')).toEqual(['stroke-start'])
  })

  it('smooths new points with factor 0.35', () => {
    const controller = new PinchController(square)
    controller.update(sample(0, hand(0.1, 0.5, 0.5)))
    const move = controller.update(sample(50, hand(0.1, 0.3, 0.5))).events[0]
    expect(move.type).toBe('stroke-move')
    if (move.type !== 'stroke-move') return
    // Index tips sit at camera x 0.51 and 0.31 → mirrored 0.49 and 0.69; smoothed 0.49·0.65 + 0.69·0.35.
    expect(move.point.x).toBeCloseTo(0.56)
  })

  it('stops adding points as soon as the hand is lost and ends the stroke after 200 ms', () => {
    const controller = new PinchController(square)
    controller.update(sample(0, hand(0.1)))
    const lost = controller.update(sample(50, null))
    expect(lost.state).toBe('absent')
    expect(lost.cursor).toBeNull()
    expect(lost.events).toEqual([])
    expect(controller.update(sample(150, null)).events).toEqual([])
    expect(types(controller.update(sample(200, null)).events)).toEqual(['stroke-end'])
  })

  it('ends the stroke on the clock even when no more samples arrive', () => {
    const controller = new PinchController(square)
    controller.update(sample(0, hand(0.1)))
    expect(controller.tick(199).events).toEqual([])
    expect(types(controller.tick(200).events)).toEqual(['stroke-end'])
    expect(controller.tick(400).events).toEqual([])
  })

  it('never joins a stroke across the screen when the hand comes back elsewhere', () => {
    const controller = new PinchController(square)
    controller.update(sample(0, hand(0.1, 0.8, 0.5)))
    controller.update(sample(50, null))
    const back = controller.update(sample(100, hand(0.1, 0.2, 0.5)))
    expect(types(back.events)).toEqual(['stroke-end', 'stroke-start'])
  })

  it('bridges a short dropout when the hand comes back at the same place', () => {
    const controller = new PinchController(square)
    controller.update(sample(0, hand(0.1, 0.5, 0.5)))
    controller.update(sample(50, null))
    const back = controller.update(sample(100, hand(0.1, 0.51, 0.5)))
    expect(types(back.events)).toEqual(['stroke-move'])
  })

  it('treats invalid samples like a missing hand', () => {
    const controller = new PinchController(square)
    controller.update(sample(0, hand(0.1)))
    const invalid = controller.update(sample(50, [{ x: Number.NaN, y: 0.5 }]))
    expect(invalid.events).toEqual([])
    expect(invalid.state).toBe('absent')
    expect(types(controller.update(sample(200, [{ x: Number.NaN, y: 0.5 }])).events)).toEqual(['stroke-end'])
  })

  it('after a reset requires opening the fingers before drawing again', () => {
    const controller = new PinchController(square)
    controller.update(sample(0, hand(0.1)))
    expect(types(controller.reset())).toEqual(['stroke-end'])
    expect(controller.update(sample(50, hand(0.1))).state).toBe('ready')
    controller.update(sample(100, hand(0.5)))
    expect(types(controller.update(sample(150, hand(0.1))).events)).toEqual(['stroke-start'])
  })
})
