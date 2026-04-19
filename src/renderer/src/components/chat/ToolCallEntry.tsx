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

// ── Bash preview: last N lines, controlled by parent ─────────────────────────
const BASH_PREVIEW_LINES = 6

function BashOutput({ result, expanded }: { result: string; expanded: boolean }) {
  const lines = result.split('\n')
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop()
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
      <pre
        className="overflow-x-auto whitespace-pre-wrap"
        style={{ color: 'var(--pi-dim)', maxHeight: '480px', overflowY: 'auto' }}
      >
        {visible.join('\n')}
      </pre>
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

// ── Main component ────────────────────────────────────────────────────────────
const EDIT_TOOLS = new Set(['edit', 'write', 'read_write', 'patch'])

export default function ToolCallEntry({ call }: Props) {
  const displayPath = getDisplayPath(call)
  const done = call.status === 'done'
  const hasResult = done && !!call.result?.trim()

  const isBash = call.toolName === 'bash'
  const isEdit = EDIT_TOOLS.has(call.toolName)

  const [expanded, setExpanded] = useState(false)
  const canToggle = hasResult && (isBash || !isEdit)

  return (
    <div
      data-testid="tool-call-entry"
      className="mx-3 my-px rounded"
      style={{ backgroundColor: getBg(call) }}
    >
      {/* Header row — plain div so displayPath can be a nested interactive element */}
      <div
        data-testid="tool-call-toggle"
        className="flex w-full items-center gap-2 px-3 py-1.5 font-mono text-xs"
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
              cursor: canToggle ? 'pointer' : 'default',
            }}
            onClick={() => canToggle && setExpanded((e) => !e)}
          >
            {displayPath}
          </span>
        )}
        <span className="ml-auto shrink-0 tabular-nums" style={{ color: getStatusColor(call) }}>
          {getStatusText(call)}
        </span>
      </div>

      {/* Bash: last N lines preview, always visible; expanded = show all */}
      {isBash && hasResult && <BashOutput result={call.result!} expanded={expanded} />}

      {/* Edit/write: diff view, always visible when done */}
      {isEdit && hasResult && <DiffOutput result={call.result!} />}

      {/* Other tools */}
      {!isBash && !isEdit && canToggle && expanded && (
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
        </div>
      )}
    </div>
  )
}
