import { execFile } from 'node:child_process'
import type { GitCommit, GitFileChange, GitRef, GitStatus } from '../shared/types'

function git(cwd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'git',
      args,
      { cwd, maxBuffer: 64 * 1024 * 1024, windowsHide: true },
      (err, stdout, stderr) => (err ? reject(new Error(stderr || err.message)) : resolve(stdout)),
    )
  })
}

export async function status(cwd: string): Promise<GitStatus | null> {
  let root: string
  try {
    root = (await git(cwd, ['rev-parse', '--show-toplevel'])).trim()
  } catch {
    return null
  }

  const [porcelain, numstat] = await Promise.all([
    git(cwd, ['status', '--porcelain=v2', '--branch', '--untracked-files=all']),
    // Fails on a repo with no commits yet; stats are optional.
    git(cwd, ['diff', '--numstat', 'HEAD']).catch(() => ''),
  ])

  const stats = new Map<string, [number | null, number | null]>()
  for (const line of numstat.split('\n')) {
    const [add, del, ...rest] = line.split('\t')
    if (!rest.length) continue
    const toNum = (v: string) => (v === '-' ? null : Number(v))
    stats.set(rest.join('\t'), [toNum(add), toNum(del)])
  }

  const result: GitStatus = { root, branch: null, detached: false, upstream: null, ahead: 0, behind: 0, files: [] }
  const addFile = (xy: string, path: string) => {
    const [additions, deletions] = stats.get(path) ?? [null, null]
    result.files.push({ path, index: xy[0], worktree: xy[1], additions, deletions } satisfies GitFileChange)
  }

  for (const line of porcelain.split('\n')) {
    if (line.startsWith('# branch.head ')) {
      const head = line.slice(14)
      result.detached = head === '(detached)'
      result.branch = result.detached ? null : head
    } else if (line.startsWith('# branch.upstream ')) {
      result.upstream = line.slice(18)
    } else if (line.startsWith('# branch.ab ')) {
      const m = /\+(\d+) -(\d+)/.exec(line)
      if (m) [result.ahead, result.behind] = [Number(m[1]), Number(m[2])]
    } else if (line.startsWith('1 ')) {
      const parts = line.split(' ')
      addFile(parts[1], parts.slice(8).join(' '))
    } else if (line.startsWith('2 ')) {
      const parts = line.split(' ')
      addFile(parts[1], parts.slice(9).join(' ').split('\t')[0])
    } else if (line.startsWith('u ')) {
      const parts = line.split(' ')
      addFile(parts[1], parts.slice(10).join(' '))
    } else if (line.startsWith('? ')) {
      addFile('??', line.slice(2))
    }
  }
  return result
}

const FIELD = '\x1f'
const RECORD = '\x1e'

export async function graph(cwd: string, limit = 400): Promise<GitCommit[]> {
  let out: string
  try {
    out = await git(cwd, [
      'log',
      '--exclude=refs/stash',
      '--all',
      '--topo-order',
      '--decorate=full',
      `-n${limit}`,
      `--format=%H${FIELD}%P${FIELD}%D${FIELD}%s${FIELD}%an${FIELD}%ct${RECORD}`,
    ])
  } catch {
    return [] // not a repo, or no commits yet
  }

  return out
    .split(RECORD)
    .map((r) => r.replace(/^\n/, ''))
    .filter(Boolean)
    .map((record) => {
      const [hash, parents, refs, subject, author, time] = record.split(FIELD)
      return {
        hash,
        parents: parents ? parents.split(' ') : [],
        refs: parseRefs(refs),
        subject,
        author,
        time: Number(time),
      }
    })
}

function parseRefs(decoration: string): GitRef[] {
  const refs: GitRef[] = []
  for (const part of decoration.split(', ')) {
    if (!part) continue
    if (part.startsWith('HEAD -> ')) refs.push({ type: 'head', name: part.slice(8).replace('refs/heads/', '') })
    else if (part === 'HEAD') refs.push({ type: 'head', name: 'HEAD' })
    else if (part.startsWith('tag: ')) refs.push({ type: 'tag', name: part.slice(5).replace('refs/tags/', '') })
    else if (part.startsWith('refs/heads/')) refs.push({ type: 'branch', name: part.slice(11) })
    else if (part.startsWith('refs/remotes/') && !part.endsWith('/HEAD'))
      refs.push({ type: 'remote', name: part.slice(13) })
  }
  return refs
}
