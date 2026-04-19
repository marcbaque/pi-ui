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
  const setSessionStatus = useStore((s) => s.setSessionStatus)
  const homedir = useStore((s) => s.config.homedir)

  async function send() {
    const msg = value.trim()
    if (!msg || !session.sessionId) return
    setValue('')
    addUserMessage(msg)
    setSessionStatus('thinking')
    try {
      await window.pi.session.send(session.sessionId, msg)
    } catch (err) {
      console.error('[send]', err)
      setSessionStatus('error')
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
    <div className="border-t border-[var(--pi-border-subtle)] bg-[var(--pi-sidebar-bg)] px-3 py-3">
      <div className="relative rounded-lg border border-zinc-800 bg-zinc-900 focus-within:border-zinc-700">
        <textarea
          ref={textareaRef}
          data-testid="chat-input"
          value={thinking ? '' : value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={thinking}
          rows={1}
          placeholder={
            thinking
              ? 'pi is working…'
              : session.status === 'error'
                ? 'Something went wrong — try again'
                : 'Send a message… (Enter to send, Shift+Enter for newline)'
          }
          className="w-full resize-none bg-transparent px-3 py-2.5 text-zinc-300 placeholder-zinc-600 outline-none disabled:cursor-not-allowed"
          style={{ minHeight: 40, maxHeight: 160 }}
        />
        {!thinking && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Button
              data-testid="send-btn"
              aria-label="Send"
              size="sm"
              onClick={send}
              disabled={!value.trim()}
              className="h-7 border border-zinc-700 bg-zinc-800 px-2 text-zinc-400 hover:text-zinc-200"
            >
              ↵
            </Button>
          </div>
        )}
        {thinking && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Button
              data-testid="stop-btn"
              aria-label="Stop"
              size="sm"
              onClick={handleAbort}
              className="h-7 border border-zinc-700 bg-zinc-800 px-2 text-zinc-400 hover:text-zinc-200"
            >
              ■ Stop
            </Button>
          </div>
        )}
      </div>
      <div
        className="mt-1.5 flex items-center gap-2 px-1 font-mono"
        style={{ color: 'var(--pi-dim)' }}
      >
        {/* Status */}
        <span
          data-testid="status-dot"
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            session.status === 'thinking' ? 'animate-pulse' : ''
          }`}
          style={{
            backgroundColor:
              session.status === 'thinking'
                ? 'var(--pi-warning)'
                : session.status === 'error'
                  ? 'var(--pi-error)'
                  : 'var(--pi-success)',
          }}
        />
        <span
          data-testid="status-text"
          style={{
            color:
              session.status === 'thinking'
                ? 'var(--pi-warning)'
                : session.status === 'error'
                  ? 'var(--pi-error)'
                  : 'var(--pi-dim)',
          }}
        >
          {session.status}
        </span>

        {/* Model + thinking */}
        {session.model && (
          <>
            <span style={{ color: 'var(--pi-dim-dark)' }}>·</span>
            <span style={{ color: 'var(--pi-accent)' }}>{session.model}</span>
            {session.thinkingLevel && session.thinkingLevel !== 'off' && (
              <span style={{ color: 'var(--pi-dim)' }}>• {session.thinkingLevel}</span>
            )}
          </>
        )}

        {/* CWD */}
        {session.cwd && (
          <>
            <span style={{ color: 'var(--pi-dim-dark)' }}>·</span>
            <button
              onClick={() => window.pi.shell.openPath(session.cwd!)}
              className="truncate hover:underline"
              style={{ color: 'var(--pi-dim)', maxWidth: '200px' }}
            >
              {homedir ? session.cwd.replace(homedir, '~') : session.cwd}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
