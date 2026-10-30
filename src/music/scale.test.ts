import { describe, expect, it } from 'vitest'
import { DEGREES, degreeAtY, frequency, noteLabel, semitoneOf, stringAtX, STRINGS, xOfString, yOfDegree } from './scale'

describe('ngũ cung (hò xự xang xê cống)', () => {
  it('uses the Northern pentatonic: C D F G A', () => {
    expect([0, 1, 2, 3, 4, 5].map(semitoneOf)).toEqual([0, 2, 5, 7, 9, 12])
  })

  it('names notes the traditional way', () => {
    expect([0, 1, 2, 3, 4].map(degree => noteLabel(degree).name)).toEqual(['Hò', 'Xự', 'Xang', 'Xê', 'Cống'])
    expect(noteLabel(5)).toEqual({ name: 'Hò', octave: 1 })
  })

  it('maps hand height to pitch: higher hand, higher note', () => {
    expect(degreeAtY(1079)).toBe(0)
    expect(degreeAtY(0)).toBe(DEGREES - 1)
    for (let degree = 0; degree < DEGREES; degree++) expect(degreeAtY(yOfDegree(degree))).toBe(degree)
  })

  it('maps the zither strings left (low) to right (high)', () => {
    expect(STRINGS).toBe(16)
    expect(stringAtX(0)).toBe(0)
    expect(stringAtX(1919)).toBe(15)
    for (let string = 0; string < STRINGS; string++) expect(stringAtX(xOfString(string))).toBe(string)
  })

  it('computes equal-tempered frequencies', () => {
    expect(frequency(69, 0)).toBeCloseTo(440)
    expect(frequency(60, 12)).toBeCloseTo(523.25, 1)
  })
})
