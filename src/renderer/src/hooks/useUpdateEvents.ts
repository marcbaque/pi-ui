// src/renderer/src/hooks/useUpdateEvents.ts
import { useEffect } from 'react'
import { useStore } from '../store'

/**
 * Listens for update:* events from the main process and syncs them
 * into the ui-slice. Call once at the App level.
 */
export function useUpdateEvents(): void {
  const setUpdateStatus = useStore((s) => s.setUpdateStatus)

  useEffect(() => {
    const unsubs = [
      window.pi.on('update:checking', () => {
        setUpdateStatus('checking')
      }),
      window.pi.on('update:available', ({ version }) => {
        setUpdateStatus('available', version)
      }),
      window.pi.on('update:not-available', ({ version }) => {
        setUpdateStatus('up-to-date', version)
      }),
      window.pi.on('update:progress', ({ percent }) => {
        setUpdateStatus('downloading', undefined, percent)
      }),
      window.pi.on('update:ready', ({ version }) => {
        setUpdateStatus('ready', version, null)
      }),
      window.pi.on('update:error', ({ message }) => {
        setUpdateStatus('error', undefined, null, message)
      }),
    ]
    return () => unsubs.forEach((u) => u())
  }, [setUpdateStatus])
}
