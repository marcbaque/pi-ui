// src/renderer/src/components/sidebar/ModelList.tsx
import { cn } from '@/lib/utils'
import { useStore } from '@/store'

export default function ModelList() {
  const config = useStore((s) => s.config)
  const setConfig = useStore((s) => s.setConfig)

  function selectModel(provider: string, modelId: string) {
    setConfig({ ...config, defaultProvider: provider, defaultModel: modelId })
    window.pi.config
      .setDefaults({ defaultModel: modelId, defaultProvider: provider })
      .catch(console.error)
  }

  return (
    <div className="px-2 pb-2">
      <p className="mb-1 px-2 text-[10px] uppercase tracking-widest text-zinc-600">Models</p>
      {config.models.map((m) => {
        const selected = m.provider === config.defaultProvider && m.modelId === config.defaultModel
        return (
          <button
            key={`${m.provider}/${m.modelId}`}
            onClick={() => selectModel(m.provider, m.modelId)}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
              selected
                ? 'bg-emerald-950 text-emerald-400'
                : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 shrink-0 rounded-full',
                selected ? 'bg-emerald-400' : 'bg-zinc-700'
              )}
            />
            <span className="truncate">{m.displayName}</span>
          </button>
        )
      })}
      {config.models.length === 0 && (
        <p className="px-2 text-xs text-zinc-700">No models — add a provider key in Settings.</p>
      )}
    </div>
  )
}
