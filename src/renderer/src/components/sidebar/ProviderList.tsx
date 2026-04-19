// src/renderer/src/components/sidebar/ProviderList.tsx
import { cn } from '@/lib/utils'
import { useStore } from '@/store'

const CHIP: Record<string, string> = {
  ok: 'bg-emerald-950 text-emerald-400',
  no: 'bg-red-950 text-red-400',
}

export default function ProviderList() {
  const config = useStore((s) => s.config)
  const openSettings = useStore((s) => s.openSettings)

  return (
    <div className="px-2 pb-2">
      <p className="mb-1 px-2 text-[10px] uppercase tracking-widest text-zinc-600">Providers</p>
      {config.providers.map((p) => (
        <button
          key={p.name}
          onClick={openSettings}
          className="flex w-full items-center justify-between rounded-md px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-300"
        >
          <span className="truncate">{p.name}</span>
          <span
            className={cn('rounded-full px-2 py-0.5 text-[10px]', p.configured ? CHIP.ok : CHIP.no)}
          >
            {p.configured ? 'on' : 'off'}
          </span>
        </button>
      ))}
    </div>
  )
}
