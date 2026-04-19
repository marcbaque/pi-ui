// src/renderer/src/components/tabs/Tab.tsx
import { cn } from '@/lib/utils'
import type { Tab } from '@/store/tabs-slice'

interface Props {
  tab: Tab
  isActive: boolean
  onActivate(): void
  onClose(): void
}

function StatusDot({ status, mode }: { status: Tab['status']; mode: Tab['mode'] }) {
  if (mode === 'readonly' || mode === 'loading' || mode === 'error') {
    return (
      <span
        data-testid="tab-status-dot"
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-600"
      />
    )
  }
  return (
    <span
      data-testid="tab-status-dot"
      className={cn('h-1.5 w-1.5 shrink-0 rounded-full', {
        'bg-yellow-400': status === 'thinking',
        'bg-emerald-400': status === 'idle',
        'bg-red-400': status === 'error',
      })}
    />
  )
}

export default function TabItem({ tab, isActive, onActivate, onClose }: Props) {
  const label = tab.cwd ? (tab.cwd.split('/').filter(Boolean).pop() ?? tab.cwd) : 'New session'

  return (
    <div
      data-testid={`tab-${tab.id}`}
      data-tab-item="true"
      onClick={onActivate}
      className={cn(
        'group flex max-w-[160px] cursor-pointer items-center gap-1.5 border-r border-[var(--pi-border-subtle)] px-3 py-2 text-xs transition-colors',
        isActive
          ? 'bg-[var(--pi-bg)] text-zinc-200'
          : 'bg-[var(--pi-sidebar-bg)] text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
      )}
    >
      <StatusDot status={tab.status} mode={tab.mode} />
      <span className="flex-1 truncate" data-testid="tab-label">
        {label}
      </span>
      <button
        data-testid="tab-close-btn"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded text-zinc-600 transition-colors hover:bg-zinc-700 hover:text-zinc-300',
          isActive ? 'visible' : 'invisible group-hover:visible'
        )}
        aria-label="Close tab"
      >
        ×
      </button>
    </div>
  )
}
