import { pickProject, switchProject } from '../actions'
import { basename } from '../lib/format'
import { useApp } from '../store/app'
import { DecoMark, Icon } from './Icon'

const PICK = '__pick__'

export function TopBar() {
  const cwd = useApp((s) => s.cwd)
  const recent = useApp((s) => s.recentProjects)
  const branch = useApp((s) => s.gitStatus?.branch)
  const layout = useApp((s) => s.layout)
  const { setLayout } = useApp.getState()

  const projects = cwd && !recent.includes(cwd) ? [cwd, ...recent] : recent

  return (
    <header className="topbar">
      <button
        className={`icon-btn${layout.leftOpen ? ' is-on' : ''}`}
        onClick={() => setLayout({ leftOpen: !layout.leftOpen })}
        title="Toggle side panel (Ctrl+B)"
      >
        <Icon name="menu" />
      </button>
      <span className="brand">
        <DecoMark />
        <span className="brand-name">Claude</span>
      </span>

      <span className="topbar-rule" />

      <label className="project-picker" title={cwd ?? ''}>
        <span className="project-name">{cwd ? basename(cwd) : 'Open a folder'}</span>
        <Icon name="chevronDown" size={12} />
        <select
          value={cwd ?? ''}
          onChange={(e) => void (e.target.value === PICK ? pickProject() : switchProject(e.target.value))}
        >
          {projects.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
          <option value={PICK}>Open folder…</option>
        </select>
      </label>
      {branch && (
        <span className="chip chip-branch" title="Current branch">
          <Icon name="branch" size={13} />
          {branch}
        </span>
      )}

      <span className="topbar-spacer" />

      <button
        className={`icon-btn${layout.rightOpen ? ' is-on' : ''}`}
        onClick={() => setLayout({ rightOpen: !layout.rightOpen })}
        title="Toggle git panel (Ctrl+G)"
      >
        <Icon name="branch" />
      </button>
    </header>
  )
}
