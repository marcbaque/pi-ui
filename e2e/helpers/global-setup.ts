// e2e/helpers/global-setup.ts
import { execSync } from 'child_process'

export default async function globalSetup(): Promise<void> {
  console.log('[global-setup] Building app for E2E tests...')
  execSync('pnpm build', { stdio: 'inherit' })
  console.log('[global-setup] Build complete.')
}
