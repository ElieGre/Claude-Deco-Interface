import { useState, type MouseEvent } from 'react'
import { closeAgent, newAgent, renameAgent } from '../actions'
import { basename } from '../lib/format'
import { useApp } from '../store/app'
import { agentTitle, useAgents, type Agent } from '../store/agents'
import { useUi } from '../store/ui'
import { useViewer } from '../store/viewer'
import '../styles/agents.css'
import { Icon, Marquee } from './Icon'
import { Bar } from './Skeleton'

/** Tab strip over the center column: one tab per agent (each its own Claude session), then open files. */
export function CenterTabs() {
  const agents = useAgents((s) => s.agents)
  const tabs = useViewer((s) => s.tabs)
  const viewing = useViewer((s) => s.active)
  const { show, close } = useViewer.getState()

  const onAux = (e: MouseEvent, path: string) => {
    // Middle-click closes, like every other tab strip.
    if (e.button === 1) {
      e.preventDefault()
      close(path)
    }
  }

  return (
    <div className="center-tabs" role="tablist">
      {agents.map((a, i) => (
        <AgentTab key={a.id} agent={a} index={i} viewingFile={viewing !== null} />
      ))}
      {agents.length === 0 && (
        <div className="ctab skel-tab" aria-hidden>
          <Bar width="96px" />
        </div>
      )}
      <button className="ctab-new" onClick={() => void newAgent()} title="New agent (Ctrl+T)">
        <Icon name="plus" size={12} />
      </button>
      {tabs.map((path) => (
        <div
          key={path}
          role="tab"
          aria-selected={viewing === path}
          className={`ctab${viewing === path ? ' is-active' : ''}`}
          title={path}
          onClick={() => show(path)}
          onAuxClick={(e) => onAux(e, path)}
          onMouseDown={(e) => e.button === 1 && e.preventDefault()}
        >
          <span className="ctab-name">{basename(path)}</span>
          <button
            className="ctab-close"
            title="Close"
            onClick={(e) => {
              e.stopPropagation()
              close(path)
            }}
          >
            <Icon name="close" size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}

function AgentTab({ agent, index, viewingFile }: { agent: Agent; index: number; viewingFile: boolean }) {
  const meta = useAgents((s) => s.meta[agent.id])
  const isActive = useAgents((s) => s.activeId === agent.id)
  const sessions = useApp((s) => s.sessions)
  const [editing, setEditing] = useState(false)
  const title = agentTitle(agent, meta, sessions)
  const busy = meta?.status === 'running' || meta?.status === 'compacting'
  const selected = isActive && !viewingFile

  const activate = () => useAgents.getState().activate(agent.id)
  const finishRename = (value: string) => {
    setEditing(false)
    if (value !== title) void renameAgent(agent.id, value)
  }

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    const others = useAgents.getState().agents.filter((a) => a.id !== agent.id)
    useUi.getState().openMenu(e.clientX, e.clientY, [
      { label: 'Rename', hint: 'double-click', onClick: () => setEditing(true) },
      { label: 'New agent', hint: 'Ctrl+T', onClick: () => void newAgent() },
      'separator',
      { label: 'Close', hint: 'Ctrl+W', onClick: () => void closeAgent(agent.id) },
      {
        label: 'Close other agents',
        disabled: !others.length,
        onClick: () => void Promise.all(others.map((a) => closeAgent(a.id))),
      },
    ])
  }

  return (
    <div
      role="tab"
      aria-selected={selected}
      className={`ctab ctab-agent${selected ? ' is-active' : ''}${isActive ? ' is-current' : ''}${meta?.waiting ? ' is-waiting' : ''}`}
      title={`${title}${meta?.waiting ? ' — waiting for your answer' : busy ? ' — working' : ''}${index < 9 ? ` (Ctrl+${index + 1})` : ''}`}
      onClick={activate}
      onDoubleClick={() => setEditing(true)}
      onAuxClick={(e) => e.button === 1 && void closeAgent(agent.id)}
      onMouseDown={(e) => e.button === 1 && e.preventDefault()}
      onContextMenu={onContextMenu}
    >
      <span className="ctab-diamond" />
      {editing ? (
        <input
          className="ctab-rename"
          autoFocus
          defaultValue={agent.title ?? (title === 'New agent' ? '' : title)}
          placeholder="Agent name"
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => finishRename(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') finishRename(e.currentTarget.value)
            if (e.key === 'Escape') setEditing(false)
          }}
        />
      ) : (
        <span className="ctab-name">{title}</span>
      )}
      {busy && <Marquee />}
      <button
        className="ctab-close"
        title="Close agent (Ctrl+W)"
        onClick={(e) => {
          e.stopPropagation()
          void closeAgent(agent.id)
        }}
      >
        <Icon name="close" size={12} />
      </button>
    </div>
  )
}
