// src/renderer/src/components/chat/ChatPane.tsx
import { useStore } from '@/store'
import { useActiveTab } from '@/hooks/useActiveTab'
import Toolbar from './Toolbar'
import MessageList from './MessageList'
import InputArea from './InputArea'
import ResumeBar from './ResumeBar'

function EmptyState() {
  const openNewSession = useStore((s) => s.openNewSession)
  return (
    <div
      data-testid="chat-empty-state"
      className="flex flex-1 flex-col items-center justify-center gap-3 text-zinc-700"
    >
      <span className="text-4xl opacity-30">⌬</span>
      <p className="text-sm font-medium text-zinc-500">No active session</p>
      <p className="max-w-[220px] text-center text-xs text-zinc-700">
        Start a new session to begin working with pi.
      </p>
      <button
        onClick={openNewSession}
        className="mt-2 rounded-md border border-zinc-800 bg-zinc-900 px-4 py-1.5 text-xs text-[var(--pi-success)] transition-colors hover:bg-zinc-800"
      >
        ＋ New session
      </button>
    </div>
  )
}

function ReadonlyLoadingState() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <span className="text-xs text-zinc-600">Loading…</span>
    </div>
  )
}

function ReadonlyErrorState({ tabId }: { tabId: string }) {
  const setTabMode = useStore((s) => s.setTabMode)
  const setTabMessages = useStore((s) => s.setTabMessages)
  const tabs = useStore((s) => s.tabs.tabs)

  async function retry() {
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab?.readonlySessionId) return
    const sessions = useStore.getState().history.sessions
    const session = sessions.find((s) => s.id === tab.readonlySessionId)
    if (!session) return
    setTabMode(tabId, 'loading')
    try {
      const messages = await window.pi.sessions.load(session.path)
      setTabMessages(tabId, messages)
      setTabMode(tabId, 'readonly')
    } catch {
      setTabMode(tabId, 'error')
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3">
      <p className="text-xs text-zinc-600">Failed to load session</p>
      <button
        onClick={retry}
        className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-900"
      >
        Retry
      </button>
    </div>
  )
}

export default function ChatPane() {
  const tab = useActiveTab()

  if (!tab) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <EmptyState />
      </div>
    )
  }

  if (tab.mode === 'loading') {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <Toolbar />
        <ReadonlyLoadingState />
      </div>
    )
  }

  if (tab.mode === 'error') {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <Toolbar />
        <ReadonlyErrorState tabId={tab.id} />
      </div>
    )
  }

  if (tab.mode === 'readonly') {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <Toolbar />
        <MessageList readonlyMessages={tab.messages} />
        <ResumeBar tabId={tab.id} />
      </div>
    )
  }

  // mode === 'active'
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Toolbar />
      <MessageList />
      <InputArea />
    </div>
  )
}
