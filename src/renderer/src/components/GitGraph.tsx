import { memo, useMemo } from 'react'
import type { GitCommit } from '../../../shared/types'
import { relativeTime } from '../lib/format'
import { laneColor } from '../lib/git'
import { layoutGraph, type GraphRow, type Segment } from '../lib/gitGraph'
import { Icon } from './Icon'

// Half a row equals one lane, so a one-lane shift is an exact 45° diagonal.
const ROW_H = 28
const LANE_W = ROW_H / 2
const PAD = 11
const x = (lane: number) => PAD + lane * LANE_W
const Y = [0, ROW_H / 2, ROW_H]

/**
 * Lane changes are drawn as straight runs and 45° diagonals only, never curves.
 * Every diagonal touches the node row (y = 1): converging lanes drop diagonally and then run level into the node;
 * branching lanes run level out of the node and then drop diagonally into their lane.
 */
function segmentPath(s: Segment): string {
  const [x1, y1, x2, y2] = [x(s.x1), Y[s.y1], x(s.x2), Y[s.y2]]
  if (x1 === x2) return `M${x1} ${y1}V${y2}`
  const dir = Math.sign(x2 - x1)
  const d = Math.min(Math.abs(x2 - x1), y2 - y1)
  if (s.y1 === 0) return `M${x1} ${y1}V${y2 - d}L${x1 + dir * d} ${y2}H${x2}`
  return `M${x1} ${y1}H${x2 - dir * d}L${x2} ${y1 + d}V${y2}`
}

const diamond = (cx: number, cy: number, r: number) => `M${cx} ${cy - r}L${cx + r} ${cy}L${cx} ${cy + r}L${cx - r} ${cy}Z`

/** Commits on HEAD's first-parent line that the upstream doesn't have yet. */
function unpushed(commits: GitCommit[], ahead: number): Set<string> {
  const out = new Set<string>()
  if (!ahead) return out
  const byHash = new Map(commits.map((c) => [c.hash, c]))
  let c = commits.find((k) => k.refs.some((r) => r.type === 'head'))
  while (c && out.size < ahead) {
    out.add(c.hash)
    c = c.parents[0] ? byHash.get(c.parents[0]) : undefined
  }
  return out
}

export function GitGraph({ commits, ahead = 0 }: { commits: GitCommit[]; ahead?: number }) {
  const { rows, lanes } = useMemo(() => layoutGraph(commits), [commits])
  const fresh = useMemo(() => unpushed(commits, ahead), [commits, ahead])
  const width = PAD * 2 + (lanes - 1) * LANE_W
  if (!commits.length) return <div className="muted pad">No commits yet.</div>
  return (
    <div className="git-graph">
      {rows.map((row) => (
        <GraphRowView key={row.commit.hash} row={row} width={width} isNew={fresh.has(row.commit.hash)} />
      ))}
    </div>
  )
}

const GraphRowView = memo(function GraphRowView({ row, width, isNew }: { row: GraphRow; width: number; isNew: boolean }) {
  const { commit } = row
  const isHead = commit.refs.some((r) => r.type === 'head')
  const isMerge = commit.parents.length > 1
  const color = laneColor(row.color)
  const cx = x(row.col)
  const cy = ROW_H / 2
  const nodeColor = isHead || isNew ? 'var(--vivid)' : color
  return (
    <div
      className={`git-row${isHead ? ' is-head' : ''}${isNew ? ' is-new' : ''}`}
      style={{ height: ROW_H }}
      title={`${commit.hash.slice(0, 10)} · ${commit.author} · ${new Date(commit.time * 1000).toLocaleString()}${isNew ? ' · not pushed yet' : ''}`}
    >
      <svg className="git-lanes" width={width} height={ROW_H}>
        {row.segments.map((s, i) => (
          <path
            key={i}
            d={segmentPath(s)}
            stroke={laneColor(s.color)}
            strokeWidth={1.5}
            strokeLinejoin="miter"
            strokeLinecap="square"
            fill="none"
          />
        ))}
        {isHead && <path d={diamond(cx, cy, 9)} fill="var(--row-bg)" stroke="var(--vivid)" strokeWidth={1} />}
        <path
          d={diamond(cx, cy, isMerge ? 4 : 5)}
          fill={isMerge ? 'var(--row-bg)' : nodeColor}
          stroke={nodeColor}
          strokeWidth={isMerge ? 1.5 : 1}
        />
      </svg>
      <div className="git-row-text">
        {commit.refs.map((r) => (
          <span key={`${r.type}:${r.name}`} className={`git-ref git-ref-${r.type}`}>
            {r.type === 'tag' && <Icon name="tag" size={11} />}
            {r.name}
          </span>
        ))}
        <span className="git-subject">{commit.subject}</span>
        <span className="git-meta">{relativeTime(commit.time * 1000)}</span>
      </div>
    </div>
  )
})
