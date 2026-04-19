# Contributing to pi-ui

Thanks for your interest in contributing!

## Development setup

**Requirements:** Node.js 22+, pnpm

```bash
git clone https://github.com/marcbaque/pi-ui
cd pi-ui
pnpm install
pnpm dev        # run in development mode
```

## Before submitting a PR

```bash
pnpm typecheck  # TypeScript
pnpm test:run   # unit tests
pnpm e2e        # end-to-end tests (requires a built app: pnpm build first)
```

All three must pass. The CI will verify on every PR.

## Commit style

Plain English, imperative mood, lowercase:

```
feat: add thinking level indicator to tab
fix: preserve messages when resuming a session
chore: update dependencies
```

## Project structure

```
src/
  main/       — Electron main process (SDK integration, IPC handlers)
  preload/    — contextBridge API exposed to renderer
  renderer/   — React app (components, store, hooks)
  shared/     — types shared between main and renderer
e2e/          — Playwright end-to-end tests
```

The internal specs and plans that guided development are in `docs/` (gitignored).

## Reporting bugs

Use the [bug report template](/.github/ISSUE_TEMPLATE/bug_report.md). Include your pi-ui version, OS, and any console errors from DevTools (right-click anywhere in the app → Inspect → Console).
