// src/renderer/src/lib/diff-utils.ts

const DIFF_CONTEXT = 4

export function isDiff(result: string): boolean {
  return result.includes('\n+') || result.includes('\n-') || result.startsWith('---')
}

/**
 * Slice a unified diff (or plain text) to ±DIFF_CONTEXT lines around each
 * changed line.  Gaps between kept regions are represented by a single '…'
 * marker.
 *
 * If the text is NOT a diff (no +/- lines), the lines are returned as-is so
 * the caller can render them as context.
 */
export function sliceHunk(lines: string[]): string[] {
  // Find indices of changed lines
  const changed = new Set<number>()
  lines.forEach((l, i) => {
    if (
      (l.startsWith('+') && !l.startsWith('+++')) ||
      (l.startsWith('-') && !l.startsWith('---'))
    ) {
      changed.add(i)
    }
  })
  if (changed.size === 0) return lines

  // Expand each changed index by DIFF_CONTEXT
  const keep = new Set<number>()
  changed.forEach((idx) => {
    for (let d = -DIFF_CONTEXT; d <= DIFF_CONTEXT; d++) {
      const j = idx + d
      if (j >= 0 && j < lines.length) keep.add(j)
    }
  })

  // Rebuild with gap markers
  const result: string[] = []
  let prev = -1
  Array.from(keep)
    .sort((a, b) => a - b)
    .forEach((i) => {
      if (prev !== -1 && i > prev + 1) result.push('…')
      result.push(lines[i])
      prev = i
    })
  return result
}
