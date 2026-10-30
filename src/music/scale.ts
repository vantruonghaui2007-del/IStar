import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../artwork/types'

/** Northern-mode pentatonic: hò xự xang xê cống ≈ C D F G A (semitones from hò). */
export const SCALE = [0, 2, 5, 7, 9]
export const NOTE_NAMES = ['Hò', 'Xự', 'Xang', 'Xê', 'Cống']
/** Pitches across the canvas height: two octaves plus the top hò. */
export const DEGREES = 11
/** Đàn tranh (đàn thập lục) has 16 strings, laid out left (low) to right (high). */
export const STRINGS = 16

export const semitoneOf = (degree: number) => Math.floor(degree / SCALE.length) * 12 + SCALE[((degree % SCALE.length) + SCALE.length) % SCALE.length]

export const noteLabel = (degree: number) => ({ name: NOTE_NAMES[degree % SCALE.length], octave: Math.floor(degree / SCALE.length) })

const clampIndex = (value: number, count: number) => Math.min(count - 1, Math.max(0, Math.floor(value)))

/** Higher hand → higher note. */
export const degreeAtY = (y: number, height = CANVAS_HEIGHT) => clampIndex(((height - y) / height) * DEGREES, DEGREES)
export const yOfDegree = (degree: number, height = CANVAS_HEIGHT) => height - ((degree + 0.5) / DEGREES) * height

export const stringAtX = (x: number, width = CANVAS_WIDTH) => clampIndex((x / width) * STRINGS, STRINGS)
export const xOfString = (string: number, width = CANVAS_WIDTH) => ((string + 0.5) / STRINGS) * width

export const frequency = (baseMidi: number, semitone: number) => 440 * 2 ** ((baseMidi + semitone - 69) / 12)
