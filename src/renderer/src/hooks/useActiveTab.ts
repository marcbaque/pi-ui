// src/renderer/src/hooks/useActiveTab.ts
import { useStore } from '@/store'
import type { Tab } from '@/store/tabs-slice'

/**
 * Returns the currently active Tab, or null if no tabs are open.
 * Use this hook in all components that previously read from store.session.*.
 */
export function useActiveTab(): Tab | null {
  return useStore((s) => s.tabs.tabs.find((t) => t.id === s.tabs.activeTabId) ?? null)
}
