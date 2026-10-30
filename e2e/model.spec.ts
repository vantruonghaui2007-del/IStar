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
