// Parity with the terminal CLI's slash commands.
// SDK sessions only register the non-interactive ones; the interactive ones either get a UI equivalent
// (actions.ts) or are listed here as terminal-only so the menu still shows the whole set.
import type { InfoKind, SlashCommand } from '../../../shared/types'

export interface TerminalOnlyCommand extends SlashCommand {
  terminalOnly: true
  /** What to do instead in this app, when there's something better than "use the terminal". */
  alternative?: string
}

const term = (name: string, description: string, alternative?: string): TerminalOnlyCommand => ({
  name,
  description,
  argumentHint: '',
  terminalOnly: true,
  alternative,
})

const AUTH = 'Authentication comes from ~/.claude/settings.json, so it applies here once the CLI is set up.'

/** Interactive commands of Claude Code 2.1.280 that have no headless equivalent. */
export const TERMINAL_ONLY: TerminalOnlyCommand[] = [
  term('login', 'Sign in or switch Anthropic accounts', AUTH),
  term('logout', 'Sign out from your Anthropic account', AUTH),
  term('setup-vertex', 'Reconfigure Google Vertex AI authentication, project, region', AUTH),
  term('setup-bedrock', 'Reconfigure Amazon Bedrock authentication, region', AUTH),
  term('privacy-settings', 'View and update your privacy settings'),
  term('rewind', 'Restore the code and conversation to an earlier point', 'Use /branch to continue from a copy of this chat.'),
  term('fork', 'Copy this conversation into a background session', 'Use /branch to copy this chat into a new one.'),
  term('subtask', 'Send a subagent off with your full context'),
  term('background', 'Send this session to the background'),
  term('tasks', 'View and manage everything running in the background'),
  term('stop', 'Stop this background session'),
  term('teleport', 'Send this session to the cloud, or resume one from claude.ai'),
  term('remote-control', 'Control this session from your phone or claude.ai/code'),
  term('session', 'Show cloud session URL and QR code'),
  term('desktop', 'Continue the current session in Claude Desktop'),
  term('web-setup', 'Set up cloud sessions with your GitHub account'),
  term('remote-env', 'Choose the default environment for cloud agents'),
  term('cloud-plugins', 'Choose whether cloud sessions use local plugins'),
  term('ultraplan', 'Draft an editable plan in a cloud session'),
  term('ultrareview', 'Run a deep cloud code review'),
  term('autofix-pr', 'Monitor and autofix issues on the current PR'),
  term('advisor', 'Let Claude consult a stronger model at key moments'),
  term('daemon', 'Manage background services and routines'),
  term('loops', 'List, create, and delete loops'),
  term('workflows', 'Browse running and completed workflows'),
  term('artifacts', 'Browse your published and shared artifacts'),
  term('plugin', 'Manage Claude Code plugins', 'Plugins enabled in the CLI load here too; /reload-plugins picks up changes.'),
  term('install-github-app', 'Set up Claude GitHub Actions for a repository'),
  term('import', 'Import config from another AI coding agent'),
  term('skill-doctor', 'Show which loaded skills are unused and costing context', 'Use /skills for each skill’s context cost.'),
  term('pause-memory', 'Pause auto-memory for this session', 'Use /memory to see what’s saved.'),
  term('ide', 'Manage IDE integrations'),
  term('terminal-setup', 'Terminal key bindings for newlines'),
  term('theme', 'Change the terminal theme', 'The app’s look lives in src/renderer/src/styles/base.css.'),
  term('tui', 'Set the terminal UI renderer'),
  term('scroll-speed', 'Adjust mouse wheel scroll speed'),
  term('focus', 'Toggle focus view'),
  term('brief', 'Toggle brief-only mode'),
  term('wellbeing', 'Configure break reminders and quiet hours'),
  term('bug', 'Report a bug or share your conversation'),
  term('feedback', 'Send feedback to Anthropic'),
  term('usage-credits', 'Configure usage credits'),
  term('upgrade', 'Upgrade your plan'),
  term('install', 'Install the Claude Code native build'),
]

export const isTerminalOnly = (c: SlashCommand): c is TerminalOnlyCommand => 'terminalOnly' in c

// ---------- Info panels (/status, /hooks, /memory, /skills, /permissions, /plan) ----------

export interface InfoRow {
  label: string
  value?: string
  detail?: string
  /** Shows Open / Reveal buttons */
  path?: string
}

export interface InfoSection {
  title: string
  rows: InfoRow[]
  /** Shown when there are no rows */
  empty?: string
}

export interface InfoView {
  title: string
  sections: InfoSection[]
  markdown?: string
  footer?: string
}

// Shapes observed on Claude Code 2.1.280; every field is optional so a CLI update degrades gracefully.
type Loose = any

const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? undefined : String(v))

export function infoView(kind: InfoKind, data: Loose): InfoView {
  switch (kind) {
    case 'status':
      return {
        title: 'Status',
        sections: (data?.sections ?? []).map((s: Loose) => ({
          title: str(s.title) ?? '',
          rows: (s.rows ?? []).map((r: Loose) => ({ label: str(r.label) ?? '', value: str(r.value) })),
        })),
      }
    case 'hooks': {
      const hooks: Loose[] = data?.hooks ?? []
      const events = [...new Set(hooks.map((h) => str(h.event) ?? 'Other'))]
      return {
        title: 'Hooks',
        sections: events.length
          ? events.map((event) => ({
              title: event,
              rows: hooks
                .filter((h) => (str(h.event) ?? 'Other') === event)
                .map((h) => ({
                  label: h.matcher ? `matcher: ${h.matcher}` : 'all',
                  value: str(h.commandText ?? h.displayText),
                  detail: [str(h.sourceLabel), h.runsInBackground ? 'runs in background' : ''].filter(Boolean).join(' · '),
                })),
            }))
          : [{ title: 'Hooks', rows: [], empty: 'No hooks configured.' }],
        footer: data?.policy?.allDisabled ? 'All hooks are disabled by policy.' : 'Edit hooks in your settings.json files.',
      }
    }
    case 'memory':
      return {
        title: 'Memory',
        sections: [
          {
            title: 'Instruction files',
            rows: (data?.files ?? []).map((f: Loose) => ({
              label: str(f.label) ?? str(f.kind) ?? 'File',
              value: f.exists === false ? 'not created yet' : undefined,
              detail: str(f.description),
              path: f.exists === false ? undefined : str(f.path),
            })),
          },
          {
            title: 'Saved memories',
            rows: (data?.memories ?? []).map((m: Loose) => ({
              label: str(m.name) ?? '',
              detail: str(m.description),
              path: str(m.path),
            })),
            empty: 'No saved memories.',
          },
          {
            title: 'Folders',
            rows: (data?.folders ?? []).map((f: Loose) => ({ label: str(f.label) ?? '', path: str(f.path) })),
          },
        ],
        footer: data?.auto_memory ? `Auto-memory: ${str(data.auto_memory.status) ?? (data.auto_memory.enabled ? 'on' : 'off')}` : undefined,
      }
    case 'skills': {
      const skills: Loose[] = data?.skills ?? []
      const total = skills.reduce((n, s) => n + (Number(s.tokens) || 0), 0)
      return {
        title: 'Skills',
        sections: [
          {
            title: `${skills.length} skills`,
            rows: skills.map((s) => ({
              label: str(s.display_name ?? s.name) ?? '',
              value: [s.tokens != null ? `${s.tokens} tokens` : '', str(s.state) ?? ''].filter(Boolean).join(' · '),
              detail: [str(s.source), str(s.description)].filter(Boolean).join(' — '),
            })),
            empty: 'No skills loaded.',
          },
        ],
        footer: `≈${total.toLocaleString()} tokens of context for skill listings.`,
      }
    }
    case 'permissions': {
      const state = data?.state ?? {}
      const rules: Loose[] = state.rules ?? []
      const byBehavior = (b: string) =>
        rules
          .filter((r) => r.behavior === b)
          .map((r) => ({
            label: str(r.rule) ?? '',
            value: str(r.source),
            detail: [r.notInEffect ? 'not in effect' : '', str(r.editability) ?? ''].filter(Boolean).join(' · '),
          }))
      return {
        title: 'Permissions',
        sections: [
          { title: 'Allow', rows: byBehavior('allow'), empty: 'No allow rules.' },
          { title: 'Ask', rows: byBehavior('ask'), empty: 'No ask rules.' },
          { title: 'Deny', rows: byBehavior('deny'), empty: 'No deny rules.' },
          {
            title: 'Working directories',
            rows: (state.workspaceDirectories ?? []).map((d: Loose) => ({ label: str(d.path) ?? '', value: str(d.source), path: str(d.path) })),
          },
        ],
        footer: 'Rules come from your settings.json files. /add-dir adds a working directory for this session.',
      }
    }
    case 'plan':
      return {
        title: 'Plan',
        sections: data?.path ? [{ title: 'Plan file', rows: [{ label: str(data.path) ?? '', path: str(data.path) }] }] : [],
        markdown: str(data?.content ?? data?.plan ?? data?.text),
      }
  }
}
