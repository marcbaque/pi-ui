// src/renderer/src/components/chat/Toolbar.tsx
import { cn } from '@/lib/utils'
import { useStore } from '@/store'
import { useActiveTab } from '@/hooks/useActiveTab'
import { useAvailableModels } from '@/hooks/useAvailableModels'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AppThinkingLevel } from '@shared/types'

const LEVELS: AppThinkingLevel[] = ['off', 'low', 'high']

export default function Toolbar() {
  const tab = useActiveTab()
  const availableModels = useAvailableModels()
  const replaceTab = useStore((s) => s.replaceTab)

  if (!tab) return null

  async function handleModelChange(val: string) {
    if (!tab) return
    const [p, ...rest] = val.split('/')
    const m = rest.join('/')
    try {
      await window.pi.session.send(tab.sessionId, `/model ${p}/${m}`)
      replaceTab(tab.id, { ...tab, model: m, provider: p })
    } catch (err) {
      console.error(err)
    }
  }

  // Readonly / loading tabs: show plain text, no dropdowns
  if (tab.mode !== 'active') {
    return (
      <div
        data-testid="chat-toolbar"
        className="flex items-center gap-3 border-b border-[var(--pi-border-subtle)] bg-[var(--pi-sidebar-bg)] px-3 py-2"
      >
        <span className="text-xs text-zinc-500">{tab.model || '—'}</span>
        <span className="ml-auto max-w-[200px] truncate text-xs text-zinc-600">{tab.cwd}</span>
      </div>
    )
  }

  return (
    <div
      data-testid="chat-toolbar"
      className="flex items-center gap-3 border-b border-[var(--pi-border-subtle)] bg-[var(--pi-sidebar-bg)] px-3 py-2"
    >
      <Select value={`${tab.provider}/${tab.model}`} onValueChange={handleModelChange}>
        <SelectTrigger className="h-7 w-48 border-zinc-800 bg-zinc-900 text-zinc-400">
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          position="popper"
          className="max-h-60 overflow-y-auto border-zinc-800 bg-zinc-900"
        >
          {availableModels.map((m) => (
            <SelectItem
              key={`${m.provider}/${m.modelId}`}
              value={`${m.provider}/${m.modelId}`}
              className="text-xs text-zinc-300"
            >
              {m.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex overflow-hidden rounded border border-zinc-800">
        {LEVELS.map((level) => (
          <button
            key={level}
            className={cn(
              'px-2 py-0.5 capitalize transition-colors',
              tab.thinkingLevel === level
                ? 'bg-[var(--pi-tool-success-bg)] text-[var(--pi-accent)]'
                : 'text-zinc-600 hover:text-zinc-400'
            )}
          >
            {level}
          </button>
        ))}
      </div>

      <button
        onClick={() => tab.cwd && window.pi.shell.openPath(tab.cwd)}
        className="ml-auto max-w-[200px] truncate text-zinc-600 transition-colors hover:text-zinc-400"
      >
        {tab.cwd}
      </button>
    </div>
  )
}
