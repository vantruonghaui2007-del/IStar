// Exports the three sample gardens as PNG through the app's own "Xuất PNG"
// button. Needs a production build: npm run build && node scripts/render-samples.mjs
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const PORT = 4190
const names = ['Mầm đầu tiên', 'Vườn xuân rộn rã', 'Đêm đom đóm']
const slug = name => name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').replace(/[^a-z0-9]+/gi, '-').toLowerCase()

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
const outDir = new URL('../docs/samples/', import.meta.url)
await mkdir(outDir, { recursive: true })
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
  for (let attempt = 0; ; attempt++) {
    try {
      await page.goto(`http://localhost:${PORT}/`)
      break
    } catch (error) {
      if (attempt > 40) throw error
      await new Promise(resolve => setTimeout(resolve, 250))
    }
  }
  for (const name of names) {
    await page.getByRole('button', { name: `✿ ${name}` }).click()
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: /Xuất PNG/ }).click()
    const file = new URL(`${slug(name)}.png`, outDir).pathname
    await (await download).saveAs(file)
    console.log(`✓ ${file}`)
  }
} finally {
  await browser.close()
  server.kill()
}
