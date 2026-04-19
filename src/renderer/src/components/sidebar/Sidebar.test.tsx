// src/renderer/src/components/sidebar/Sidebar.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useStore } from '@/store'
import Sidebar from './Sidebar'

vi.mock('@/store', () => ({
  useStore: vi.fn(),
}))

const mockStore = {
  openSettings: vi.fn(),
  history: {
    sessions: [],
    expandedCwds: [],
  },
  tabs: {
    tabs: [],
    activeTabId: null,
  },
  toggleCwdExpanded: vi.fn(),
  setSessions: vi.fn(),
  createTab: vi.fn(),
  setActiveTab: vi.fn(),
  setTabMessages: vi.fn(),
  setTabMode: vi.fn(),
}

beforeEach(() => {
  vi.mocked(useStore).mockImplementation((selector) =>
    selector(mockStore as unknown as Parameters<typeof selector>[0])
  )
})

describe('Sidebar', () => {
  it('renders sidebar root element', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
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
