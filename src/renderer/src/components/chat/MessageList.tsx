// src/renderer/src/components/chat/MessageList.tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { useStore } from '@/store'
import { useAutoScroll } from '@/hooks/useAutoScroll'
import ToolCallEntry from './ToolCallEntry'
import type { Message } from '@shared/types'

interface Props {
  readonlyMessages?: Message[]
}

function PiMarkdown({ children }: { children: string }) {
  return (
    <div className="pi-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {children}
      </ReactMarkdown>
    </div>
  )
}

function UserMessage({ msg }: { msg: Message }) {
  return (
    <div
      data-testid="user-message"
      className="mx-3 my-2 rounded-md px-4 py-3"
      style={{ backgroundColor: 'var(--pi-user-msg-bg)' }}
    >
      <PiMarkdown>{msg.content}</PiMarkdown>
    </div>
  )
}

function AssistantMessage({ content, streaming }: { content: string; streaming?: boolean }) {
  return (
    <div data-testid="assistant-message" className="px-5 py-2">
      <p
        className="mb-2 text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: 'var(--pi-accent)' }}
      >
        pi
      </p>
      <PiMarkdown>{content}</PiMarkdown>
      {streaming && (
        <span
          className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse align-middle"
          style={{ backgroundColor: 'var(--pi-accent)' }}
        />
      )}
    </div>
  )
}

export default function MessageList({ readonlyMessages }: Props = {}) {
  const session = useStore((s) => s.session)
  const messages = readonlyMessages ?? session.messages
  const streamingContent = readonlyMessages ? '' : session.currentStreamingContent
  const scrollRef = useAutoScroll<HTMLDivElement>(messages.length + streamingContent.length)

  return (
    <div ref={scrollRef} data-testid="message-list" className="flex-1 overflow-y-auto py-2">
      {messages.map((msg) => (
        <div key={msg.id}>
          {msg.role === 'user' ? (
            <UserMessage msg={msg} />
          ) : (
            <AssistantMessage content={msg.content} />
          )}
          {msg.toolCalls.map((call) => (
            <ToolCallEntry key={call.id} call={call} />
          ))}
        </div>
      ))}

      {streamingContent && <AssistantMessage content={streamingContent} streaming />}
    </div>
  )
}
