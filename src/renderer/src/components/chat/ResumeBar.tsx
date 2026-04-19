// src/renderer/src/components/chat/ResumeBar.tsx
import { useState } from 'react'
import { useStore } from '@/store'

interface Props {
  tabId: string
}

export default function ResumeBar({ tabId }: Props) {
  const tabs = useStore((s) => s.tabs.tabs)
  const replaceTab = useStore((s) => s.replaceTab)
  const setSessions = useStore((s) => s.setSessions)
  const [loading, setLoading] = useState(false)

  const tab = tabs.find((t) => t.id === tabId)
  const historySessions = useStore((s) => s.history.sessions)
  const session = tab?.readonlySessionId
    ? historySessions.find((s) => s.id === tab.readonlySessionId)
    : null

  async function handleResume() {
    if (!tab || !session) return
    setLoading(true)
    try {
      const { sessionId } = await window.pi.sessions.resume(session.path)
      replaceTab(tabId, {
        id: sessionId,
        sessionId,
        cwd: session.cwd,
        model: session.model ?? '',
        provider: '',
        thinkingLevel: 'off',
        status: 'idle',
        messages: [],
        currentStreamingContent: '',
        mode: 'active',
      })
      const updated = await window.pi.sessions.list()
      setSessions(updated)
    } catch (err) {
      console.error('Failed to resume session:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      data-testid="resume-bar"
      className="flex items-center justify-between border-t border-[var(--pi-border-subtle)] bg-[var(--pi-sidebar-bg)] px-4 py-3"
    >
      <span className="text-xs text-zinc-600">This is a past session</span>
      <button
        data-testid="resume-btn"
        onClick={handleResume}
        disabled={loading}
        className="rounded-md bg-[var(--pi-tool-success-bg)] px-3 py-1.5 text-xs text-[var(--pi-accent)] transition-colors hover:bg-emerald-900 disabled:opacity-50"
      >
        {loading ? 'Resuming…' : 'Resume →'}
      </button>
    </div>
  )
}
