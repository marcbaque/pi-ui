// src/renderer/src/hooks/useUpdateEvents.test.tsx
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useUpdateEvents } from './useUpdateEvents'
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

describe('useUpdateEvents', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
    Object.keys(handlers).forEach((k) => delete handlers[k])
  })

  it('registers update event listeners on mount', () => {
    renderHook(() => useUpdateEvents())
    expect(mockOn).toHaveBeenCalledWith('update:checking', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('update:available', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('update:not-available', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('update:progress', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('update:ready', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('update:error', expect.any(Function))
  })

  it('sets status to checking on update:checking', () => {
    renderHook(() => useUpdateEvents())
    act(() => {
      handlers['update:checking']({})
    })
    expect(useStore.getState().ui.updateStatus).toBe('checking')
  })

  it('sets status to available with version on update:available', () => {
    renderHook(() => useUpdateEvents())
    act(() => {
      handlers['update:available']({ version: '1.2.0' })
    })
    expect(useStore.getState().ui.updateStatus).toBe('available')
    expect(useStore.getState().ui.updateVersion).toBe('1.2.0')
  })

  it('sets status to up-to-date on update:not-available', () => {
    renderHook(() => useUpdateEvents())
    act(() => {
      handlers['update:not-available']({ version: '0.1.0' })
    })
    expect(useStore.getState().ui.updateStatus).toBe('up-to-date')
  })

  it('sets status to downloading with progress on update:progress', () => {
    renderHook(() => useUpdateEvents())
    act(() => {
      handlers['update:progress']({
        percent: 55,
        bytesPerSecond: 1000,
        transferred: 500,
        total: 1000,
      })
    })
    expect(useStore.getState().ui.updateStatus).toBe('downloading')
    expect(useStore.getState().ui.updateProgress).toBe(55)
  })

  it('sets status to ready on update:ready', () => {
    renderHook(() => useUpdateEvents())
    act(() => {
      handlers['update:ready']({ version: '1.2.0' })
    })
    expect(useStore.getState().ui.updateStatus).toBe('ready')
    expect(useStore.getState().ui.updateVersion).toBe('1.2.0')
  })

  it('sets status to error on update:error', () => {
    renderHook(() => useUpdateEvents())
    act(() => {
      handlers['update:error']({ message: 'net::ERR_CONNECTION_REFUSED' })
    })
    expect(useStore.getState().ui.updateStatus).toBe('error')
    expect(useStore.getState().ui.updateError).toBe('net::ERR_CONNECTION_REFUSED')
  })
})
