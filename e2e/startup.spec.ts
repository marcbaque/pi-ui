// e2e/startup.spec.ts
import { test, expect } from './helpers/app'
import { sidebar, chat } from './helpers/selectors'

test('app launches without errors', async ({ page }) => {
  await expect(page.locator('#root')).toBeVisible()
})

test('sidebar is visible', async ({ page }) => {
  await expect(sidebar.root(page)).toBeVisible()
})

test('chat pane shows empty state on first load', async ({ page }) => {
  await expect(chat.emptyState(page)).toBeVisible()
})

test('settings button is visible in sidebar footer', async ({ page }) => {
  await expect(sidebar.settingsBtn(page)).toBeVisible()
})
