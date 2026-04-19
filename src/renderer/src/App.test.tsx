// src/renderer/src/App.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from './App'

vi.stubGlobal('pi', {
  config: {
    get: vi.fn(async () => ({
      providers: [],
      defaultModel: null,
      defaultProvider: null,
      defaultThinkingLevel: 'low',
      systemPrompt: '',
    })),
  },
  models: { list: vi.fn(async () => []) },
  sessions: { list: vi.fn(async () => []) },
  on: vi.fn(() => () => {}),
})

describe('App', () => {
  it('renders sidebar and chat pane', () => {
    render(<App />)
    // Settings button in sidebar footer
    expect(screen.getByTestId('settings-btn')).toBeInTheDocument()
    // Chat empty state
    expect(screen.getByText(/no active session/i)).toBeInTheDocument()
  })
})
