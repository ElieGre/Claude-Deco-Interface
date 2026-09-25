import type { GitFileChange } from '../../../shared/types'

/** Single-letter status like VS Code's: U untracked, M modified, A added, D deleted, R renamed. */
export function fileCode(f: GitFileChange): string {
  if (f.index === '?') return 'U'
  return f.worktree !== '.' ? f.worktree : f.index
}

/** Lane colors are `--lane-0` … `--lane-7` in styles/base.css, cycled by lane. */
export const laneColor = (i: number) => `var(--lane-${i % 8})`
