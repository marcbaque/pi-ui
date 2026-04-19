// src/renderer/src/App.tsx
import { useEffect } from 'react'
import { useStore } from './store'
import Sidebar from './components/sidebar/Sidebar'
import ChatPane from './components/chat/ChatPane'
import NewSessionDialog from './components/modals/NewSessionDialog'
import SettingsModal from './components/modals/SettingsModal'

export default function App() {
  const setConfig = useStore((s) => s.setConfig)
  const setModels = useStore((s) => s.setModels)
  const openSettings = useStore((s) => s.openSettings)

  useEffect(() => {
    Promise.all([window.pi.config.get(), window.pi.models.list()])
      .then(([config, models]) => {
        setConfig(config)
        setModels(models)
      })
      .catch(console.error)
  }, [setConfig, setModels])

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
