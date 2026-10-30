import { expect, test } from '@playwright/test'
import { drag } from './helpers'

test('the mouse draws through the same stroke pipeline without a camera', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('hand-state')).toHaveText('Chế độ chuột')
  await drag(page, [0.2, 0.8], [0.4, 0.3])
  await expect(page.getByTestId('point-count')).not.toHaveText(/^0 \//)
  await expect(page.getByRole('button', { name: /Hoàn tác/ })).toBeEnabled()
})
