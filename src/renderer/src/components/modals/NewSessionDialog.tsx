// src/renderer/src/components/modals/NewSessionDialog.tsx
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useStore } from '@/store'
import type { AppThinkingLevel } from '@shared/types'

const THINKING_LEVELS: AppThinkingLevel[] = ['off', 'low', 'high']

export default function NewSessionDialog() {
  const ui = useStore((s) => s.ui)
  const config = useStore((s) => s.config)
  const closeNewSession = useStore((s) => s.closeNewSession)
  const setSessionActive = useStore((s) => s.setSessionActive)

  const [cwd, setCwd] = useState('~')
  const [model, setModel] = useState(config.defaultModel ?? '')
  const [provider, setProvider] = useState(config.defaultProvider ?? '')
  const [thinking, setThinking] = useState<AppThinkingLevel>(config.defaultThinkingLevel)
  const [loading, setLoading] = useState(false)

  // Fall back to config defaults if user hasn't made a selection yet
  const effectiveModel = model || config.defaultModel || ''
  const effectiveProvider = provider || config.defaultProvider || ''

  async function handleBrowse() {
    const dir = await window.pi.dialog.openDirectory()
    if (dir) setCwd(dir)
  }

  async function handleStart() {
    if (!cwd || !effectiveModel || !effectiveProvider) return
    setLoading(true)
    try {
      const { sessionId } = await window.pi.session.create({
        cwd,
        model: effectiveModel,
        provider: effectiveProvider,
        thinkingLevel: thinking,
      })
      setSessionActive({
        sessionId,
        cwd,
        model: effectiveModel,
        provider: effectiveProvider,
        thinkingLevel: thinking,
      })
      closeNewSession()
    } catch (err) {
      console.error('Failed to create session:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={ui.newSessionOpen} onOpenChange={(open) => !open && closeNewSession()}>
      <DialogContent
        data-testid="new-session-dialog"
        className="border-zinc-800 bg-[#161616] text-zinc-200 sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">New Session</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500">
              Working Directory
            </label>
            <div className="flex gap-2">
              <Input
                data-testid="cwd-input"
                value={cwd}
                onChange={(e) => setCwd(e.target.value)}
                className="flex-1 border-zinc-800 bg-zinc-900 text-xs text-zinc-300"
                placeholder="~/code/project"
              />
              <Button
                aria-label="Browse"
                variant="outline"
                size="sm"
                onClick={handleBrowse}
                className="border-zinc-800 bg-zinc-900 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Browse
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500">Model</label>
            <Select
              value={effectiveModel ? `${effectiveProvider}/${effectiveModel}` : ''}
              onValueChange={(val) => {
                const [p, ...rest] = val.split('/')
                setProvider(p)
                setModel(rest.join('/'))
              }}
            >
              <SelectTrigger
                data-testid="model-select"
                className="border-zinc-800 bg-zinc-900 text-xs text-zinc-300"
              >
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-zinc-900">
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
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500">Thinking</label>
            <div
              data-testid="thinking-control"
              className="flex overflow-hidden rounded-md border border-zinc-800"
            >
              {THINKING_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => setThinking(level)}
                  className={cn(
                    'flex-1 py-1.5 text-xs capitalize transition-colors',
                    thinking === level
                      ? 'bg-emerald-950 text-emerald-400'
                      : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button
            data-testid="cancel-session-btn"
            aria-label="Cancel"
            variant="outline"
            onClick={closeNewSession}
            className="border-zinc-800 bg-transparent text-xs text-zinc-500 hover:text-zinc-300"
          >
            Cancel
          </Button>
          <Button
            data-testid="start-session-btn"
            aria-label="Start"
            onClick={handleStart}
            disabled={loading || !cwd || !effectiveModel}
            className="bg-emerald-950 text-xs text-emerald-400 hover:bg-emerald-900"
          >
            {loading ? 'Starting…' : 'Start Session →'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
