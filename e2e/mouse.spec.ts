import { expect, test, type Page } from '@playwright/test'

/** Drags across the canvas from (x1,y1) to (x2,y2), given as fractions of its size. */
export async function drag(page: Page, from: [number, number], to: [number, number], steps = 24) {
  const box = (await page.getByTestId('art-canvas').boundingBox())!
  await page.mouse.move(box.x + box.width * from[0], box.y + box.height * from[1])
  await page.mouse.down()
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    await page.mouse.move(box.x + box.width * (from[0] + (to[0] - from[0]) * t), box.y + box.height * (from[1] + (to[1] - from[1]) * t))
  }
  await page.mouse.up()
}

test('the mouse draws through the same stroke pipeline without a camera', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('hand-state')).toHaveText('Chế độ chuột')
  await drag(page, [0.2, 0.8], [0.4, 0.3])
  await expect(page.getByTestId('point-count')).not.toHaveText(/^0 \//)
  await expect(page.getByRole('button', { name: /Hoàn tác/ })).toBeEnabled()
})
