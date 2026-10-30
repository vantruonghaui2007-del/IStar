import type { Page } from '@playwright/test'

/** Drags across the canvas from `from` to `to`, given as fractions of its size. */
export async function drag(page: Page, from: [number, number], to: [number, number], steps = 24) {
  await page.getByTestId('art-canvas').scrollIntoViewIfNeeded()
  const box = (await page.getByTestId('art-canvas').boundingBox())!
  const at = (t: number) => [box.x + box.width * (from[0] + (to[0] - from[0]) * t), box.y + box.height * (from[1] + (to[1] - from[1]) * t)] as const
  await page.mouse.move(...at(0))
  await page.mouse.down()
  for (let i = 1; i <= steps; i++) {
    const [x, y] = at(i / steps)
    // A gentle wave so strokes look like stems, not rulers.
    await page.mouse.move(x, y + Math.sin((i / steps) * Math.PI * 2) * box.height * 0.03)
  }
  await page.mouse.up()
}
