// e2e/phase1/settings.spec.ts
import { test, expect } from './helpers/app'
import { sidebar, settingsModal } from './helpers/selectors'

test('settings modal opens via sidebar footer button', async ({ page }) => {
  await sidebar.settingsBtn(page).click()
  await expect(settingsModal.root(page)).toBeVisible()
})

test('settings modal opens via Cmd+,', async ({ page }) => {
  await page.keyboard.press('Meta+,')
  await expect(settingsModal.root(page)).toBeVisible()
})

test('API key inputs are masked (password type)', async ({ page }) => {
  await sidebar.settingsBtn(page).click()
  const anthropicInput = settingsModal.apiKeyInput(page, 'anthropic')
  await expect(anthropicInput).toHaveAttribute('type', 'password')
})

test('saving an API key triggers model list refresh', async ({ page }) => {
  await sidebar.settingsBtn(page).click()
  const input = settingsModal.apiKeyInput(page, 'openai')
  await input.fill('sk-test-key')
  await settingsModal.saveApiKeyBtn(page, 'openai').click()
  await expect(sidebar.modelList(page)).toBeVisible()
})

test('defaults section shows model select, thinking level, and system prompt', async ({ page }) => {
  await sidebar.settingsBtn(page).click()
  await expect(settingsModal.defaultModelSelect(page)).toBeVisible()
  await expect(settingsModal.systemPromptInput(page)).toBeVisible()
})
