// src/renderer/src/components/sidebar/Sidebar.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useStore } from '@/store'
import Sidebar from './Sidebar'

vi.mock('@/store', () => ({
  useStore: vi.fn(),
}))

const mockStore = {
  openNewSession: vi.fn(),
  openSettings: vi.fn(),
  history: {
    sessions: [],
    expandedCwds: [],
    selectedSessionId: null,
    loadedMessages: [],
    loadStatus: 'idle' as const,
  },
  toggleCwdExpanded: vi.fn(),
  selectSession: vi.fn(),
  setLoadStatus: vi.fn(),
  setLoadedMessages: vi.fn(),
  setSessions: vi.fn(),
  clearReadonly: vi.fn(),
}

beforeEach(() => {
  vi.mocked(useStore).mockImplementation((selector) =>
    selector(mockStore as unknown as Parameters<typeof selector>[0])
  )
})

describe('Sidebar', () => {
  it('renders header with new session button', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('new-session-btn')).toBeInTheDocument()
  })

  it('renders settings button in footer', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('settings-btn')).toBeInTheDocument()
  })

  it('shows empty state when no sessions', () => {
    render(<Sidebar />)
    expect(screen.getByText(/no sessions yet/i)).toBeInTheDocument()
  })
})
