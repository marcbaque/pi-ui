// src/renderer/src/hooks/usePiEvents.ts
import { useEffect } from 'react'
import { useStore } from '../store'

/**
 * Registers global pi event listeners and routes each event to the correct
 * tab by sessionId. Call once at the App level — not per-tab.
 */
export function usePiEvents(): void {
  const appendToken = useStore((s) => s.appendToken)
  const setTabStatus = useStore((s) => s.setTabStatus)
  const finalizeAssistantMessage = useStore((s) => s.finalizeAssistantMessage)
  const addToolCall = useStore((s) => s.addToolCall)
  const resolveToolCall = useStore((s) => s.resolveToolCall)

  useEffect(() => {
    function findTabId(sessionId: string): string | null {
      const { tabs } = useStore.getState().tabs
      return tabs.find((t) => t.id === sessionId)?.id ?? null
    }

    const unsubs = [
      window.pi.on('pi:token', ({ sessionId, delta }) => {
        const tabId = findTabId(sessionId)
        if (!tabId) return
        appendToken(tabId, delta)
        setTabStatus(tabId, 'thinking')
      }),

      window.pi.on('pi:tool-start', ({ sessionId, toolCallId, toolName, args }) => {
        const tabId = findTabId(sessionId)
        if (!tabId) return
        addToolCall(tabId, { toolCallId, toolName, args })
      }),

      window.pi.on(
        'pi:tool-end',
        ({ sessionId, toolCallId, result, details, isError, durationMs }) => {
          const tabId = findTabId(sessionId)
          if (!tabId) return
          resolveToolCall(tabId, { toolCallId, result, details, isError, durationMs })
        }
      ),

      window.pi.on('pi:turn-end', () => {
        // Turn ended — assistant message finalized on pi:idle
      }),

      window.pi.on('pi:idle', ({ sessionId }) => {
        const tabId = findTabId(sessionId)
        if (!tabId) return
        finalizeAssistantMessage(tabId)
        setTabStatus(tabId, 'idle')
      }),

      window.pi.on('pi:error', ({ sessionId }) => {
        const tabId = findTabId(sessionId)
        if (!tabId) return
        setTabStatus(tabId, 'error')
      }),
    ]

    return () => unsubs.forEach((unsub) => unsub())
  }, [appendToken, setTabStatus, finalizeAssistantMessage, addToolCall, resolveToolCall])
}
