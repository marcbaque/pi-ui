// src/renderer/src/components/sidebar/Sidebar.tsx
import { Plus, Settings } from 'lucide-react'
import { useStore } from '@/store'
import SessionList from './SessionList'

export default function Sidebar() {
  const openNewSession = useStore((s) => s.openNewSession)
  const openSettings = useStore((s) => s.openSettings)

  return (
    <aside
      data-testid="sidebar"
      className="flex h-full w-56 shrink-0 flex-col overflow-hidden border-r border-[var(--pi-border-subtle)] bg-[var(--pi-sidebar-bg)]"
    >
      <div className="flex items-center justify-end border-b border-[var(--pi-border-subtle)] px-3 py-3">
        <button
          data-testid="new-session-btn"
          aria-label="New session"
          onClick={openNewSession}
          className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          <Plus size={14} />
        </button>
      </div>

      <SessionList />

      <div className="border-t border-[var(--pi-border-subtle)] p-2">
        <button
          data-testid="settings-btn"
          aria-label="Settings"
          onClick={openSettings}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-300"
        >
          <Settings size={13} />
          Settings
          <span className="ml-auto text-zinc-700">⌘,</span>
        </button>
      </div>
    </aside>
  )
}
