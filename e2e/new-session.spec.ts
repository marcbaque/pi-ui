// e2e/new-session.spec.ts
import { test, expect } from './helpers/app'
import { chat, newSessionDialog, tabs } from './helpers/selectors'
import { DEFAULT_MODELS } from './helpers/defaults'

// Helper: open New Session dialog from empty state
async function openNewSessionDialog(page: Parameters<typeof chat.emptyState>[0]) {
  // First session: click empty state button; subsequent sessions: tab bar + button
  const emptyBtn = chat.emptyState(page).locator('button')
  const tabBarBtn = tabs.newBtn(page)
  if (await emptyBtn.isVisible()) {
    await emptyBtn.click()
  } else {
    await tabBarBtn.click()
  }
}

test('clicking + opens New Session dialog', async ({ page }) => {
  await openNewSessionDialog(page)
  await expect(newSessionDialog.root(page)).toBeVisible()
})

test('working directory field is pre-populated', async ({ page }) => {
  await openNewSessionDialog(page)
  const cwd = newSessionDialog.cwdInput(page)
  await expect(cwd).toBeVisible()
  await expect(cwd).not.toHaveValue('')
})

test('model dropdown lists available models', async ({ page }) => {
  await openNewSessionDialog(page)
  await newSessionDialog.modelSelect(page).click()
  for (const model of DEFAULT_MODELS) {
    await expect(page.getByText(model.displayName).first()).toBeVisible()
  }
})

test('thinking level control is visible', async ({ page }) => {
  await openNewSessionDialog(page)
  await expect(newSessionDialog.thinkingControl(page)).toBeVisible()
})

test('Start button creates session and closes dialog', async ({ page }) => {
  await openNewSessionDialog(page)
  await newSessionDialog.startBtn(page).click()
  await expect(newSessionDialog.root(page)).not.toBeVisible()
  await expect(chat.emptyState(page)).not.toBeVisible()
})

test('Cancel button closes dialog without creating session', async ({ page }) => {
  await openNewSessionDialog(page)
  await newSessionDialog.cancelBtn(page).click()
  await expect(newSessionDialog.root(page)).not.toBeVisible()
  await expect(chat.emptyState(page)).toBeVisible()
})
