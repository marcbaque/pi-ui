// src/renderer/src/components/diff/DiffPane.tsx
import { useActiveTab } from '@/hooks/useActiveTab'
import { useStore } from '@/store'
import { basename } from '@/lib/path-utils'
import DiffView from './DiffView'

export default function DiffPane() {
  const tab = useActiveTab()
  const addDiffComment = useStore((s) => s.addDiffComment)
  const removeDiffComment = useStore((s) => s.removeDiffComment)
  const clearDiffComments = useStore((s) => s.clearDiffComments)
  const toggleDiffPane = useStore((s) => s.toggleDiffPane)
  const setTabStatus = useStore((s) => s.setTabStatus)
  const addUserMessage = useStore((s) => s.addUserMessage)

  if (!tab || !tab.currentDiff || !tab.diffPaneOpen) return null

  const { path, unifiedDiff } = tab.currentDiff
  const canSend = tab.diffComments.length > 0 && tab.mode === 'active' && tab.status === 'idle'

  async function sendReview() {
    if (!tab || !canSend) return
    const header = `Code review for \`${path}\`:`
    const body = tab.diffComments
      .map((c) => {
        const sign = c.lineType === 'added' ? '+' : c.lineType === 'removed' ? '-' : ' '
        return `**Line ${c.lineIndex + 1}** (${sign} \`${c.lineContent.slice(0, 60)}\`):\n${c.content}`
      })
      .join('\n\n')
    const msg = `${header}\n\n${body}`
    clearDiffComments(tab.id)
    addUserMessage(tab.id, msg)
    setTabStatus(tab.id, 'thinking')
    try {
      await window.pi.session.send(tab.sessionId, msg)
    } catch (err) {
      console.error('[sendReview]', err)
      setTabStatus(tab.id, 'error')
    }
  }

  return (
    <div
      data-testid="diff-pane"
      className="flex w-[460px] shrink-0 flex-col border-l border-[var(--pi-border-subtle)] bg-[var(--pi-sidebar-bg)]"
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--pi-border-subtle)] px-3 py-2">
        <span
          data-testid="diff-pane-path"
          className="flex-1 truncate font-mono text-xs text-zinc-400"
          title={path}
        >
          {basename(path)}
        </span>
        <button
          data-testid="diff-pane-close-btn"
          onClick={() => toggleDiffPane(tab.id)}
          className="text-zinc-600 hover:text-zinc-300"
          aria-label="Close diff pane"
        >
          ×
        </button>
      </div>

      {/* Diff body */}
      <DiffView
        unifiedDiff={unifiedDiff}
        comments={tab.diffComments}
        onAddComment={(c) => addDiffComment(tab.id, c)}
        onRemoveComment={(id) => removeDiffComment(tab.id, id)}
      />

      {/* Footer */}
      <div className="border-t border-[var(--pi-border-subtle)] px-3 py-2">
        <button
          data-testid="send-review-btn"
          disabled={!canSend}
          onClick={sendReview}
          className="w-full rounded bg-zinc-800 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send review to pi
          {tab.diffComments.length > 0 && (
            <span className="ml-1.5 rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
              {tab.diffComments.length}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
