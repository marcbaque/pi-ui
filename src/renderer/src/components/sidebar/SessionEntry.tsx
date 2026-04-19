// src/renderer/src/components/sidebar/SessionEntry.tsx
import { useState, type MouseEvent } from 'react'
import { Pin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SessionSummary } from '@shared/types'
import RenameInput from './RenameInput'

interface Props {
  session: SessionSummary
  isSelected: boolean
  onClick(): void
  onRename(name: string): void
  onTogglePin(): void
  onDelete(): void
}

export function formatTimestamp(ms: number): string {
  const now = new Date()
  const date = new Date(ms)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - 86400_000

  const hhmm = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  if (ms >= todayStart) return `Today ${hhmm}`
  if (ms >= yesterdayStart) return `Yesterday ${hhmm}`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` ${hhmm}`
}

export default function SessionEntry({
  session,
  isSelected,
  onClick,
  onRename,
  onTogglePin,
  onDelete,
}: Props) {
  const [renaming, setRenaming] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const displayName = session.name ?? formatTimestamp(session.lastActiveAt)

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  function closeContextMenu() {
    setContextMenu(null)
  }

  return (
    <>
      <div
        data-testid={`session-entry-${session.id}`}
        className={cn(
          'group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 transition-colors',
          isSelected
            ? 'bg-zinc-800 text-zinc-200'
            : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
        )}
        onClick={onClick}
        onContextMenu={handleContextMenu}
      >
        <span
          className={cn(
            'h-1.5 w-1.5 shrink-0 rounded-full',
            session.isActive ? 'bg-emerald-400' : 'bg-zinc-700'
          )}
        />
        <span className="flex-1 truncate">
          {renaming ? (
            <RenameInput
              initialValue={session.name ?? ''}
              onConfirm={(name) => {
                setRenaming(false)
                onRename(name)
              }}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            displayName
          )}
        </span>
        {session.pinned && <Pin size={10} className="shrink-0 text-zinc-600" />}
      </div>

      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeContextMenu} />
          <div
            data-testid="session-context-menu"
            className="fixed z-50 min-w-[140px] rounded-md border border-zinc-800 bg-zinc-900 py-1 shadow-lg"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              data-testid="context-menu-rename"
              onClick={() => {
                closeContextMenu()
                setRenaming(true)
              }}
              className="block w-full px-3 py-1.5 text-left text-zinc-300 hover:bg-zinc-800"
            >
              Rename
            </button>
            <button
              data-testid="context-menu-pin"
              onClick={() => {
                closeContextMenu()
                onTogglePin()
              }}
              className="block w-full px-3 py-1.5 text-left text-zinc-300 hover:bg-zinc-800"
            >
              {session.pinned ? 'Unpin' : 'Pin'}
            </button>
            <div className="my-1 border-t border-zinc-800" />
            <button
              data-testid="context-menu-delete"
              onClick={() => {
                closeContextMenu()
                onDelete()
              }}
              className="block w-full px-3 py-1.5 text-left text-red-400 hover:bg-zinc-800"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </>
  )
}
