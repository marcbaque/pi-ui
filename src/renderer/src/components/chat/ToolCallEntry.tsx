// src/renderer/src/components/chat/ToolCallEntry.tsx
import { useState } from 'react'
import type { ToolCall } from '@shared/types'
import { isDiff, sliceHunk } from '@/lib/diff-utils'

interface Props {
  call: ToolCall
}

function getDisplayPath(call: ToolCall): string {
  const args = call.args
  if (typeof args.path === 'string') return args.path
  if (typeof args.command === 'string') return args.command.slice(0, 120)
  const first = Object.values(args).find((v) => typeof v === 'string')
  return typeof first === 'string' ? first.slice(0, 120) : ''
}

function getBg(call: ToolCall): string {
  if (call.status === 'pending') return 'var(--pi-tool-pending-bg)'
  if (call.isError) return 'var(--pi-tool-error-bg)'
  return 'var(--pi-tool-success-bg)'
}

function getStatusText(call: ToolCall): string {
  if (call.status === 'pending') return 'running…'
  if (call.isError) return call.durationMs != null ? `${call.durationMs}ms ✗` : '✗'
  return call.durationMs != null ? `${call.durationMs}ms ✓` : '✓'
}

function getStatusColor(call: ToolCall): string {
  if (call.status === 'pending') return 'var(--pi-dim)'
  if (call.isError) return 'var(--pi-error)'
  return 'var(--pi-success)'
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// ── Truncation warning badge ─────────────────────────────────────────────────

function TruncationBadge({ call }: { call: ToolCall }) {
  const trunc = call.details?.truncation
  if (!trunc?.truncated) return null

  let label: string
  if (trunc.truncatedBy === 'lines') {
    label = `Showing ${trunc.outputLines} of ${trunc.totalLines} lines`
  } else {
    const kb = trunc.maxBytes ? Math.round(trunc.maxBytes / 1024) : 50
    label = `Truncated (${kb}KB limit) — ${trunc.outputLines} of ${trunc.totalLines} lines`
  }

  return (
    <div
      className="mx-3 mb-1 rounded px-2 py-0.5 font-mono text-[10px]"
      style={{ backgroundColor: 'rgba(255,180,0,0.08)', color: 'var(--pi-warning, #e5c07b)' }}
    >
      ⚠ {label}
      {call.details?.fullOutputPath && (
        <span
          className="ml-2 cursor-pointer underline"
          style={{ color: 'var(--pi-accent)' }}
          onClick={() => window.pi.shell.openPath(call.details!.fullOutputPath!)}
        >
          Open full output
        </span>
      )}
    </div>
  )
}

// ── Bash output with streaming-style preview ─────────────────────────────────
const BASH_PREVIEW_LINES = 6

function BashOutput({ call, expanded }: { call: ToolCall; expanded: boolean }) {
  const result = call.result ?? ''
  const lines = result.split('\n')
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop()

  const skipped =
    !expanded && lines.length > BASH_PREVIEW_LINES ? lines.length - BASH_PREVIEW_LINES : 0
  const visible = expanded ? lines : lines.slice(-BASH_PREVIEW_LINES)

  return (
    <div
      className="mx-3 mb-2 font-mono text-xs leading-relaxed"
      style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingTop: '6px',
        paddingBottom: '8px',
      }}
    >
      {skipped > 0 && (
        <div className="mb-1 text-[10px]" style={{ color: 'var(--pi-dim-dark, #555)' }}>
          … ({skipped} earlier lines, click to expand)
        </div>
      )}
      <pre
        className="overflow-x-auto whitespace-pre-wrap"
        style={{
          color: 'var(--pi-dim)',
          maxHeight: expanded ? '800px' : '200px',
          overflowY: 'auto',
        }}
      >
        {visible.join('\n')}
      </pre>
      <TruncationBadge call={call} />
      {call.durationMs != null && call.durationMs > 0 && (
        <div className="mt-1 text-[10px]" style={{ color: 'var(--pi-dim-dark, #555)' }}>
          Took {formatDuration(call.durationMs)}
        </div>
      )}
    </div>
  )
}

// ── Edit diff: coloured unified diff with context ────────────────────────────

function lineColor(line: string): string {
  if (line.startsWith('+') && !line.startsWith('+++')) return '#b5bd68' // green
  if (line.startsWith('-') && !line.startsWith('---')) return '#cc6666' // red
  if (line.startsWith('@@')) return 'var(--pi-accent)'
  if (line.startsWith('---') || line.startsWith('+++')) return 'var(--pi-dim)'
  return 'var(--pi-dim)'
}

function DiffOutput({ result }: { result: string }) {
  const raw = result.split('\n')
  while (raw.length > 0 && raw[raw.length - 1].trim() === '') raw.pop()

  const lines = isDiff(result) ? sliceHunk(raw) : raw

  return (
    <div
      className="mx-3 mb-2 overflow-x-auto font-mono text-xs leading-relaxed"
      style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingTop: '6px',
        maxHeight: '320px',
        overflowY: 'auto',
      }}
    >
      {lines.map((line, i) =>
        line === '…' ? (
          <div key={i} style={{ color: 'var(--pi-dim-dark)' }}>
            …
          </div>
        ) : (
          <div key={i} style={{ color: lineColor(line) }} className="whitespace-pre">
            {line}
          </div>
        )
      )}
    </div>
  )
}

// ── Read output: syntax-highlighted file content with line numbers ────────────

function ReadOutput({ call, expanded }: { call: ToolCall; expanded: boolean }) {
  const result = call.result ?? ''
  const lines = result.split('\n')
  const startLine = typeof call.args.offset === 'number' ? call.args.offset : 1
  const visible = expanded ? lines : lines.slice(0, 20)
  const hasMore = !expanded && lines.length > 20

  return (
    <div
      className="mx-3 mb-2 overflow-x-auto font-mono text-xs leading-relaxed"
      style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingTop: '6px',
        maxHeight: expanded ? '600px' : '280px',
        overflowY: 'auto',
      }}
    >
      {visible.map((line, i) => (
        <div key={i} className="flex whitespace-pre">
          <span
            className="mr-3 inline-block w-8 select-none text-right"
            style={{ color: 'var(--pi-dim-dark, #555)' }}
          >
            {startLine + i}
          </span>
          <span style={{ color: 'var(--pi-dim)' }}>{line}</span>
        </div>
      ))}
      {hasMore && (
        <div className="mt-1 text-[10px]" style={{ color: 'var(--pi-dim-dark, #555)' }}>
          … ({lines.length - 20} more lines, click to expand)
        </div>
      )}
      <TruncationBadge call={call} />
    </div>
  )
}

// ── Grep/Find/Ls output: structured file list ────────────────────────────────

function FileListOutput({ call, expanded }: { call: ToolCall; expanded: boolean }) {
  const result = call.result ?? ''
  const lines = result.split('\n').filter((l) => l.trim())
  const visible = expanded ? lines : lines.slice(0, 15)
  const hasMore = !expanded && lines.length > 15

  return (
    <div
      className="mx-3 mb-2 font-mono text-xs leading-relaxed"
      style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingTop: '6px',
        maxHeight: expanded ? '500px' : '220px',
        overflowY: 'auto',
      }}
    >
      {visible.map((line, i) => {
        // Grep results: highlight matches (file:line:content format)
        const grepMatch = call.toolName === 'grep' ? line.match(/^(.+?):(\d+):(.*)$/) : null
        if (grepMatch) {
          return (
            <div key={i} className="whitespace-pre">
              <span style={{ color: 'var(--pi-accent)' }}>{grepMatch[1]}</span>
              <span style={{ color: 'var(--pi-dim-dark, #555)' }}>:{grepMatch[2]}:</span>
              <span style={{ color: 'var(--pi-dim)' }}>{grepMatch[3]}</span>
            </div>
          )
        }
        return (
          <div key={i} style={{ color: 'var(--pi-dim)' }} className="whitespace-pre">
            {line}
          </div>
        )
      })}
      {hasMore && (
        <div className="mt-1 text-[10px]" style={{ color: 'var(--pi-dim-dark, #555)' }}>
          … ({lines.length - 15} more items, click to expand)
        </div>
      )}
      <TruncationBadge call={call} />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
const EDIT_TOOLS = new Set(['edit', 'write', 'read_write', 'patch'])
const FILE_LIST_TOOLS = new Set(['grep', 'find', 'ls'])

export default function ToolCallEntry({ call }: Props) {
  const displayPath = getDisplayPath(call)
  const done = call.status === 'done'
  const hasResult = done && !!call.result?.trim()

  const isBash = call.toolName === 'bash'
  const isEdit = EDIT_TOOLS.has(call.toolName)
  const isRead = call.toolName === 'read'
  const isFileList = FILE_LIST_TOOLS.has(call.toolName)

  const [expanded, setExpanded] = useState(false)
  const canToggle = hasResult

  return (
    <div
      data-testid="tool-call-entry"
      className="mx-3 my-px rounded"
      style={{ backgroundColor: getBg(call) }}
    >
      {/* Header row */}
      <div
        data-testid="tool-call-toggle"
        className="flex w-full items-center gap-2 px-3 py-1.5 font-mono text-xs"
        style={{ cursor: canToggle ? 'pointer' : 'default' }}
        onClick={() => canToggle && setExpanded((e) => !e)}
      >
        <span style={{ color: 'var(--pi-dim)', fontSize: '10px' }}>{expanded ? '▾' : '▸'}</span>
        {isBash ? (
          <span style={{ color: 'var(--pi-dim)' }}>$</span>
        ) : (
          <span className="font-medium" style={{ color: 'var(--pi-text)' }}>
            {call.toolName}
          </span>
        )}
        {displayPath && (
          <span
            className="flex-1 truncate text-left"
            style={{
              color: isBash ? 'var(--pi-text)' : 'var(--pi-accent)',
            }}
          >
            {displayPath}
          </span>
        )}
        <span className="ml-auto shrink-0 tabular-nums" style={{ color: getStatusColor(call) }}>
          {getStatusText(call)}
        </span>
      </div>

      {/* Bash: streaming-style preview with truncation info */}
      {isBash && hasResult && <BashOutput call={call} expanded={expanded} />}

      {/* Edit/write: diff view */}
      {isEdit && hasResult && <DiffOutput result={call.result!} />}

      {/* Read: file content with line numbers */}
      {isRead && hasResult && (expanded || true) && <ReadOutput call={call} expanded={expanded} />}

      {/* Grep/Find/Ls: structured file list */}
      {isFileList && hasResult && <FileListOutput call={call} expanded={expanded} />}

      {/* Other tools: generic collapsible */}
      {!isBash && !isEdit && !isRead && !isFileList && canToggle && expanded && (
        <div
          className="mx-3 mb-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed"
          style={{
            color: 'var(--pi-dim)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: '6px',
            maxHeight: '320px',
            overflowY: 'auto',
          }}
        >
          {call.result}
          <TruncationBadge call={call} />
        </div>
      )}
    </div>
  )
}
