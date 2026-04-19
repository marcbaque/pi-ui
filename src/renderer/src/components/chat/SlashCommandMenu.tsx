// src/renderer/src/components/chat/SlashCommandMenu.tsx
import type { SlashCommand } from '@shared/types'

interface Props {
  commands: SlashCommand[]
  activeIndex: number
  onSelect(command: SlashCommand): void
  onDismiss(): void
}

const SOURCE_COLORS: Record<SlashCommand['source'], string> = {
  builtin: 'text-zinc-500',
  skill: 'text-emerald-600',
  prompt: 'text-blue-500',
  extension: 'text-purple-500',
}

export default function SlashCommandMenu({ commands, activeIndex, onSelect }: Props) {
  if (commands.length === 0) {
    return (
      <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-zinc-800 bg-zinc-900 py-2 shadow-lg">
        <p className="px-3 py-1 text-xs text-zinc-600">No commands match</p>
      </div>
    )
  }

  return (
    <div
      role="listbox"
      className="absolute bottom-full left-0 right-0 mb-1 max-h-56 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 py-1 shadow-lg"
    >
      {commands.map((cmd, i) => (
        <div
          key={cmd.name}
          role="option"
          aria-selected={i === activeIndex}
          onMouseDown={(e) => {
            // mouseDown prevents textarea blur before click fires
            e.preventDefault()
            onSelect(cmd)
          }}
          className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs ${
            i === activeIndex ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'
          }`}
        >
          <span className="font-mono text-zinc-200">{cmd.name}</span>
          <span className={`shrink-0 text-[10px] ${SOURCE_COLORS[cmd.source]}`}>{cmd.source}</span>
          {cmd.description && (
            <span className="ml-auto truncate text-zinc-600">{cmd.description}</span>
          )}
        </div>
      ))}
    </div>
  )
}
