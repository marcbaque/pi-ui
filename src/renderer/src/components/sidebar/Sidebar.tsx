// src/renderer/src/components/sidebar/Sidebar.tsx
import { Settings } from 'lucide-react'
import { useStore } from '@/store'
import SessionList from './SessionList'

export default function Sidebar() {
  const openSettings = useStore((s) => s.openSettings)

  return (
    <aside
      data-testid="sidebar"
      className="flex h-full w-56 shrink-0 flex-col overflow-hidden border-r border-[var(--pi-border-subtle)] bg-[var(--pi-sidebar-bg)]"
    >
      <div className="border-b border-[var(--pi-border-subtle)] px-3 py-3">
        <span className="text-xs font-semibold text-zinc-600">pi-ui</span>
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
