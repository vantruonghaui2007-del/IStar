import { expect, test } from '@playwright/test'
import { fakeCamera } from './camera'

test.use({ launchOptions: fakeCamera('no-hand.mjpeg'), permissions: ['camera'] })

test('with the camera on but no hand in view the studio asks for a hand', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Bắt đầu' }).click()
  await expect(page.getByTestId('tracking-status')).toHaveText('AI đang nhận diện', { timeout: 30_000 })
  await expect(page.getByTestId('hand-state')).toHaveText('Đưa tay vào khung')
  await expect(page.getByTestId('art-canvas')).not.toHaveAttribute('data-cursor', /.+/)
})
