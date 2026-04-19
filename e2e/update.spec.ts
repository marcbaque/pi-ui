// e2e/update.spec.ts — Auto-update feature
import {
  test,
  expect,
  emitUpdateChecking,
  emitUpdateAvailable,
  emitUpdateNotAvailable,
  emitUpdateProgress,
  emitUpdateReady,
  emitUpdateError,
} from './helpers/app'
import { updateBanner, settingsModal } from './helpers/selectors'

test('update banner is hidden on startup', async ({ page }) => {
  await expect(updateBanner.root(page)).not.toBeVisible()
})

test('update banner is hidden while checking', async ({ page }) => {
  await emitUpdateChecking(page)
  // checking state is transient — banner should stay hidden (only visible when available/ready/error)
  await expect(updateBanner.root(page)).not.toBeVisible()
})

test('update banner appears when update is available (downloading)', async ({ page }) => {
  await emitUpdateChecking(page)
  await emitUpdateAvailable(page, '1.2.0')
  await expect(updateBanner.root(page)).toBeVisible()
  await expect(updateBanner.root(page)).toContainText('1.2.0')
})

test('update banner shows download progress', async ({ page }) => {
  await emitUpdateAvailable(page, '1.2.0')
  await emitUpdateProgress(page, 42)
  await expect(updateBanner.root(page)).toBeVisible()
  await expect(updateBanner.root(page)).toContainText('42%')
})

test('update banner shows restart button when update is ready', async ({ page }) => {
  await emitUpdateReady(page, '1.2.0')
  await expect(updateBanner.root(page)).toBeVisible()
  await expect(updateBanner.root(page)).toContainText('restart to install')
  await expect(updateBanner.installBtn(page)).toBeVisible()
})

test('update banner can be dismissed with ×', async ({ page }) => {
  await emitUpdateReady(page, '1.2.0')
  await expect(updateBanner.root(page)).toBeVisible()
  await page.locator('[data-testid="update-banner"] button[aria-label="Dismiss"]').click()
  await expect(updateBanner.root(page)).not.toBeVisible()
})

test('update banner shows error state', async ({ page }) => {
  await emitUpdateError(page, 'net::ERR_CONNECTION_REFUSED')
  await expect(updateBanner.root(page)).toBeVisible()
  await expect(updateBanner.root(page)).toContainText('failed')
})

test('update banner is hidden when update is not available', async ({ page }) => {
  await emitUpdateNotAvailable(page, '0.1.0')
  await expect(updateBanner.root(page)).not.toBeVisible()
})

test('settings modal has Check for updates button', async ({ page }) => {
  await page.locator('[data-testid="settings-btn"]').click()
  await expect(settingsModal.root(page)).toBeVisible()
  await expect(page.locator('[data-testid="check-updates-btn"]')).toBeVisible()
})

test('settings modal shows Restart & update button when ready', async ({ page }) => {
  await emitUpdateReady(page, '1.2.0')
  await page.locator('[data-testid="settings-btn"]').click()
  await expect(page.locator('[data-testid="update-install-settings-btn"]')).toBeVisible()
})
