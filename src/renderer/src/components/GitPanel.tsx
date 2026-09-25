import { useEffect } from 'react'
import { fileCode } from '../lib/git'
import { useApp } from '../store/app'
import { GitGraph } from './GitGraph'
import { Icon } from './Icon'
import { GitSkeleton } from './Skeleton'

const REFRESH_MS = 15_000

export function GitPanel() {
  const status = useApp((s) => s.gitStatus)
  const gitLoaded = useApp((s) => s.gitLoaded)
  const commits = useApp((s) => s.commits)
  const refresh = useApp((s) => s.refreshGit)

  useEffect(() => {
    const timer = setInterval(() => void refresh(), REFRESH_MS)
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh])

  if (!gitLoaded) return <GitSkeleton />
  if (!status)
    return (
      <aside className="panel git-panel">
        <div className="panel-header">
          <span className="panel-title">Git</span>
        </div>
        <div className="muted pad">Not a git repository.</div>
      </aside>
    )

  return (
    <aside className="panel git-panel">
      <div className="panel-header">
        <span className="panel-title git-branch">
          <Icon name="branch" size={14} />
          {status.branch ?? 'detached HEAD'}
        </span>
        {status.upstream && (
          <span className="git-ab" title={`${status.ahead} ahead, ${status.behind} behind ${status.upstream}`}>
            <span className={status.ahead ? 'is-ahead' : undefined}>↑{status.ahead}</span>
            <span className={status.behind ? 'is-behind' : undefined}>↓{status.behind}</span>
          </span>
        )}
        <button className="icon-btn" onClick={() => void refresh()} title="Refresh">
          <Icon name="refresh" />
        </button>
      </div>

      <details className="git-changes" open>
        <summary className="section-label">
          <Icon name="chevronRight" size={11} className="section-chevron" />
          Changes <span className="count">{status.files.length}</span>
        </summary>
        {status.files.length === 0 ? (
          <div className="muted pad-sm">Working tree clean</div>
        ) : (
          <ul>
            {status.files.map((f) => {
              const code = fileCode(f)
              const slash = f.path.lastIndexOf('/')
              return (
                <li key={f.path} className="git-file" title={f.path}>
                  <span className={`git-code git-code-${code}`}>{code}</span>
                  <span className="git-path">
                    <span className="git-file-name">{f.path.slice(slash + 1)}</span>
                    {slash > 0 && <span className="git-file-dir">{f.path.slice(0, slash)}</span>}
                  </span>
                  {f.additions != null && <span className="git-add">+{f.additions}</span>}
                  {f.deletions != null && <span className="git-del">−{f.deletions}</span>}
                </li>
              )
            })}
          </ul>
        )}
      </details>

      <div className="section-label git-graph-head">History</div>
      <div className="git-graph-scroll">
        <GitGraph commits={commits} ahead={status.ahead} />
      </div>
    </aside>
  )
}
