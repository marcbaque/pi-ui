// src/renderer/src/hooks/usePiEvents.test.tsx
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePiEvents } from './usePiEvents'
import { useStore } from '../store'

type Handler = (payload: unknown) => void
const handlers: Record<string, Handler> = {}
const mockOn = vi.fn((event: string, handler: Handler) => {
  handlers[event] = handler
  return () => {
    delete handlers[event]
  }
})

vi.stubGlobal('window', {
  pi: { on: mockOn },
})

function resetStore() {
  useStore.setState((useStore as unknown as { getInitialState: () => object }).getInitialState())
}

const MOCK_TAB = {
  id: 'sess-1',
  sessionId: 'sess-1',
  cwd: '/code',
  model: 'claude',
  provider: 'anthropic',
  thinkingLevel: 'low' as const,
  status: 'idle' as const,
  messages: [],
  currentStreamingContent: '',
  mode: 'active' as const,
  diffPaneOpen: false,
  currentDiff: null,
  diffComments: [],
}

function getTab() {
  return useStore.getState().tabs.tabs.find((t) => t.id === 'sess-1')!
}

describe('usePiEvents', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
    Object.keys(handlers).forEach((k) => delete handlers[k])
    useStore.getState().createTab(MOCK_TAB)
  })

  it('registers listeners for all pi events on mount', () => {
    renderHook(() => usePiEvents())
    expect(mockOn).toHaveBeenCalledWith('pi:token', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('pi:tool-start', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('pi:tool-end', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('pi:idle', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('pi:error', expect.any(Function))
  })

  it('appends token on pi:token event', () => {
    renderHook(() => usePiEvents())
    act(() => {
      handlers['pi:token']({ sessionId: 'sess-1', delta: 'Hello' })
    })
    expect(getTab().currentStreamingContent).toBe('Hello')
  })

  it('sets status to thinking on pi:token', () => {
    renderHook(() => usePiEvents())
    act(() => {
      handlers['pi:token']({ sessionId: 'sess-1', delta: 'x' })
    })
    expect(getTab().status).toBe('thinking')
  })

  it('finalizes message and sets idle on pi:idle', () => {
    renderHook(() => usePiEvents())
    act(() => {
      handlers['pi:token']({ sessionId: 'sess-1', delta: 'Done!' })
    })
    act(() => {
      handlers['pi:idle']({ sessionId: 'sess-1' })
    })
    const tab = getTab()
    expect(tab.messages).toHaveLength(1)
    expect(tab.messages[0].content).toBe('Done!')
    expect(tab.status).toBe('idle')
  })

  it('adds a pending tool call on pi:tool-start', () => {
    renderHook(() => usePiEvents())
    act(() => {
      handlers['pi:token']({ sessionId: 'sess-1', delta: 'reading...' })
    })
    act(() => {
      handlers['pi:idle']({ sessionId: 'sess-1' })
    })
    act(() => {
      handlers['pi:token']({ sessionId: 'sess-1', delta: 'ok' })
    })
    act(() => {
      handlers['pi:tool-start']({
        sessionId: 'sess-1',
        toolCallId: 't1',
        toolName: 'read',
        args: { path: 'x.ts' },
      })
    })
    const lastMsg = getTab().messages.at(-1)!
    expect(lastMsg.toolCalls.some((c) => c.id === 't1' && c.status === 'pending')).toBe(true)
  })

  it('sets status to error on pi:error', () => {
    renderHook(() => usePiEvents())
    act(() => {
      handlers['pi:error']({ sessionId: 'sess-1' })
    })
    expect(getTab().status).toBe('error')
  })

  it('ignores events for a sessionId with no matching tab', () => {
    renderHook(() => usePiEvents())
    act(() => {
      handlers['pi:token']({ sessionId: 'OTHER', delta: 'ignore me' })
    })
    expect(getTab().currentStreamingContent).toBe('')
  })
})
