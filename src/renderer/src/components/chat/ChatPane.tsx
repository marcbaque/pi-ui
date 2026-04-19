// src/renderer/src/components/chat/ChatPane.tsx
import { useStore } from '@/store'
import { usePiEvents } from '@/hooks/usePiEvents'
import Toolbar from './Toolbar'
import MessageList from './MessageList'
import InputArea from './InputArea'

function EmptyState() {
  const openNewSession = useStore((s) => s.openNewSession)
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-zinc-700">
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

export default function ChatPane() {
  const session = useStore((s) => s.session)

  usePiEvents(session.sessionId)

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
