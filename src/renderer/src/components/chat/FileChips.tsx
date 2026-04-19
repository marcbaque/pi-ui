// src/renderer/src/components/chat/FileChips.tsx

export interface AttachedFile {
  id: string
  name: string
  path: string
  content: string
  error?: string
}

interface Props {
  files: AttachedFile[]
  onRemove(id: string): void
}

export default function FileChips({ files, onRemove }: Props) {
  if (files.length === 0) return null
  return (
    <div data-testid="file-chips" className="flex flex-wrap gap-1.5 px-3 pb-0 pt-2">
      {files.map((f) => (
        <div
          key={f.id}
          data-testid={`file-chip-${f.name}`}
          className={`flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[11px] ${
            f.error
              ? 'border-[var(--pi-error)] text-[var(--pi-error)]'
              : 'border-zinc-700 text-zinc-400'
          }`}
          title={f.error ?? f.path}
        >
          <span className="max-w-[180px] truncate">{f.name}</span>
          {f.error && <span className="ml-1 opacity-70 text-[10px]">({f.error})</span>}
          <button
            onClick={() => onRemove(f.id)}
            className="ml-0.5 text-zinc-600 hover:text-zinc-300"
            aria-label={`Remove ${f.name}`}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
