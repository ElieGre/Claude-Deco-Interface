// App-wide overlays driven by the ui store: context menu, confirm dialog, info panel, toasts.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { revealLabel } from '../lib/paths'
import { useUi } from '../store/ui'
import '../styles/commands.css'
import { MarkdownText } from './ChatItemView'
import { Icon } from './Icon'

/** Read-only panel for /status, /memory, /skills, /hooks, /permissions and /plan. */
export function InfoModal() {
  const view = useUi((s) => s.info)
  const close = () => useUi.getState().showInfo(null)
  useEffect(() => {
    if (!view) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && useUi.getState().showInfo(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view])
  if (!view) return null
  const run = (p: Promise<unknown>) => p.catch((e) => useUi.getState().toast(String(e instanceof Error ? e.message : e), 'warn'))
  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <div className="modal info-modal" role="dialog" aria-label={view.title} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span>{view.title}</span>
          <button className="icon-btn" onClick={close} title="Close (Esc)">
            <Icon name="close" />
          </button>
        </div>
        {view.markdown && <MarkdownText text={view.markdown} />}
        {view.sections.map((s, i) => (
          <section key={`${s.title}-${i}`}>
            <div className="section-label">{s.title}</div>
            {s.rows.length === 0 ? (
              <div className="muted info-empty">{s.empty ?? 'None.'}</div>
            ) : (
              <ul className="info-rows">
                {s.rows.map((r, j) => (
                  <li key={j} className="info-row">
                    <div className="info-main">
                      <span className="info-label">{r.label}</span>
                      {r.value && <span className="info-value">{r.value}</span>}
                    </div>
                    {r.detail && <div className="info-detail">{r.detail}</div>}
                    {r.path && (
                      <div className="info-actions">
                        <button className="btn btn-small" onClick={() => void run(window.api.shell.open(r.path!))}>
                          Open
                        </button>
                        <button className="btn btn-small" title={revealLabel} onClick={() => void run(window.api.shell.reveal(r.path!))}>
                          Reveal
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
        {view.footer && <div className="info-footer">{view.footer}</div>}
      </div>
    </div>
  )
}

export function ContextMenu() {
  const menu = useUi((s) => s.menu)
  const close = useUi((s) => s.closeMenu)
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  // Keep the menu inside the window.
  useLayoutEffect(() => {
    if (!menu || !ref.current) return
    const { width, height } = ref.current.getBoundingClientRect()
    setPos({
      x: Math.min(menu.x, window.innerWidth - width - 4),
      y: Math.min(menu.y, window.innerHeight - height - 4),
    })
  }, [menu])

  useEffect(() => {
    if (!menu) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('blur', close)
    window.addEventListener('resize', close)
    window.addEventListener('wheel', close, { capture: true })
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('blur', close)
      window.removeEventListener('resize', close)
      window.removeEventListener('wheel', close, { capture: true })
    }
  }, [menu, close])

  if (!menu) return null
  return (
    <div ref={ref} className="context-menu" role="menu" style={{ left: pos.x, top: pos.y }}>
      {menu.items.map((item, i) =>
        item === 'separator' ? (
          <div key={i} className="menu-sep" />
        ) : (
          <button
            key={i}
            role="menuitem"
            className={`menu-item${item.danger ? ' is-danger' : ''}`}
            disabled={item.disabled}
            onClick={() => {
              close()
              item.onClick()
            }}
          >
            <span>{item.label}</span>
            {item.hint && <span className="menu-hint">{item.hint}</span>}
          </button>
        ),
      )}
    </div>
  )
}

export function ConfirmDialog() {
  const req = useUi((s) => s.confirm)
  const [dontAsk, setDontAsk] = useState(false)
  useEffect(() => setDontAsk(false), [req])
  if (!req) return null
  const answer = (ok: boolean) => req.resolve({ ok, dontAsk: ok && dontAsk })
  return (
    <div className="modal-backdrop" onMouseDown={() => answer(false)} onKeyDown={(e) => e.key === 'Escape' && answer(false)}>
      <div className="modal dialog" role="alertdialog" aria-labelledby="dialog-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head" id="dialog-title">
          {req.title}
        </div>
        <div className="dialog-body">{req.body}</div>
        <div className="dialog-actions">
          {req.allowDontAsk && (
            <label className="dialog-check">
              <input type="checkbox" checked={dontAsk} onChange={(e) => setDontAsk(e.target.checked)} /> Don't ask again
            </label>
          )}
          <button className="btn" onClick={() => answer(false)}>
            Cancel
          </button>
          <button className="btn btn-primary" autoFocus onClick={() => answer(true)}>
            {req.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Toasts() {
  const toasts = useUi((s) => s.toasts)
  const dismiss = useUi((s) => s.dismissToast)
  if (!toasts.length) return null
  return (
    <div className="toasts" role="status">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`} onClick={() => dismiss(t.id)}>
          {t.text}
        </div>
      ))}
    </div>
  )
}
