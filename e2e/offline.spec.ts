import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { chromium, expect, test } from '@playwright/test'
import { fakeCamera } from './camera'
import { drag } from './helpers'

const ready = 'Sẵn sàng dùng offline'

test('after preparing online, a browser restarted without network still runs everything', async ({ baseURL }) => {
  test.setTimeout(150_000)
  const profile = await mkdtemp(path.join(os.tmpdir(), 'mua-net-offline-'))
  const launch = () => chromium.launchPersistentContext(profile, { ...fakeCamera('hand-victory.mjpeg'), permissions: ['camera'], viewport: { width: 1366, height: 768 }, acceptDownloads: true })
  try {
    // 1. Online: open once and wait until every required file is verified in the cache.
    const first = await launch()
    const page = first.pages()[0] ?? (await first.newPage())
    await page.goto(baseURL!)
    await expect(page.getByTestId('offline-status')).toHaveText(ready, { timeout: 60_000 })
    await first.close()

    // 2. Offline: a fresh browser process, no network at all.
    const second = await launch()
    await second.setOffline(true)
    const offline = second.pages()[0] ?? (await second.newPage())
    await offline.goto(baseURL!)
    await expect(offline.getByRole('heading', { name: 'Gieo mầm' })).toBeVisible()
    await expect(offline.getByTestId('offline-status')).toContainText(ready)
    await expect(offline.getByTestId('offline-status')).toContainText('đang ngoại tuyến')

    // Draw and save.
    await drag(offline, [0.2, 0.85], [0.45, 0.3])
    await expect(offline.getByTestId('save-state')).toHaveText(/Đã lưu lúc/, { timeout: 5_000 })

    // Replay.
    await offline.getByRole('button', { name: /^▷ Phát lại$/ }).click()
    await expect(offline.getByTestId('replay-state')).toHaveText('Phát lại xong', { timeout: 15_000 })
    await offline.getByRole('button', { name: 'Thoát phát lại' }).first().click()

    // Export PNG.
    const download = offline.waitForEvent('download')
    await offline.getByRole('button', { name: /Xuất PNG/ }).click()
    expect((await download).suggestedFilename()).toMatch(/\.png$/)

    // Camera + the real hand model, served from the cache.
    await offline.getByRole('button', { name: 'Bắt đầu' }).click()
    await expect(offline.getByTestId('tracking-status')).toHaveText('AI đang nhận diện', { timeout: 30_000 })
    await expect(offline.getByTestId('hand-state')).toHaveText(/Sẵn sàng|Đang vẽ/)
    await second.close()
  } finally {
    await rm(profile, { recursive: true, force: true })
  }
})

test('a missing cached file is reported, never shown as ready, and can be repaired', async ({ page }) => {
  await page.goto('/')
  const status = page.getByTestId('offline-status')
  await expect(status).toHaveText(ready, { timeout: 60_000 })

  const removed = await page.evaluate(async () => {
    for (const name of await caches.keys()) {
      const cache = await caches.open(name)
      for (const request of await cache.keys()) if (request.url.includes('hand_landmarker.task')) return cache.delete(request)
    }
    return false
  })
  expect(removed).toBe(true)

  await page.getByRole('button', { name: 'Kiểm tra lại' }).click()
  await expect(status).toHaveText(/Chưa đủ tài nguyên offline \(thiếu 1\//)
  await page.getByRole('button', { name: 'Thử lại' }).click()
  await expect(status).toHaveText(ready, { timeout: 30_000 })
})
