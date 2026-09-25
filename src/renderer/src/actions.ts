// Cross-store orchestration and the UI-side slash commands.
// Anything not handled here is sent to Claude Code as-is, so every CLI command,
// custom command, skill and plugin command works exactly like in the terminal.
import type { EffortLevel, FileEntry, PermissionMode, SlashCommand } from '../../shared/types'
import { CONTEXT_LABELS, contextFiles } from './lib/context'
import { basename } from './lib/format'
import { normPath } from './lib/paths'
import { useApp } from './store/app'
import { EFFORT_LEVELS, PERMISSION_MODES, useSession } from './store/session'
import { focusComposer, useUi } from './store/ui'
import { useViewer } from './store/viewer'

export async function bootstrap(): Promise<void> {
  await useApp.getState().load()
  await useSession.getState().start()
}

export async function openProject(cwd: string): Promise<void> {
  await useSession.getState().stop()
  await useApp.getState().setCwd(cwd)
  await useSession.getState().start()
}

/**
 * A Claude Code session is bound to one working folder, so changing the chat's context
 * means starting a new chat. Warn first (unless the user opted out); the old chat stays in history.
 */
async function confirmNewChat(title: string, body: string): Promise<boolean> {
  if (!useApp.getState().confirmNewChat) return true
  const { status } = useSession.getState()
  const running = status === 'running' || status === 'compacting'
  const { ok, dontAsk } = await useUi.getState().ask({
    title,
    body: `${body}\n\nYour current chat is saved under Chats and can be resumed any time.${running ? '\nClaude is still working — the current turn will be stopped.' : ''}`,
    confirmLabel: 'Start new chat',
    allowDontAsk: true,
  })
  if (ok && dontAsk) useApp.getState().setConfirmNewChat(false)
  return ok
}

/** Switch the working folder (project picker, "New chat in this folder", parent folder). */
export async function switchProject(dir: string): Promise<void> {
  if (normPath(dir) === normPath(useApp.getState().cwd ?? '')) return
  const ok = await confirmNewChat(
    `Start a new chat in ${basename(dir)}?`,
    `Claude's working folder becomes:\n${dir}\n\nThe file tree, chat history and git panel switch to that folder.`,
  )
  if (ok) await openProject(dir)
}

export async function pickProject(): Promise<void> {
  const dir = await window.api.config.pickFolder()
  if (dir) await switchProject(dir)
}

export const newChat = () => useSession.getState().start()
export const resumeChat = (sessionId: string) => useSession.getState().start({ resume: sessionId })

/** Attach a project file/folder to the current chat, or say so if it's already in context. */
export function addToContext(entry: FileEntry): void {
  const { items, attachments } = useSession.getState()
  const state = contextFiles(items, attachments, useApp.getState().cwd).get(normPath(entry.path))
  const label = entry.dir ? `${entry.rel}/` : entry.rel
  const { toast } = useUi.getState()
  if (state) toast(`${label} is already in context — ${CONTEXT_LABELS[state]}`, 'warn')
  else {
    useSession.getState().attach(entry.rel)
    toast(`Attached ${label} — it's sent with your next message`)
  }
  focusComposer()
}

/** Fresh chat in the same folder with just this file attached. */
export async function newChatWithFile(entry: FileEntry): Promise<void> {
  const ok = await confirmNewChat(
    `Start a new chat with ${entry.name}?`,
    `Claude starts from a clean context with ${entry.rel} attached to your first message.`,
  )
  if (!ok) return
  await newChat()
  useSession.getState().attach(entry.rel)
  focusComposer()
}

const local = (name: string, description: string, argumentHint = ''): SlashCommand => ({ name, description, argumentHint })

export const LOCAL_COMMANDS: SlashCommand[] = [
  local('clear', 'Start a new conversation'),
  local('new', 'Start a new conversation'),
  local('model', 'Switch model for this session', '<model>'),
  local('effort', 'Set effort level', EFFORT_LEVELS.join('|')),
  local('mode', 'Set permission mode (Shift+Tab cycles)', PERMISSION_MODES.join('|')),
  local('help', 'List interface commands'),
]

export async function submit(raw: string): Promise<void> {
  const text = raw.trim()
  const session = useSession.getState()
  if (!text && !session.attachments.length) return
  useViewer.getState().show(null)
  const m = /^\/(\S+)\s*([\s\S]*)$/.exec(text)
  if (m) {
    const [, name, arg] = m
    const say = (t: string) => session.addNotice(t, 'output')
    switch (name) {
      case 'clear':
      case 'new':
        return newChat()
      case 'model': {
        const models = session.meta?.models ?? []
        if (!arg) return say(`Current: ${session.model ?? 'default'}\n\n${models.map((x) => `  ${x.value.padEnd(24)} ${x.displayName}`).join('\n')}`)
        await session.setModel(arg)
        return say(`Model set to ${arg}`)
      }
      case 'effort':
        if (!EFFORT_LEVELS.includes(arg as EffortLevel)) return say(`Effort: ${session.effort ?? 'default'}. Options: ${EFFORT_LEVELS.join(', ')}`)
        await session.setEffort(arg as EffortLevel)
        return say(`Effort set to ${arg}`)
      case 'mode':
        if (!PERMISSION_MODES.includes(arg as PermissionMode)) return say(`Mode: ${session.permissionMode}. Options: ${PERMISSION_MODES.join(', ')}`)
        await session.setPermissionMode(arg as PermissionMode)
        return say(`Permission mode set to ${arg}`)
      case 'help':
        return say(
          [
            'Interface commands:',
            ...LOCAL_COMMANDS.map((c) => `  /${c.name.padEnd(8)} ${c.description}`),
            '',
            'Everything else (/compact, /context, /cost, custom commands, skills…) runs in Claude Code.',
            'Files tab: click a file to view it · double-click, drag into the composer, or right-click → "Add to chat context" to attach it.',
            'Keys: Enter send · Shift+Enter newline · Esc interrupt · Shift+Tab permission mode · ↑ previous prompt',
          ].join('\n'),
        )
    }
  }
  await session.send(text)
}
