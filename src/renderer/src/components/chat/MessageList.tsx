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
      className="mx-3 my-1 rounded px-3 py-2"
      style={{ backgroundColor: 'var(--pi-user-msg-bg)' }}
    >
      <PiMarkdown>{msg.content}</PiMarkdown>
    </div>
  )
}

function AssistantMessage({ content, streaming }: { content: string; streaming?: boolean }) {
  return (
    <div data-testid="assistant-message" className="px-4 py-1.5">
      <PiMarkdown>{content}</PiMarkdown>
      {streaming && (
        <span
          className="ml-0.5 inline-block h-3 w-0.5 animate-pulse align-middle"
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
    <div ref={scrollRef} data-testid="message-list" className="flex-1 overflow-y-auto py-1">
      {messages.map((msg) => (
        <div key={msg.id} className="mb-1">
          {msg.role === 'user' ? (
            <UserMessage msg={msg} />
          ) : (
            <AssistantMessage content={msg.content} />
          )}
          {msg.toolCalls.length > 0 && (
            <div className="mt-0.5 space-y-px">
              {msg.toolCalls.map((call) => (
                <ToolCallEntry key={call.id} call={call} />
              ))}
            </div>
          )}
        </div>
      ))}

      {streamingContent && <AssistantMessage content={streamingContent} streaming />}
    </div>
  )
}
