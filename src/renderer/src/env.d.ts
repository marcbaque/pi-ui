/// <reference types="vite/client" />

import type { PiAPI } from '../../shared/types'

interface MockPiControl {
  emitToken(sessionId: string, delta: string): void
  emitToolStart(
    sessionId: string,
    toolCallId: string,
    toolName: string,
    args: Record<string, unknown>
  ): void
  emitToolEnd(
    sessionId: string,
    toolCallId: string,
    toolName: string,
    result: string,
    isError: boolean,
    durationMs: number
  ): void
  emitTurnEnd(sessionId: string): void
  emitIdle(sessionId: string): void
  emitError(sessionId: string, message: string): void
  getLastSessionId(): string
  getSessions(): import('../../shared/types').SessionSummary[]
  emitUpdateChecking(): void
  emitUpdateAvailable(version: string): void
  emitUpdateNotAvailable(version: string): void
  emitUpdateProgress(percent: number): void
  emitUpdateReady(version: string): void
  emitUpdateError(message: string): void
}

declare global {
  interface Window {
    pi: PiAPI
    __mockPi?: MockPiControl
    __APP_VERSION__?: string
  }
}
