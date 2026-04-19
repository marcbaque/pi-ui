// e2e/session-history.spec.ts
import { test, expect } from './helpers/app'
import { chat, sessionHistory } from './helpers/selectors'

const MOCK_SLUG = '--mock-project--'
const MOCK_SESSION_1 = 'past-session-1'
const MOCK_SESSION_2 = 'past-session-2'

test('sidebar shows session history list', async ({ page }) => {
  await expect(sessionHistory.list(page)).toBeVisible()
})

test('sidebar shows cwd group for mock project', async ({ page }) => {
  await expect(sessionHistory.cwdGroup(page, MOCK_SLUG)).toBeVisible()
})

test('cwd group is collapsed by default', async ({ page }) => {
  await expect(sessionHistory.sessionEntry(page, MOCK_SESSION_1)).not.toBeVisible()
})

test('clicking cwd group header expands it', async ({ page }) => {
  await sessionHistory.cwdGroup(page, MOCK_SLUG).click()
  await expect(sessionHistory.sessionEntry(page, MOCK_SESSION_1)).toBeVisible()
})

test('clicking again collapses the cwd group', async ({ page }) => {
  await sessionHistory.cwdGroup(page, MOCK_SLUG).click()
  await expect(sessionHistory.sessionEntry(page, MOCK_SESSION_1)).toBeVisible()
  await sessionHistory.cwdGroup(page, MOCK_SLUG).click()
  await expect(sessionHistory.sessionEntry(page, MOCK_SESSION_1)).not.toBeVisible()
})

test('pinned session shows its custom name', async ({ page }) => {
  await sessionHistory.cwdGroup(page, MOCK_SLUG).click()
  const entry = sessionHistory.sessionEntry(page, MOCK_SESSION_2)
  await expect(entry).toBeVisible()
  await expect(entry).toContainText('My important session')
})

test('search input filters session list', async ({ page }) => {
  await sessionHistory.cwdGroup(page, MOCK_SLUG).click()
  await sessionHistory.search(page).fill('important')
  await expect(sessionHistory.sessionEntry(page, MOCK_SESSION_2)).toBeVisible()
  await expect(sessionHistory.sessionEntry(page, MOCK_SESSION_1)).not.toBeVisible()
})

test('Escape clears search', async ({ page }) => {
  await sessionHistory.search(page).fill('important')
  await sessionHistory.search(page).press('Escape')
  await expect(sessionHistory.search(page)).toHaveValue('')
})

test('clicking a session opens read-only view', async ({ page }) => {
  await sessionHistory.cwdGroup(page, MOCK_SLUG).click()
  await sessionHistory.sessionEntry(page, MOCK_SESSION_1).click()
  await expect(sessionHistory.resumeBar(page)).toBeVisible()
  await expect(chat.emptyState(page)).not.toBeVisible()
})

test('read-only view shows past messages', async ({ page }) => {
  await sessionHistory.cwdGroup(page, MOCK_SLUG).click()
  await sessionHistory.sessionEntry(page, MOCK_SESSION_1).click()
  await expect(chat.messageList(page)).toBeVisible()
  await expect(chat.userMessage(page)).toContainText('This is a past message')
})

test('Resume button creates a new active session', async ({ page }) => {
  await sessionHistory.cwdGroup(page, MOCK_SLUG).click()
  await sessionHistory.sessionEntry(page, MOCK_SESSION_1).click()
  await expect(sessionHistory.resumeBtn(page)).toBeVisible()
  await sessionHistory.resumeBtn(page).click()
  await expect(sessionHistory.resumeBar(page)).not.toBeVisible()
  await expect(chat.input(page)).toBeVisible()
})

test('right-click shows context menu', async ({ page }) => {
  await sessionHistory.cwdGroup(page, MOCK_SLUG).click()
  await sessionHistory.sessionEntry(page, MOCK_SESSION_1).click({ button: 'right' })
  await expect(sessionHistory.contextMenu(page)).toBeVisible()
})

test('context menu has Rename, Pin, and Delete options', async ({ page }) => {
  await sessionHistory.cwdGroup(page, MOCK_SLUG).click()
  await sessionHistory.sessionEntry(page, MOCK_SESSION_1).click({ button: 'right' })
  await expect(sessionHistory.contextMenuRename(page)).toBeVisible()
  await expect(sessionHistory.contextMenuPin(page)).toBeVisible()
  await expect(sessionHistory.contextMenuDelete(page)).toBeVisible()
})

test('clicking Rename shows inline input', async ({ page }) => {
  await sessionHistory.cwdGroup(page, MOCK_SLUG).click()
  await sessionHistory.sessionEntry(page, MOCK_SESSION_1).click({ button: 'right' })
  await sessionHistory.contextMenuRename(page).click()
  await expect(sessionHistory.renameInput(page)).toBeVisible()
})
