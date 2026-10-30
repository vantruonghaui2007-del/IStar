import { describe, expect, it } from 'vitest'
import { averageLuma, isLowLight } from './light'

const rgba = (r: number, g: number, b: number, pixels = 4) => Uint8ClampedArray.from(Array.from({ length: pixels }, () => [r, g, b, 255]).flat())

describe('light level', () => {
  it('averages perceived brightness of RGBA pixels on a 0–255 scale', () => {
    expect(averageLuma(rgba(255, 255, 255))).toBeCloseTo(255)
    expect(averageLuma(rgba(0, 0, 0))).toBe(0)
    expect(averageLuma(rgba(0, 255, 0))).toBeCloseTo(0.7152 * 255, 0)
    expect(averageLuma(new Uint8ClampedArray())).toBe(0)
  })

  it('flags a frame as low light below the threshold', () => {
    expect(isLowLight(30)).toBe(true)
    expect(isLowLight(120)).toBe(false)
  })
})
