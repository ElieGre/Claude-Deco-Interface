// Lane layout for a commit graph. Commits must be in topological order (children first).
// Each row is drawn independently as segments in three vertical slots: top (0), node (1), bottom (2).
import type { GitCommit } from '../../../shared/types'

export interface Segment {
  x1: number
  y1: 0 | 1
  x2: number
  y2: 1 | 2
  color: number
}

export interface GraphRow {
  commit: GitCommit
  col: number
  color: number
  segments: Segment[]
}

export function layoutGraph(commits: GitCommit[]): { rows: GraphRow[]; lanes: number } {
  const lanes: (string | null)[] = [] // hash each lane is waiting for
  const colors: number[] = []
  let nextColor = 0
  let maxLanes = 1
  const rows: GraphRow[] = []

  const freeSlot = (avoid = -1) => {
    const i = lanes.findIndex((h, j) => h === null && j !== avoid)
    return i === -1 ? Math.max(lanes.length, avoid + 1) : i
  }

  for (const commit of commits) {
    const before = lanes.slice()
    const segments: Segment[] = []

    let col = lanes.indexOf(commit.hash)
    if (col === -1) {
      // Branch tip: nothing above it in view.
      col = freeSlot()
      lanes[col] = commit.hash
      colors[col] = nextColor++
    }

    // Top half: lanes flowing into this commit converge on its node; others pass through.
    before.forEach((h, j) => {
      if (h === null || h === undefined) return
      segments.push({ x1: j, y1: 0, x2: h === commit.hash ? col : j, y2: 1, color: colors[j] })
    })
    lanes.forEach((h, j) => {
      if (h === commit.hash && j !== col) lanes[j] = null
    })

    // Bottom half: first parent continues this lane; extra (merge) parents join or open lanes.
    if (commit.parents.length === 0) lanes[col] = null
    else {
      lanes[col] = commit.parents[0]
      for (const p of commit.parents.slice(1)) {
        let j = lanes.indexOf(p)
        if (j === -1) {
          j = freeSlot(col)
          lanes[j] = p
          colors[j] = nextColor++
        }
        segments.push({ x1: col, y1: 1, x2: j, y2: 2, color: colors[j] })
      }
    }
    lanes.forEach((h, j) => {
      if (h === null || h === undefined) return
      if (j === col) segments.push({ x1: col, y1: 1, x2: col, y2: 2, color: colors[col] })
      else if (before[j] === h) segments.push({ x1: j, y1: 1, x2: j, y2: 2, color: colors[j] })
    })

    rows.push({ commit, col, color: colors[col], segments })
    maxLanes = Math.max(maxLanes, lanes.length, before.length, col + 1)
    while (lanes.length && lanes[lanes.length - 1] == null) lanes.pop()
  }

  return { rows, lanes: maxLanes }
}
