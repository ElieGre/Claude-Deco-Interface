# Claude Interface

A customizable desktop UI for Claude Code. It drives the same `claude` engine you use in the terminal
through the [Claude Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk), so your
`~/.claude/settings.json` (Vertex auth, model, effort, permissions, hooks), CLAUDE.md files, skills,
plugins, MCP servers and slash commands all work unchanged.

```
┌──────────┬────────────────────────────────┬──────────────────────┐
│Chats|Files│  chat messages / tool calls   │ ⎇ branch  ↑1 ↓0      │
│ history / │                               │ Changes (git status) │
│ file tree │                               │ History (lane graph) │
│ ● in ctx  │  [permission prompts]         │                      │
│           │  [@attached] [composer — /]   │                      │
├──────────┴────────────────────────────────┴──────────────────────┤
│ status · model · effort · mode · context meter · tokens · cost   │
└──────────────────────────────────────────────────────────────────┘
```

## Run

```bash
npm install      # first install downloads the Electron binary (~150 MB, slow on the corporate network)
npm run dev      # launch with hot reload
npm run build    # production build into out/
npm run typecheck
```

The app opens the folder it was launched from (or the last project). Switch projects from the folder
picker in the top bar.

## What works

- **Chat**: streaming text, collapsible thinking, tool-call cards (Bash, Edit diff, Write, TodoWrite…),
  subagent steps nested under their Agent/Task call, markdown rendering.
- **Commands**: every CLI command, custom command and skill is passed straight to Claude Code, with
  autocomplete from the live command list. UI-side commands: `/clear` `/new` `/model` `/effort` `/mode` `/theme` `/help`.
- **Permissions**: Allow once / Always allow / Deny with feedback; AskUserQuestion; plan approval (ExitPlanMode).
  `Shift+Tab` cycles the permission mode.
- **Session info**: model, effort, and permission mode switch live mid-session. The status bar shows the
  context meter (click for a per-category breakdown), token totals, cost, turns, and CLI version.
- **History** (left, Chats tab): chats for the current project with search, rename (double-click), delete, and resume.
- **Files** (left, Files tab, `Ctrl+Shift+E`): lazy-loaded project tree with gitignored files dimmed, git status
  colors, and live refresh when files change on disk. Right-click for: Add to chat context, New chat with this
  file / in this folder, Open, Reveal in File Explorer, Copy path / relative path.
- **Chat context from files** (see below).
- **Git**: branch, ahead/behind, changed files with +/- counts, and a commit lane graph across all branches.
  It refreshes after every turn, on window focus, and every 15 s.
- **Keys**: `Enter` send · `Shift+Enter` newline · `Esc` interrupt · `↑/↓` prompt history · `Ctrl+B`/`Ctrl+G` toggle side panels.

## Chat context from the Files tab

- **Add to chat context** (right-click, double-click a file, or drag it onto the composer) attaches the file
  or folder to your *next message* as an `@path` mention. The CLI expands it into the file contents, exactly like
  typing `@path` in the terminal. Pending attachments show as chips above the composer (✕ to remove).
- **Already in context?** Files you attached earlier, and files Claude has read or edited in this chat, count as
  "in context". Adding one again doesn't duplicate it; a toast tells you it's already there and why.
  After `/compact`, only activity since the compaction counts, because older turns became a summary.
- **Where you can see it**: in the tree, ● means in chat context and ○ means attached to your next message
  (hover for the reason). The same legend sits at the bottom of the Files tab.
- **Changing the working folder needs a new chat.** A Claude Code session is bound to one folder, so
  *New chat in this folder…*, the ↑ parent-folder button, and the project picker all start a new chat there.
  *New chat with this file…* starts a clean chat in the same folder with just that file attached. Each of these
  asks first. The warning has a "Don't ask again" checkbox (stored as `confirmNewChat` in the app config).
  Your previous chat is always kept in Chats history.

## Where things live

| Area | File |
| --- | --- |
| Claude session (SDK, permissions, control requests) | `src/main/claude.ts` |
| IPC wiring, history via SDK | `src/main/ipc.ts` |
| Git status / log parsing | `src/main/git.ts` |
| File listing (+ gitignore flags) and folder watcher | `src/main/files.ts` |
| Persisted app config (userData/config.json) | `src/main/config.ts` |
| Bridge API (`window.api`) + shared types | `src/preload/index.ts`, `src/shared/types.ts` |
| SDK message stream → chat items | `src/renderer/src/lib/chat.ts` |
| Git lane layout algorithm | `src/renderer/src/lib/gitGraph.ts` |
| "In context" tracking for files | `src/renderer/src/lib/context.ts` |
| State (zustand) | `src/renderer/src/store/{app,session,files,ui}.ts` |
| UI slash commands + orchestration | `src/renderer/src/actions.ts` |
| Components | `src/renderer/src/components/*` |

## Customizing the look

- **Colors / themes**: `src/renderer/src/themes.ts`. Each theme is a token map applied as CSS variables
  (`--bg`, `--accent`, `--lane-0`…). Add an entry to create a new theme; it shows up in the theme picker and `/theme`.
- **Fonts, sizes, radii, layout**: the tokens at the top of `src/renderer/src/styles/base.css`.
- Components only use theme variables, never hard-coded colors, so a restyle is CSS plus theme work.

## Not built yet

Image attachments and dragging files in from File Explorer, `@file` mention autocomplete, keyboard navigation in the file tree, code syntax highlighting, virtualized lists for very long
chats, "load more" and click-to-diff in the git graph, multiple concurrent sessions, packaging into an installer.
