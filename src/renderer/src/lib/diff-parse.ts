// src/renderer/src/lib/diff-parse.ts

export type DiffLineType = 'header' | 'hunk' | 'added' | 'removed' | 'context'

export interface DiffLine {
  type: DiffLineType
  raw: string
  content: string
  lineNumBefore: number | null
  lineNumAfter: number | null
}

/** Parse hunk header like "@@ -10,7 +10,8 @@ optional text" */
function parseHunkHeader(line: string): { before: number; after: number } | null {
  const m = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
  if (!m) return null
  return { before: parseInt(m[1], 10), after: parseInt(m[2], 10) }
}

function isDiffHeader(line: string): boolean {
  return (
    line.startsWith('--- ') ||
    line.startsWith('+++ ') ||
    line.startsWith('diff ') ||
    line.startsWith('index ') ||
    line.startsWith('new file') ||
    line.startsWith('deleted file') ||
    line.startsWith('old mode') ||
    line.startsWith('new mode')
  )
}

export function parseDiff(raw: string): DiffLine[] {
  if (!raw.trim()) return []

  const rawLines = raw.split('\n')
  // Remove trailing empty line from split
  if (rawLines[rawLines.length - 1] === '') rawLines.pop()

  // Check if this looks like a unified diff
  const looksLikeDiff = rawLines.some(
    (l) => l.startsWith('---') || l.startsWith('+++') || l.startsWith('@@')
  )

  // If not a unified diff, treat the whole content as a new-file (all added lines)
  if (!looksLikeDiff) {
    return rawLines.map((line, i) => ({
      type: 'added' as DiffLineType,
      raw: '+' + line,
      content: line,
      lineNumBefore: null,
      lineNumAfter: i + 1,
    }))
  }

  const result: DiffLine[] = []
  let lineBefore = 0
  let lineAfter = 0

  for (const line of rawLines) {
    if (isDiffHeader(line)) {
      result.push({
        type: 'header',
        raw: line,
        content: line,
        lineNumBefore: null,
        lineNumAfter: null,
      })
      continue
    }

    if (line.startsWith('@@ ')) {
      const nums = parseHunkHeader(line)
      if (nums) {
        lineBefore = nums.before
        lineAfter = nums.after
      }
      result.push({
        type: 'hunk',
        raw: line,
        content: line,
        lineNumBefore: null,
        lineNumAfter: null,
      })
      continue
    }

    if (line.startsWith('+')) {
      result.push({
        type: 'added',
        raw: line,
        content: line.slice(1),
        lineNumBefore: null,
        lineNumAfter: lineAfter++,
      })
      continue
    }

    if (line.startsWith('-')) {
      result.push({
        type: 'removed',
        raw: line,
        content: line.slice(1),
        lineNumBefore: lineBefore++,
        lineNumAfter: null,
      })
      continue
    }

    // Context line (space or empty)
    result.push({
      type: 'context',
      raw: line,
      content: line.startsWith(' ') ? line.slice(1) : line,
      lineNumBefore: lineBefore++,
      lineNumAfter: lineAfter++,
    })
  }

  return result
}
