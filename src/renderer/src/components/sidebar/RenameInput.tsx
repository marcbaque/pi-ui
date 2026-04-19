// src/renderer/src/components/sidebar/RenameInput.tsx
import { useState, useEffect, useRef, type KeyboardEvent } from 'react'

interface Props {
  initialValue: string
  onConfirm(name: string): void
  onCancel(): void
}

export default function RenameInput({ initialValue, onConfirm, onCancel }: Props) {
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      onConfirm(value.trim() || initialValue)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  return (
    <input
      ref={inputRef}
      data-testid="rename-input"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onConfirm(value.trim() || initialValue)}
      className="w-full rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-200 outline-none"
    />
  )
}
