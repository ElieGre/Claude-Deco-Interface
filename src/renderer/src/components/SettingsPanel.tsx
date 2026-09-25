import { useEffect, useState } from 'react'
import type { CliSetting } from '../../../shared/types'
import { useApp } from '../store/app'
import { useUi } from '../store/ui'
import '../styles/agents.css'
import { Icon, Marquee } from './Icon'

interface RowState {
  saving?: boolean
  message?: string
  error?: boolean
}

/**
 * Claude Code's own settings (the terminal's /config). Values are written by the CLI (`/config key=value`
 * in a background process), so validation and storage match the terminal exactly.
 */
export function SettingsPanel() {
  const open = useUi((s) => s.settingsOpen)
  const close = useUi((s) => s.closeSettings)
  const cwd = useApp((s) => s.cwd)
  const [items, setItems] = useState<CliSetting[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [rows, setRows] = useState<Record<string, RowState>>({})

  useEffect(() => {
    if (!open || !cwd) return
    setItems(null)
    setError(null)
    setRows({})
    window.api.cliConfig.list(cwd).then(setItems, (e) => setError(String(e instanceof Error ? e.message : e)))
  }, [open, cwd])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && useUi.getState().closeSettings()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open || !cwd) return null

  const setValue = (key: string, value: string | null) => setItems((list) => list?.map((i) => (i.key === key ? { ...i, value } : i)) ?? null)

  const save = async (item: CliSetting, value: string) => {
    const previous = item.value
    setValue(item.key, value)
    setRows((r) => ({ ...r, [item.key]: { saving: true } }))
    try {
      const reply = await window.api.cliConfig.set(cwd, item.key, value)
      // The CLI confirms with "Set <label> to <value>"; anything else is its explanation of what went wrong.
      const ok = /^Set /i.test(reply.trim())
      if (!ok) setValue(item.key, previous)
      setRows((r) => ({ ...r, [item.key]: { message: ok ? 'saved' : reply.trim(), error: !ok } }))
    } catch (e) {
      setValue(item.key, previous)
      setRows((r) => ({ ...r, [item.key]: { message: String(e instanceof Error ? e.message : e), error: true } }))
    }
  }

  const q = filter.trim().toLowerCase()
  const shown = items?.filter((i) => !q || `${i.label} ${i.key}`.toLowerCase().includes(q))

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <div className="modal settings-modal" role="dialog" aria-label="Claude Code settings" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span>Claude Code settings</span>
          <button className="icon-btn" onClick={close} title="Close (Esc)">
            <Icon name="close" />
          </button>
        </div>
        <div className="settings-intro">
          The same settings as <code>/config</code> in the terminal. Claude Code saves them itself (in ~/.claude.json or
          ~/.claude/settings.json), so they apply to every Claude Code session; some take effect in new sessions.
        </div>
        <input className="settings-search" placeholder="Filter settings…" value={filter} autoFocus onChange={(e) => setFilter(e.target.value)} />
        {error && <div className="notice notice-error">{error}</div>}
        {!items && !error && (
          <div className="muted">
            <Marquee /> Reading settings from Claude Code…
          </div>
        )}
        {shown && (
          <ul className="settings-list">
            {shown.map((item) => (
              <SettingRow key={item.key} item={item} state={rows[item.key]} onSave={(v) => void save(item, v)} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function SettingRow({ item, state, onSave }: { item: CliSetting; state?: RowState; onSave: (value: string) => void }) {
  const [draft, setDraft] = useState(item.value ?? '')
  const busy = !!state?.saving
  const status = busy ? 'saving…' : state?.message

  let control
  if (item.kind === 'boolean') {
    const on = item.value === 'true'
    control = (
      <button
        className={`switch${on ? ' is-on' : ''}`}
        role="switch"
        aria-checked={on}
        aria-label={item.label}
        disabled={busy}
        title={item.value === null ? 'Current value unknown' : on ? 'On' : 'Off'}
        onClick={() => onSave(on ? 'false' : 'true')}
      />
    )
  } else if (item.kind === 'enum') {
    const known = item.value !== null && item.options.includes(item.value)
    control = (
      <select value={item.value ?? ''} disabled={busy} aria-label={item.label} onChange={(e) => e.target.value && onSave(e.target.value)}>
        {item.value === null && <option value="">— choose —</option>}
        {item.value !== null && !known && <option value={item.value}>{item.value}</option>}
        {item.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    )
  } else {
    const commit = () => draft !== (item.value ?? '') && onSave(draft)
    control = (
      <input
        type="text"
        value={draft}
        disabled={busy}
        aria-label={item.label}
        placeholder="not set"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
      />
    )
  }

  return (
    <li className="settings-row">
      <div className="settings-label">{item.label}</div>
      <div className="settings-key">
        {item.key}
        {status && <span className={`settings-state${state?.error ? ' is-error' : state?.message === 'saved' ? ' is-saved' : ''}`}> · {status}</span>}
      </div>
      <div className="settings-control">{control}</div>
    </li>
  )
}
