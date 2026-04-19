// e2e/phase1/chat.spec.ts
import {
  test,
  expect,
  emitToken,
  emitToolStart,
  emitToolEnd,
  emitTurnEnd,
  emitIdle,
  getLastSessionId,
  startSession,
} from './helpers/app'
import { chat } from './helpers/selectors'

test.beforeEach(async ({ page }) => {
  await startSession(page)
})

test('chat pane shows active state after session creation', async ({ page }) => {
  await expect(chat.emptyState(page)).not.toBeVisible()
  await expect(chat.input(page)).toBeVisible()
})

test('sent message appears in message list', async ({ page }) => {
  await chat.input(page).fill('Hello pi')
  await chat.sendBtn(page).click()
  await expect(chat.userMessage(page)).toContainText('Hello pi')
})

test('token streaming updates assistant message content', async ({ page }) => {
  await chat.input(page).fill('Tell me something')
  await chat.sendBtn(page).click()

  const sessionId = await getLastSessionId(page)
  await emitToken(page, sessionId, 'Hello ')
  await emitToken(page, sessionId, 'world')

  await expect(chat.assistantMessage(page)).toContainText('Hello world')
})

test('tool call entry appears on tool-start and updates on tool-end', async ({ page }) => {
  await chat.input(page).fill('Do something')
  await chat.sendBtn(page).click()

  const sessionId = await getLastSessionId(page)
  await emitToolStart(page, sessionId, 'tc-1', 'read', { path: 'src/main.ts' })
  await expect(chat.toolCallEntry(page)).toBeVisible()

  await emitToolEnd(page, sessionId, 'tc-1', 'read', 'file contents', false, 45)
  await expect(chat.toolCallEntry(page)).toContainText('read')
  await expect(chat.toolCallEntry(page)).toContainText('45')
})

test('tool call is collapsed by default', async ({ page }) => {
  await chat.input(page).fill('Do something')
  await chat.sendBtn(page).click()

  const sessionId = await getLastSessionId(page)
  await emitToolStart(page, sessionId, 'tc-2', 'bash', { command: 'ls' })
  await emitToolEnd(page, sessionId, 'tc-2', 'bash', 'output', false, 200)

  const entry = chat.toolCallEntry(page)
  await expect(entry).toBeVisible()
  await expect(entry.locator('[data-testid="tool-call-toggle"]')).toBeVisible()
})

test('status updates to thinking during turn and idle after', async ({ page }) => {
  await chat.input(page).fill('Go')
  await chat.sendBtn(page).click()

  await expect(chat.statusText(page)).toContainText('thinking')

  const sessionId = await getLastSessionId(page)
  await emitTurnEnd(page, sessionId)
  await emitIdle(page, sessionId)

  await expect(chat.statusText(page)).toContainText('idle')
})

// ── File attachments ──────────────────────────────────────────────────────────
import { fileChips } from './helpers/selectors'

test('paperclip button is visible in input area', async ({ page }) => {
  await expect(fileChips.attachBtn(page)).toBeVisible()
})

test('clicking paperclip button attaches a file chip', async ({ page }) => {
  await fileChips.attachBtn(page).click()
  // Mock pickFile returns example.ts
  await expect(fileChips.chip(page, 'example.ts')).toBeVisible()
})

test('attached file chip can be removed with ×', async ({ page }) => {
  await fileChips.attachBtn(page).click()
  await expect(fileChips.chip(page, 'example.ts')).toBeVisible()
  await page.locator('[data-testid="file-chip-example.ts"] button').click()
  await expect(fileChips.chip(page, 'example.ts')).not.toBeVisible()
})

test('sending a message with attachment includes file content', async ({ page }) => {
  await fileChips.attachBtn(page).click()
  await chat.input(page).fill('use this file')
  await chat.sendBtn(page).click()
  const userMsg = page.locator('[data-testid="user-message"]').first()
  await expect(userMsg).toContainText('Attached file')
  await expect(userMsg).toContainText('use this file')
})

test('file chips are cleared after sending', async ({ page }) => {
  await fileChips.attachBtn(page).click()
  await chat.input(page).fill('test')
  await chat.sendBtn(page).click()
  await expect(fileChips.container(page)).not.toBeVisible()
})
