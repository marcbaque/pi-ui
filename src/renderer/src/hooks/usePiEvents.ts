import { useEffect } from 'react'
import { useStore } from '../store'

const DIFF_TOOLS = new Set(['write', 'edit', 'read_write', 'patch'])

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
  const setTabDiff = useStore((s) => s.setTabDiff)

  useEffect(() => {
    function findTabId(sessionId: string): string | null {
      const { tabs } = useStore.getState().tabs
      return tabs.find((t) => t.id === sessionId)?.id ?? null
    }

    // Track tool call args by toolCallId so pi:tool-end can access them
    const toolArgs = new Map<string, Record<string, unknown>>()

    const unsubs = [
      window.pi.on('pi:token', ({ sessionId, delta }) => {
        console.log(`[usePiEvents] pi:token sessionId=${sessionId} tabId=${findTabId(sessionId)}`)
        const tabId = findTabId(sessionId)
        if (!tabId) return
        appendToken(tabId, delta)
        setTabStatus(tabId, 'thinking')
      }),

      window.pi.on('pi:tool-start', ({ sessionId, toolCallId, toolName, args }) => {
        const tabId = findTabId(sessionId)
        if (!tabId) return
        toolArgs.set(toolCallId, args)
        addToolCall(tabId, { toolCallId, toolName, args })
      }),

      window.pi.on(
        'pi:tool-end',
        ({ sessionId, toolCallId, toolName, result, details, isError, durationMs }) => {
          const tabId = findTabId(sessionId)
          if (!tabId) return
          resolveToolCall(tabId, { toolCallId, result, details, isError, durationMs })
          // Auto-open diff pane for write/edit tools with non-empty result
          if (DIFF_TOOLS.has(toolName) && result?.trim()) {
            const args = toolArgs.get(toolCallId)
            const path = typeof args?.path === 'string' ? args.path : 'unknown'
            setTabDiff(tabId, { path, unifiedDiff: result })
          }
          toolArgs.delete(toolCallId)
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
  }, [
    appendToken,
    setTabStatus,
    finalizeAssistantMessage,
    addToolCall,
    resolveToolCall,
    setTabDiff,
  ])
}
