import { useLayoutEffect, useMemo, useRef } from 'react'
import type { ChatItem } from '../lib/chat'
import { useApp } from '../store/app'
import { useSession } from '../store/session'
import { ChatItemView } from './ChatItemView'
import { Marquee } from './Icon'

export function MessageList() {
  const items = useSession((s) => s.items)
  const status = useSession((s) => s.status)
  const ref = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  const { top, nested } = useMemo(() => groupByParent(items), [items])

  useLayoutEffect(() => {
    const el = ref.current
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [items, status])

  const onScroll = () => {
    const el = ref.current
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  return (
    <div className="messages" ref={ref} onScroll={onScroll}>
      <div className="messages-inner">
        {top.length === 0 ? <EmptyState /> : top.map((it) => <ChatItemView key={it.id} item={it} nested={nested} />)}
        {(status === 'running' || status === 'compacting') && (
          <div className="working" role="status">
            <Marquee />
            {status === 'compacting' ? 'Compacting conversation…' : 'Working…'}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  const cwd = useApp((s) => s.cwd)
  return (
    <div className="empty-chat">
      <Sunburst />
      <h2>What are we building?</h2>
      <p className="empty-cwd">{cwd}</p>
      <p className="empty-tips">
        Type <kbd>/</kbd> for commands · <kbd>Shift</kbd>+<kbd>Tab</kbd> to change permission mode · <kbd>Esc</kbd> to interrupt
      </p>
    </div>
  )
}

// Rays at 15° steps from a point on the horizon, long and short in turn, over a stepped base.
const RAYS = Array.from({ length: 11 }, (_, i) => {
  const a = ((i + 1) * 15 * Math.PI) / 180
  const [r1, r2] = [34, i % 2 ? 84 : 108]
  const pt = (r: number) => [120 - Math.cos(a) * r, 120 - Math.sin(a) * r].map((n) => n.toFixed(2)).join(' ')
  return { d: `M${pt(r1)}L${pt(r2)}`, long: i % 2 === 0 }
})

function Sunburst() {
  return (
    <svg className="sunburst" width="240" height="134" viewBox="0 0 240 134" aria-hidden>
      <path className="sun-arc" d="M4 120A116 116 0 0 1 236 120" />
      <path className="sun-arc" d="M68 120A52 52 0 0 1 172 120" />
      {RAYS.map((r, i) => (
        <path key={i} className={r.long ? 'sun-ray is-long' : 'sun-ray'} d={r.d} style={{ animationDelay: `${i * 40}ms` }} />
      ))}
      <path className="sun-step" d="M0 120.5H240M44 126.5H196M88 132.5H152" />
      <path className="sun-gem-frame" d="M120 88L136 104 120 120 104 104Z" />
      <path className="sun-gem" d="M120 97L127 104 120 111 113 104Z" />
    </svg>
  )
}

function groupByParent(items: ChatItem[]) {
  const toolIds = new Set(items.filter((i) => i.kind === 'tool').map((i) => i.id))
  const top: ChatItem[] = []
  const nested = new Map<string, ChatItem[]>()
  for (const it of items) {
    const parent = 'parent' in it ? it.parent : null
    if (parent && toolIds.has(parent)) {
      const list = nested.get(parent) ?? []
      list.push(it)
      nested.set(parent, list)
    } else top.push(it)
  }
  return { top, nested }
}
