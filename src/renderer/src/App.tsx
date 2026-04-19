// src/renderer/src/App.tsx
import { useEffect, useCallback } from 'react'
import { useStore } from './store'
import Sidebar from './components/sidebar/Sidebar'
import ChatPane from './components/chat/ChatPane'
import NewSessionDialog from './components/modals/NewSessionDialog'
import SettingsModal from './components/modals/SettingsModal'

export default function App() {
  const setConfig = useStore((s) => s.setConfig)
  const setModels = useStore((s) => s.setModels)
  const openSettings = useStore((s) => s.openSettings)
  const setSessions = useStore((s) => s.setSessions)
  const sessionActive = useStore((s) => s.session.active)
  const sessionId = useStore((s) => s.session.sessionId)

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

  // Refresh sessions after a new session becomes active
  useEffect(() => {
    if (sessionActive) {
      loadSessions()
    }
  }, [sessionActive, sessionId, loadSessions])

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
      <ChatPane />
      <NewSessionDialog />
      <SettingsModal />
    </div>
  )
}
