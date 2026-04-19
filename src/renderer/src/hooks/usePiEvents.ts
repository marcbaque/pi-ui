// src/renderer/src/hooks/usePiEvents.ts
import { useEffect } from 'react'
import { useStore } from '../store'

export function usePiEvents(sessionId: string | null): void {
  const appendToken = useStore((s) => s.appendToken)
  const setSessionStatus = useStore((s) => s.setSessionStatus)
  const finalizeAssistantMessage = useStore((s) => s.finalizeAssistantMessage)
  const addToolCall = useStore((s) => s.addToolCall)
  const resolveToolCall = useStore((s) => s.resolveToolCall)

  useEffect(() => {
    if (!sessionId) return

    const unsubs = [
      window.pi.on('pi:token', ({ sessionId: sid, delta }) => {
        if (sid !== sessionId) return
        appendToken(delta)
        setSessionStatus('thinking')
      }),

      window.pi.on('pi:tool-start', ({ sessionId: sid, toolCallId, toolName, args }) => {
        if (sid !== sessionId) return
        addToolCall({ toolCallId, toolName, args })
      }),

      window.pi.on('pi:tool-end', ({ sessionId: sid, toolCallId, result, isError, durationMs }) => {
        if (sid !== sessionId) return
        resolveToolCall({ toolCallId, result, isError, durationMs })
      }),

      window.pi.on('pi:turn-end', () => {
        // Turn ended — assistant message finalized on pi:idle
      }),

      window.pi.on('pi:idle', ({ sessionId: sid }) => {
        if (sid !== sessionId) return
        finalizeAssistantMessage()
        setSessionStatus('idle')
      }),

      window.pi.on('pi:error', ({ sessionId: sid }) => {
        if (sid !== sessionId) return
        setSessionStatus('error')
      }),
    ]

    return () => unsubs.forEach((unsub) => unsub())
  }, [
    sessionId,
    appendToken,
    setSessionStatus,
    finalizeAssistantMessage,
    addToolCall,
    resolveToolCall,
  ])
}
