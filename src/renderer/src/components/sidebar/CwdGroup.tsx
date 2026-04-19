// src/renderer/src/components/sidebar/CwdGroup.tsx
import { ChevronRight, ChevronDown } from 'lucide-react'
import type { SessionSummary } from '@shared/types'
import SessionEntry from './SessionEntry'

interface Props {
  cwdSlug: string
  cwd: string
  sessions: SessionSummary[]
  expanded: boolean
  selectedSessionId: string | null
  onToggle(): void
  onSelectSession(session: SessionSummary): void
  onRenameSession(session: SessionSummary, name: string): void
  onTogglePinSession(session: SessionSummary): void
  onDeleteSession(session: SessionSummary): void
}

function cwdBasename(cwd: string): string {
  return cwd.split('/').filter(Boolean).pop() ?? cwd
}

export default function CwdGroup({
  cwdSlug,
  cwd,
  sessions,
  expanded,
  selectedSessionId,
  onToggle,
  onSelectSession,
  onRenameSession,
  onTogglePinSession,
  onDeleteSession,
}: Props) {
  const sorted = [...sessions].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return b.lastActiveAt - a.lastActiveAt
  })

  const hasActive = sessions.some((s) => s.isActive)

  return (
    <div data-testid={`cwd-group-${cwdSlug}`}>
      <button
        onClick={onToggle}
        title={cwd}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left uppercase tracking-widest text-zinc-600 transition-colors hover:bg-zinc-900 hover:text-zinc-400"
      >
        {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        <span className="truncate">{cwdBasename(cwd)}</span>
        {hasActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />}
      </button>

      {expanded && (
        <div className="ml-2 space-y-0.5">
          {sorted.map((session) => (
            <SessionEntry
              key={session.id}
              session={session}
              isSelected={session.id === selectedSessionId}
              onClick={() => onSelectSession(session)}
              onRename={(name) => onRenameSession(session, name)}
              onTogglePin={() => onTogglePinSession(session)}
              onDelete={() => onDeleteSession(session)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
