import { expect, test, type Page } from '@playwright/test'
import { drag } from './helpers'

async function tap(page: Page, x: number, y: number) {
  const box = (await page.getByTestId('art-canvas').boundingBox())!
  await page.mouse.click(box.x + box.width * x, box.y + box.height * y)
}

test('every traditional instrument sounds, names its notes and grows its own plant', async ({ page }) => {
  await page.goto('/')
  const note = page.getByTestId('note')
  for (const [name, play] of [
    ['Đàn bầu', () => drag(page, [0.1, 0.8], [0.3, 0.3])],
    ['Sáo trúc', () => drag(page, [0.35, 0.8], [0.45, 0.3])],
    ['Đàn tranh', () => drag(page, [0.5, 0.5], [0.7, 0.45])],
    ['Trống cơm', () => tap(page, 0.6, 0.85)],
  ] as const) {
    await page.getByRole('radio', { name: new RegExp(name) }).click()
    await expect(page.getByRole('heading', { name: new RegExp(name) })).toBeVisible()
    await play()
    await expect(note).toContainText(name)
  }
  await expect(note).toContainText(/Tùng|Tình/)
  await expect(page.getByRole('button', { name: 'Tắt âm thanh' })).toHaveAttribute('data-audio', 'running')
  await expect(page.getByTestId('garden-stats')).toHaveText(/· 4 nhạc cụ$/)

  await page.getByRole('button', { name: 'Tắt âm thanh' }).click()
  await expect(page.getByRole('button', { name: 'Bật âm thanh' })).toBeVisible()
})

test('the step-by-step lesson for trống cơm ticks off as you play', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('radio', { name: /Trống cơm/ }).click()
  await page.getByRole('button', { name: /Tập chơi từng bước/ }).click()
  const lesson = page.getByTestId('tutorial')
  await expect(lesson.locator('li.current')).toContainText('tùng')

  await tap(page, 0.3, 0.9)
  await expect(lesson.locator('li.done')).toHaveCount(1)
  await expect(lesson.locator('li.current')).toContainText('tình')

  await tap(page, 0.3, 0.15)
  await expect(lesson.locator('li.done')).toHaveCount(2)

  for (let i = 0; i < 4; i++) {
    await tap(page, 0.4 + i * 0.05, 0.85)
    await page.waitForTimeout(450)
  }
  await expect(lesson.locator('li.done')).toHaveCount(3)
  await expect(lesson).toContainText('Tuyệt vời')
})

test('the lesson for đàn tranh needs a real sweep, not a tap', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('radio', { name: /Đàn tranh/ }).click()
  await page.getByRole('button', { name: /Tập chơi từng bước/ }).click()
  const lesson = page.getByTestId('tutorial')
  for (const x of [0.2, 0.4, 0.6]) await tap(page, x, 0.4)
  await expect(lesson.locator('li.done')).toHaveCount(1)
  await tap(page, 0.8, 0.4)
  await expect(lesson.locator('li.done')).toHaveCount(1)
  await drag(page, [0.1, 0.5], [0.6, 0.5], 30)
  await expect(lesson.locator('li.done')).toHaveCount(2)
})
