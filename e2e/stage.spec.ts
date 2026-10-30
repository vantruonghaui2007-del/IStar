import { expect, test, type Page } from '@playwright/test'
import { fakeCamera } from './camera'

test.use({ launchOptions: fakeCamera('hand-victory.mjpeg'), permissions: ['camera'] })

async function press(page: Page, x: number, y: number) {
  const stage = page.getByTestId('stage-canvas')
  await stage.scrollIntoViewIfNeeded()
  const box = (await stage.boundingBox())!
  await page.mouse.click(box.x + box.width * x, box.y + box.height * y)
}

test('the AR stage draws the instrument and plays it; what you play still grows the garden', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('radio', { name: /Trống cơm/ }).click()
  await page.getByRole('tab', { name: /Sân khấu/ }).click()
  await expect(page.getByTestId('stage')).toBeVisible()
  await press(page, 0.5, 0.28)
  await expect(page.getByTestId('note')).toContainText('Tình')
  await press(page, 0.5, 0.75)
  await expect(page.getByTestId('note')).toContainText('Tùng')
  await expect(page.getByTestId('garden-stats')).toHaveAttribute('data-strokes', '2')
  await page.getByRole('tab', { name: /Khu vườn/ }).click()
  await expect(page.getByTestId('stage')).toHaveCount(0)
})

test('play along: the whole “Hội làng” on the drum, one lit note at a time', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('radio', { name: /Trống cơm/ }).click()
  await page.getByRole('button', { name: /Tập đánh cả bài “Hội làng”/ }).click()
  const count = page.getByTestId('lesson-count')
  await expect(count).toHaveText('0 / 46')
  const canvas = page.getByTestId('stage-canvas')

  // A wrong hit does not move the lesson on.
  const first = Number(await canvas.getAttribute('data-target'))
  await press(page, 0.5, first >= 5 ? 0.75 : 0.28)
  await expect(count).toHaveText('0 / 46')

  for (let played = 0; played < 46; played++) {
    const target = Number(await canvas.getAttribute('data-target'))
    await press(page, 0.5, target >= 5 ? 0.28 : 0.75)
    if (played < 45) await expect(count).toHaveText(`${played + 1} / 46`)
  }
  const done = page.getByRole('dialog', { name: 'Hoàn thành bài' })
  await expect(done).toContainText('Bạn đã đánh xong bài “Hội làng”')
  await expect(done).toContainText('1 lần chệch nốt')
  await done.getByRole('button', { name: 'Xem khu vườn vừa gieo' }).click()
  await expect(page.getByTestId('stage')).toHaveCount(0)
  await expect(page.getByTestId('garden-stats')).toHaveAttribute('data-strokes', '47')
})

test('play along on đàn tranh follows the lit string', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('radio', { name: /Đàn tranh/ }).click()
  await page.getByRole('button', { name: /Tập đánh cả bài “Mưa xuân”/ }).click()
  const canvas = page.getByTestId('stage-canvas')
  for (let played = 0; played < 6; played++) {
    const string = Number(await canvas.getAttribute('data-target'))
    await press(page, (string + 0.5) / 16, 0.55)
    await expect(page.getByTestId('lesson-count')).toHaveText(new RegExp(`^${played + 1} / `))
  }
  await expect(page.getByTestId('lesson-next')).not.toBeEmpty()
})

test('with the camera on, the stage shows the live camera behind the instruments', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Bắt đầu' }).click()
  await expect(page.getByTestId('tracking-status')).toHaveText('AI đang nhận diện', { timeout: 30_000 })
  await page.getByRole('tab', { name: /Sân khấu/ }).click()
  const live = await page.getByTestId('stage').locator('video').evaluate((video: HTMLVideoElement) => (video.srcObject as MediaStream | null)?.getVideoTracks()[0]?.readyState)
  expect(live).toBe('live')
  await expect(page.getByTestId('stage-canvas')).toBeVisible()
})

test('turning the camera on while the stage is open brings the live picture in', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: /Sân khấu/ }).click()
  await page.getByRole('button', { name: 'Bắt đầu' }).click()
  await expect(page.getByTestId('tracking-status')).toHaveText('AI đang nhận diện', { timeout: 30_000 })
  await expect
    .poll(() => page.getByTestId('stage').locator('video').evaluate((video: HTMLVideoElement) => (video.srcObject as MediaStream | null)?.getVideoTracks()[0]?.readyState ?? 'none'))
    .toBe('live')
})
