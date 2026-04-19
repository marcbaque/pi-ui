// e2e/phase1/new-session.spec.ts
import { test, expect } from './helpers/app'
import { sidebar, chat, newSessionDialog } from './helpers/selectors'
import { DEFAULT_MODELS } from './helpers/defaults'

test('clicking + opens New Session dialog', async ({ page }) => {
  await sidebar.newSessionBtn(page).click()
  await expect(newSessionDialog.root(page)).toBeVisible()
})

test('working directory field is pre-populated', async ({ page }) => {
  await sidebar.newSessionBtn(page).click()
  const cwd = newSessionDialog.cwdInput(page)
  await expect(cwd).toBeVisible()
  await expect(cwd).not.toHaveValue('')
})

test('model dropdown lists available models', async ({ page }) => {
  await sidebar.newSessionBtn(page).click()
  await newSessionDialog.modelSelect(page).click()
  for (const model of DEFAULT_MODELS) {
    await expect(page.getByText(model.displayName).first()).toBeVisible()
  }
})

test('thinking level control is visible', async ({ page }) => {
  await sidebar.newSessionBtn(page).click()
  await expect(newSessionDialog.thinkingControl(page)).toBeVisible()
})

test('Start button creates session and closes dialog', async ({ page }) => {
  await sidebar.newSessionBtn(page).click()
  await newSessionDialog.startBtn(page).click()
  await expect(newSessionDialog.root(page)).not.toBeVisible()
  await expect(chat.emptyState(page)).not.toBeVisible()
})

test('Cancel button closes dialog without creating session', async ({ page }) => {
  await sidebar.newSessionBtn(page).click()
  await newSessionDialog.cancelBtn(page).click()
  await expect(newSessionDialog.root(page)).not.toBeVisible()
  await expect(chat.emptyState(page)).toBeVisible()
})
