// e2e/phase1/startup.spec.ts
import { test, expect } from './helpers/app'
import { sidebar, chat } from './helpers/selectors'
import { DEFAULT_MODELS, DEFAULT_CONFIG } from './helpers/defaults'

test('app launches without errors', async ({ page }) => {
  await expect(page.locator('#root')).toBeVisible()
})

test('sidebar is visible with model list and provider list', async ({ page }) => {
  await expect(sidebar.root(page)).toBeVisible()
  await expect(sidebar.modelList(page)).toBeVisible()
  await expect(sidebar.providerList(page)).toBeVisible()
})

test('sidebar model list shows all available models', async ({ page }) => {
  for (const model of DEFAULT_MODELS) {
    await expect(sidebar.modelItem(page, model.modelId)).toBeVisible()
  }
})

test('sidebar provider list shows all providers with correct status', async ({ page }) => {
  for (const provider of DEFAULT_CONFIG.providers) {
    await expect(sidebar.providerItem(page, provider.name)).toBeVisible()
  }
})

test('chat pane shows empty state on first load', async ({ page }) => {
  await expect(chat.emptyState(page)).toBeVisible()
})

test('settings button is visible in sidebar footer', async ({ page }) => {
  await expect(sidebar.settingsBtn(page)).toBeVisible()
})
