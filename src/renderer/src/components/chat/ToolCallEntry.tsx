// src/renderer/src/components/chat/ToolCallEntry.tsx
import { cn } from '@/lib/utils'
import type { ToolCall } from '@shared/types'

interface Props {
  call: ToolCall
}

function getDisplayPath(call: ToolCall): string {
  const args = call.args
  if (typeof args.path === 'string') return args.path
  if (typeof args.command === 'string') return args.command.slice(0, 60)
  return ''
}

export default function ToolCallEntry({ call }: Props) {
  return (
    <div
      data-testid="tool-call-entry"
      className="flex items-center gap-2 border-l-2 border-zinc-800 py-0.5 pl-4 pr-2 font-mono text-[11px]"
    >
      <span data-testid="tool-call-toggle" className="text-zinc-600">
        ▸
      </span>
      <span className="text-zinc-500">{call.toolName}</span>
      <span className="truncate text-emerald-900">{getDisplayPath(call)}</span>
      <span
        className={cn(
          'ml-auto',
          call.status === 'pending'
            ? 'text-zinc-700'
            : call.isError
              ? 'text-red-700'
              : 'text-zinc-700'
        )}
      >
        {call.status === 'pending'
          ? 'running…'
          : call.isError
            ? `${call.durationMs}ms ✗`
            : `${call.durationMs}ms ✓`}
      </span>
    </div>
  )
}
