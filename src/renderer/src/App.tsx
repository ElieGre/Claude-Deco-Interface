import { useEffect } from 'react'
import { bootstrap } from './actions'
import { CenterTabs } from './components/CenterTabs'
import { Composer } from './components/Composer'
import { FileViewer } from './components/FileViewer'
import { GitPanel } from './components/GitPanel'
import { LeftPanel } from './components/LeftPanel'
import { MessageList } from './components/MessageList'
import { ConfirmDialog, ContextMenu, Toasts } from './components/Overlays'
import { PermissionPrompt } from './components/PermissionPrompt'
import { Resizer } from './components/Resizer'
import { StatusBar } from './components/StatusBar'
import { TopBar } from './components/TopBar'
import { useApp } from './store/app'
import { useFiles } from './store/files'
import { useSession } from './store/session'
import { useViewer } from './store/viewer'

export default function App() {
  const layout = useApp((s) => s.layout)
  const cwd = useApp((s) => s.cwd)
  const viewing = useViewer((s) => s.active)

  useEffect(() => {
    const offClaude = window.api.claude.onEvent((e) => useSession.getState().handleEvent(e))
    const offFiles = window.api.files.onChanged((change) => {
      if (change.dirs.length) {
        void useFiles.getState().reload(change.dirs)
        useViewer.getState().reload(change.dirs)
      }
      useApp.getState().refreshGitSoon()
    })
    void bootstrap()
    return () => {
      offClaude()
      offFiles()
    }
  }, [])

  useEffect(() => {
    if (cwd) useFiles.getState().setRoot(cwd)
    useViewer.getState().closeAll()
  }, [cwd])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { setLayout, layout } = useApp.getState()
      if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault()
        useSession.getState().cyclePermissionMode()
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        setLayout({ leftOpen: true, leftTab: 'files' })
      } else if (e.ctrlKey && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        setLayout({ leftOpen: !layout.leftOpen })
      } else if (e.ctrlKey && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        setLayout({ rightOpen: !layout.rightOpen })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const columns = [
    layout.leftOpen && `${layout.leftWidth}px 4px`,
    'minmax(420px, 1fr)',
    layout.rightOpen && `4px ${layout.rightWidth}px`,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="app">
      <TopBar />
      <div className="workspace" style={{ gridTemplateColumns: columns }}>
        {layout.leftOpen && (
          <>
            <LeftPanel />
            <Resizer side="left" />
          </>
        )}
        <main className="chat">
          <CenterTabs />
          {viewing ? <FileViewer path={viewing} /> : <MessageList />}
          <div className="chat-bottom">
            <PermissionPrompt />
            <Composer />
          </div>
        </main>
        {layout.rightOpen && (
          <>
            <Resizer side="right" />
            <GitPanel />
          </>
        )}
      </div>
      <StatusBar />
      <ContextMenu />
      <ConfirmDialog />
      <Toasts />
    </div>
  )
}
