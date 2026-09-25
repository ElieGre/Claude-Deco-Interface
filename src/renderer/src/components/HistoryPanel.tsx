import { useMemo, useState } from 'react'
import type { SDKSessionInfo } from '../../../shared/types'
import { useShallow } from 'zustand/react/shallow'
import { newAgent, resumeChat } from '../actions'
import { relativeTime } from '../lib/format'
import { useApp } from '../store/app'
import { useAgents, useSession } from '../store/agents'
import { useUi } from '../store/ui'
import '../styles/agents.css'
import { Icon } from './Icon'
import { HistorySkeleton } from './Skeleton'

const title = (s: SDKSessionInfo) => s.customTitle || s.summary || s.firstPrompt || 'Untitled chat'

function groupLabel(ms: number): string {
  const day = 86_400_000
  const startOfToday = new Date().setHours(0, 0, 0, 0)
  if (ms >= startOfToday) return 'Today'
  if (ms >= startOfToday - day) return 'Yesterday'
  if (ms >= startOfToday - 7 * day) return 'Previous 7 days'
  return 'Older'
}

export function HistoryPanel() {
  const sessions = useApp((s) => s.sessions)
  const historyLoaded = useApp((s) => s.historyLoaded)
  const cwd = useApp((s) => s.cwd)
  const activeId = useSession((s) => s.sessionId)
  const openIds = useAgents(useShallow((s) => Object.values(s.meta).map((m) => m.sessionId)))
  const agentFor = (sessionId: string) => {
    const { agents, meta } = useAgents.getState()
    return agents.find((a) => meta[a.id]?.sessionId === sessionId)
  }
  const [filter, setFilter] = useState('')
  const [editing, setEditing] = useState<string | null>(null)

  const groups = useMemo(() => {
    const q = filter.toLowerCase()
    const out = new Map<string, SDKSessionInfo[]>()
    for (const s of sessions) {
      if (q && !title(s).toLowerCase().includes(q)) continue
      const g = groupLabel(s.lastModified)
      out.set(g, [...(out.get(g) ?? []), s])
    }
    return [...out]
  }, [sessions, filter])

  const rename = async (s: SDKSessionInfo, value: string) => {
    setEditing(null)
    if (!cwd || !value.trim() || value === title(s)) return
    await window.api.history.rename(s.sessionId, value.trim(), cwd)
    const open = agentFor(s.sessionId)
    if (open) useAgents.getState().setTitle(open.id, value.trim())
    await useApp.getState().refreshHistory()
  }

  const remove = async (s: SDKSessionInfo) => {
    if (!cwd) return
    const { ok } = await useUi.getState().ask({
      title: 'Delete chat?',
      body: `"${title(s)}"\n\nThis removes the transcript from disk and can't be undone.`,
      confirmLabel: 'Delete',
    })
    if (!ok) return
    const open = agentFor(s.sessionId)
    if (open) await useAgents.getState().close(open.id)
    await window.api.history.remove(s.sessionId, cwd)
    await useApp.getState().refreshHistory()
  }

  return (
    <div className="tab-body history-panel">
      <div className="tab-toolbar">
        <input className="history-search" placeholder="Search chats…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <button className="btn btn-small" onClick={() => void newAgent()} title="New agent tab (Ctrl+T)">
          <Icon name="plus" size={12} /> New
        </button>
      </div>
      <div className="history-list">
        {!historyLoaded && <HistorySkeleton />}
        {historyLoaded && groups.length === 0 && <div className="muted pad">No chats in this project yet.</div>}
        {groups.map(([label, items]) => (
          <div key={label} className="history-group">
            <div className="section-label history-group-label">{label}</div>
            {items.map((s) => (
              <div
                key={s.sessionId}
                className={`history-item${s.sessionId === activeId ? ' is-active' : ''}${openIds.includes(s.sessionId) ? ' is-open' : ''}`}
                onClick={() => void resumeChat(s.sessionId)}
                onDoubleClick={() => setEditing(s.sessionId)}
                title={s.firstPrompt}
              >
                {editing === s.sessionId ? (
                  <input
                    className="history-rename"
                    autoFocus
                    defaultValue={title(s)}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => void rename(s, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void rename(s, e.currentTarget.value)
                      if (e.key === 'Escape') setEditing(null)
                    }}
                  />
                ) : (
                  <div className="history-title">{title(s)}</div>
                )}
                <div className="history-meta">
                  {openIds.includes(s.sessionId) && <span className="history-open">open</span>}
                  {relativeTime(s.lastModified)}
                  {s.gitBranch && (
                    <span className="history-branch">
                      <Icon name="branch" size={11} />
                      {s.gitBranch}
                    </span>
                  )}
                </div>
                <button
                  className="history-delete"
                  title="Delete chat"
                  onClick={(e) => {
                    e.stopPropagation()
                    void remove(s)
                  }}
                >
                  <Icon name="close" size={12} />
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
