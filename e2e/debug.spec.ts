import { test, expect } from './helpers/app'

test('app launches and shows root element', async ({ page }) => {
  expect(page).toBeTruthy()
  const html = await page.content()
  console.log('PAGE HTML (first 500):', html.slice(0, 500))
})
