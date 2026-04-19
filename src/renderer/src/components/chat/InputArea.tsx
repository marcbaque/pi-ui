// src/renderer/src/components/chat/InputArea.tsx
import { useState, useRef, type KeyboardEvent } from 'react'
import { useStore } from '@/store'
import { Button } from '@/components/ui/button'

export default function InputArea() {
  const session = useStore((s) => s.session)
  const addUserMessage = useStore((s) => s.addUserMessage)
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const thinking = session.status === 'thinking'

  async function send() {
    const msg = value.trim()
    if (!msg || !session.sessionId) return
    setValue('')
    addUserMessage(msg)
    try {
      await window.pi.session.send(session.sessionId, msg)
    } catch (err) {
      console.error(err)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  async function handleAbort() {
    if (!session.sessionId) return
    await window.pi.session.abort(session.sessionId)
  }

  return (
    <div className="border-t border-zinc-900 bg-[#0a0a0a] px-3 py-3">
      <div className="relative rounded-lg border border-zinc-800 bg-zinc-900 focus-within:border-zinc-700">
        <textarea
          ref={textareaRef}
          value={thinking ? '' : value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={thinking}
          rows={1}
          placeholder={
            thinking ? 'pi is working…' : 'Send a message… (Enter to send, Shift+Enter for newline)'
          }
          className="w-full resize-none bg-transparent px-3 py-2.5 text-sm text-zinc-300 placeholder-zinc-600 outline-none disabled:cursor-not-allowed"
          style={{ minHeight: 40, maxHeight: 160 }}
        />
        {thinking && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Button
              aria-label="Stop"
              size="sm"
              onClick={handleAbort}
              className="h-7 border border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-400 hover:text-zinc-200"
            >
              ■ Stop
            </Button>
          </div>
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-3 px-1">
        <span
          className={`flex items-center gap-1.5 text-[11px] ${session.status === 'thinking' ? 'text-amber-600' : session.status === 'error' ? 'text-red-600' : 'text-zinc-700'}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${session.status === 'thinking' ? 'animate-pulse bg-amber-500' : session.status === 'error' ? 'bg-red-500' : 'bg-emerald-700'}`}
          />
          {session.status}
        </span>
        <span className="ml-auto text-[11px] text-zinc-700">
          {session.model} · {session.cwd}
        </span>
      </div>
    </div>
  )
}
