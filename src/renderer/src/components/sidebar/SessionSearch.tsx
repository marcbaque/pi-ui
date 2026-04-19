// src/renderer/src/components/sidebar/SessionSearch.tsx
import { useRef, type KeyboardEvent } from 'react'
import { Search, X } from 'lucide-react'

interface Props {
  value: string
  onChange(query: string): void
}

export default function SessionSearch({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      onChange('')
      inputRef.current?.blur()
    }
  }

  return (
    <div className="relative px-2 py-1.5">
      <Search size={11} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
      <input
        ref={inputRef}
        data-testid="session-search"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search sessions…"
        className="w-full rounded bg-zinc-900 py-1 pl-6 pr-6 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:ring-1 focus:ring-zinc-700"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
        >
          <X size={11} />
        </button>
      )}
    </div>
  )
}
