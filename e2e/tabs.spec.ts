// e2e/tabs.spec.ts
import { test, expect, emitToken, emitIdle, startSession, getLastSessionId } from './helpers/app'
import { tabs, chat, newSessionDialog } from './helpers/selectors'

test('tab bar is visible with one tab after creating a session', async ({ page }) => {
  await startSession(page)
  await expect(tabs.bar(page)).toBeVisible()
  await expect(page.locator('[data-tab-item="true"]')).toHaveCount(1)
})

test('tab shows cwd basename and status dot', async ({ page }) => {
  const sessionId = await startSession(page)
  await expect(tabs.label(page, sessionId)).toBeVisible()
  await expect(tabs.statusDot(page, sessionId)).toBeVisible()
})

test('status dot is yellow while thinking and green while idle', async ({ page }) => {
  const sessionId = await startSession(page)

  // Trigger thinking state
  await emitToken(page, sessionId, 'hello')
  await expect(tabs.statusDot(page, sessionId)).toHaveClass(/bg-yellow-400/)

  // Trigger idle state
  await emitIdle(page, sessionId)
  await expect(tabs.statusDot(page, sessionId)).toHaveClass(/bg-emerald-400/)
})

test('clicking + in tab bar opens New Session dialog', async ({ page }) => {
  await startSession(page)
  await tabs.newBtn(page).click()
  await expect(newSessionDialog.root(page)).toBeVisible()
})

test('creating a second session opens a new tab and switches to it', async ({ page }) => {
  await startSession(page)
  const sessionId2 = await startSession(page)

  await expect(page.locator('[data-tab-item="true"]')).toHaveCount(2)

  // Active tab is the most recently created one
  const activeTab = tabs.tab(page, sessionId2)
  await expect(activeTab).toBeVisible()
})

test('clicking a tab switches the chat pane to that session', async ({ page }) => {
  const sessionId1 = await startSession(page)
  const sessionId2 = await startSession(page)

  // Send a message in session 2 (currently active)
  await page.fill('[data-testid="chat-input"]', 'session 2 message')
  await page.click('[data-testid="send-btn"]')

  // Switch to session 1
  await tabs.tab(page, sessionId1).click()

  // Session 1 should have no messages
  await expect(page.locator('[data-testid="user-message"]')).toHaveCount(0)

  // Switch back to session 2
  await tabs.tab(page, sessionId2).click()
  await expect(page.locator('[data-testid="user-message"]')).toContainText('session 2 message')
})

test('each tab maintains its own independent message history', async ({ page }) => {
  const sessionId1 = await startSession(page)
  await page.fill('[data-testid="chat-input"]', 'message in tab 1')
  await page.click('[data-testid="send-btn"]')

  const sessionId2 = await startSession(page)
  await page.fill('[data-testid="chat-input"]', 'message in tab 2')
  await page.click('[data-testid="send-btn"]')

  // Verify tab 1 doesn't contain tab 2's message
  await tabs.tab(page, sessionId1).click()
  const messages = await page.locator('[data-testid="user-message"]').allTextContents()
  expect(messages.join('\n')).not.toContain('message in tab 2')
  expect(messages.join('\n')).toContain('message in tab 1')
})

test('closing a tab that is mid-turn shows a confirmation prompt', async ({ page }) => {
  const sessionId = await startSession(page)

  // Trigger thinking state
  await emitToken(page, sessionId, 'working...')

  await tabs.closeBtn(page, sessionId).click()

  await expect(tabs.confirmDialog(page)).toBeVisible()
  await expect(tabs.confirmDialog(page)).toContainText('pi is still working')
})

test('closing last tab returns app to empty state', async ({ page }) => {
  const sessionId = await startSession(page)

  await tabs.closeBtn(page, sessionId).click()

  await expect(tabs.bar(page)).not.toBeVisible()
  await expect(chat.emptyState(page)).toBeVisible()
})

test('clicking a past session in sidebar opens it in a new tab', async ({ page }) => {
  // Expand the mock cwd group first (collapsed by default)
  await page.locator('[data-testid="cwd-group-header---mock-project--"]').click()
  await page.locator('[data-testid="session-entry-past-session-1"]').click()

  // A new tab should appear
  await expect(page.locator('[data-tab-item="true"]')).toHaveCount(1)
  // The resume bar should be visible (readonly mode)
  await expect(page.locator('[data-testid="resume-bar"]')).toBeVisible()
})

test('clicking same past session again focuses existing tab without creating a duplicate', async ({
  page,
}) => {
  // Expand the mock cwd group first
  await page.locator('[data-testid="cwd-group-header---mock-project--"]').click()
  await page.locator('[data-testid="session-entry-past-session-1"]').click()
  await expect(page.locator('[data-tab-item="true"]')).toHaveCount(1)

  // Click a different past session
  await page.locator('[data-testid="session-entry-past-session-2"]').click()
  await expect(page.locator('[data-tab-item="true"]')).toHaveCount(2)

  // Click past-session-1 again — should focus existing tab, not create a third
  await page.locator('[data-testid="session-entry-past-session-1"]').click()
  await expect(page.locator('[data-tab-item="true"]')).toHaveCount(2)
})
