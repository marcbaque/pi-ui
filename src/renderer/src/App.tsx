// src/renderer/src/App.tsx
import { useEffect, useCallback } from 'react'
import { useStore } from './store'
import { usePiEvents } from './hooks/usePiEvents'
import Sidebar from './components/sidebar/Sidebar'
import TabBar from './components/tabs/TabBar'
import ChatPane from './components/chat/ChatPane'
import DiffPane from './components/diff/DiffPane'
import NewSessionDialog from './components/modals/NewSessionDialog'
import SettingsModal from './components/modals/SettingsModal'

export default function App() {
  const setConfig = useStore((s) => s.setConfig)
  const setModels = useStore((s) => s.setModels)
  const openSettings = useStore((s) => s.openSettings)
  const setSessions = useStore((s) => s.setSessions)
  const tabCount = useStore((s) => s.tabs.tabs.length)

  // Register global pi event listeners (routes to correct tab by sessionId)
  usePiEvents()

  const loadSessions = useCallback(async () => {
    try {
      const sessions = await window.pi.sessions.list()
      setSessions(sessions)
    } catch (err) {
      console.error('Failed to load sessions:', err)
    }
  }, [setSessions])

  useEffect(() => {
    Promise.all([window.pi.config.get(), window.pi.models.list()])
      .then(([config, models]) => {
        setConfig(config)
        setModels(models)
      })
      .catch(console.error)

    loadSessions()
  }, [setConfig, setModels, loadSessions])

  // Refresh sessions list whenever a tab is opened or closed
  useEffect(() => {
    loadSessions()
  }, [tabCount, loadSessions])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        openSettings()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openSettings])

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TabBar />
        <div className="flex flex-1 overflow-hidden">
          <ChatPane />
          <DiffPane />
        </div>
      </div>
      <NewSessionDialog />
      <SettingsModal />
    </div>
  )
}
