import { expect, test } from '@playwright/test'
import { fakeCamera } from './camera'

test.use({ launchOptions: fakeCamera('hand-victory.mjpeg'), permissions: ['camera'] })

// MediaPipe flushes its usage log every 60 s; watch a full cycle.
test('during a long session nothing leaves the device, including MediaPipe usage logging', async ({ page }) => {
  test.setTimeout(150_000)
  const external: string[] = []
  const workerLog: string[] = []
  page.on('request', request => {
    const url = new URL(request.url())
    if (url.protocol.startsWith('http') && url.hostname !== 'localhost') external.push(request.url())
  })
  page.on('worker', worker => worker.on('console', message => workerLog.push(message.text())))

  await page.goto('/')
  await page.getByRole('button', { name: 'Bắt đầu' }).click()
  await expect(page.getByTestId('tracking-status')).toHaveText('AI đang nhận diện', { timeout: 30_000 })
  await expect.poll(() => workerLog.some(line => line.includes('[riêng tư] Đã chặn yêu cầu tới odml.pa.googleapis.com')), { timeout: 90_000, intervals: [5_000] }).toBe(true)

  expect(external).toEqual([])
  expect(workerLog.filter(line => /Refused to connect/i.test(line))).toEqual([])
  await expect(page.getByTestId('ai-stats')).toHaveText(/[1-9]\d* lần\/giây/)
})
