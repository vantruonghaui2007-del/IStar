// Renders public/icons/icon.svg into the PNG sizes the web manifest needs.
// Usage: node scripts/render-icons.mjs   (uses the Playwright Chromium)
import { readFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const svg = await readFile(new URL('../public/icons/icon.svg', import.meta.url), 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage()
const outputs = [
  { file: 'icon-192.png', size: 192, padding: 0 },
  { file: 'icon-512.png', size: 512, padding: 0 },
  { file: 'apple-touch-icon.png', size: 180, padding: 0 },
  // Maskable icons keep their content inside the central 80% safe zone.
  { file: 'icon-maskable-512.png', size: 512, padding: 0.1, background: '#3f694c' },
]
for (const { file, size, padding, background = 'transparent' } of outputs) {
  await page.setViewportSize({ width: size, height: size })
  const inset = Math.round(size * padding)
  await page.setContent(`<body style="margin:0;background:${background}"><div style="padding:${inset}px;width:${size}px;height:${size}px;box-sizing:border-box">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body>`)
  await page.screenshot({ path: new URL(`../public/icons/${file}`, import.meta.url).pathname, omitBackground: background === 'transparent' })
}
await browser.close()
