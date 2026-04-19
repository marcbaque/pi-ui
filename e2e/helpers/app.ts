// e2e/helpers/app.ts
import { test as base, type Page } from '@playwright/test'
import { _electron as electron, type ElectronApplication } from 'playwright'
import path from 'path'

// Resolve the path to the built Electron main entry
const APP_PATH = path.resolve(process.cwd())

export interface AppFixtures {
  electronApp: ElectronApplication
  page: Page
}

/**
 * Playwright test fixture that launches the Electron app in E2E mode.
 * Use `test` from this file instead of `@playwright/test` in all E2E specs.
 * Each test gets a fresh Electron process (function-scoped fixtures).
 */
export const test = base.extend<AppFixtures>({
  electronApp: async ({}, use) => {
    const app = await electron.launch({
      args: [APP_PATH],
      env: { ...process.env, PI_E2E: 'true' },
    })
    await use(app)
    await app.close()
  },
  page: async ({ electronApp }, use) => {
    const window = await electronApp.firstWindow()
    // Wait for React to hydrate
    await window.waitForSelector('#root > *', { timeout: 10_000 })
    await use(window)
  },
})

export { expect } from '@playwright/test'

// ─── Mock control helpers ──────────────────────────────────────────────────

export async function emitToken(page: Page, sessionId: string, delta: string): Promise<void> {
  await page.evaluate(
    ({ sessionId, delta }) => (window as Window & { __mockPi?: { emitToken: (s: string, d: string) => void } }).__mockPi?.emitToken(sessionId, delta),
    { sessionId, delta },
  )
}

export async function emitToolStart(
  page: Page,
  sessionId: string,
  toolCallId: string,
  toolName: string,
  args: Record<string, unknown> = {},
): Promise<void> {
  await page.evaluate(
    ({ sessionId, toolCallId, toolName, args }) =>
      (window as any).__mockPi?.emitToolStart(sessionId, toolCallId, toolName, args),
    { sessionId, toolCallId, toolName, args },
  )
}

export async function emitToolEnd(
  page: Page,
  sessionId: string,
  toolCallId: string,
  toolName: string,
  result = '',
  isError = false,
  durationMs = 120,
): Promise<void> {
  await page.evaluate(
    ({ sessionId, toolCallId, toolName, result, isError, durationMs }) =>
      (window as any).__mockPi?.emitToolEnd(
        sessionId,
        toolCallId,
        toolName,
        result,
        isError,
        durationMs,
      ),
    { sessionId, toolCallId, toolName, result, isError, durationMs },
  )
}

export async function emitTurnEnd(page: Page, sessionId: string): Promise<void> {
  await page.evaluate(
    ({ sessionId }) => (window as any).__mockPi?.emitTurnEnd(sessionId),
    { sessionId },
  )
}

export async function emitIdle(page: Page, sessionId: string): Promise<void> {
  await page.evaluate(
    ({ sessionId }) => (window as any).__mockPi?.emitIdle(sessionId),
    { sessionId },
  )
}

export async function emitError(page: Page, sessionId: string, message: string): Promise<void> {
  await page.evaluate(
    ({ sessionId, message }) => (window as any).__mockPi?.emitError(sessionId, message),
    { sessionId, message },
  )
}

/** Get the sessionId of the most recently created session. */
export async function getLastSessionId(page: Page): Promise<string> {
  return page.evaluate(() => (window as any).__mockPi?.getLastSessionId() ?? 'test-session-1')
}

/** Start a session via the New Session Dialog. Returns the sessionId. */
export async function startSession(page: Page): Promise<string> {
  // If no tabs exist yet, the empty state has a "New session" button.
  // If tabs exist, use the tab bar + button.
  const emptyBtn = page.locator('[data-testid="chat-empty-state"] button')
  const tabBarBtn = page.locator('[data-testid="tab-bar-new-btn"]')
  const hasEmpty = await emptyBtn.isVisible().catch(() => false)
  if (hasEmpty) {
    await emptyBtn.click()
  } else {
    await tabBarBtn.click()
  }
  await page.click('[data-testid="start-session-btn"]')
  return getLastSessionId(page)
}
