// src/renderer/src/components/UpdateBanner.tsx
import { useStore } from '@/store'

export default function UpdateBanner() {
  const status = useStore((s) => s.ui.updateStatus)
  const version = useStore((s) => s.ui.updateVersion)
  const progress = useStore((s) => s.ui.updateProgress)
  const error = useStore((s) => s.ui.updateError)
  const setUpdateStatus = useStore((s) => s.setUpdateStatus)

  if (status === 'idle' || status === 'checking' || status === 'up-to-date') return null

  async function install() {
    await window.pi.update.install()
  }

  function dismiss() {
    setUpdateStatus('idle')
  }

  if (status === 'available' || status === 'downloading') {
    const label =
      status === 'available'
        ? `Update available${version ? ` (v${version})` : ''} — downloading…`
        : `Downloading update${version ? ` v${version}` : ''}… ${progress != null ? `${progress}%` : ''}`
    return (
      <div
        data-testid="update-banner"
        className="flex items-center gap-3 border-b border-[var(--pi-border-subtle)] bg-zinc-900 px-4 py-1.5 text-xs"
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--pi-warning)]" />
        <span className="flex-1 text-zinc-400">{label}</span>
        {status === 'downloading' && progress != null && (
          <div className="h-1 w-24 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-[var(--pi-accent)] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        <button
          onClick={dismiss}
          className="text-zinc-600 hover:text-zinc-300"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    )
  }

  if (status === 'ready') {
    return (
      <div
        data-testid="update-banner"
        className="flex items-center gap-3 border-b border-[var(--pi-border-subtle)] bg-zinc-900 px-4 py-1.5 text-xs"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--pi-success)]" />
        <span className="flex-1 text-zinc-400">
          Update ready{version ? ` (v${version})` : ''} — restart to install
        </span>
        <button
          data-testid="update-install-btn"
          onClick={install}
          className="rounded border border-[var(--pi-accent)] px-2 py-0.5 text-[var(--pi-accent)] transition-colors hover:bg-zinc-800"
        >
          Restart &amp; update
        </button>
        <button
          onClick={dismiss}
          className="text-zinc-600 hover:text-zinc-300"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div
        data-testid="update-banner"
        className="flex items-center gap-3 border-b border-[var(--pi-border-subtle)] bg-zinc-900 px-4 py-1.5 text-xs"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--pi-error)]" />
        <span className="flex-1 truncate text-zinc-500">
          Update check failed{error ? `: ${error}` : ''}
        </span>
        <button
          onClick={dismiss}
          className="text-zinc-600 hover:text-zinc-300"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    )
  }

  return null
}
