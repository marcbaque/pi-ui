# pi-ui Session A — Release Pipeline + E2E Test Infrastructure

**Date:** 2026-04-19
**Status:** Approved
**Scope:** Release pipeline (.dmg packaging, GitHub Actions) + Playwright E2E test suite for Phase 1, stubs for Phase 2–D

---

## 1. Overview

Session A ships two things together:

1. **Release pipeline** — automated GitHub Actions workflow that builds a universal `.dmg` on every tagged release, so users can download and run pi-ui without terminal setup.
2. **E2E test suite** — Playwright tests covering all Phase 1 features using a mocked `window.pi` bridge; skipped stubs for Sessions B–D ready to be fleshed out in future sessions.

This ships before Phase 2 work begins. Every subsequent session produces a distributable artifact and has E2E coverage from day one.

---

## 2. Release Pipeline

### 2.1 electron-builder

Configuration added to `package.json` under `"build"` key (or extracted to `electron-builder.yml`):

```json
{
  "build": {
    "appId": "io.marcbaque.pi-ui",
    "productName": "pi-ui",
    "mac": {
      "target": [
        { "target": "dmg", "arch": ["universal"] },
        { "target": "zip", "arch": ["universal"] }
      ],
      "icon": "build/icon.icns"
    },
    "directories": {
      "output": "dist"
    },
    "files": [
      "out/**/*"
    ]
  }
}
```

- **Universal binary** — single artifact runs on Apple Silicon and Intel
- **zip target** — required by `electron-updater` when auto-update is added later
- **Icon** — `build/icon.icns` created from a 1024×1024 source PNG via `iconutil`; placeholder icon ships in Session A
- **Output dir** — `dist/` to avoid collision with Vite's `out/` (electron-vite build output)

**Scripts added to `package.json`:**

```json
"dist": "electron-vite build && electron-builder --universal",
"dist:dir": "electron-vite build && electron-builder --dir"
```

`dist:dir` produces an unpacked app for quick local testing without DMG creation overhead.

### 2.2 Code Signing

Deferred. No signing in v1. Technical early adopters bypass Gatekeeper with right-click → Open, or:

```bash
xattr -cr "pi-ui.dmg"
```

When wider distribution is needed: `APPLE_CERTIFICATE`, `APPLE_ID`, `APPLE_TEAM_ID`, `APPLE_APP_PASSWORD` stored as GitHub secrets; `electron-builder` handles signing and notarization via its `afterSign` hook.

### 2.3 GitHub Actions — CI (`ci.yml`)

Triggers on push and PRs to `main`. Runs fast checks only.

```
on: [push, pull_request] (main branch)

jobs:
  ci:
    runs-on: macos-latest
    steps:
      - checkout
      - setup Node 22 + pnpm
      - pnpm install
      - pnpm typecheck
      - pnpm test (unit tests, Vitest)
      - pnpm e2e (Playwright E2E, headless)
```

### 2.4 GitHub Actions — Release (`release.yml`)

Triggers on `v*` tags (e.g. `v0.1.0`).

```
on:
  push:
    tags: ['v*']

jobs:
  release:
    runs-on: macos-latest
    steps:
      - checkout
      - setup Node 22 + pnpm
      - pnpm install
      - pnpm dist
      - upload dist/*.dmg and dist/*.zip as GitHub Release assets
      - release notes from tag annotation
```

Pre-release tags (`v0.1.0-beta.1`) create draft/pre-release entries automatically via `softprops/action-gh-release`.

### 2.5 Versioning

Version sourced from `package.json`. Tag `v0.1.0` → GitHub Release titled `pi-ui v0.1.0` with `.dmg` and `.zip` attached.

---

## 3. E2E Test Infrastructure

### 3.1 Framework

- **`@playwright/test`** with Electron launch support via `playwright`'s `_electron` API
- Tests live in `e2e/` at project root, separate from Vitest unit tests in `src/`
- Config: `playwright.config.ts` at project root

### 3.2 Mock Bridge

The mock bridge replaces the real `window.pi` contextBridge in test mode.

**Injection mechanism:**
- `VITE_E2E=true` environment variable set at Electron launch time in tests
- In `src/preload/index.ts`: `if (process.env.VITE_E2E) { exposeInMainWorld('pi', mockBridge) }` else real bridge
- Electron launched in tests: `electron.launch({ env: { ...process.env, VITE_E2E: 'true' } })`

**Mock bridge file: `e2e/mocks/pi-bridge.ts`**

Implements the same `PiAPI` interface as the real preload. Default state:
- 2 providers: Anthropic (configured), OpenAI (not configured)
- 3 models: `claude-sonnet-4-5`, `claude-opus-4-5`, `gpt-4o`
- Default thinking level: `off`
- Default cwd: `/tmp/test-project`

Per-test control via a `MockPiBridge` helper:

```typescript
// Set up specific state
mockBridge.setModels([...])
mockBridge.setProviders([...])

// Simulate agent events
mockBridge.emitToken(sessionId, 'Hello ')
mockBridge.emitToken(sessionId, 'world')
mockBridge.emitToolStart(sessionId, { toolCallId, toolName, args })
mockBridge.emitToolEnd(sessionId, { toolCallId, toolName, result, durationMs })
mockBridge.emitTurnEnd(sessionId)
mockBridge.emitIdle(sessionId)
mockBridge.emitError(sessionId, 'Something went wrong')
```

The mock bridge is exposed to tests via `page.evaluate(() => window.__mockPi)` — a secondary handle set alongside `window.pi` in E2E mode.

### 3.3 Directory Structure

```
e2e/
  mocks/
    pi-bridge.ts          # MockPiBridge class implementing PiAPI
  helpers/
    app.ts                # launch/teardown helpers, shared fixtures
    selectors.ts          # reusable locator helpers
  phase1/
    startup.spec.ts
    new-session.spec.ts
    chat.spec.ts
    abort.spec.ts
    settings.spec.ts
  phase2/
    session-history.spec.ts   # all test.skip — Session B
    tabs.spec.ts              # all test.skip — Session C
    diff-pane.spec.ts         # all test.skip — Session D
playwright.config.ts
tsconfig.e2e.json
```

### 3.4 Phase 1 Test Coverage

**`startup.spec.ts`**
- App launches without errors
- Sidebar renders with model list and provider list
- Chat pane shows empty state ("No active session")
- Settings button visible in sidebar footer

**`new-session.spec.ts`**
- `+` button opens New Session dialog
- Working directory field pre-populated
- Model dropdown lists available models grouped by provider
- Thinking level segmented control renders (Off / Low / High)
- Start button creates session and closes dialog
- Cancel button closes dialog without creating session

**`chat.spec.ts`**
- After session creation, chat pane shows active state (no empty state)
- User message appears after send
- Token streaming: assistant message updates character by character
- Tool call entry appears on `pi:tool-start`, updates on `pi:tool-end` with duration and status
- Tool call is collapsed by default with `▸ toolName path duration ✓`
- Auto-scroll: message list scrolls to bottom during streaming
- Status bar updates: `thinking` during turn, `idle` after `pi:idle`

**`abort.spec.ts`**
- Stop button appears in input area while session is active (thinking state)
- Input textarea is disabled while pi is thinking
- Clicking Stop triggers `session:abort` IPC call
- Status returns to idle after abort

**`settings.spec.ts`**
- Settings modal opens via sidebar footer button
- Settings modal opens via `Cmd+,`
- API key input is masked (password type)
- Save button calls `config:setApiKey`
- Model list refreshes after saving a key
- Defaults section: model dropdown, thinking level, system prompt textarea

### 3.5 Phase 2–D Stubs

Each stub file contains `test.skip(...)` entries with descriptive names. Example:

```typescript
// e2e/phase2/session-history.spec.ts
import { test } from '@playwright/test';

test.skip('sidebar shows past sessions grouped by date', () => {});
test.skip('search filters session list by content', () => {});
test.skip('right-click context menu shows rename/tag/pin/delete', () => {});
test.skip('pinned sessions float to top of list', () => {});
test.skip('clicking a past session opens it in read-only view', () => {});
test.skip('resume session creates new active session from history', () => {});
```

### 3.6 CI Integration

E2E tests run in `ci.yml` on every push and PR to `main`:
- `pnpm e2e` runs all non-skipped tests headless on `macos-latest`
- Skipped stubs don't fail CI
- Playwright trace on failure saved as CI artifact for debugging

---

## 4. Source Changes Summary

| Path | Change |
|---|---|
| `package.json` | Add `electron-builder` config, `dist`/`dist:dir`/`e2e` scripts, devDependencies |
| `electron-builder.yml` (or inline) | App id, targets, icon, directories |
| `build/icon.icns` | Placeholder app icon |
| `src/preload/index.ts` | Add `VITE_E2E` branch to expose mock bridge |
| `playwright.config.ts` | Playwright config (test dir, timeout, reporter) |
| `tsconfig.e2e.json` | TS config for e2e dir |
| `e2e/mocks/pi-bridge.ts` | `MockPiBridge` implementing `PiAPI` |
| `e2e/helpers/app.ts` | Launch/teardown, shared fixtures |
| `e2e/helpers/selectors.ts` | Reusable locator helpers |
| `e2e/phase1/*.spec.ts` | 5 spec files, all implemented |
| `e2e/phase2/*.spec.ts` | 3 stub files, all `test.skip` |
| `.github/workflows/ci.yml` | CI workflow |
| `.github/workflows/release.yml` | Release workflow |

---

## 5. Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | **Mock at `window.pi` boundary** | Clean interface, matches `PiAPI` type, no SDK or IPC in tests. Fast, deterministic, CI-safe. |
| 2 | **`VITE_E2E` env var for mock injection** | Simple conditional in preload; no separate entry point or build target needed. |
| 3 | **`test.skip` stubs for Phase 2–D** | Specs are written as skipped tests now so future sessions have a clear implementation target without breaking CI. |
| 4 | **No code signing in v1** | Acceptable for technical early adopters. Apple Developer account added when distributing broadly. |
| 5 | **`dist/` output dir for electron-builder** | Avoids collision with electron-vite's `out/` directory. |
