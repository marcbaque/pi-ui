// src/renderer/src/components/tabs/TabBar.tsx
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from '@/store'
import TabComponent from './Tab'

export default function TabBar() {
  const tabs = useStore((s) => s.tabs.tabs)
  const activeTabId = useStore((s) => s.tabs.activeTabId)
  const setActiveTab = useStore((s) => s.setActiveTab)
  const closeTab = useStore((s) => s.closeTab)
  const openNewSession = useStore((s) => s.openNewSession)

  // Confirmation state: tabId awaiting close confirmation
  const [confirmingTabId, setConfirmingTabId] = useState<string | null>(null)

  if (tabs.length === 0) return null

  function handleCloseRequest(tabId: string) {
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab) return
    if (tab.mode !== 'active' || tab.status !== 'thinking') {
      if (tab.mode === 'active') {
        window.pi.session.close(tabId).catch(console.error)
      }
      closeTab(tabId)
      return
    }
    setConfirmingTabId(tabId)
  }

  async function handleConfirmClose() {
    if (!confirmingTabId) return
    const tabId = confirmingTabId
    setConfirmingTabId(null)
    try {
      await window.pi.session.abort(tabId)
      await window.pi.session.close(tabId)
    } catch (err) {
      console.error('[tab close]', err)
    }
    closeTab(tabId)
  }

  function handleCancelClose() {
    setConfirmingTabId(null)
  }

  return (
    <>
      <div
        data-testid="tab-bar"
        className="flex items-stretch border-b border-[var(--pi-border-subtle)] bg-[var(--pi-sidebar-bg)]"
      >
        {tabs.map((tab) => (
          <TabComponent
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onActivate={() => setActiveTab(tab.id)}
            onClose={() => handleCloseRequest(tab.id)}
          />
        ))}
        <button
          data-testid="tab-bar-new-btn"
          onClick={openNewSession}
          aria-label="New session"
          className="flex items-center px-3 py-2 text-zinc-600 transition-colors hover:bg-zinc-900 hover:text-zinc-300"
        >
          <Plus size={13} />
        </button>
      </div>

      {confirmingTabId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            data-testid="tab-close-confirm-dialog"
            className="w-80 rounded-lg border border-zinc-800 bg-[#161616] p-5 shadow-xl"
          >
            <p className="mb-4 text-sm text-zinc-200">
              pi is still working. Close this tab and stop the session?
            </p>
            <div className="flex justify-end gap-2">
              <button
                data-testid="tab-close-cancel-btn"
                onClick={handleCancelClose}
                className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                data-testid="tab-close-confirm-btn"
                onClick={handleConfirmClose}
                className="rounded-md bg-red-900/40 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-900/60"
              >
                Close tab
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
