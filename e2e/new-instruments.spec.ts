import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { drag } from './helpers'

const instruments = [
  { name: 'Đàn nguyệt', title: 'Trăng sân đình' },
  { name: 'Đàn tỳ bà', title: 'Lan bên thềm' },
]

async function meter(page: Page) {
  return page.evaluate(() => {
    const analyser = (window as unknown as { audioMeter?: AnalyserNode }).audioMeter
    if (!analyser) return 0
    const samples = new Float32Array(analyser.fftSize)
    analyser.getFloatTimeDomainData(samples)
    return Math.sqrt(samples.reduce((sum, n) => sum + n * n, 0) / samples.length)
  })
}

for (const { name, title } of instruments) {
  test(`${name}: all three tutorial steps respond to playing`, async ({ page }) => {
    await page.goto('/')
    await page.getByRole('radio', { name: new RegExp(name) }).click()
    await page.getByRole('button', { name: 'Tập chơi từng bước' }).click()
    const canvas = page.getByTestId('art-canvas')
    const tutorial = page.getByTestId('tutorial')
    const tap = async (hold = 0) => {
      await canvas.scrollIntoViewIfNeeded()
      const box = (await canvas.boundingBox())!
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.6)
      await page.mouse.down()
      if (hold) await page.waitForTimeout(hold)
      await page.mouse.up()
    }
    const bend = async () => {
      await canvas.scrollIntoViewIfNeeded()
      const box = (await canvas.boundingBox())!
      await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * (1 - 2.5 / 11))
      await page.mouse.down()
      for (const degree of [5, 7]) {
        await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * (1 - (degree + 0.5) / 11))
        await page.waitForTimeout(100)
        await page.mouse.move(box.x + box.width * 0.5 + 5, box.y + box.height * (1 - (degree + 0.5) / 11))
      }
      await page.mouse.up()
    }
    await tap()
    await expect(tutorial.locator('li.done')).toHaveCount(1)
    await bend()
    await expect(tutorial.locator('li.done')).toHaveCount(2)
    for (let i = 0; i < 3; i++) await tap()
    await expect(tutorial.locator('li.done')).toHaveCount(3)
  })

  test(`${name}: audible onset, decaying tone, release and mute`, async ({ page }) => {
    await page.addInitScript(() => {
      const Base = window.AudioContext
      window.AudioContext = class extends Base {
        constructor(options?: AudioContextOptions) {
          super(options)
          const create = this.createDynamicsCompressor.bind(this)
          this.createDynamicsCompressor = () => {
            const node = create()
            const analyser = this.createAnalyser()
            node.connect(analyser)
            ;(window as unknown as { audioMeter: AnalyserNode }).audioMeter = analyser
            return node
          }
        }
      }
    })
    await page.goto('/')
    await page.getByRole('radio', { name: new RegExp(name) }).click()
    const canvas = page.getByTestId('art-canvas')
    await canvas.scrollIntoViewIfNeeded()
    const box = (await canvas.boundingBox())!
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.6)
    await page.mouse.down()
    await expect.poll(() => meter(page)).toBeGreaterThan(0.005)
    await page.waitForTimeout(2800)
    expect(await meter(page)).toBeLessThan(0.005)
    await page.mouse.up()
    await expect.poll(() => meter(page), { timeout: 6000 }).toBeLessThan(0.001)
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.6)
    await expect.poll(() => meter(page)).toBeGreaterThan(0.002)
    await expect.poll(() => meter(page), { timeout: 6000 }).toBeLessThan(0.001)
    await page.getByRole('button', { name: 'Tắt âm thanh' }).click()
    await drag(page, [0.3, 0.8], [0.6, 0.3])
    expect(await meter(page)).toBeLessThan(0.001)
  })

  test(`${name}: complete the AR lesson and replay its own demo`, async ({ page }) => {
    await page.goto('/')
    await page.getByRole('radio', { name: new RegExp(name) }).click()
    await page.getByRole('button', { name: `Tập đánh cả bài “${title}”` }).click()
    const canvas = page.getByTestId('stage-canvas')
    const count = page.getByTestId('lesson-count')
    const total = Number((await count.innerText()).split('/')[1])
    await canvas.scrollIntoViewIfNeeded()
    for (let i = 0; i < total; i++) {
      await canvas.scrollIntoViewIfNeeded()
      const box = (await canvas.boundingBox())!
      const degree = Number(await canvas.getAttribute('data-target'))
      await page.mouse.click(box.x + box.width * 0.65, box.y + box.height * (1 - (degree + 0.5) / 11))
      if (i < total - 1) await expect(count).toHaveText(`${i + 1} / ${total}`)
    }
    const done = page.getByRole('dialog', { name: 'Hoàn thành bài' })
    await expect(done).toContainText(`Bạn đã đánh xong bài “${title}”`)
    await done.getByRole('button', { name: 'Xem khu vườn vừa gieo' }).click()
    await page.getByRole('button', { name: `Nghe tác phẩm “${title}”` }).click()
    await page.getByRole('button', { name: 'Tốc độ 2×' }).click()
    await expect(page.getByTestId('replay-state')).toHaveText('Phát lại xong', { timeout: 30000 })
    await expect(page.getByLabel('Tên tác phẩm')).toHaveValue(title)
  })
}

test('new instruments survive save/reload, undo/redo and export after replay', async ({ page }) => {
  await page.goto('/')
  for (const { name } of instruments) {
    await page.getByRole('radio', { name: new RegExp(name) }).click()
    await drag(page, [0.25, 0.8], [0.7, 0.3], 30)
  }
  await expect(page.getByTestId('save-state')).toHaveText(/Đã lưu lúc/)
  await page.reload()
  const stats = page.getByTestId('garden-stats')
  await expect(stats).toHaveText(/· 2 nhạc cụ$/)
  await page.getByRole('button', { name: /Hoàn tác/ }).click()
  await expect(stats).toHaveAttribute('data-strokes', '1')
  await page.getByRole('button', { name: /Khôi phục/ }).click()
  await expect(stats).toHaveAttribute('data-strokes', '2')
  await page.getByRole('button', { name: /^▷ Phát lại$/ }).click()
  await page.getByRole('button', { name: 'Tốc độ 2×' }).click()
  await expect(page.getByTestId('replay-state')).toHaveText('Phát lại xong')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /Xuất PNG/ }).click()
  const png = await readFile(await (await download).path())
  expect(png.subarray(1, 4).toString()).toBe('PNG')
  expect(png.readUInt32BE(16)).toBe(1920)
  expect(png.readUInt32BE(20)).toBe(1080)
})
