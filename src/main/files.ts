import { execFile } from 'node:child_process'
import { watch, type FSWatcher } from 'node:fs'
import { open, readdir } from 'node:fs/promises'
import { dirname, join, relative, sep } from 'node:path'
import type { WebContents } from 'electron'
import type { FileContent, FileEntry } from '../shared/types'

const HIDDEN = new Set(['.git'])
const READ_LIMIT = 2 * 1024 * 1024

/** Direct children of `dir`, folders first, with gitignored entries flagged. */
export async function list(dir: string, root: string): Promise<FileEntry[]> {
  const dirents = await readdir(dir, { withFileTypes: true })
  const entries: FileEntry[] = dirents
    .filter((d) => !HIDDEN.has(d.name))
    .map((d) => {
      const path = join(dir, d.name)
      return { name: d.name, path, rel: relative(root, path).split(sep).join('/'), dir: d.isDirectory(), ignored: false }
    })
  const ignored = await gitIgnored(dir, entries)
  for (const e of entries) e.ignored = ignored.has(e.name)
  return entries.sort((a, b) =>
    a.dir === b.dir ? a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }) : a.dir ? -1 : 1,
  )
}

/** File contents for the viewer: text as UTF-8, or why it can't be shown. */
export async function read(path: string): Promise<FileContent> {
  const fh = await open(path, 'r')
  try {
    const { size } = await fh.stat()
    if (size > READ_LIMIT) return { kind: 'too-large', size, limit: READ_LIMIT }
    const buf = await fh.readFile()
    // NUL bytes in the first 8 KB is the same heuristic git uses to call a file binary.
    if (buf.subarray(0, 8192).includes(0)) return { kind: 'binary', size }
    return { kind: 'text', text: buf.toString('utf8'), size }
  } finally {
    await fh.close()
  }
}

function gitIgnored(dir: string, entries: FileEntry[]): Promise<Set<string>> {
  return new Promise((resolve) => {
    if (!entries.length) return resolve(new Set())
    const child = execFile('git', ['check-ignore', '--stdin'], { cwd: dir, windowsHide: true }, (_err, stdout) => {
      // Exit 1 means nothing is ignored and 128 means not a repo; either way the output is what counts.
      resolve(new Set(String(stdout).split('\n').map((l) => l.trim().replace(/\/$/, '')).filter(Boolean)))
    })
    // Trailing slash lets directory-only patterns like `node_modules/` match.
    child.stdin?.end(entries.map((e) => (e.dir ? `${e.name}/` : e.name)).join('\n') + '\n')
  })
}

/** Watches the project folder and tells the renderer which directories changed (debounced). */
export class FolderWatcher {
  private readonly wc: WebContents
  private watcher: FSWatcher | null = null
  private dirs = new Set<string>()
  private gitChanged = false
  private timer: NodeJS.Timeout | null = null

  constructor(wc: WebContents) {
    this.wc = wc
  }

  watch(root: string): void {
    this.close()
    try {
      this.watcher = watch(root, { recursive: true }, (_event, filename) => {
        if (!filename) return
        const parts = filename.split(/[\\/]/)
        if (parts[0] === '.git') {
          // Only HEAD/refs matter; .git/index churns on every `git status`, including our own.
          if (parts[1] !== 'HEAD' && parts[1] !== 'refs') return
          this.gitChanged = true
        } else if (parts.includes('node_modules')) return
        else this.dirs.add(dirname(join(root, filename)))
        this.timer ??= setTimeout(() => this.flush(), 300)
      })
      this.watcher.on('error', () => this.close())
    } catch {
      // Recursive watch unsupported or folder gone: the tree still refreshes on focus and after each turn.
    }
  }

  private flush(): void {
    this.timer = null
    const change = { dirs: [...this.dirs], git: this.gitChanged }
    this.dirs.clear()
    this.gitChanged = false
    if (!this.wc.isDestroyed()) this.wc.send('fs:changed', change)
  }

  close(): void {
    this.watcher?.close()
    this.watcher = null
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    this.dirs.clear()
  }
}
