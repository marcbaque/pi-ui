// src/renderer/src/components/chat/InputArea.tsx
import { useState, useRef, type KeyboardEvent, type DragEvent } from 'react'
import { useStore } from '@/store'
import { useActiveTab } from '@/hooks/useActiveTab'
import { Button } from '@/components/ui/button'
import FileChips, { type AttachedFile } from './FileChips'

const EXT_LANG: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  go: 'go',
  java: 'java',
  cs: 'csharp',
  cpp: 'cpp',
  c: 'c',
  h: 'c',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  md: 'markdown',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  css: 'css',
  html: 'html',
  sql: 'sql',
  xml: 'xml',
  txt: 'text',
}

function isBinary(content: string): boolean {
  for (let i = 0; i < Math.min(content.length, 8192); i++) {
    if (content.charCodeAt(i) === 0) return true
  }
  return false
}

function buildMessage(text: string, files: AttachedFile[]): string {
  const validFiles = files.filter((f) => !f.error)
  if (validFiles.length === 0) return text
  const fileParts = validFiles
    .map((f) => {
      const ext = f.name.split('.').pop() ?? ''
      const lang = EXT_LANG[ext] ?? ext
      return `**Attached file: \`${f.name}\`**\n\`\`\`${lang}\n${f.content}\n\`\`\``
    })
    .join('\n\n')
  return text ? `${fileParts}\n\n${text}` : fileParts
}

export default function InputArea() {
  const tab = useActiveTab()
  const addUserMessage = useStore((s) => s.addUserMessage)
  const setTabStatus = useStore((s) => s.setTabStatus)
  const homedir = useStore((s) => s.config.homedir)
  const [value, setValue] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  if (!tab || tab.mode !== 'active') return null

  const thinking = tab.status === 'thinking'
  const hasErrors = attachedFiles.some((f) => f.error)
  const hasContent = value.trim().length > 0 || attachedFiles.filter((f) => !f.error).length > 0
  const canSend = !thinking && hasContent && !hasErrors

  function addFile(name: string, path: string, content: string) {
    if (isBinary(content)) {
      setAttachedFiles((prev) => [
        ...prev,
        { id: crypto.randomUUID(), name, path, content: '', error: 'Binary file' },
      ])
      return
    }
    if (content.length > 512 * 1024) {
      setAttachedFiles((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          name,
          path,
          content: '',
          error: 'File too large (max 500KB)',
        },
      ])
      return
    }
    setAttachedFiles((prev) => [...prev, { id: crypto.randomUUID(), name, path, content }])
  }

  async function send() {
    if (!tab || !canSend) return
    const msg = buildMessage(value.trim(), attachedFiles)
    setValue('')
    setAttachedFiles([])
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

  async function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    for (const file of files) {
      try {
        const content = await file.text()
        addFile(file.name, file.name, content)
      } catch {
        setAttachedFiles((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            name: file.name,
            path: file.name,
            content: '',
            error: 'Could not read file',
          },
        ])
      }
    }
    textareaRef.current?.focus()
  }

  async function handlePaperclip() {
    try {
      const result = await window.pi.dialog.pickFile()
      if (!result) return
      addFile(result.name, result.path, result.content)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not read file'
      setAttachedFiles((prev) => [
        ...prev,
        { id: crypto.randomUUID(), name: 'file', path: '', content: '', error: msg },
      ])
    }
    textareaRef.current?.focus()
  }

  return (
    <div
      className={`border-t border-[var(--pi-border-subtle)] bg-[var(--pi-sidebar-bg)] transition-colors ${
        isDragging ? 'ring-1 ring-inset ring-[var(--pi-accent)]' : ''
      }`}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <FileChips
        files={attachedFiles}
        onRemove={(id) => setAttachedFiles((f) => f.filter((x) => x.id !== id))}
      />

      <div className="px-3 py-3">
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
                  : isDragging
                    ? 'Drop file to attach…'
                    : 'Send a message… (Enter to send, Shift+Enter for newline)'
            }
            className="w-full resize-none bg-transparent px-3 py-2.5 pr-16 text-zinc-300 placeholder-zinc-600 outline-none disabled:cursor-not-allowed"
            style={{ minHeight: 40, maxHeight: 160 }}
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {!thinking && (
              <button
                data-testid="attach-btn"
                onClick={handlePaperclip}
                title="Attach file"
                className="flex h-7 w-7 items-center justify-center rounded text-zinc-600 hover:text-zinc-400"
              >
                📎
              </button>
            )}
            {!thinking && (
              <Button
                data-testid="send-btn"
                aria-label="Send"
                size="sm"
                onClick={send}
                disabled={!canSend}
                className="h-7 border border-zinc-700 bg-zinc-800 px-2 text-zinc-400 hover:text-zinc-200"
              >
                ↵
              </Button>
            )}
            {thinking && (
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
            )}
          </div>
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
    </div>
  )
}
