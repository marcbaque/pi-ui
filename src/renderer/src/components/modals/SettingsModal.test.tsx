// src/renderer/src/components/modals/SettingsModal.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SettingsModal from './SettingsModal'
import { useStore } from '../../store'

const mockSetApiKey = vi.fn(async () => {})
const mockSetDefaults = vi.fn(async () => {})
const mockListModels = vi.fn(async () => [])

vi.stubGlobal('pi', {
  config: { setApiKey: mockSetApiKey, setDefaults: mockSetDefaults },
  models: { list: mockListModels },
  on: vi.fn(() => () => {}),
})

function resetStore() {
  useStore.setState((useStore as unknown as { getInitialState: () => object }).getInitialState())
}

describe('SettingsModal', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it('does not render when settingsOpen is false', () => {
    render(<SettingsModal />)
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('renders sections when open', () => {
    useStore.getState().openSettings()
    render(<SettingsModal />)
    expect(screen.getByText('API Keys')).toBeInTheDocument()
    expect(screen.getByText('Defaults')).toBeInTheDocument()
    expect(screen.getByText('System Prompt')).toBeInTheDocument()
  })

  it('calls config.setApiKey when Save is clicked', async () => {
    useStore.getState().openSettings()
    useStore.getState().setConfig({
      providers: [{ name: 'anthropic', authType: 'apikey', configured: false }],
      defaultModel: null,
      defaultProvider: null,
      defaultThinkingLevel: 'low',
      systemPrompt: '',
      homedir: '/Users/test',
    })
    render(<SettingsModal />)
    const input = screen.getByPlaceholderText(/sk-ant/i)
    fireEvent.change(input, { target: { value: 'sk-ant-abc' } })
    fireEvent.click(screen.getByRole('button', { name: /save anthropic/i }))
    await waitFor(() => expect(mockSetApiKey).toHaveBeenCalledWith('anthropic', 'sk-ant-abc'))
  })

  it('closes when the dialog onOpenChange fires with false', () => {
    useStore.getState().openSettings()
    render(<SettingsModal />)
    // Simulate ESC / overlay click by checking close button exists and store flips
    fireEvent.click(screen.getAllByRole('button', { name: /close/i })[0])
    expect(useStore.getState().ui.settingsOpen).toBe(false)
  })
})
