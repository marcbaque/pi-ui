// e2e/phase1/abort.spec.ts
import { test, expect, emitIdle, getLastSessionId } from './helpers/app'
import { sidebar, chat, newSessionDialog } from './helpers/selectors'

test.beforeEach(async ({ page }) => {
  await sidebar.newSessionBtn(page).click()
  await newSessionDialog.startBtn(page).click()
})

test('stop button is visible while pi is thinking', async ({ page }) => {
  await chat.input(page).fill('Do something long')
  await chat.sendBtn(page).click()
  await expect(chat.stopBtn(page)).toBeVisible()
})

test('input is disabled while pi is thinking', async ({ page }) => {
  await chat.input(page).fill('Do something long')
  await chat.sendBtn(page).click()
  await expect(chat.input(page)).toBeDisabled()
})

test('clicking stop calls abort and returns to idle', async ({ page }) => {
  await chat.input(page).fill('Do something long')
  await chat.sendBtn(page).click()

  // The mock abort handler emits pi:idle automatically
  await chat.stopBtn(page).click()

  await expect(chat.statusText(page)).toContainText('idle')
  await expect(chat.input(page)).toBeEnabled()
  await expect(chat.stopBtn(page)).not.toBeVisible()
})

test('input is re-enabled after pi becomes idle', async ({ page }) => {
  await chat.input(page).fill('Short task')
  await chat.sendBtn(page).click()

  const sessionId = await getLastSessionId(page)
  await emitIdle(page, sessionId)

  await expect(chat.input(page)).toBeEnabled()
})
