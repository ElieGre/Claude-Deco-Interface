import type { MouseEvent } from 'react'
import { basename } from '../lib/format'
import { useSession } from '../store/session'
import { useViewer } from '../store/viewer'
import { Icon, Marquee } from './Icon'

/** Tab strip over the center column: the agent chat first, then files open in the viewer. */
export function CenterTabs() {
  const tabs = useViewer((s) => s.tabs)
  const active = useViewer((s) => s.active)
  const status = useSession((s) => s.status)
  const waiting = useSession((s) => s.permissions.length > 0)
  const { show, close } = useViewer.getState()
  const busy = status === 'running' || status === 'compacting'

  const onAux = (e: MouseEvent, path: string) => {
    // Middle-click closes, like every other tab strip.
    if (e.button === 1) {
      e.preventDefault()
      close(path)
    }
  }

  return (
    <div className="center-tabs" role="tablist">
      <button
        role="tab"
        aria-selected={active === null}
        className={`ctab ctab-agent${active === null ? ' is-active' : ''}${waiting ? ' is-waiting' : ''}`}
        onClick={() => show(null)}
        title={waiting ? 'Claude is waiting for your answer' : 'Agent chat'}
      >
        <span className="ctab-diamond" />
        Agent
        {busy && active !== null && <Marquee />}
      </button>
      {tabs.map((path) => (
        <div
          key={path}
          role="tab"
          aria-selected={active === path}
          className={`ctab${active === path ? ' is-active' : ''}`}
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
