import { memo, useEffect, useMemo, type DragEvent, type MouseEvent } from 'react'
import type { FileEntry } from '../../../shared/types'
import { addToContext, newChatWithFile, switchProject } from '../actions'
import { CONTEXT_LABELS, useContextFiles, type ContextState } from '../lib/context'
import { basename } from '../lib/format'
import { fileCode } from '../lib/git'
import { joinPath, normPath, parentDir, revealLabel } from '../lib/paths'
import { useApp } from '../store/app'
import { useFiles } from '../store/files'
import { useUi, type MenuItem } from '../store/ui'
import { useViewer } from '../store/viewer'
import { Icon } from './Icon'
import { TreeSkeleton } from './Skeleton'

export const DRAG_TYPE = 'application/x-claude-file'

interface Decorations {
  git: Map<string, string>
  gitDirs: Set<string>
  context: Map<string, ContextState>
}

function useGitDecorations() {
  const status = useApp((s) => s.gitStatus)
  return useMemo(() => {
    const git = new Map<string, string>()
    const gitDirs = new Set<string>()
    if (!status) return { git, gitDirs }
    const root = normPath(status.root)
    for (const f of status.files) {
      const abs = normPath(joinPath(status.root, f.path))
      git.set(abs, fileCode(f))
      for (let d = abs.slice(0, abs.lastIndexOf('/')); d.length > root.length; d = d.slice(0, d.lastIndexOf('/'))) gitDirs.add(d)
    }
    return { git, gitDirs }
  }, [status])
}

function entryMenu(entry: FileEntry, state: ContextState | undefined): MenuItem[] {
  const { toast } = useUi.getState()
  const run = (p: Promise<unknown>) => p.catch((e) => toast(String(e instanceof Error ? e.message : e), 'warn'))
  return [
    {
      label: 'Add to chat context',
      hint: state ? '✓ in context' : 'as @mention',
      onClick: () => addToContext(entry),
    },
    entry.dir
      ? { label: 'New chat in this folder…', hint: 'changes working folder', onClick: () => void switchProject(entry.path) }
      : { label: 'New chat with this file…', onClick: () => void newChatWithFile(entry) },
    'separator',
    ...(entry.dir
      ? []
      : [
          { label: 'Open in viewer', hint: 'click', onClick: () => useViewer.getState().open(entry.path) },
          { label: 'Open in default app', onClick: () => void run(window.api.shell.open(entry.path)) },
        ]),
    { label: revealLabel, onClick: () => void run(window.api.shell.reveal(entry.path)) },
    'separator',
    { label: 'Copy path', onClick: () => void window.api.shell.copy(entry.path) },
    { label: 'Copy relative path', onClick: () => void window.api.shell.copy(entry.rel) },
  ]
}

export function FilesPanel() {
  const root = useFiles((s) => s.root)
  const error = useFiles((s) => s.error)
  const { reload, collapseAll } = useFiles.getState()
  const git = useGitDecorations()
  const context = useContextFiles()
  const deco = useMemo<Decorations>(() => ({ ...git, context }), [git, context])

  useEffect(() => {
    const onFocus = () => void reload()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [reload])

  if (!root) return <div className="muted pad">No folder open.</div>
  const parent = parentDir(root)

  return (
    <div className="tab-body files-panel">
      <div className="tab-toolbar">
        <span className="files-root" title={root}>
          {basename(root)}
        </span>
        <button
          className="icon-btn"
          disabled={!parent}
          onClick={() => parent && void switchProject(parent)}
          title="New chat in the parent folder"
        >
          <Icon name="up" />
        </button>
        <button className="icon-btn" onClick={() => void reload()} title="Refresh">
          <Icon name="refresh" />
        </button>
        <button className="icon-btn" onClick={collapseAll} title="Collapse all">
          <Icon name="collapse" />
        </button>
      </div>
      <div className="file-tree" role="tree">
        {error ? <div className="notice notice-error">{error}</div> : <DirChildren dir={root} depth={0} deco={deco} />}
      </div>
      <div className="files-legend">
        <span>
          <span className="ctx-dot is-in" /> in chat context
        </span>
        <span>
          <span className="ctx-dot is-pending" /> attached to next message
        </span>
        <span className="muted">Click to view · double-click or drag to attach · right-click for more</span>
      </div>
    </div>
  )
}

function DirChildren({ dir, depth, deco }: { dir: string; depth: number; deco: Decorations }) {
  const entries = useFiles((s) => s.children[dir])
  useEffect(() => {
    if (!entries) void useFiles.getState().load(dir)
  }, [dir, entries])
  if (!entries) return <TreeSkeleton indent={indent(depth)} />
  if (!entries.length) return <div className="tree-empty" style={{ paddingLeft: indent(depth) }}>empty</div>
  return (
    <>
      {entries.map((e) => (
        <TreeRow key={e.path} entry={e} depth={depth} deco={deco} />
      ))}
    </>
  )
}

const indent = (depth: number) => 8 + depth * 12

const TreeRow = memo(function TreeRow({ entry, depth, deco }: { entry: FileEntry; depth: number; deco: Decorations }) {
  const expanded = useFiles((s) => !!s.expanded[entry.path])
  const selected = useFiles((s) => s.selected === entry.path)
  const viewing = useViewer((s) => s.active === entry.path)
  const key = normPath(entry.path)
  const gitCode = entry.dir ? (deco.gitDirs.has(key) ? '•' : undefined) : deco.git.get(key)
  const ctx = deco.context.get(key)
  const ctxInside = entry.dir && !ctx && [...deco.context.keys()].some((k) => k.startsWith(`${key}/`))

  const onClick = () => {
    useFiles.getState().select(entry.path)
    if (entry.dir) useFiles.getState().toggle(entry.path)
    else useViewer.getState().open(entry.path)
  }
  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    useFiles.getState().select(entry.path)
    useUi.getState().openMenu(e.clientX, e.clientY, entryMenu(entry, ctx))
  }
  const onDragStart = (e: DragEvent) => {
    e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(entry))
    e.dataTransfer.effectAllowed = 'copy'
  }

  const ctxTitle = ctx ? `In chat context — ${CONTEXT_LABELS[ctx]}` : ctxInside ? 'Contains files in chat context' : undefined

  return (
    <>
      <div
        role="treeitem"
        aria-expanded={entry.dir ? expanded : undefined}
        className={`tree-row${selected ? ' is-selected' : ''}${viewing ? ' is-viewing' : ''}${entry.ignored ? ' is-ignored' : ''}${gitCode ? ` git-${gitCode === '•' ? 'dir' : gitCode}` : ''}`}
        style={{ paddingLeft: indent(depth) }}
        title={entry.rel}
        draggable
        onDragStart={onDragStart}
        onClick={onClick}
        onDoubleClick={() => !entry.dir && addToContext(entry)}
        onContextMenu={onContextMenu}
      >
        <span className="tree-chevron">{entry.dir && <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={12} />}</span>
        <span className="tree-name">{entry.name}</span>
        {(ctx || ctxInside) && (
          <span className={`ctx-dot ${ctx === 'pending' ? 'is-pending' : ctxInside ? 'is-inside' : 'is-in'}`} title={ctxTitle} />
        )}
        {gitCode && <span className="tree-git">{gitCode}</span>}
      </div>
      {entry.dir && expanded && <DirChildren dir={entry.path} depth={depth + 1} deco={deco} />}
    </>
  )
})
