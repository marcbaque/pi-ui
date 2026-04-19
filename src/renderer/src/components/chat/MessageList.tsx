// src/renderer/src/components/chat/MessageList.tsx
import { useStore } from '@/store'
import { useAutoScroll } from '@/hooks/useAutoScroll'
import ToolCallEntry from './ToolCallEntry'

export default function MessageList() {
  const session = useStore((s) => s.session)
  const scrollRef = useAutoScroll<HTMLDivElement>(
    session.messages.length + session.currentStreamingContent.length
  )

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto py-4">
      {session.messages.map((msg) => (
        <div key={msg.id}>
          <div className="px-5 py-2">
            <p
              className={`mb-1 text-[10px] font-semibold uppercase tracking-widest ${msg.role === 'user' ? 'text-emerald-500' : 'text-blue-400'}`}
            >
              {msg.role === 'user' ? 'You' : 'pi'}
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
              {msg.content}
            </p>
          </div>
          {msg.toolCalls.map((call) => (
            <ToolCallEntry key={call.id} call={call} />
          ))}
        </div>
      ))}

      {session.currentStreamingContent && (
        <div className="px-5 py-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-blue-400">
            pi
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
            {session.currentStreamingContent}
            <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-blue-400 align-middle" />
          </p>
        </div>
      )}
    </div>
  )
}
