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
} from '../helpers/app'
import { sidebar, chat, newSessionDialog } from '../helpers/selectors'

test.beforeEach(async ({ page }) => {
  await sidebar.newSessionBtn(page).click()
  await newSessionDialog.startBtn(page).click()
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
