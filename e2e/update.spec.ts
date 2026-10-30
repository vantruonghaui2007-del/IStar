import { execSync } from 'node:child_process'
import { expect, test } from '@playwright/test'
import { drag } from './helpers'

// Rebuilds dist/ in place while `vite preview` serves it, so it runs last.
test('a new version waits for the user and the open garden survives the update', async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto('/')
  await expect(page.getByTestId('offline-status')).toHaveText('Sẵn sàng dùng offline', { timeout: 60_000 })
  const version = await page.getByTestId('app-version').innerText()
  await drag(page, [0.2, 0.85], [0.45, 0.3])
  await drag(page, [0.6, 0.85], [0.7, 0.35])
  const stats = await page.getByTestId('garden-stats').innerText()

  try {
    execSync('npx vite build', { env: { ...process.env, VITE_APP_VERSION: 'e2e-next' }, stdio: 'ignore' })
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update())

    const banner = page.getByRole('alert')
    await expect(banner).toContainText('Đã có phiên bản mới', { timeout: 60_000 })
    // Nothing reloads by itself while someone may be drawing.
    await page.waitForTimeout(1500)
    await expect(page.getByTestId('app-version')).toHaveText(version)
    await expect(page.getByTestId('garden-stats')).toHaveText(stats)

    await banner.getByRole('button', { name: 'Cập nhật ngay' }).click()
    await expect(page.getByTestId('app-version')).toHaveText('Phiên bản e2e-next', { timeout: 30_000 })
    await expect(page.getByTestId('garden-stats')).toHaveText(stats)
  } finally {
    execSync('npx vite build', { stdio: 'ignore' })
  }
})
