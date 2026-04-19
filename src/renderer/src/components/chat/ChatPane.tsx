// src/renderer/src/components/chat/ChatPane.tsx
import { useStore } from '@/store'
import { usePiEvents } from '@/hooks/usePiEvents'
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
        className="mt-2 rounded-md border border-zinc-800 bg-zinc-900 px-4 py-1.5 text-xs text-emerald-500 transition-colors hover:bg-zinc-800"
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

function ReadonlyErrorState() {
  const setLoadStatus = useStore((s) => s.setLoadStatus)
  const selectedId = useStore((s) => s.history.selectedSessionId)

  async function retry() {
    if (!selectedId) return
    const session = useStore.getState().history.sessions.find((s) => s.id === selectedId)
    if (!session) return
    setLoadStatus('loading')
    try {
      const messages = await window.pi.sessions.load(session.path)
      useStore.getState().setLoadedMessages(messages)
    } catch {
      setLoadStatus('error')
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
  const session = useStore((s) => s.session)
  const history = useStore((s) => s.history)

  usePiEvents(session.sessionId)

  const isReadonly = !session.active && history.selectedSessionId !== null

  if (isReadonly) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <Toolbar />
        {history.loadStatus === 'loading' && <ReadonlyLoadingState />}
        {history.loadStatus === 'error' && <ReadonlyErrorState />}
        {history.loadStatus === 'idle' && (
          <>
            <MessageList readonlyMessages={history.loadedMessages} />
            <ResumeBar />
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Toolbar />
      {session.active ? (
        <>
          <MessageList />
          <InputArea />
        </>
      ) : (
        <EmptyState />
      )}
    </div>
  )
}
