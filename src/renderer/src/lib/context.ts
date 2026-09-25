// Which project files are in the current chat's context: attached by the user, or read/edited by Claude.
import { useMemo } from 'react'
import { useApp } from '../store/app'
import { useSession } from '../store/session'
import type { ChatItem } from './chat'
import { joinPath, normPath } from './paths'

export type ContextState = 'pending' | 'attached' | 'read' | 'edited'

export const CONTEXT_LABELS: Record<ContextState, string> = {
  pending: 'attached to your next message',
  attached: 'attached earlier in this chat',
  read: 'read by Claude in this chat',
  edited: 'edited by Claude in this chat',
}

const FILE_TOOLS: Record<string, ContextState> = {
  Read: 'read',
  Edit: 'edited',
  MultiEdit: 'edited',
  Write: 'edited',
  NotebookEdit: 'edited',
}

/** Keyed by normPath(absolute path). */
export function contextFiles(items: ChatItem[], attachments: string[], cwd: string | null): Map<string, ContextState> {
  const map = new Map<string, ContextState>()
  if (!cwd) return map
  // Compaction replaces earlier turns with a summary, so only count what happened since the last one.
  let start = 0
  items.forEach((it, i) => {
    if (it.kind === 'notice' && it.tone === 'divider') start = i + 1
  })
  for (const it of items.slice(start)) {
    if (it.kind === 'user') {
      for (const rel of it.files ?? []) map.set(normPath(joinPath(cwd, rel)), 'attached')
    } else if (it.kind === 'tool' && FILE_TOOLS[it.name] && !it.isError) {
      const p = it.input.file_path ?? it.input.notebook_path
      if (typeof p !== 'string') continue
      const key = normPath(joinPath(cwd, p))
      if (map.get(key) !== 'edited') map.set(key, FILE_TOOLS[it.name])
    }
  }
  for (const rel of attachments) map.set(normPath(joinPath(cwd, rel)), 'pending')
  return map
}

/** Live context map with a stable identity while its contents don't change (it's recomputed on every stream delta). */
export function useContextFiles(): Map<string, ContextState> {
  const items = useSession((s) => s.items)
  const attachments = useSession((s) => s.attachments)
  const cwd = useApp((s) => s.cwd)
  const map = useMemo(() => contextFiles(items, attachments, cwd), [items, attachments, cwd])
  const signature = [...map].map(([k, v]) => `${k}=${v}`).join('|')
  return useMemo(() => map, [signature])
}
