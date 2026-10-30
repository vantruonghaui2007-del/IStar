import { expect, test } from '@playwright/test'
import { fakeCamera } from './camera'

test.use({ launchOptions: fakeCamera('hand-victory.mjpeg'), permissions: ['camera'] })

test('the real MediaPipe model loads locally and detects a hand from the webcam', async ({ page }) => {
  const external: string[] = []
  page.on('request', request => {
    const url = new URL(request.url())
    if (!['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol.startsWith('http')) external.push(request.url())
  })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))

  await page.goto('/')
  await page.getByRole('button', { name: 'Bắt đầu' }).click()

  await expect(page.getByTestId('tracking-status')).toHaveText('AI đang nhận diện', { timeout: 30_000 })
  await expect(page.getByTestId('hand-state')).toHaveText(/Sẵn sàng|Đang vẽ/)
  await expect(page.getByTestId('ai-stats')).toHaveText(/[1-9]\d* lần\/giây/)

  // The index fingertip cursor follows the detected hand.
  await expect(page.getByTestId('art-canvas')).toHaveAttribute('data-cursor', /\d+,\d+/)

  expect(external, 'no request may leave the device').toEqual([])
  expect(errors).toEqual([])
})

test('turning the camera off releases the camera and the worker', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Bắt đầu' }).click()
  await expect(page.getByTestId('tracking-status')).toHaveText('AI đang nhận diện', { timeout: 30_000 })
  await page.getByRole('button', { name: 'Tắt camera' }).click()
  await expect(page.getByTestId('tracking-status')).toHaveText('Camera đã tắt')
  const liveTracks = await page.evaluate(() => (document.querySelector('video')?.srcObject as MediaStream | null)?.getTracks().filter(t => t.readyState === 'live').length ?? 0)
  expect(liveTracks).toBe(0)
  await expect(page.getByTestId('hand-state')).toHaveText('Chế độ chuột')
})

test('replay stops hand processing and drawing; leaving replay resumes it', async ({ page }) => {
  await page.goto('/')
  const box = (await page.getByTestId('art-canvas').boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.getByRole('button', { name: 'Bắt đầu' }).click()
  await expect(page.getByTestId('ai-stats')).toHaveText(/[1-9]\d* lần\/giây/, { timeout: 30_000 })
  await page.getByRole('button', { name: /^▷ Phát lại$/ }).click()
  await expect(page.getByTestId('ai-stats')).toHaveText(/^0 lần\/giây/, { timeout: 5_000 })
  await page.getByRole('button', { name: 'Thoát phát lại' }).first().click()
  await expect(page.getByTestId('ai-stats')).toHaveText(/[1-9]\d* lần\/giây/, { timeout: 5_000 })
})

test('losing the camera mid-session is explained, mouse keeps working and retry reconnects', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Bắt đầu' }).click()
  await expect(page.getByTestId('tracking-status')).toHaveText('AI đang nhận diện', { timeout: 30_000 })
  // What the browser fires when a webcam is unplugged or taken by another app.
  await page.evaluate(() => (document.querySelector('video')!.srcObject as MediaStream).getVideoTracks()[0].dispatchEvent(new Event('ended')))
  await expect(page.getByRole('status')).toContainText('Mất kết nối camera')
  await expect(page.getByTestId('hand-state')).toHaveText('Chế độ chuột')
  await page.getByRole('button', { name: 'Thử lại' }).click()
  await expect(page.getByTestId('tracking-status')).toHaveText('AI đang nhận diện', { timeout: 30_000 })
})

test('switching tabs during a replay does not resume hand processing', async ({ page }) => {
  await page.goto('/')
  const box = (await page.getByTestId('art-canvas').boundingBox())!
  await page.mouse.click(box.x + box.width / 3, box.y + box.height / 2)
  await page.getByRole('button', { name: 'Bắt đầu' }).click()
  await expect(page.getByTestId('ai-stats')).toHaveText(/[1-9]\d* lần\/giây/, { timeout: 30_000 })
  await page.getByRole('button', { name: /^▷ Phát lại$/ }).click()
  await expect(page.getByTestId('ai-stats')).toHaveText(/^0 lần\/giây/, { timeout: 5_000 })
  await page.evaluate(() => {
    const show = (hidden: boolean) => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') })
      document.dispatchEvent(new Event('visibilitychange'))
    }
    show(true)
    show(false)
  })
  await page.waitForTimeout(2_500)
  await expect(page.getByTestId('ai-stats')).toHaveText(/^0 lần\/giây/)
  await expect(page.getByTestId('garden-stats')).toHaveText('0 cây · 0 lá · 1 hoa')
})
