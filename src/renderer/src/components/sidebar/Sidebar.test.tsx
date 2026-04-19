// src/renderer/src/components/sidebar/Sidebar.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Sidebar from './Sidebar'
import { useStore } from '../../store'

vi.stubGlobal('window', {
  pi: { on: vi.fn(() => () => {}), config: { setDefaults: vi.fn(async () => {}) } },
})

function resetStore() {
  useStore.setState((useStore as unknown as { getInitialState: () => object }).getInitialState())
}

describe('Sidebar', () => {
  beforeEach(resetStore)

  it('renders the pi-ui logo', () => {
    render(<Sidebar />)
    const matches = screen.getAllByText((_, el) => el?.textContent === 'pi-ui')
    expect(matches.length).toBeGreaterThan(0)
  })

  it('renders each model from the store', () => {
    useStore.getState().setModels([
      {
        provider: 'github-copilot',
        modelId: 'claude-sonnet-4.6',
        displayName: 'Claude Sonnet 4.6',
        supportsThinking: true,
      },
      {
        provider: 'github-copilot',
        modelId: 'gpt-5',
        displayName: 'GPT-5',
        supportsThinking: false,
      },
    ])
    render(<Sidebar />)
    expect(screen.getByText('Claude Sonnet 4.6')).toBeInTheDocument()
    expect(screen.getByText('GPT-5')).toBeInTheDocument()
  })

  it('renders provider statuses', () => {
    useStore.getState().setConfig({
      providers: [
        { name: 'github-copilot', authType: 'oauth', configured: true },
        { name: 'anthropic', authType: 'apikey', configured: false },
      ],
      defaultModel: null,
      defaultProvider: null,
      defaultThinkingLevel: 'low',
      systemPrompt: '',
    })
    render(<Sidebar />)
    expect(screen.getByText('github-copilot')).toBeInTheDocument()
    expect(screen.getByText('anthropic')).toBeInTheDocument()
  })

  it('opens new session dialog when + button is clicked', () => {
    render(<Sidebar />)
    fireEvent.click(screen.getByRole('button', { name: /new session/i }))
    expect(useStore.getState().ui.newSessionOpen).toBe(true)
  })

  it('opens settings when Settings button is clicked', () => {
    render(<Sidebar />)
    fireEvent.click(screen.getByRole('button', { name: /settings/i }))
    expect(useStore.getState().ui.settingsOpen).toBe(true)
  })
})
