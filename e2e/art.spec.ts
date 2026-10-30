import { expect, test } from '@playwright/test'
import { drag } from './helpers'

test('strokes grow into the instrument plant; undo, restore and start over work on whole strokes', async ({ page }) => {
  await page.goto('/')
  const stats = page.getByTestId('garden-stats')
  await expect(stats).toHaveText('0 nốt · 0 hoa lá · 0 nhạc cụ')

  await drag(page, [0.15, 0.85], [0.45, 0.25], 40)
  await expect(stats).toHaveAttribute('data-strokes', '1')
  await expect(stats).toHaveText(/^1 nốt · [1-9]\d* hoa lá · 1 nhạc cụ$/)

  await page.getByRole('radio', { name: /Đàn tranh/ }).click()
  await expect(page.getByRole('radio', { name: /Đàn tranh/ })).toHaveAttribute('aria-checked', 'true')
  await drag(page, [0.55, 0.6], [0.85, 0.55], 40)
  await expect(stats).toHaveAttribute('data-strokes', '2')
  await expect(stats).toHaveText(/· 2 nhạc cụ$/)

  await page.getByRole('button', { name: /Hoàn tác/ }).click()
  await expect(stats).toHaveAttribute('data-strokes', '1')
  await page.getByRole('button', { name: /Khôi phục/ }).click()
  await expect(stats).toHaveAttribute('data-strokes', '2')

  page.once('dialog', dialog => void dialog.dismiss())
  await page.getByRole('button', { name: /Làm lại/ }).click()
  await expect(stats).toHaveAttribute('data-strokes', '2')

  page.once('dialog', dialog => void dialog.accept())
  await page.getByRole('button', { name: /Làm lại/ }).click()
  await expect(stats).toHaveText('0 nốt · 0 hoa lá · 0 nhạc cụ')
})

test('a click in place plays one note and grows one small flower', async ({ page }) => {
  await page.goto('/')
  const box = (await page.getByTestId('art-canvas').boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await expect(page.getByTestId('garden-stats')).toHaveText(/^1 nốt · 1 hoa lá · 1 nhạc cụ$/)
})

test('keyboard shortcuts undo and restore', async ({ page }) => {
  await page.goto('/')
  await drag(page, [0.3, 0.8], [0.5, 0.4])
  const stats = page.getByTestId('garden-stats')
  await expect(stats).toHaveAttribute('data-strokes', '1')
  await page.keyboard.press('Control+z')
  await expect(stats).toHaveAttribute('data-strokes', '0')
  await page.keyboard.press('Control+y')
  await expect(stats).toHaveAttribute('data-strokes', '1')
})
