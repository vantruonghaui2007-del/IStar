export const LOW_LIGHT_LUMA = 55

/** Mean Rec. 709 luma of RGBA pixel data, 0–255. */
export function averageLuma(data: Uint8ClampedArray): number {
  const pixels = data.length / 4
  if (!pixels) return 0
  let sum = 0
  for (let i = 0; i < data.length; i += 4) sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
  return sum / pixels
}

export function isLowLight(luma: number): boolean {
  return luma < LOW_LIGHT_LUMA
}
