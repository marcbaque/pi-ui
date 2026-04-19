// src/renderer/src/components/chat/ChatPane.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ChatPane from './ChatPane'
import { useStore } from '../../store'

const mockSend = vi.fn(async () => {})
const mockAbort = vi.fn(async () => {})

vi.stubGlobal('pi', {
  session: { send: mockSend, abort: mockAbort },
  shell: { openPath: vi.fn() },
  on: vi.fn(() => () => {}),
})

function resetStore() {
  useStore.setState((useStore as unknown as { getInitialState: () => object }).getInitialState())
}

const MOCK_TAB = {
  id: 's1',
  sessionId: 's1',
  cwd: '/code',
  model: 'claude',
  provider: 'anthropic',
  thinkingLevel: 'low' as const,
  status: 'idle' as const,
  messages: [],
  currentStreamingContent: '',
  mode: 'active' as const,
}

describe('ChatPane', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it('shows empty state when no tabs are open', () => {
    render(<ChatPane />)
    expect(screen.getByText(/no active session/i)).toBeInTheDocument()
  })

  it('shows the message input when an active tab exists', () => {
    useStore.getState().createTab(MOCK_TAB)
    render(<ChatPane />)
    expect(screen.getByPlaceholderText(/send a message/i)).toBeInTheDocument()
  })

  it('sends a message on Enter and clears the input', async () => {
    useStore.getState().createTab(MOCK_TAB)
    render(<ChatPane />)
    const input = screen.getByPlaceholderText(/send a message/i)
    fireEvent.change(input, { target: { value: 'hello pi' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    await waitFor(() => expect(mockSend).toHaveBeenCalledWith('s1', 'hello pi'))
    expect((input as HTMLTextAreaElement).value).toBe('')
  })

  it('does not send on Shift+Enter', () => {
    useStore.getState().createTab(MOCK_TAB)
    render(<ChatPane />)
    const input = screen.getByPlaceholderText(/send a message/i)
    fireEvent.change(input, { target: { value: 'draft' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('shows Stop button while thinking and calls abort', async () => {
    useStore.getState().createTab(MOCK_TAB)
    useStore.getState().setTabStatus('s1', 'thinking')
    render(<ChatPane />)
    const stop = screen.getByRole('button', { name: /stop/i })
    fireEvent.click(stop)
    await waitFor(() => expect(mockAbort).toHaveBeenCalledWith('s1'))
  })

  it('renders user messages', () => {
    useStore.getState().createTab(MOCK_TAB)
    useStore.getState().addUserMessage('s1', 'hello')
    render(<ChatPane />)
    expect(screen.getByText('hello')).toBeInTheDocument()
  })
})
