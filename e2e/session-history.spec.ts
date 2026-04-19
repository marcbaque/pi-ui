// e2e/session-history.spec.ts
// Stubs for Session B — Session History & Sidebar
import { test } from '@playwright/test'

test.skip('sidebar shows past sessions grouped by date (Today / Yesterday / older)', () => {})
test.skip('sessions are sorted with most recent first within each group', () => {})
test.skip(
  'each session entry shows name (or truncated first message), cwd, model, and timestamp',
  () => {},
)
test.skip('search input filters session list by content in real time', () => {})
test.skip('search with no results shows empty state', () => {})
test.skip('right-click context menu shows rename, tag, pin, and delete options', () => {})
test.skip('renaming a session updates the entry in the list', () => {})
test.skip('pinned sessions float to the top of the list regardless of date', () => {})
test.skip('clicking a past session opens it in read-only view in the chat pane', () => {})
test.skip(
  'resume button on a past session creates a new active session continuing the conversation',
  () => {},
)
test.skip('deleting a session removes it from the list', () => {})
