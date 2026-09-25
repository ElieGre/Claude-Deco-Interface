import { useEffect, useState } from 'react'
import type { ContextUsage, EffortLevel, ModelInfo, PermissionMode } from '../../../shared/types'
import { formatCost, formatDuration, formatTokens } from '../lib/format'
import { EFFORT_LEVELS, PERMISSION_MODES, useSession } from '../store/session'
import { Icon, Marquee } from './Icon'

const MODE_LABELS: Record<string, string> = {
  default: 'Ask before edits',
  acceptEdits: 'Auto-accept edits',
  plan: 'Plan mode',
  bypassPermissions: 'Bypass permissions',
  dontAsk: "Don't ask",
  auto: 'Auto',
}

function matchModel(models: ModelInfo[], current: string | null): ModelInfo | undefined {
  if (!current) return undefined
  // Prefer a named alias (e.g. "opus") over the generic "default" row that resolves to the same id.
  const named = models.filter((m) => m.value !== 'default')
  return (
    models.find((m) => m.value === current) ??
    named.find((m) => m.resolvedModel === current || current.startsWith(m.resolvedModel ?? '\0')) ??
    models.find((m) => m.resolvedModel === current)
  )
}

export function StatusBar() {
  const status = useSession((s) => s.status)
  const model = useSession((s) => s.model)
  const effort = useSession((s) => s.effort)
  const mode = useSession((s) => s.permissionMode)
  const meta = useSession((s) => s.meta)
  const usage = useSession((s) => s.usage)
  const context = useSession((s) => s.context)
  const turns = useSession((s) => s.turns)
  const lastTurnMs = useSession((s) => s.lastTurnMs)
  const sessionId = useSession((s) => s.sessionId)
  const cliVersion = useSession((s) => s.cliVersion)
  const { setModel, setEffort, setPermissionMode } = useSession.getState()
  const [showContext, setShowContext] = useState(false)

  const models = meta?.models ?? []
  const current = matchModel(models, model)
  const effortLevels = current ? (current.supportedEffortLevels ?? []) : EFFORT_LEVELS
  const pct = context ? Math.min(100, (context.used / context.max) * 100) : 0

  return (
    <footer className="statusbar">
      <span className={`sb-status sb-${status}`}>
        {status === 'running' || status === 'compacting' || status === 'starting' ? <Marquee /> : <span className="sb-dot" />}
        {status}
      </span>

      <label className="sb-field" title="Model">
        <span className="sb-label">model</span>
        <select value={current?.value ?? model ?? ''} onChange={(e) => void setModel(e.target.value)}>
          {!current && <option value={model ?? ''}>{model ?? 'from settings'}</option>}
          {models.map((m) => (
            <option key={m.value} value={m.value} title={m.description}>
              {m.displayName}
            </option>
          ))}
        </select>
      </label>

      <label className="sb-field" title="Effort level">
        <span className="sb-label">effort</span>
        <select
          value={effortLevels.length ? (effort ?? '') : ''}
          disabled={!effortLevels.length}
          onChange={(e) => void setEffort(e.target.value as EffortLevel)}
        >
          {(!effort || !effortLevels.length) && <option value="">{effortLevels.length ? 'default' : 'n/a'}</option>}
          {effortLevels.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>

      <label className={`sb-field sb-mode sb-mode-${mode}`} title="Permission mode (Shift+Tab to cycle)">
        <span className="sb-label">mode</span>
        <select value={mode} onChange={(e) => void setPermissionMode(e.target.value as PermissionMode)}>
          {(PERMISSION_MODES.includes(mode) ? PERMISSION_MODES : [...PERMISSION_MODES, mode]).map((m) => (
            <option key={m} value={m}>
              {MODE_LABELS[m] ?? m}
            </option>
          ))}
        </select>
      </label>

      <span className="sb-sep" />

      <button className="sb-context" onClick={() => setShowContext(true)} title="Context window usage (click for breakdown)">
        <span className="meter">
          <span className="meter-fill" style={{ width: `${pct}%` }} data-level={pct > 85 ? 'high' : pct > 60 ? 'mid' : 'low'} />
        </span>
        {context ? `${formatTokens(context.used)} / ${formatTokens(context.max)} · ${pct.toFixed(0)}%` : 'context –'}
      </button>

      <span className="sb-item" title="Tokens this run: input (incl. cache) / output">
        <span className="sb-label">tokens</span>↑{formatTokens(usage.input + usage.cacheRead + usage.cacheWrite)} ↓{formatTokens(usage.output)}
      </span>
      <span className="sb-item" title="Cache read / cache write tokens">
        <span className="sb-label">cache</span>
        {formatTokens(usage.cacheRead)}/{formatTokens(usage.cacheWrite)}
      </span>
      <span className="sb-item" title="Estimated cost this run">
        <span className="sb-label">cost</span>
        {formatCost(usage.costUsd)}
      </span>
      <span className="sb-item" title="Turns this run · last turn duration">
        <span className="sb-label">turns</span>
        {turns}
        {lastTurnMs != null && ` · ${formatDuration(lastTurnMs)}`}
      </span>

      <span className="sb-spacer" />
      <span className="sb-item sb-dim" title={sessionId ?? ''}>
        {sessionId?.slice(0, 8)}
      </span>
      {cliVersion && <span className="sb-item sb-dim">claude v{cliVersion}</span>}
      {(meta?.account?.email || meta?.account?.apiProvider) && (
        <span className="sb-item sb-dim">{meta.account.email ?? meta.account.apiProvider}</span>
      )}

      {showContext && <ContextModal onClose={() => setShowContext(false)} />}
    </footer>
  )
}

function ContextModal({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<ContextUsage | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const { key } = useSession.getState()
    if (!key) return setError('No active session')
    window.api.claude.contextUsage(key).then(setData, (e) => setError(String(e)))
  }, [])

  const used = data?.categories.filter((c) => c.kind !== 'free') ?? []
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span>Context usage</span>
          <button className="icon-btn" onClick={onClose} title="Close">
            <Icon name="close" />
          </button>
        </div>
        {error && <div className="notice notice-error">{error}</div>}
        {!data && !error && <div className="muted">Counting tokens…</div>}
        {data && (
          <>
            <div className="ctx-total">
              {data.model} · {formatTokens(data.totalTokens)} / {formatTokens(data.rawMaxTokens)} tokens ({data.percentage.toFixed(0)}%)
            </div>
            <div className="ctx-bar">
              {used.map((c) => (
                <span
                  key={c.name}
                  style={{ width: `${(c.tokens / data.rawMaxTokens) * 100}%`, background: `var(--lane-${data.categories.indexOf(c) % 8})` }}
                  title={`${c.name}: ${formatTokens(c.tokens)}`}
                />
              ))}
            </div>
            <table className="ctx-table">
              <tbody>
                {data.categories.map((c, i) => (
                  <tr key={c.name}>
                    <td>
                      <span className="ctx-swatch" style={{ background: c.kind === 'free' ? 'var(--border)' : `var(--lane-${i % 8})` }} />
                      {c.name}
                    </td>
                    <td className="num">{formatTokens(c.tokens)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.memoryFiles.length > 0 && (
              <>
                <div className="ctx-section">Memory files</div>
                <table className="ctx-table">
                  <tbody>
                    {data.memoryFiles.map((f) => (
                      <tr key={f.path}>
                        <td className="mono">{f.path}</td>
                        <td className="num">{formatTokens(f.tokens)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
