// src/renderer/src/components/modals/SettingsModal.tsx
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useStore } from '@/store'
import type { AppThinkingLevel } from '@shared/types'

const THINKING_LEVELS: AppThinkingLevel[] = ['off', 'low', 'high']

export default function SettingsModal() {
  const ui = useStore((s) => s.ui)
  const config = useStore((s) => s.config)
  const closeSettings = useStore((s) => s.closeSettings)
  const setConfig = useStore((s) => s.setConfig)
  const setModels = useStore((s) => s.setModels)

  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [systemPrompt, setSystemPrompt] = useState(config.systemPrompt)
  const [thinking, setThinking] = useState<AppThinkingLevel>(config.defaultThinkingLevel)

  async function handleSaveApiKey(provider: string) {
    const key = apiKeys[provider]
    if (!key) return
    await window.pi.config.setApiKey(provider, key)
    const models = await window.pi.models.list()
    setModels(models)
    setConfig({
      ...config,
      providers: config.providers.map((p) =>
        p.name === provider ? { ...p, configured: true } : p
      ),
    })
  }

  async function handleSaveDefaults() {
    await window.pi.config.setDefaults({ defaultThinkingLevel: thinking, systemPrompt })
    setConfig({ ...config, defaultThinkingLevel: thinking, systemPrompt })
  }

  const apiKeyProviders = config.providers.filter((p) => p.authType === 'apikey')
  const oauthProviders = config.providers.filter((p) => p.authType === 'oauth')

  return (
    <Dialog open={ui.settingsOpen} onOpenChange={(open) => !open && closeSettings()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto border-zinc-800 bg-[#161616] text-zinc-200 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Settings</DialogTitle>
        </DialogHeader>

        <Button
          aria-label="Close"
          variant="ghost"
          size="sm"
          onClick={closeSettings}
          className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300"
        >
          ✕
        </Button>

        {oauthProviders.length > 0 && (
          <div className="border-t border-zinc-900 pt-4">
            <p className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">
              Connected Accounts
            </p>
            {oauthProviders.map((p) => (
              <div key={p.name} className="mb-2 flex items-center justify-between">
                <span className="text-xs text-zinc-400">{p.name}</span>
                {p.configured ? (
                  <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] text-emerald-400">
                    ● connected
                  </span>
                ) : (
                  <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">
                    Run <code className="font-mono">pi /login</code>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-zinc-900 pt-4">
          <p className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">API Keys</p>
          {apiKeyProviders.map((p) => (
            <div key={p.name} className="mb-3 flex items-center gap-2">
              <span className="w-24 shrink-0 text-xs text-zinc-400">{p.name}</span>
              <Input
                type="password"
                placeholder={
                  p.name === 'anthropic' ? 'sk-ant-…' : p.name === 'openai' ? 'sk-…' : 'API key'
                }
                value={apiKeys[p.name] ?? ''}
                onChange={(e) => setApiKeys((prev) => ({ ...prev, [p.name]: e.target.value }))}
                className={cn(
                  'flex-1 border-zinc-800 bg-zinc-900 font-mono text-xs',
                  p.configured && 'border-emerald-900 text-emerald-400'
                )}
              />
              <Button
                aria-label={`Save ${p.name}`}
                size="sm"
                onClick={() => handleSaveApiKey(p.name)}
                disabled={!apiKeys[p.name]}
                className="border border-zinc-800 bg-zinc-900 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Save
              </Button>
            </div>
          ))}
          {apiKeyProviders.length === 0 && (
            <p className="text-xs text-zinc-700">No API key providers configured.</p>
          )}
        </div>

        <div className="border-t border-zinc-900 pt-4">
          <p className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">Defaults</p>
          <div className="mb-3">
            <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-zinc-600">
              Thinking Level
            </label>
            <div className="flex overflow-hidden rounded border border-zinc-800">
              {THINKING_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => setThinking(level)}
                  className={cn(
                    'flex-1 py-1.5 text-xs capitalize',
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

        <div className="border-t border-zinc-900 pt-4">
          <p className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">System Prompt</p>
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={4}
            placeholder="Global default system prompt for all sessions…"
            className="border-zinc-800 bg-zinc-900 text-xs text-zinc-300 placeholder-zinc-700"
          />
          <div className="mt-3 flex justify-end">
            <Button
              onClick={handleSaveDefaults}
              className="bg-emerald-950 text-xs text-emerald-400 hover:bg-emerald-900"
            >
              Save defaults
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
