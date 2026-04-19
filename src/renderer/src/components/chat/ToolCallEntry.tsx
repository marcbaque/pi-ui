// src/renderer/src/components/chat/ToolCallEntry.tsx
import { useState } from 'react'
import type { ToolCall } from '@shared/types'

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

export default function ToolCallEntry({ call }: Props) {
  const [expanded, setExpanded] = useState(false)
  const displayPath = getDisplayPath(call)
  const hasOutput = call.status === 'done' && call.result && call.result.trim().length > 0

  return (
    <div
      data-testid="tool-call-entry"
      className="mx-3 my-px rounded"
      style={{ backgroundColor: getBg(call) }}
    >
      {/* Header row */}
      <button
        data-testid="tool-call-toggle"
        onClick={() => hasOutput && setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 px-3 py-1 font-mono text-xs"
        style={{ cursor: hasOutput ? 'pointer' : 'default' }}
      >
        <span style={{ color: 'var(--pi-dim)', fontSize: '10px' }}>
          {hasOutput ? (expanded ? '▾' : '▸') : '▸'}
        </span>
        <span className="font-medium" style={{ color: 'var(--pi-accent)' }}>
          {call.toolName}
        </span>
        {displayPath && (
          <span className="flex-1 truncate text-left" style={{ color: 'var(--pi-dim)' }}>
            {displayPath}
          </span>
        )}
        <span className="ml-auto shrink-0 tabular-nums" style={{ color: getStatusColor(call) }}>
          {getStatusText(call)}
        </span>
      </button>

      {/* Expandable output */}
      {expanded && hasOutput && (
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
