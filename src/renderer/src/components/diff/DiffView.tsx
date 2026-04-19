// src/renderer/src/components/diff/DiffView.tsx
import { useState } from 'react'
import { parseDiff, type DiffLine, type DiffLineType } from '@/lib/diff-parse'
import type { DiffComment } from '@shared/types'

interface Props {
  unifiedDiff: string
  comments: DiffComment[]
  onAddComment(comment: DiffComment): void
  onRemoveComment(commentId: string): void
}

function lineBackground(type: DiffLineType): string {
  switch (type) {
    case 'added':
      return 'rgba(181,189,104,0.08)'
    case 'removed':
      return 'rgba(204,102,102,0.10)'
    case 'hunk':
      return 'rgba(138,190,183,0.06)'
    default:
      return 'transparent'
  }
}

function lineColor(type: DiffLineType): string {
  switch (type) {
    case 'added':
      return 'var(--pi-success)'
    case 'removed':
      return 'var(--pi-error)'
    case 'hunk':
    case 'header':
      return 'var(--pi-accent)'
    default:
      return 'var(--pi-dim)'
  }
}

function lineSign(type: DiffLineType): string {
  switch (type) {
    case 'added':
      return '+'
    case 'removed':
      return '-'
    default:
      return ' '
  }
}

interface CommentInputProps {
  lineContent: string
  lineType: 'added' | 'removed' | 'context'
  onSubmit(text: string): void
  onCancel(): void
}

function CommentInput({ lineContent, lineType, onSubmit, onCancel }: CommentInputProps) {
  const [text, setText] = useState('')
  return (
    <div
      className="mx-2 my-1 rounded border border-zinc-700 bg-zinc-900 p-2"
      style={{ fontSize: 12 }}
    >
      <div className="mb-1 truncate font-mono text-[10px]" style={{ color: 'var(--pi-dim)' }}>
        {lineType === 'added' ? '+' : lineType === 'removed' ? '-' : ' '} {lineContent}
      </div>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            onCancel()
          }
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && text.trim()) {
            e.preventDefault()
            onSubmit(text.trim())
          }
        }}
        placeholder="Add a comment… (⌘Enter to save, Esc to cancel)"
        className="w-full resize-none rounded bg-zinc-800 px-2 py-1.5 font-sans text-xs text-zinc-300 placeholder-zinc-600 outline-none"
        rows={3}
      />
      <div className="mt-1.5 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-300"
        >
          Cancel
        </button>
        <button
          onClick={() => text.trim() && onSubmit(text.trim())}
          disabled={!text.trim()}
          className="rounded bg-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-600 disabled:opacity-40"
        >
          Add comment
        </button>
      </div>
    </div>
  )
}

function isCommentable(line: DiffLine): boolean {
  return line.type === 'added' || line.type === 'removed' || line.type === 'context'
}

export default function DiffView({ unifiedDiff, comments, onAddComment, onRemoveComment }: Props) {
  const lines = parseDiff(unifiedDiff)
  const [commentingIndex, setCommentingIndex] = useState<number | null>(null)

  // Group comments by lineIndex
  const commentsByLine = new Map<number, DiffComment[]>()
  for (const c of comments) {
    if (!commentsByLine.has(c.lineIndex)) commentsByLine.set(c.lineIndex, [])
    commentsByLine.get(c.lineIndex)!.push(c)
  }

  return (
    <div className="flex-1 overflow-y-auto font-mono text-xs leading-5" data-testid="diff-view">
      {lines.map((line, i) => {
        const commentable = isCommentable(line)
        const lineComments = commentsByLine.get(i) ?? []

        return (
          <div key={i}>
            {/* Diff line */}
            <div
              className="group flex items-center"
              style={{ backgroundColor: lineBackground(line.type) }}
              data-testid={`diff-line-${i}`}
            >
              {/* Line numbers */}
              <span
                className="w-9 shrink-0 select-none px-1 text-right tabular-nums"
                style={{ color: 'var(--pi-dim-dark)' }}
              >
                {line.lineNumBefore ?? ''}
              </span>
              <span
                className="w-9 shrink-0 select-none px-1 text-right tabular-nums"
                style={{ color: 'var(--pi-dim-dark)' }}
              >
                {line.lineNumAfter ?? ''}
              </span>

              {/* Sign */}
              <span
                className="w-4 shrink-0 select-none text-center"
                style={{ color: lineColor(line.type) }}
              >
                {lineSign(line.type)}
              </span>

              {/* Content */}
              <span
                className="flex-1 whitespace-pre-wrap break-all pr-1"
                style={{ color: lineColor(line.type) }}
              >
                {line.content}
              </span>

              {/* Gutter + button — always in DOM, visible on hover via group-hover */}
              {commentable && (
                <button
                  data-testid={`diff-gutter-btn-${i}`}
                  onClick={() => setCommentingIndex(commentingIndex === i ? null : i)}
                  className="w-5 shrink-0 text-center text-[11px] opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ color: 'var(--pi-accent)' }}
                  title="Add comment"
                  aria-label="Add comment"
                >
                  +
                </button>
              )}
            </div>

            {/* Inline comment input */}
            {commentingIndex === i && (
              <CommentInput
                lineContent={line.content}
                lineType={line.type as 'added' | 'removed' | 'context'}
                onSubmit={(text) => {
                  onAddComment({
                    id: crypto.randomUUID(),
                    lineIndex: i,
                    lineContent: line.content,
                    lineType: line.type as 'added' | 'removed' | 'context',
                    content: text,
                  })
                  setCommentingIndex(null)
                }}
                onCancel={() => setCommentingIndex(null)}
              />
            )}

            {/* Existing comments for this line */}
            {lineComments.map((c) => (
              <div
                key={c.id}
                data-testid="diff-comment"
                className="mx-2 my-0.5 flex items-start gap-2 rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5"
              >
                <span className="flex-1 whitespace-pre-wrap text-xs text-zinc-300">
                  {c.content}
                </span>
                <button
                  onClick={() => onRemoveComment(c.id)}
                  className="shrink-0 text-zinc-600 hover:text-zinc-300"
                  aria-label="Remove comment"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
