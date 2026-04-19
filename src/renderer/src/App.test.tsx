// src/renderer/src/App.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from './App'

vi.stubGlobal('window', {
  pi: {
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
    on: vi.fn(() => () => {}),
  },
})

describe('App', () => {
  it('renders the shell without crashing', () => {
    render(<App />)
    expect(screen.getByText('pi-ui')).toBeInTheDocument()
  })
})
