import { expect, test } from '@playwright/test'
import { drag } from './helpers'

test('strokes grow into plants; undo, restore and start over work on whole strokes', async ({ page }) => {
  await page.goto('/')
  const stats = page.getByTestId('garden-stats')
  await expect(stats).toHaveText('0 cây · 0 lá · 0 hoa')

  await drag(page, [0.15, 0.85], [0.45, 0.25], 40)
  await expect(stats).toHaveText(/^1 cây · [1-9]\d* lá · 1 hoa$/)

  await page.getByRole('button', { name: 'Hoàng hôn' }).click()
  await expect(page.getByRole('button', { name: 'Hoàng hôn' })).toHaveAttribute('aria-pressed', 'true')
  await drag(page, [0.6, 0.9], [0.8, 0.3], 40)
  await expect(stats).toHaveText(/^2 cây/)

  await page.getByRole('button', { name: /Hoàn tác/ }).click()
  await expect(stats).toHaveText(/^1 cây/)
  await page.getByRole('button', { name: /Khôi phục/ }).click()
  await expect(stats).toHaveText(/^2 cây/)

  page.once('dialog', dialog => void dialog.dismiss())
  await page.getByRole('button', { name: /Làm lại/ }).click()
  await expect(stats).toHaveText(/^2 cây/)

  page.once('dialog', dialog => void dialog.accept())
  await page.getByRole('button', { name: /Làm lại/ }).click()
  await expect(stats).toHaveText('0 cây · 0 lá · 0 hoa')
})

test('a click in place plants one small flower', async ({ page }) => {
  await page.goto('/')
  const box = (await page.getByTestId('art-canvas').boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await expect(page.getByTestId('garden-stats')).toHaveText('0 cây · 0 lá · 1 hoa')
})

test('keyboard shortcuts undo and restore', async ({ page }) => {
  await page.goto('/')
  await drag(page, [0.3, 0.8], [0.5, 0.4])
  await expect(page.getByTestId('garden-stats')).toHaveText(/^1 cây/)
  await page.keyboard.press('Control+z')
  await expect(page.getByTestId('garden-stats')).toHaveText(/^0 cây/)
  await page.keyboard.press('Control+y')
  await expect(page.getByTestId('garden-stats')).toHaveText(/^1 cây/)
})
