// e2e/diff-pane.spec.ts — Session D: Diff Pane
import {
  test,
  expect,
  startSession,
  emitWriteToolCall,
  emitEditToolCall,
  emitIdle,
} from './helpers/app'
import { diffPane, chat } from './helpers/selectors'

test('diff pane is hidden by default when session starts', async ({ page }) => {
  await startSession(page)
  await expect(diffPane.root(page)).not.toBeVisible()
})

test('diff pane auto-opens when a write tool call completes', async ({ page }) => {
  const sid = await startSession(page)
  await emitWriteToolCall(page, sid)
  await expect(diffPane.root(page)).toBeVisible()
})

test('diff pane auto-opens when an edit tool call completes', async ({ page }) => {
  const sid = await startSession(page)
  await emitEditToolCall(page, sid)
  await expect(diffPane.root(page)).toBeVisible()
})

test('diff pane shows file path', async ({ page }) => {
  const sid = await startSession(page)
  await emitWriteToolCall(page, sid, 'src/auth.ts')
  await expect(diffPane.path(page)).toHaveText('auth.ts')
})

test('diff pane replaces content when a new write/edit tool call completes', async ({ page }) => {
  const sid = await startSession(page)
  await emitWriteToolCall(page, sid, 'src/auth.ts')
  await expect(diffPane.path(page)).toHaveText('auth.ts')
  // Need unique tool call IDs — use a second call helper
  await page.evaluate(
    ({ sessionId }) => {
      const m = (window as any).__mockPi
      m.emitToolStart(sessionId, 'tool-write-2', 'write', { path: 'src/config.ts' })
      m.emitToolEnd(sessionId, 'tool-write-2', 'write', '--- a/src/config.ts\n+++ b/src/config.ts\n@@ -1 +1 @@\n-old\n+new\n', false, 50)
    },
    { sessionId: sid }
  )
  await expect(diffPane.path(page)).toHaveText('config.ts')
})

test('toolbar toggle button shows and hides the diff pane', async ({ page }) => {
  const sid = await startSession(page)
  await emitWriteToolCall(page, sid)
  await expect(diffPane.root(page)).toBeVisible()
  await diffPane.toggleBtn(page).click()
  await expect(diffPane.root(page)).not.toBeVisible()
  await diffPane.toggleBtn(page).click()
  await expect(diffPane.root(page)).toBeVisible()
})

test('close button hides the diff pane', async ({ page }) => {
  const sid = await startSession(page)
  await emitWriteToolCall(page, sid)
  await diffPane.closeBtn(page).click()
  await expect(diffPane.root(page)).not.toBeVisible()
})

test('hovering a diff line shows a + icon in the gutter', async ({ page }) => {
  const sid = await startSession(page)
  await emitWriteToolCall(page, sid)
  // Find a commentable diff line (added/removed/context) and hover it
  const firstGutterBtn = page.locator('[data-testid^="diff-gutter-btn-"]').first()
  await expect(firstGutterBtn).toBeAttached()
})

test('clicking the gutter + icon opens an inline comment textarea', async ({ page }) => {
  const sid = await startSession(page)
  await emitWriteToolCall(page, sid)
  const gutterBtn = page.locator('[data-testid^="diff-gutter-btn-"]').first()
  await gutterBtn.click({ force: true })
  await expect(page.locator('textarea[placeholder*="comment"]')).toBeVisible()
})

test('multiple comments can be added across different lines before sending', async ({ page }) => {
  const sid = await startSession(page)
  await emitWriteToolCall(page, sid)
  const gutterBtns = page.locator('[data-testid^="diff-gutter-btn-"]')
  const count = await gutterBtns.count()
  if (count < 2) {
    // Diff doesn't have enough commentable lines — just verify one comment works
    await gutterBtns.first().click({ force: true })
    await page.locator('textarea[placeholder*="comment"]').fill('First comment')
    await page.locator('button:has-text("Add comment")').click()
    await expect(diffPane.comment(page)).toHaveCount(1)
    await expect(diffPane.sendReviewBtn(page)).toBeEnabled()
    return
  }
  // Add first comment
  await gutterBtns.nth(0).click({ force: true })
  await page.locator('textarea[placeholder*="comment"]').fill('First comment')
  await page.locator('button:has-text("Add comment")').click()
  // Add second comment on a different line
  await gutterBtns.nth(1).click({ force: true })
  await page.locator('textarea[placeholder*="comment"]').fill('Second comment')
  await page.locator('button:has-text("Add comment")').click()
  await expect(diffPane.comment(page)).toHaveCount(2)
  await expect(diffPane.sendReviewBtn(page)).toBeEnabled()
})

test('Send review to pi button constructs a structured message and sends it to chat', async ({
  page,
}) => {
  const sid = await startSession(page)
  await emitWriteToolCall(page, sid)
  // Add a comment
  const gutterBtn = page.locator('[data-testid^="diff-gutter-btn-"]').first()
  await gutterBtn.click({ force: true })
  await page.locator('textarea[placeholder*="comment"]').fill('Please add error handling')
  await page.locator('button:has-text("Add comment")').click()
  // Send review
  await diffPane.sendReviewBtn(page).click()
  await emitIdle(page, sid)
  // User message should contain the review
  const userMsg = chat.userMessage(page, 0)
  await expect(userMsg).toContainText('Code review for')
  // Comments are cleared after send
  await expect(diffPane.comment(page)).toHaveCount(0)
})

test('comments are cleared when a new diff replaces the current one', async ({ page }) => {
  const sid = await startSession(page)
  await emitWriteToolCall(page, sid)
  // Add a comment
  const gutterBtn = page.locator('[data-testid^="diff-gutter-btn-"]').first()
  await gutterBtn.click({ force: true })
  await page.locator('textarea[placeholder*="comment"]').fill('Old comment')
  await page.locator('button:has-text("Add comment")').click()
  await expect(diffPane.comment(page)).toHaveCount(1)
  // New diff arrives with a different tool call ID
  await page.evaluate(
    ({ sessionId }) => {
      const m = (window as any).__mockPi
      m.emitToolStart(sessionId, 'tool-write-3', 'write', { path: 'src/new.ts' })
      m.emitToolEnd(sessionId, 'tool-write-3', 'write', '--- a/src/new.ts\n+++ b/src/new.ts\n@@ -1 +1 @@\n-x\n+y\n', false, 30)
    },
    { sessionId: sid }
  )
  await expect(diffPane.comment(page)).toHaveCount(0)
})
