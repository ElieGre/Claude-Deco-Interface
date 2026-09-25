// Cross-store orchestration and the UI-side slash commands.
// Anything not handled here is sent to Claude Code as-is, so every CLI command,
// custom command, skill and plugin command works exactly like in the terminal.
import type { EffortLevel, FileEntry, InfoKind, PermissionMode, SlashCommand } from '../../shared/types'
import { infoView, TERMINAL_ONLY } from './lib/commands'
import { CONTEXT_LABELS, contextFiles } from './lib/context'
import { basename } from './lib/format'
import { joinPath, normPath } from './lib/paths'
import { useApp } from './store/app'
import { agentTitle, useAgents, useSession } from './store/agents'
import { EFFORT_LEVELS, PERMISSION_MODES } from './store/session'
import { focusComposer, useUi } from './store/ui'
import { useViewer } from './store/viewer'

export async function bootstrap(): Promise<void> {
  await useApp.getState().load()
  // Idempotent: a hot reload re-runs startup, and must not open a second agent.
  if (!useAgents.getState().agents.length) await useAgents.getState().add()
}

/** Agents belong to a folder, so switching folders closes them and opens one fresh agent there. */
export async function openProject(cwd: string): Promise<void> {
  await useAgents.getState().closeAll()
  await useApp.getState().setCwd(cwd)
  await useAgents.getState().add()
}

/**
 * A Claude Code session is bound to one working folder, so changing the chat's context
 * means starting a new chat. Warn first (unless the user opted out); the old chat stays in history.
 */
async function confirmNewChat(title: string, body: string): Promise<boolean> {
  if (!useApp.getState().confirmNewChat) return true
  const { agents, meta } = useAgents.getState()
  const running = Object.values(meta).filter((m) => m.status === 'running' || m.status === 'compacting').length
  const notes = [
    'Your chats are saved under Chats and can be resumed any time.',
    agents.length > 1 ? `All ${agents.length} open agents will be closed.` : '',
    running ? `${running === 1 ? 'An agent is' : `${running} agents are`} still working and will be stopped.` : '',
  ]
  const { ok, dontAsk } = await useUi.getState().ask({
    title,
    body: `${body}\n\n${notes.filter(Boolean).join('\n')}`,
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

/** A new agent tab: its own Claude Code session, like opening a terminal tab. */
export const newAgent = () => useAgents.getState().add()

/** /clear and /new: a fresh session in the current tab, like the terminal. */
export async function newChat(): Promise<void> {
  const { activeId, setTitle } = useAgents.getState()
  if (activeId) setTitle(activeId, null)
  await useSession.getState().start()
}

/** Open a saved chat: focus its tab if it's open, reuse the current tab if it's empty, else open a new tab. */
export async function resumeChat(sessionId: string): Promise<void> {
  const { agents, meta, activeId, activate, add, setTitle } = useAgents.getState()
  const open = agents.find((a) => meta[a.id]?.sessionId === sessionId)
  if (open) return activate(open.id)
  const current = useSession.getState()
  const empty = !current.items.some((i) => i.kind === 'user') && current.status !== 'running' && current.status !== 'compacting'
  if (activeId && empty) {
    setTitle(activeId, null)
    useViewer.getState().show(null)
    await current.start({ resume: sessionId })
  } else await add({ resume: sessionId })
}

/** Close an agent tab, confirming first if Claude is still working or waiting there. */
export async function closeAgent(id: string): Promise<void> {
  const { agents, meta, close } = useAgents.getState()
  const agent = agents.find((a) => a.id === id)
  const m = meta[id]
  if (!agent) return
  if (m && (m.status === 'running' || m.status === 'compacting' || m.waiting)) {
    const { ok } = await useUi.getState().ask({
      title: `Close ${agentTitle(agent, m, useApp.getState().sessions)}?`,
      body: 'Claude is still working in this tab. Closing stops it; the chat so far stays in Chats and can be resumed.',
      confirmLabel: 'Stop and close',
    })
    if (!ok) return
  }
  await close(id)
}

export async function renameAgent(id: string, title: string): Promise<void> {
  const name = title.trim()
  if (name) await useAgents.getState().rename(id, name)
  else useAgents.getState().setTitle(id, null)
}

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

/** A new agent tab starting from a clean context with just this file attached. */
export async function newChatWithFile(entry: FileEntry): Promise<void> {
  const agent = await useAgents.getState().add()
  agent.store.getState().attach(entry.rel)
  focusComposer()
}

const local = (name: string, description: string, argumentHint = ''): SlashCommand => ({ name, description, argumentHint })

export const LOCAL_COMMANDS: SlashCommand[] = [
  local('btw', 'Ask a quick side question without interrupting the main conversation', '<question>'),
  local('clear', 'Start a new conversation'),
  local('new', 'Start a new conversation'),
  local('model', 'Switch model for this session', '<model>'),
  local('effort', 'Set effort level', EFFORT_LEVELS.join('|')),
  local('mode', 'Set permission mode (Shift+Tab cycles)', PERMISSION_MODES.join('|')),
  local('theme', 'Switch between the dark and light Neo-Deco themes', 'dark|light'),
  local('plan', 'View the session plan, or switch to plan mode'),
  local('status', 'Show version, model, account, API connectivity and tool status'),
  local('memory', 'Show CLAUDE.md files and saved memories'),
  local('skills', 'List skills and what each costs in context'),
  local('hooks', 'Show hook configurations for tool events'),
  local('permissions', 'Show allow / ask / deny rules and working directories'),
  local('add-dir', 'Add a working directory for this session', '<path>'),
  local('export', 'Export the conversation to a text file', '[filename]'),
  local('copy', "Copy Claude's last response (or /copy N for the Nth-latest)", '[N]'),
  local('branch', 'Branch this conversation into a new agent tab'),
  local('agent', 'Open a new agent tab (Ctrl+T)'),
  local('config', "Claude Code's settings (same as the terminal's /config)", '[key=value]'),
  local('resume', 'Resume a previous conversation (Chats tab)'),
  local('cd', 'Start a new chat in another folder', '<path>'),
  local('diff', 'Show uncommitted changes (git panel)'),
  local('version', "Show this session's Claude Code version"),
  local('exit', 'Close the app'),
  local('help', 'List interface commands'),
]

/** Fetch one of the CLI's read-only command views and show it in the info panel. */
async function showInfo(kind: InfoKind): Promise<unknown> {
  const { key, status } = useSession.getState()
  if (!key || status === 'closed') {
    useUi.getState().toast('No live session — send a message first.', 'warn')
    return null
  }
  try {
    const data = await window.api.claude.info(key, kind)
    if (kind !== 'plan') useUi.getState().showInfo(infoView(kind, data))
    return data
  } catch (err) {
    useUi.getState().toast(`/${kind} failed: ${err instanceof Error ? err.message : err}`, 'warn')
    return null
  }
}

/** Strip quotes and resolve against the project folder. */
function argPath(arg: string): string {
  return joinPath(useApp.getState().cwd ?? '', arg.trim().replace(/^["']|["']$/g, ''))
}

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
      case 'theme': {
        const app = useApp.getState()
        if (arg && arg !== 'dark' && arg !== 'light') return say(`Theme: ${app.theme}. Options: dark, light`)
        return app.setTheme(arg === 'dark' || arg === 'light' ? arg : app.theme === 'dark' ? 'light' : 'dark')
      }
      case 'agent':
        await newAgent()
        return
      case 'rename': {
        // Without a name the CLI generates one; with a name, rename the tab and the saved chat together.
        const { activeId } = useAgents.getState()
        if (!arg || !activeId) break
        await renameAgent(activeId, arg)
        return say(`Renamed to "${arg}"`)
      }
      case 'config': {
        if (!arg) return useUi.getState().openSettings()
        const cwd = useApp.getState().cwd
        const pairs = arg.match(/[A-Za-z]+=("[^"]*"|\S+)/g)
        if (!cwd || !pairs) return say('Usage: /config key=value, or /config on its own for the settings panel.')
        for (const pair of pairs) {
          const [key, ...rest] = pair.split('=')
          say(await window.api.cliConfig.set(cwd, key, rest.join('=').replace(/^"|"$/g, '')))
        }
        return
      }
      case 'btw':
        if (!arg) return say('Usage: /btw <question> — answered from the conversation so far, even while Claude is working, and not added to it.')
        return session.askSide(arg)
      case 'status':
      case 'memory':
      case 'skills':
      case 'hooks':
      case 'permissions':
        await showInfo(name)
        return
      case 'plan': {
        const plan = (await showInfo('plan')) as { exists?: boolean } | null
        if (plan?.exists) return useUi.getState().showInfo(infoView('plan', plan))
        await session.setPermissionMode('plan')
        return say('No plan in this session yet. Plan mode is on: Claude will research and propose a plan before changing anything.')
      }
      case 'add-dir': {
        if (!arg) return say('Usage: /add-dir <path> — lets Claude read and edit files there for the rest of this session.')
        const dir = argPath(arg)
        try {
          await window.api.files.list(dir, dir)
        } catch {
          return say(`Folder not found: ${dir}`)
        }
        if (await session.addDirectory(dir)) say(`Added working directory for this session:\n${dir}`)
        return
      }
      case 'export': {
        if (!session.key) return say('No live session to export.')
        const conv = await window.api.claude.exportConversation(session.key)
        if (!conv.text.trim()) return say('Nothing to export yet.')
        const saved = await window.api.shell.saveText(arg || conv.default_filename, conv.text)
        if (saved) say(`Exported the conversation to ${saved}`)
        return
      }
      case 'copy': {
        const n = Math.max(1, Number.parseInt(arg, 10) || 1)
        const replies = session.items.filter((i) => i.kind === 'text' && !i.parent && !i.streaming)
        const reply = replies[replies.length - n]
        if (!reply || reply.kind !== 'text') return say(n === 1 ? 'No response to copy yet.' : `There's no response #${n}.`)
        await window.api.shell.copy(reply.text)
        return useUi.getState().toast(n === 1 ? "Copied Claude's last response" : `Copied response #${n} from the end`)
      }
      case 'branch': {
        const cwd = useApp.getState().cwd
        if (!cwd || !session.sessionId || !session.items.some((i) => i.kind === 'user')) return say('Nothing to branch yet — send a message first.')
        const forked = await window.api.history.fork(session.sessionId, cwd)
        await useAgents.getState().add({ resume: forked })
        void useApp.getState().refreshHistory()
        return useUi.getState().toast('Branched into a new tab; the original keeps its own tab.')
      }
      case 'resume':
        useApp.getState().setLayout({ leftOpen: true, leftTab: 'chats' })
        return useUi.getState().toast('Pick a chat to resume from the Chats tab.')
      case 'cd':
        if (!arg) return say('Usage: /cd <path> — starts a new chat with that folder as the working directory.')
        return switchProject(argPath(arg))
      case 'diff':
        useApp.getState().setLayout({ rightOpen: true })
        return useUi.getState().toast('Uncommitted changes are listed in the git panel.')
      case 'version':
        return say(`Claude Code ${session.cliVersion ?? '(reported after the first message)'}`)
      case 'exit':
      case 'quit':
        return window.close()
      case 'help':
        return say(
          [
            'Interface commands:',
            ...LOCAL_COMMANDS.map((c) => `  /${c.name.padEnd(12)} ${c.description}`),
            '',
            'Everything else (/compact, /context, /cost, custom commands, skills…) runs in Claude Code.',
            `Terminal-only (interactive terminal screens): ${TERMINAL_ONLY.map((c) => `/${c.name}`).join(' ')}`,
            'Files tab: click a file to view it · double-click, drag into the composer, or right-click → "Add to chat context" to attach it.',
            'Keys: Enter send · Shift+Enter newline · Esc interrupt · Shift+Tab permission mode · ↑ previous prompt',
          ].join('\n'),
        )
      default: {
        const term = TERMINAL_ONLY.find((c) => c.name === name)
        if (term)
          return say(
            `/${name} (${term.description}) is terminal-only: it opens an interactive terminal screen, which SDK sessions don't have. Run it in \`claude\` in PowerShell.${term.alternative ? `\n${term.alternative}` : ''}`,
          )
      }
    }
  }
  await session.send(text)
}
