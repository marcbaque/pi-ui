// src/renderer/src/components/chat/InputArea.tsx
import { useState, useRef, type KeyboardEvent } from 'react'
import { useStore } from '@/store'
import { useActiveTab } from '@/hooks/useActiveTab'
import { Button } from '@/components/ui/button'

export default function InputArea() {
  const tab = useActiveTab()
  const addUserMessage = useStore((s) => s.addUserMessage)
  const setTabStatus = useStore((s) => s.setTabStatus)
  const homedir = useStore((s) => s.config.homedir)
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  if (!tab || tab.mode !== 'active') return null

  const thinking = tab.status === 'thinking'

  async function send() {
    if (!tab) return
    const msg = value.trim()
    if (!msg || !tab.sessionId) return
    setValue('')
    addUserMessage(tab.id, msg)
    setTabStatus(tab.id, 'thinking')
    try {
      await window.pi.session.send(tab.sessionId, msg)
    } catch (err) {
      console.error('[send]', err)
      setTabStatus(tab.id, 'error')
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  async function handleAbort() {
    if (!tab?.sessionId) return
    await window.pi.session.abort(tab.sessionId)
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
              : tab.status === 'error'
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
              variant="ghost"
              onClick={handleAbort}
              className="h-7 border border-zinc-700 bg-zinc-800 px-2 text-zinc-500 hover:text-zinc-300"
            >
              ■
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
            tab.status === 'thinking' ? 'animate-pulse' : ''
          }`}
          style={{
            backgroundColor:
              tab.status === 'thinking'
                ? 'var(--pi-warning)'
                : tab.status === 'error'
                  ? 'var(--pi-error)'
                  : 'var(--pi-success)',
          }}
        />
        <span
          data-testid="status-text"
          style={{
            color:
              tab.status === 'thinking'
                ? 'var(--pi-warning)'
                : tab.status === 'error'
                  ? 'var(--pi-error)'
                  : 'var(--pi-dim)',
          }}
        >
          {tab.status}
        </span>

        {/* Model + thinking */}
        {tab.model && (
          <>
            <span style={{ color: 'var(--pi-dim-dark)' }}>·</span>
            <span style={{ color: 'var(--pi-accent)' }}>{tab.model}</span>
            {tab.thinkingLevel && tab.thinkingLevel !== 'off' && (
              <span style={{ color: 'var(--pi-dim)' }}>• {tab.thinkingLevel}</span>
            )}
          </>
        )}

        {/* CWD */}
        {tab.cwd && (
          <>
            <span style={{ color: 'var(--pi-dim-dark)' }}>·</span>
            <button
              onClick={() => window.pi.shell.openPath(tab.cwd!)}
              className="truncate hover:underline"
              style={{ color: 'var(--pi-dim)', maxWidth: '200px' }}
            >
              {homedir ? tab.cwd.replace(homedir, '~') : tab.cwd}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
