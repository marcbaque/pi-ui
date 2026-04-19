// src/renderer/src/lib/diff-utils.test.ts
import { describe, it, expect } from 'vitest'
import { isDiff, sliceHunk } from './diff-utils'

describe('isDiff', () => {
  it('returns true when text has a + line', () => {
    expect(isDiff('context\n+added line')).toBe(true)
  })

  it('returns true when text has a - line', () => {
    expect(isDiff('context\n-removed line')).toBe(true)
  })

  it('returns true when text starts with ---', () => {
    expect(isDiff('--- a/file.ts\n+++ b/file.ts')).toBe(true)
  })

  it('returns false for plain output with no diff markers', () => {
    expect(isDiff('file contents\nno changes here')).toBe(false)
  })
})

describe('sliceHunk', () => {
  it('returns lines unchanged when there are no changed lines', () => {
    const lines = ['line 1', 'line 2', 'line 3']
    expect(sliceHunk(lines)).toEqual(lines)
  })

  it('includes context lines around a single change', () => {
    // 10 lines of context, change at index 5
    const lines = Array.from({ length: 10 }, (_, i) => ` line ${i}`)
    lines[5] = '+added'
    const result = sliceHunk(lines)
    // Should include indices 1-9 (5±4)
    expect(result).toContain('+added')
    expect(result).toContain(' line 1')
    expect(result).toContain(' line 9')
    expect(result).not.toContain(' line 0') // too far before
    expect(result).not.toContain('…') // no gap — all kept are contiguous
  })

  it('inserts … marker between two non-adjacent hunks', () => {
    // 20 lines, changes at index 1 and index 18
    const lines = Array.from({ length: 20 }, (_, i) => ` line ${i}`)
    lines[1] = '+first change'
    lines[18] = '+second change'
    const result = sliceHunk(lines)
    expect(result).toContain('…')
    expect(result).toContain('+first change')
    expect(result).toContain('+second change')
  })

  it('does not insert … marker when two hunks are adjacent (within 2*context)', () => {
    // Changes at index 2 and index 7 — context=4, so they overlap
    const lines = Array.from({ length: 15 }, (_, i) => ` line ${i}`)
    lines[2] = '-removed'
    lines[7] = '+added'
    const result = sliceHunk(lines)
    expect(result).not.toContain('…')
  })

  it('handles --- and +++ header lines as context (not changed markers)', () => {
    const lines = ['--- a/file.ts', '+++ b/file.ts', ' context', '+real change', ' context']
    const result = sliceHunk(lines)
    expect(result).toContain('+real change')
    // --- and +++ lines are NOT treated as changed lines
    expect(result).toContain('--- a/file.ts')
  })

  it('handles a single-line change at the start of the file', () => {
    const lines = ['+first line', ' second line', ' third line']
    const result = sliceHunk(lines)
    expect(result[0]).toBe('+first line')
    expect(result).not.toContain('…')
  })

  it('handles a single-line change at the end of the file', () => {
    const lines = [' a', ' b', ' c', '-last']
    const result = sliceHunk(lines)
    expect(result).toContain('-last')
    expect(result).not.toContain('…')
  })
})
