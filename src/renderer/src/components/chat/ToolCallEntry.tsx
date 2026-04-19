// src/renderer/src/components/chat/ToolCallEntry.tsx
import type { ToolCall } from '@shared/types'

interface Props {
  call: ToolCall
}

function getDisplayPath(call: ToolCall): string {
  const args = call.args
  if (typeof args.path === 'string') return args.path
  if (typeof args.command === 'string') return args.command.slice(0, 80)
  // Show first string arg value as fallback
  const first = Object.values(args).find((v) => typeof v === 'string')
  return typeof first === 'string' ? first.slice(0, 80) : ''
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
  const displayPath = getDisplayPath(call)

  return (
    <div
      data-testid="tool-call-entry"
      className="mx-3 my-0.5 flex items-center gap-2 rounded px-3 py-1.5 font-mono text-[11px]"
      style={{ backgroundColor: getBg(call) }}
    >
      <span data-testid="tool-call-toggle" style={{ color: 'var(--pi-dim)' }}>
        ▸
      </span>
      <span className="font-medium" style={{ color: 'var(--pi-accent)' }}>
        {call.toolName}
      </span>
      {displayPath && (
        <span className="flex-1 truncate" style={{ color: 'var(--pi-dim)' }}>
          {displayPath}
        </span>
      )}
      <span className="ml-auto shrink-0 tabular-nums" style={{ color: getStatusColor(call) }}>
        {getStatusText(call)}
      </span>
    </div>
  )
}
