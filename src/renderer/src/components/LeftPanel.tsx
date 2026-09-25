import type { LayoutConfig } from '../../../shared/types'
import { useApp } from '../store/app'
import { FilesPanel } from './FilesPanel'
import { HistoryPanel } from './HistoryPanel'

const TABS: { id: LayoutConfig['leftTab']; label: string; title: string }[] = [
  { id: 'chats', label: 'Chats', title: 'Chat history for this folder' },
  { id: 'files', label: 'Files', title: 'Project files (Ctrl+Shift+E)' },
]

export function LeftPanel() {
  const tab = useApp((s) => s.layout.leftTab)
  const setLayout = useApp((s) => s.setLayout)
  return (
    <aside className="panel left-panel">
      <div className="panel-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`panel-tab${tab === t.id ? ' is-active' : ''}`}
            title={t.title}
            onClick={() => setLayout({ leftTab: t.id })}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'files' ? <FilesPanel /> : <HistoryPanel />}
    </aside>
  )
}
