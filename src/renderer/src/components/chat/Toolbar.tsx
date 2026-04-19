// src/renderer/src/components/chat/Toolbar.tsx
import { cn } from '@/lib/utils'
import { useStore } from '@/store'
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
  const session = useStore((s) => s.session)
  const config = useStore((s) => s.config)
  const setSessionActive = useStore((s) => s.setSessionActive)

  if (!session.active) return null

  async function handleModelChange(val: string) {
    const [p, ...rest] = val.split('/')
    const m = rest.join('/')
    try {
      await window.pi.session.send(session.sessionId!, `/model ${p}/${m}`)
      setSessionActive({
        sessionId: session.sessionId!,
        cwd: session.cwd!,
        model: m,
        provider: p,
        thinkingLevel: session.thinkingLevel,
      })
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div
      data-testid="chat-toolbar"
      className="flex items-center gap-3 border-b border-zinc-900 bg-[#0a0a0a] px-3 py-2"
    >
      <Select value={`${session.provider}/${session.model}`} onValueChange={handleModelChange}>
        <SelectTrigger className="h-7 w-48 border-zinc-800 bg-zinc-900 text-xs text-zinc-400">
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          position="popper"
          className="max-h-60 overflow-y-auto border-zinc-800 bg-zinc-900"
        >
          {config.models.map((m) => (
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
              'px-2 py-0.5 text-[10px] capitalize transition-colors',
              session.thinkingLevel === level
                ? 'bg-emerald-950 text-emerald-400'
                : 'text-zinc-600 hover:text-zinc-400'
            )}
          >
            {level}
          </button>
        ))}
      </div>

      <button
        onClick={() => session.cwd && window.pi.shell.openPath(session.cwd)}
        className="ml-auto max-w-[200px] truncate text-[11px] text-zinc-600 transition-colors hover:text-zinc-400"
      >
        {session.cwd}
      </button>
    </div>
  )
}
