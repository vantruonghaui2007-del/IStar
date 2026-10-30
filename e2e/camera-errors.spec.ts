import { expect, test } from '@playwright/test'

// No fake-UI flag and no granted permission: Chromium rejects getUserMedia.
test('a denied camera explains what to do and offers a retry, mouse still works', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Bắt đầu' }).click()
  await expect(page.getByRole('status')).toContainText(/camera/i)
  await expect(page.getByRole('button', { name: 'Thử lại' })).toBeVisible()
  await expect(page.getByTestId('hand-state')).toHaveText('Chế độ chuột')
})
