import { describe, it, expect } from 'vitest'
import { parseDiff } from './diff-parse'

const UNIFIED_DIFF = `--- a/src/auth.ts
+++ b/src/auth.ts
@@ -1,5 +1,6 @@
 import { db } from './db'
-import { legacy } from './legacy'
 import { config } from './config'
+import { logger } from './logger'
+import { metrics } from './metrics'
 
 export function auth() {`

describe('parseDiff', () => {
  it('returns empty array for empty string', () => {
    expect(parseDiff('')).toEqual([])
  })

  it('parses header lines', () => {
    const lines = parseDiff(UNIFIED_DIFF)
    expect(lines[0].type).toBe('header')
    expect(lines[0].content).toBe('--- a/src/auth.ts')
    expect(lines[1].type).toBe('header')
    expect(lines[1].content).toBe('+++ b/src/auth.ts')
  })

  it('parses hunk header', () => {
    const lines = parseDiff(UNIFIED_DIFF)
    const hunk = lines.find((l) => l.type === 'hunk')
    expect(hunk).toBeDefined()
    expect(hunk!.content).toContain('@@ -1,5 +1,6 @@')
  })

  it('assigns lineNumBefore to removed lines', () => {
    const lines = parseDiff(UNIFIED_DIFF)
    const removed = lines.find((l) => l.type === 'removed')
    expect(removed).toBeDefined()
    expect(removed!.lineNumBefore).toBe(2)
    expect(removed!.lineNumAfter).toBeNull()
  })

  it('assigns lineNumAfter to added lines', () => {
    const lines = parseDiff(UNIFIED_DIFF)
    const added = lines.filter((l) => l.type === 'added')
    expect(added[0].lineNumBefore).toBeNull()
    expect(added[0].lineNumAfter).toBe(3)
  })

  it('assigns both line numbers to context lines', () => {
    const lines = parseDiff(UNIFIED_DIFF)
    const ctx = lines.find((l) => l.type === 'context')
    expect(ctx!.lineNumBefore).toBeGreaterThan(0)
    expect(ctx!.lineNumAfter).toBeGreaterThan(0)
  })

  it('strips the leading +/-/space from content', () => {
    const lines = parseDiff(UNIFIED_DIFF)
    const removed = lines.find((l) => l.type === 'removed')!
    expect(removed.content).toBe("import { legacy } from './legacy'")
    const added = lines.find((l) => l.type === 'added')!
    expect(added.content).toBe("import { logger } from './logger'")
  })

  it('handles plain new-file content (no diff markers)', () => {
    const lines = parseDiff('hello\nworld\n')
    expect(lines.every((l) => l.type === 'added')).toBe(true)
    expect(lines[0].content).toBe('hello')
    expect(lines[0].lineNumAfter).toBe(1)
  })
})
