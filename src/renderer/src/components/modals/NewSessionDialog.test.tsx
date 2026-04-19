// src/renderer/src/components/modals/NewSessionDialog.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import NewSessionDialog from './NewSessionDialog'
import { useStore } from '../../store'

const mockCreate = vi.fn(async () => ({ sessionId: 'new-sess' }))
const mockOpenDir = vi.fn(async () => '/selected/dir')

vi.stubGlobal('pi', {
  session: { create: mockCreate },
  dialog: { openDirectory: mockOpenDir },
  on: vi.fn(() => () => {}),
})

function resetStore() {
  useStore.setState((useStore as unknown as { getInitialState: () => object }).getInitialState())
}

describe('NewSessionDialog', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
    useStore
      .getState()
      .setModels([
        { provider: 'anthropic', modelId: 'claude', displayName: 'Claude', supportsThinking: true },
      ])
    useStore.getState().setConfig({
      providers: [],
      defaultModel: 'claude',
      defaultProvider: 'anthropic',
      defaultThinkingLevel: 'low',
      systemPrompt: '',
      homedir: '/Users/test',
      defaultWorkingDirectory: null,
    })
  })

  it('does not render when newSessionOpen is false', () => {
    render(<NewSessionDialog />)
    expect(screen.queryByText('New Session')).not.toBeInTheDocument()
  })

  it('renders when newSessionOpen is true', () => {
    useStore.getState().openNewSession()
    render(<NewSessionDialog />)
    expect(screen.getByText('New Session')).toBeInTheDocument()
  })

  it('opens directory picker when Browse is clicked', async () => {
    useStore.getState().openNewSession()
    render(<NewSessionDialog />)
    fireEvent.click(screen.getByRole('button', { name: /browse/i }))
    await waitFor(() => expect(mockOpenDir).toHaveBeenCalled())
  })

  it('calls session.create and closes dialog on Start', async () => {
    useStore.getState().openNewSession()
    render(<NewSessionDialog />)
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    await waitFor(() => expect(mockCreate).toHaveBeenCalled())
    expect(useStore.getState().ui.newSessionOpen).toBe(false)
  })
})
