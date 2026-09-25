// Loading placeholders in the Neo-Deco grammar: flat bars in a faint tint of the text color that light up in
// sequence, the marquee's rhythm at rest. They stand in only while data is genuinely loading, never for "empty".
import type { CSSProperties } from 'react'

// Fixed, varied widths so a skeleton reads as content rather than a grid of identical bars.
const WIDTHS = ['72%', '54%', '83%', '47%', '66%', '58%', '77%', '41%']
const w = (i: number) => WIDTHS[i % WIDTHS.length]

/** One placeholder bar. `i` is its place in the lighting sequence. */
export function Bar({ width, i = 0, className }: { width: string; i?: number; className?: string }) {
  return <span className={`skel${className ? ` ${className}` : ''}`} style={{ width, '--i': i } as CSSProperties} />
}

export function HistorySkeleton() {
  return (
    <div className="skel-list" role="status" aria-label="Loading chats">
      <div className="section-label history-group-label">
        <Bar width="44px" />
      </div>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="skel-history">
          <Bar width={w(i)} i={i} />
          <Bar width={`${28 + ((i * 7) % 20)}%`} i={i} className="skel-meta" />
        </div>
      ))}
    </div>
  )
}

export function TreeSkeleton({ indent }: { indent: number }) {
  return (
    <div role="status" aria-label="Loading folder">
      {[0, 1, 2].map((i) => (
        <div key={i} className="skel-tree" style={{ paddingLeft: indent + 17 }}>
          <Bar width={`${38 + ((i * 17) % 30)}%`} i={i} />
        </div>
      ))}
    </div>
  )
}

/** Git panel placeholder: branch header, change rows, and a lane line threaded through hollow diamonds. */
export function GitSkeleton() {
  return (
    <aside className="panel git-panel" role="status" aria-label="Loading git status">
      <div className="panel-header">
        <Bar width="96px" />
      </div>
      <div className="section-label">Changes</div>
      <div className="skel-changes">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skel-file">
            <Bar width="9px" i={i} />
            <Bar width={w(i + 2)} i={i} />
          </div>
        ))}
      </div>
      <div className="section-label">History</div>
      <div className="skel-graph">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="skel-commit" style={{ '--i': i } as CSSProperties}>
            <span className="skel-node" />
            <Bar width={w(i)} i={i} />
            <Bar width="38px" i={i} className="skel-time" />
          </div>
        ))}
      </div>
    </aside>
  )
}

/** A resumed conversation loading: a user card, agent prose on the sage rule, a tool card. */
export function ChatSkeleton() {
  return (
    <div className="skel-chat" role="status" aria-label="Loading conversation">
      <div className="msg msg-user">
        <div className="msg-label">You</div>
        <div className="msg-user-body skel-card">
          <Bar width="260px" />
        </div>
      </div>
      <div className="msg msg-assistant">
        <div className="skel-lines">
          <Bar width="92%" i={1} />
          <Bar width="86%" i={2} />
          <Bar width="61%" i={3} />
        </div>
      </div>
      <div className="tool skel-tool">
        <span className="tool-dot" />
        <Bar width="44px" i={4} />
        <Bar width="52%" i={4} />
      </div>
      <div className="msg msg-assistant">
        <div className="skel-lines">
          <Bar width="78%" i={5} />
          <Bar width="44%" i={6} />
        </div>
      </div>
    </div>
  )
}

export function StatusSkeleton() {
  return (
    <footer className="statusbar" role="status" aria-label="Starting">
      <span className="sb-status">
        <Bar width="56px" />
      </span>
      {['model', 'effort', 'mode'].map((label, i) => (
        <span key={label} className="sb-field">
          <span className="sb-label">{label}</span>
          <Bar width={`${48 + i * 14}px`} i={i + 1} />
        </span>
      ))}
      <span className="sb-spacer" />
    </footer>
  )
}
