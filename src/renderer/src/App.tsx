// src/renderer/src/App.tsx
import { useEffect } from 'react'
import { useStore } from './store'

export default function App() {
  const setConfig = useStore((s) => s.setConfig)
  const setModels = useStore((s) => s.setModels)

  useEffect(() => {
    Promise.all([window.pi.config.get(), window.pi.models.list()])
      .then(([config, models]) => {
        setConfig(config)
        setModels(models)
      })
      .catch(console.error)
  }, [setConfig, setModels])

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar placeholder — filled in Plan 5 */}
      <div className="w-56 shrink-0 border-r border-border bg-[#0a0a0a]" />
      {/* Chat area placeholder — filled in Plan 5 */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <p className="text-sm text-muted-foreground">pi-ui</p>
      </div>
    </div>
  )
}
