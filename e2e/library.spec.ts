import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { drag } from './helpers'

const savedLabel = (page: Page) => expect(page.getByTestId('save-state')).toHaveText(/Đã lưu lúc/, { timeout: 5_000 })

test('autosaves after a second and reopens the garden after a reload', async ({ page }) => {
  await page.goto('/')
  await drag(page, [0.2, 0.85], [0.4, 0.3])
  await drag(page, [0.6, 0.85], [0.7, 0.4])
  const stats = await page.getByTestId('garden-stats').innerText()
  await savedLabel(page)
  await page.reload()
  await expect(page.getByTestId('garden-stats')).toHaveText(stats)
  await expect(page.getByTestId('library').locator('.library-row')).toHaveCount(1)
})

test('the library opens, renames and deletes artworks', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Tên tác phẩm').fill('Vườn của Lan')
  await drag(page, [0.2, 0.85], [0.4, 0.3])
  await savedLabel(page)
  const library = page.getByTestId('library')
  await expect(library).toContainText('Vườn của Lan')

  await page.getByRole('button', { name: 'Tác phẩm mới' }).click()
  await expect(page.getByTestId('garden-stats')).toHaveText('0 cây · 0 lá · 0 hoa')
  await drag(page, [0.5, 0.9], [0.6, 0.2])
  await savedLabel(page)
  await expect(library.locator('.library-row')).toHaveCount(2)

  await library.getByRole('button', { name: /^Vườn của Lan/ }).click()
  await expect(page.getByLabel('Tên tác phẩm')).toHaveValue('Vườn của Lan')

  page.once('dialog', dialog => void dialog.accept('Khu vườn mùa thu'))
  await library.getByRole('button', { name: 'Đổi tên Khu vườn chưa đặt tên' }).click()
  await expect(library).toContainText('Khu vườn mùa thu')

  page.once('dialog', dialog => void dialog.accept())
  await library.getByRole('button', { name: 'Xóa Khu vườn mùa thu' }).click()
  await expect(library.locator('.library-row')).toHaveCount(1)
  await expect(library).not.toContainText('Khu vườn mùa thu')
})

test('replay pauses, restarts and ends on exactly the exported picture, without the camera', async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as unknown as { cameraCalls: number }).cameraCalls = 0
    const original = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices)
    if (original) navigator.mediaDevices.getUserMedia = (constraints) => {
      ;(window as unknown as { cameraCalls: number }).cameraCalls++
      return original(constraints)
    }
  })
  await page.goto('/')
  await drag(page, [0.2, 0.85], [0.45, 0.25], 30)
  await page.getByRole('button', { name: 'Đêm đom đóm' }).click()
  await drag(page, [0.7, 0.9], [0.55, 0.3], 30)
  await page.waitForTimeout(800)

  await page.getByRole('button', { name: /^▷ Phát lại$/ }).click()
  const state = page.getByTestId('replay-state')
  await expect(state).toHaveText('Đang phát lại')
  await page.getByRole('button', { name: 'Tạm dừng' }).click()
  await expect(state).toHaveText('Tạm dừng')
  await page.getByRole('button', { name: 'Bắt đầu lại' }).click()
  await expect(state).toHaveText('Đang phát lại')
  await page.getByRole('button', { name: 'Tốc độ 2×' }).click()
  await expect(state).toHaveText('Phát lại xong', { timeout: 15_000 })

  const replayFrame = await page.getByTestId('art-canvas').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL('image/png'))
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /Xuất PNG/ }).click()
  const png = await readFile(await (await download).path())
  const difference = await page.evaluate(async ([a, b]) => {
    const load = async (src: string) => {
      const image = new Image()
      image.src = src
      await image.decode()
      const canvas = new OffscreenCanvas(image.width, image.height)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0)
      return ctx.getImageData(0, 0, image.width, image.height).data
    }
    const [x, y] = await Promise.all([load(a), load(b)])
    let total = 0
    for (let i = 0; i < x.length; i++) total += Math.abs(x[i] - y[i])
    return total / x.length
  }, [replayFrame, `data:image/png;base64,${png.toString('base64')}`])
  expect(difference).toBeLessThan(0.5)
  expect(await page.evaluate(() => (window as unknown as { cameraCalls: number }).cameraCalls)).toBe(0)

  await page.getByRole('button', { name: 'Thoát phát lại' }).first().click()
  await expect(state).toHaveCount(0)
})

test('when storage fails the garden stays on screen and PNG export still works', async ({ page }) => {
  await page.addInitScript(() => {
    IDBFactory.prototype.open = () => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    }
  })
  await page.goto('/')
  await drag(page, [0.2, 0.85], [0.4, 0.3])
  await expect(page.getByTestId('save-state')).toHaveText('Chưa lưu được', { timeout: 5_000 })
  await expect(page.getByRole('status')).toContainText('Bộ nhớ trình duyệt đã đầy')
  await expect(page.getByTestId('garden-stats')).toHaveText(/^1 cây/)

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /Xuất PNG/ }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/^mua-net-ai-.*\.png$/)
  const png = await readFile(await file.path())
  expect(png.subarray(1, 4).toString()).toBe('PNG')
  expect(png.readUInt32BE(16)).toBe(1920)
  expect(png.readUInt32BE(20)).toBe(1080)
})
