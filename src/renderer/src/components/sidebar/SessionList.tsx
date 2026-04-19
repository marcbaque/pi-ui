// src/renderer/src/components/sidebar/SessionList.tsx
import { useState, useMemo } from 'react'
import { useStore } from '@/store'
import { formatTimestamp } from './SessionEntry'
import CwdGroup from './CwdGroup'
import SessionSearch from './SessionSearch'
import type { SessionSummary } from '@shared/types'

export default function SessionList() {
  const sessions = useStore((s) => s.history.sessions)
  const expandedCwds = useStore((s) => s.history.expandedCwds)
  const selectedSessionId = useStore((s) => s.history.selectedSessionId)
  const toggleCwdExpanded = useStore((s) => s.toggleCwdExpanded)
  const selectSession = useStore((s) => s.selectSession)
  const setLoadStatus = useStore((s) => s.setLoadStatus)
  const setLoadedMessages = useStore((s) => s.setLoadedMessages)
  const setSessions = useStore((s) => s.setSessions)

  const clearReadonly = useStore((s) => s.clearReadonly)

  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const map = new Map<string, { cwd: string; slug: string; sessions: SessionSummary[] }>()
    for (const s of sessions) {
      if (!map.has(s.cwdSlug)) {
        map.set(s.cwdSlug, { cwd: s.cwd, slug: s.cwdSlug, sessions: [] })
      }
      map.get(s.cwdSlug)!.sessions.push(s)
    }
    return Array.from(map.values()).sort((a, b) => {
      const aMax = Math.max(...a.sessions.map((s) => s.lastActiveAt))
      const bMax = Math.max(...b.sessions.map((s) => s.lastActiveAt))
      return bMax - aMax
    })
  }, [sessions])

  const filteredGroups = useMemo(() => {
    if (!query.trim()) return groups
    const q = query.toLowerCase()
    return groups
      .map((g) => ({
        ...g,
        sessions: g.sessions.filter((s) => {
          const label = (s.name ?? formatTimestamp(s.lastActiveAt)).toLowerCase()
          return label.includes(q) || g.cwd.toLowerCase().includes(q)
        }),
      }))
      .filter((g) => g.sessions.length > 0)
  }, [groups, query])

  function isExpanded(slug: string): boolean {
    if (query.trim()) return true
    return expandedCwds.includes(slug)
  }

  async function handleSelectSession(session: SessionSummary) {
    selectSession(session.id)
    setLoadStatus('loading')
    try {
      const messages = await window.pi.sessions.load(session.path)
      setLoadedMessages(messages)
    } catch {
      setLoadStatus('error')
    }
  }

  async function handleRename(session: SessionSummary, _name: string) {
    // Names stored in SDK JSONL — placeholder for future SDK integration
    console.log('rename', session.id, _name)
  }

  async function handleTogglePin(session: SessionSummary) {
    await window.pi.sessions.updateMeta(session.id, { pinned: !session.pinned })
    const updated = await window.pi.sessions.list()
    setSessions(updated)
  }

  async function handleDelete(session: SessionSummary) {
    await window.pi.sessions.delete(session.id)
    if (selectedSessionId === session.id) clearReadonly()
    const updated = await window.pi.sessions.list()
    setSessions(updated)
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <SessionSearch value={query} onChange={setQuery} />
        <div className="px-4 py-6 text-center text-xs text-zinc-700">
          No sessions yet.
          <br />
          Start one with +
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <SessionSearch value={query} onChange={setQuery} />
      <div data-testid="session-list" className="flex-1 space-y-1 overflow-y-auto px-2 py-1">
        {filteredGroups.map((g) => (
          <CwdGroup
            key={g.slug}
            cwdSlug={g.slug}
            cwd={g.cwd}
            sessions={g.sessions}
            expanded={isExpanded(g.slug)}
            selectedSessionId={selectedSessionId}
            onToggle={() => toggleCwdExpanded(g.slug)}
            onSelectSession={handleSelectSession}
            onRenameSession={handleRename}
            onTogglePinSession={handleTogglePin}
            onDeleteSession={handleDelete}
          />
        ))}
        {filteredGroups.length === 0 && query && (
          <p className="py-4 text-center text-xs text-zinc-700">
            No sessions match &ldquo;{query}&rdquo;
          </p>
        )}
      </div>
    </div>
  )
}
