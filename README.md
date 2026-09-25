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

**Desktop shortcut / `launch.vbs`** runs `scripts/launch.mjs`: it rebuilds only when something under `src/` or
`resources/` changed since the last build, then starts Electron directly (no npm). A normal launch skips the ~20 s
build entirely; the remaining few seconds are Electron's own cold start on this machine. The window appears right
away with the crab boot mark while the UI loads. Build and app output go to `launch.log`.

The app opens the folder it was launched from (or the last project). Switch projects from the folder
picker in the top bar.

## What works

- **Agent tabs**: several Claude Code sessions side by side, like terminal tabs. Each tab is its own CLI
  process and keeps running in the background: its tab shows a working indicator, lights up when Claude is
  waiting for an answer, and a toast says when it finishes. Double-click a tab (or `/rename <name>`) to rename it;
  the name is saved as the chat's title, so Chats shows it too. Each tab keeps its own unsent draft.
  `+` / `Ctrl+T` / `/agent` new tab · `Ctrl+W` / middle-click close (asks first if Claude is working) ·
  `Ctrl+Tab` / `Ctrl+1…9` switch · right-click for Rename / Close others. Opening a chat from Chats focuses its
  tab if it's already open, reuses an empty tab, or opens a new one; `/branch` and "New chat with this file"
  open new tabs. Tabs belong to the current folder: switching folders closes them (after a warning).
- **Claude Code settings** (`/config` or the sliders button): the terminal's `/config` settings with their current
  values, as switches and dropdowns. Changes run `/config key=value` in a background CLI process, so Claude Code
  validates and saves them exactly as the terminal would (`~/.claude.json` / `~/.claude/settings.json`), and
  they apply to all your Claude Code sessions. `/config key=value` in the composer works too.
- **Chat**: streaming text, collapsible thinking, tool-call cards (Bash, Edit diff, Write, TodoWrite…),
  subagent steps nested under their Agent/Task call, markdown rendering with syntax-highlighted code blocks.
- **File viewer**: click a file in the Files tab to open it read-only in the center column, as a tab next to
  the agent chat (syntax highlighting, click a line to mark it, Attach / open externally / reveal). The composer
  stays below it, and sending a message switches back to the chat. Open files re-read when they change on disk.
- **Commands**: every command the CLI registers for SDK sessions (plus custom commands and skills) is passed
  straight to Claude Code, with autocomplete from the live command list. The terminal's *interactive* commands
  aren't registered in SDK sessions, so the app provides them itself:
  - `/btw <question>`: side question answered from the conversation, even mid-turn, shown in a card above the
    composer and never added to the transcript (`Esc` dismisses it).
  - `/status` `/memory` `/skills` `/hooks` `/permissions` `/plan`: info panels fed by the CLI's own control requests.
  - `/add-dir` (extra working directory for the session), `/export` (save to file), `/copy [N]`, `/branch`
    (fork the chat), `/resume`, `/cd`, `/diff`, `/version`, `/exit`, plus `/clear` `/new` `/model` `/effort` `/mode` `/theme` `/help`.
  - The rest (`/login`, other terminal-only screens, cloud and background-session commands…) show in the menu
    tagged *terminal only* and explain what to do instead. The list lives in `src/renderer/src/lib/commands.ts`.
  - `/btw`, the info panels and `/export` use SDK control requests that exist at runtime but aren't in the SDK's
    published typings (declared in `src/main/claude.ts`), so re-check them after SDK upgrades.
- **Permissions**: Allow once / Always allow / Deny with feedback; AskUserQuestion; plan approval (ExitPlanMode).
  `Shift+Tab` cycles the permission mode.
- **Session info**: model, effort, and permission mode switch live mid-session. The status bar shows the
  context meter (click for a per-category breakdown), token totals, cost, turns, and CLI version.
- **History** (left, Chats tab): chats for the current project with search, rename (double-click), delete, and resume.
- **Files** (left, Files tab, `Ctrl+Shift+E`): lazy-loaded project tree with gitignored files dimmed, git status
  colors, and live refresh when files change on disk. Click a file to view it. Right-click for: Add to chat context,
  New chat with this file / in this folder, Open in viewer, Open in default app, Reveal in File Explorer, Copy path / relative path.
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
- **Where you can see it**: in the tree, ◆ means in chat context and ◇ means attached to your next message
  (hover for the reason). The same legend sits at the bottom of the Files tab.
- **Changing the working folder needs a new chat.** A Claude Code session is bound to one folder, so
  *New chat in this folder…*, the ↑ parent-folder button, and the project picker all start a new chat there,
  closing the open agent tabs, and each asks first. The warning has a "Don't ask again" checkbox (stored as
  `confirmNewChat` in the app config). Your previous chats are always kept in Chats history.
  *New chat with this file…* doesn't replace anything: it opens a new agent tab with just that file attached.

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
| State (zustand) | `src/renderer/src/store/{app,session,files,ui,viewer}.ts` |
| Agent tabs: one session store per tab, event routing, titles | `src/renderer/src/store/agents.ts` |
| Claude Code settings (`/config`): read values, write via CLI | `src/main/cliConfig.ts`, `src/renderer/src/components/SettingsPanel.tsx` |
| Syntax highlighting (shiki, grammars loaded on demand) | `src/renderer/src/lib/highlight.ts` |
| UI slash commands + orchestration | `src/renderer/src/actions.ts` |
| Components | `src/renderer/src/components/*` |

## Customizing the look

The app has one design language, **Neo-Deco**: Art Deco geometry for a dense tool. Forest-green panels,
1px sage hairlines, lime only for live state (HEAD, streaming, the caret), zero border radius, diamonds as the
universal marker, and 45° git lanes. `DESIGN.md` records the system.

- **Two lights, both low-glare**: a softened dark (lifted obsidian, soft ivory type) and a bone/parchment light
  (forest-ink type, never white). Switch with the sun/moon button in the top bar or `/theme [dark|light]`; the choice is
  saved (`theme` in the app config). Dark tokens are `:root`; light overrides are `:root[data-theme='light']`.
- **No native title bar**: the window is frameless (`titleBarStyle: 'hidden'`, so resize, snapping and the shadow still
  work). The top bar is the chrome: drag it to move the window, double-click to maximize, and the minimize /
  maximize / close controls on the right are drawn in the same line style (`components/WindowControls.tsx`).

- **Every token** (palette, surfaces, lane colors, syntax colors, fonts, weights, sizes, layout) is a CSS variable at
  the top of `src/renderer/src/styles/base.css`. Components never hard-code a color, font or radius.
- **Syntax colors** are the `--syn-*` variables (shiki's CSS-variables theme), so code in the viewer and chat retunes there.
- **Fonts** ship locally (`@fontsource-variable/*`, no CDN): Josefin Sans for the interface, Jost for long agent prose
  (`--font-prose`; point it at `var(--font-ui)` for pure Josefin), JetBrains Mono for code and git.
- **Icons** are hand-drawn SVG paths in `src/renderer/src/components/Icon.tsx`, on the same 16px / 45° grid.
- **App mark**: the owner's Art Deco winged crab. `resources/icon.ico` / `icon.png` are the window, taskbar, tray and
  desktop-shortcut icon; `src/renderer/src/assets/logo.png` is the top-bar logo and stands at the center of the
  empty-chat sunburst. Regenerate both from the source art if it changes (trim to the alpha bounds, then resize).

## Not built yet

Image attachments and dragging files in from File Explorer, `@file` mention autocomplete, keyboard navigation in the file tree, editing files in the viewer, virtualized lists for very long
chats, "load more" and click-to-diff in the git graph, multiple concurrent sessions, packaging into an installer.
