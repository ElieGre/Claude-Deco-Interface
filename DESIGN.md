---
name: Claude Interface
description: A dense Neo-Deco agent workbench — Art Deco geometry on an obsidian canvas, built for hours-long Claude Code sessions.
colors:
  # Dark (default, :root) canonical values. The light companion (:root[data-theme='light']) is
  # documented role-by-role in ## Colors and mirrored in .impeccable/design.json's colorMeta.light.
  obsidian: "#14181a"
  forest: "#18221d"
  bg-elev: "#1d2a23"
  bg-input: "#151c18"
  bg-hover: "#213027"
  code-bg: "#111618"
  sage: "#4e8752"
  accent-text: "#8cc291"
  accent-fill: "#3e7342"
  accent-soft: "rgb(78 135 82 / 0.16)"
  lime: "#a3e635"
  vivid-text: "#a3e635"
  emerald: "#22c55e"
  brass: "#d4af6a"
  ivory: "#fdfbf7"
  mark: "#fdfbf7"
  text: "#ede9de"
  text-muted: "#b3b9ae"
  text-dim: "#8a978c"
  border: "#2b3f31"
  danger: "#e5715f"
  danger-fill: "#c4452f"
  info: "#6cc4b0"
  scrim: "rgb(6 9 8 / 0.66)"
  scroll-thumb: "#33493a"
  line-hover: "rgb(237 233 222 / 0.03)"
  lane-jade: "#7db482"
  lane-parchment: "#e8dfc4"
  lane-terracotta: "#e08e79"
  lane-stone: "#aeb8b4"
  syn-string: "#5fd08b"
  syn-function: "#e9dfc2"
  syn-parameter: "#c9d4c5"
  syn-punctuation: "#919f94"
  syn-comment: "#75897a"
typography:
  display:
    fontFamily: "'Josefin Sans Variable', 'Poiret One', Futura, 'Segoe UI', sans-serif"
    fontSize: "24px"
    fontWeight: 300
    lineHeight: 1.2
    letterSpacing: "0.24em"
  headline:
    fontFamily: "'Josefin Sans Variable', 'Poiret One', Futura, 'Segoe UI', sans-serif"
    fontSize: "22px"
    fontWeight: 300
    lineHeight: 1.25
    letterSpacing: "0.03em"
  title:
    fontFamily: "'Josefin Sans Variable', 'Poiret One', Futura, 'Segoe UI', sans-serif"
    fontSize: "15px"
    fontWeight: 300
    lineHeight: 1.2
    letterSpacing: "0.04em"
  body:
    fontFamily: "'Jost Variable', Futura, 'Josefin Sans Variable', sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "'Josefin Sans Variable', 'Poiret One', Futura, 'Segoe UI', sans-serif"
    fontSize: "10.5px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.18em"
  mono:
    fontFamily: "'JetBrains Mono Variable', 'IBM Plex Mono', Consolas, monospace"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
rounded:
  none: "0"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "14px"
  xl: "18px"
  xxl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.accent-fill}"
    textColor: "{colors.ivory}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "8px 14px 6px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "8px 14px 6px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.accent-text}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "3px 8px 1px"
  input-field:
    backgroundColor: "{colors.bg-input}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "6px 10px 4px"
  tool-card:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.text-muted}"
    typography: "{typography.mono}"
    rounded: "{rounded.none}"
---

# Design System: Claude Interface

## Overview

**Creative North Star: "The Instrument Panel"**

Claude Interface reads like the cockpit of a dense, dark machine, not a chat app. Every surface is a flat panel bounded by a 1px sage hairline; every state (streaming, HEAD, the caret, a running tool) is reported the same way an instrument panel reports it — a single lit diamond, a color that turns on and off, never a bounce or a bubble. The geometry is Art Deco stripped to its structural bones: zero radius, 45° turns, diamonds as the one recurring mark, `--mark` corner brackets on anything that needs to read as "focused." Nothing about it is playful; it is built for a developer who lives in this window for hours next to a terminal and an editor, and who wants the agent's work, its prompts, the project's files, and its git history legible at a glance without leaving the frame.

The palette refuses warmth almost everywhere on purpose — obsidian canvas, forest panels, sage structure, ivory-adjacent text — so that the two exceptions read as signal instead of decoration: lime is lit only when something is alive right now (HEAD, an unpushed commit, the streaming caret), and brass is the single warm metal, reserved for warnings and one syntax token. The system explicitly rejects the rounded-bubble chat-app default: no radius, no soft drop shadows on resting surfaces, no chat bubbles at all — the agent's replies run in an indented column marked by a rule and a diamond, not a card.

The system now ships in two lights, not one. Dark is the default: a canvas lifted off near-black (`#14181a`, not the original `#0b0d0f`) so the obsidian reads as a deep surface rather than a void. Light (`:root[data-theme='light']`) is its bone-and-parchment inversion — aged paper tones and forest-green ink, never bright white. Both are deliberately low-glare; the system treats "dark mode" and "light mode" as the same instrument panel under two different lighting conditions, not two different products. The window itself is frameless: the native title bar is hidden, and the top bar draws its own drag region, brand mark and window controls (minimize/maximize/close) in the same Deco vocabulary as everything else. The brand mark is the one departure from the system's drawn geometry: it's the owner's own artwork, an Art Deco winged crab rendered in copper with brass legs and green eyes, used as a fixed raster asset (never a generated shape) across the top bar, the empty-chat sunburst, and the app/taskbar/tray icons.

**Key Characteristics:**
- Flat obsidian/forest surfaces, zero border-radius, 1px hairlines as the only structural device
- Diamonds (45°-rotated squares) as the universal status/marker glyph, reused at every scale from tab dots to git graph nodes
- Lime is exclusively a "live" signal (HEAD, unpushed, caret, streaming) — never a general accent
- Tracked-caps Josefin Sans as the signage voice for every label, tab, and chip; Jost for reading prose; JetBrains Mono for anything code- or git-shaped
- `--mark` corner brackets mark the one "framed" surface treatment (prompts, dialogs, focused composer)
- Two lights, one language: a lifted-obsidian dark and a bone-parchment light, both intentionally low-glare — dark never drops to near-black, light never rises to true white
- The window chrome is hand-drawn, not native — a frameless Electron window with its own drag region and minimize/maximize/close cells — except the brand mark itself, which is the owner's own raster artwork (a copper Deco crab), never a drawn shape

## Colors

Nearly monochrome by design — a narrow band of obsidian/forest/sage — so the two reserved hues (lime, brass) and the semantic status colors read as genuine signal. Every role below now carries two values: dark (`:root`, default) and light (`:root[data-theme='light']`). Components never hard-code either; they read the custom property, and the property repoints per theme.

### Primary
- **Sage** (dark `#4e8752` / light `#3a6b3e`): the system's only general-purpose accent — hairlines between panels, focus rings, links, filled-button backgrounds (as `accent-fill`, `#3e7342` in both themes), the agent-column rule, the git-lane default color. Sage is the one token that itself deepens in light mode, specifically so it still clears 3:1 as a line against parchment. Lifted to `accent-text` (dark `#8cc291` / light `#2a6231`) wherever sage needs to double as legible text (branch chips, links, chip labels).

### Secondary
- **Lime — "Vivid"** (`--vivid`, dark `#a3e635` / light `#4a8c0c`; `--vivid-text`, dark `#a3e635` / light `#2f6109`): reserved for state that is happening right now: the HEAD commit dot, unpushed commits in the git graph, the text-input caret, the streaming block-cursor, the lit diamond in the marquee, the todo item currently in progress, and the syntax highlighter's keyword color. It never appears as a resting UI color. In dark mode `--vivid` and `--vivid-text` are the same lime; in light mode they split into two distinct greens (a brighter fill green and a darker, more-legible text green) because a single lime can't hold both a "lit dot" role and a "readable on parchment" role at once.

### Tertiary
- **Brass** (`#d4af6a` in both themes): the lone warm metal. Used for the `warning` status color (dark `#d4af6a` / light `#735216`), modified-file git-status text, one git-lane color, and the syntax highlighter's constant token. Nothing else in the palette is warm.

### Neutral
- **Obsidian** (`#14181a`): the chat canvas and file viewer background — the darkest surface in the app, deliberately lifted off near-black so it reads as a lit surface rather than a void.
- **Forest** (`#18221d`): side panels, bars, tool cards, the git row background.
- **Elevated Forest** (`bg-elev`, `#1d2a23`): menus, permission prompts, dialogs, modals — anything that sits above the base layer.
- **Input Forest** (`bg-input`, `#151c18`) / **Code Well** (`code-bg`, `#111618`): text inputs and code surfaces, slightly darker than their surrounding panel to read as a well.
- **Hover Forest** (`bg-hover`, `#213027`): the universal hover fill for rows, tabs, and icon buttons.
- **Text** (`#ede9de`): all primary text — a softened ivory, one step off pure white, chosen so the canvas glows less over long reading sessions. This is distinct from raw **Ivory** (`#fdfbf7`), which is now reserved for text set on a fixed-color fill (`accent-fill`, `danger-fill`) that doesn't itself adapt across themes — see the Mark vs. Ivory Rule below.
- **Mark** (`--mark`, dark `#fdfbf7` / light `#161d18`): the corner-bracket tick, active-tab underlines and diamonds, the viewing-file edge marker, the resizer-hover rule. A semantic "emphasis ink" token, not a fixed color — dark mode points it at ivory, light mode points it at a near-black ink a step darker than body text.
- **Muted Text** (`text-muted`, dark `#b3b9ae` / light `#3f4a42`) / **Dim Text** (`text-dim`, dark `#8a978c` / light `#515b4b`): secondary and tertiary text — metadata, placeholders, disabled labels.
- **Border** (dark `#2b3f31` / light `#bcc1ac`): the hairline inside a panel (row dividers, input outlines) — the quiet sibling of the sage `border-strong`.
- **Danger** (dark `#e5715f` / light `#9e3526`) / **Info** (dark `#6cc4b0` / light `#185e54`) / **Success** (reuses emerald in dark `#22c55e`, deepens to `#126534` in light): status feedback — deleted files, links/renames, and tool-success dots respectively. **Danger Fill** (`--danger-fill`, `#c4452f`, unchanged across themes): the close window-control's hover field, painted under ivory text — it stays constant because, unlike `--danger`, it's a fixed-color fill rather than a text color sitting on the ambient canvas.

Two reused sub-systems ride on top of this palette without expanding it conceptually: the **git-lane / chart-series** colors (`lane-0`…`lane-7`, cycling through sage, brass, info, emerald and three unique hues — jade `#7db482`, parchment `#e8dfc4`, terracotta `#e08e79`, stone `#aeb8b4` in dark; all seven re-tuned to darker, less-saturated values in light), and the **syntax palette** consumed by Shiki's CSS-variables theme (`--syn-*`), which mostly points back at existing tokens (keyword→lime, constant→brass, link→info) plus five unique hues for strings, functions, parameters, punctuation and comments (punctuation `#919f94`, comment `#75897a` in dark; both re-tuned darker/desaturated for light).

### Light Theme (`:root[data-theme='light']`)

Bone and sage parchment with forest ink, not an inverted dark theme. Canvas `#e6e0d2`, panels `#dad8c8`, elevated surfaces `#ebe6da`, inputs `#ede8dc`, hover `#d2d1c0`, code wells `#ddd7c8` — all warm, muted, low-chroma tones; the palette never reaches for white. Ink text is `#232d26`, one step off true black for the same reason dark's canvas is lifted off true black. Depth chrome re-tunes alongside color: `--shadow-float` softens to `0 14px 28px -14px rgb(40 48 40 / 0.35)`, `--scrim` to `rgb(58 62 52 / 0.35)`, `--scroll-thumb` to `#b4b9a3`, and `--line-hover` to `rgb(35 45 38 / 0.04)` — each carrying the same *role* as its dark counterpart at an intensity tuned for a pale ground.

### Named Rules
**The One Live Color Rule.** Lime appears only where something is happening *right now* — HEAD, an unpushed commit, a caret, a stream, an in-progress todo. If nothing is live, nothing on screen is lime.

**The Warm Metal Rule.** Brass is the only warm hue in the system. It never shares a surface with a second warm color — no oranges, golds, or reds beyond the single `danger` red reserved for destructive/deleted state.

**The Two Lights Rule.** Both themes are deliberately low-glare. Dark is lifted off near-black (`#14181a`, never `#0b0d0f`-black); light is aged bone and parchment (`#e6e0d2`, never white). Neither theme is an inversion of the other's extremes — they're two lighting conditions on the same instrument panel.

**The Contrast Floor Rule.** Every text token clears 4.5:1 against both the panel tone and `--bg-hover`; every line token (`--border`, `--border-strong`) clears 3:1. This is the constraint the light-theme values were tuned against, not an incidental property — a new color added to either theme must be checked against it before it ships.

**The Mark vs. Ivory Rule.** Use `--mark`, never raw `--ivory`, for anything that draws a marker, tick or emphasis line directly on the ambient canvas or a panel (corner brackets, active-tab diamonds, the viewing-file edge, resizer hover) — `--mark` repoints from ivory to a near-black ink in light mode, while raw `--ivory` stays fixed near-white in both themes. Raw `--ivory` is reserved for text sitting on a fixed-color fill (`--accent-fill`, `--danger-fill`) that itself doesn't change across themes, where a literal near-white is what clears contrast either way.

## Typography

**Display/Label Font:** Josefin Sans Variable (with Poiret One, Futura, Segoe UI)
**Body/Prose Font:** Jost Variable (with Futura, Josefin Sans Variable)
**Mono Font:** JetBrains Mono Variable (with IBM Plex Mono, Consolas)

All three ship as local variable-font files (`@fontsource-variable/*`), never a CDN request — the app runs on a corporate network where downloads are slow. `--font-prose` is a single token pointed at Jost specifically because Jost's taller x-height reads better for long agent answers than Josefin Sans; swapping the whole app back to pure Josefin prose is a one-token change.

**Character:** Josefin Sans tracked into wide uppercase caps is the app's signage voice — every label, tab, chip and table header speaks in it. Jost is the only font that runs at normal case and holds a reading measure; it's reserved for anything meant to be *read* rather than *scanned*. JetBrains Mono marks anything that is code-shaped or git-shaped, including the git branch chip, commit subjects, and every tool card.

### Hierarchy
- **Display** (300, 24px, line-height 1.2, letter-spacing 0.24em, uppercase): the empty-chat headline over the sunburst — the single largest text in the app.
- **Headline** (300, 22px, line-height 1.25): agent-prose `h1`; `h2`/`h3` step down to 19px/16px at the same weight and letter-spacing.
- **Title** (300, 15px, line-height 1.2): chrome titles — the topbar wordmark (tracked to 0.34em) and panel titles (tracked to 0.04em).
- **Body** (400, 15px, line-height 1.6, Jost): agent replies, user message bodies, thinking transcripts, dialog and plan bodies. Base UI chrome runs slightly smaller at 14px/1.5 in Josefin Sans.
- **Label** (400, 10–11.5px, letter-spacing 0.14–0.18em, uppercase, Josefin Sans): section labels, panel tabs, chips, status-bar fields, codeblock language tags, table headers — the tracked-caps signage voice used everywhere something needs a name rather than a sentence.
- **Mono** (400, 12–12.5px, JetBrains Mono): tool cards, git rows, the file viewer, fenced code blocks.

### Type Scale

The five named roles above are the system's vocabulary; in the built CSS they resolve to eighteen distinct step values, all still on the same three-family, two-weight system. Every step in active use:

| Size | Weight/family | Where |
|---|---|---|
| 24px | 300, Josefin Sans | Display — the empty-chat headline |
| 22px | 300, Josefin Sans | Headline — agent-prose `h1` |
| 19px | 300, Josefin Sans | agent-prose `h2` |
| 18px | 300, Josefin Sans | modal head |
| 17px | 300, Josefin Sans | permission-prompt title |
| 16px | 300, Josefin Sans | agent-prose `h3`; question-prompt head |
| 15px | 400, Jost (300, Josefin for chrome titles) | Title / Body — panel titles, agent replies, user messages, composer text |
| 14.5px | 400, Jost | dialog body |
| 14px | 400, Josefin Sans (base `--font-size`) / Jost for prose contexts | base UI chrome, markdown tables, thinking-transcript body, todo list |
| 13.5px | 400 | context-menu items, toasts, the settings/info modal body |
| 13px | 400, JetBrains Mono | git branch readout, empty-state tips |
| 12.5px | 400, JetBrains Mono (`--mono-size`) | tool cards, git rows, the file viewer, fenced code, settings intro copy |
| 12px | 400 | general small UI/mono text — tool summaries, git file rows, viewer crumbs |
| 11.5px | 400, Josefin Sans | button labels, `chip-branch`, markdown `h4` |
| 11px | 400, Josefin Sans/mono | panel tabs, center-tab labels, git meta |
| 10.5px | 400, Josefin Sans | section labels, most tracked-caps signage text |
| 10px | 400, Josefin Sans | chips, codeblock language tag, slash-menu tags |
| 9.5px | 400, Josefin Sans | status-bar secondary labels, the "open in agent" chat-history tag |

Every step below 15px runs at weight 400; every step at 15px or above that uses Josefin Sans runs at weight 300 — the Weight Line Rule holds across all eighteen steps, not just the five named roles.

### Named Rules
**The Weight Line Rule.** Josefin Sans carries weight 300 for headers and anything set at 15px or larger; everything smaller runs at weight 400. There is no other weight in the type system — no bold, no 500, no 600 outside a single `strong` override in agent markdown.

**The Signage vs. Prose Rule.** Uppercase tracked Josefin Sans names things (labels, tabs, chips); normal-case Jost explains things (agent answers, dialogs). A string of prose never appears in the signage voice, and a label never appears in prose case.

## Layout

The window is frameless (`titleBarStyle: 'hidden'` — no native title bar on Windows/Linux; macOS keeps its own traffic lights and the custom controls don't render). The top bar is both the drag region and the window chrome: the whole strip drags the window, and every interactive child (buttons, the project picker, the theme toggle) is carved out of the drag region individually rather than the bar being click-through.

Three sage-ruled columns under a fixed instrument stack: a `44px` topbar, a flexible workspace row, and a `28px` status bar (`--topbar-h`, `--statusbar-h`). The left panel (chats/files, tabbed) and right panel (git status/graph) are resizable against a fixed-width center column; panel edges are a single hairline on the panel's own side of the drag handle, sage at rest and `--mark` on hover — never a visible gutter or shadow.

The center column's agent conversation and composer both clamp to a `880px` reading column (`--chat-max-w`), centered in whatever space the side panels leave. Inside that column, agent prose additionally narrows to a 35em measure (about 72 characters of Jost at 15px) while tool cards, code blocks, and tables keep the full column width — prose reads like a page, tool output reads like a terminal. The agent column itself is marked by a `19px` indent (`--gutter`): a 1px sage rule topped with a hollow diamond that fills lime while a reply is streaming.

Density is high and intentional: 26–28px list rows, 44px panel headers, 36px tab strips. There is no responsive breakpoint system — this is a fixed-chrome desktop Electron window, not a page that reflows to mobile widths.

## Elevation & Depth

Flat by default: panels, cards, rows and buttons carry no shadow at rest, only a 1px border to separate them from their neighbor. Depth is conveyed through layering of the neutral scale instead (obsidian → forest → elevated-forest → hover-forest, each a discrete step darker or lighter) and through a single inset accent bar (`inset 2px 0 0 var(--mark)`) for "picked/active" rows in menus and option lists — never a glow or an offset shadow.

The one exception is content that floats above the layout rather than sitting inside it: the slash-command menu, the right-click context menu, and toasts share one soft, tightly-clipped shadow (`--shadow-float`) to lift them off the canvas behind them. Modals and dialogs get the same treatment via their backdrop (`--scrim`), not an additional shadow on the box itself.

### Shadow Vocabulary
- **Ambient overlay** (`--shadow-float`; dark `0 16px 32px -16px rgb(0 0 0 / 0.75)`, light `0 14px 28px -14px rgb(40 48 40 / 0.35)`): the only shadow in the system. Used exclusively on the slash-menu, context-menu, toast, and (implicitly, as a backdrop) modals — content that floats above the app chrome, never on cards, panels, or buttons.

### Named Rules
**The Ambient-Only Rule.** A shadow appears only under something that floats above the layout (a menu, a toast). Anything that lives inside the layout — a panel, a card, a row, a button — stays flat and uses a border or a background step instead.

## Shapes

Zero radius everywhere (`--radius: 0`), applied globally to buttons, inputs, selects, cards, tabs, dialogs, and file/git rows alike — there is no rounded-corner escape hatch anywhere in the system. Borders are exclusively 1px hairlines; the only place a border thickens is the sage `border-strong` used for structural or focused edges. The diamond (a square rotated 45°) is the one recurring non-rectilinear form: it marks status dots, the active-tab indicator, todo checkmarks, context dots, table swatches, hr dividers, and every git-graph commit node. The one exception to the geometric vocabulary is the brand mark itself — see Components: Brand Mark — which is figurative owner artwork, not a drawn Deco shape. Framed surfaces (permission prompts, modals, the focused composer) add `--mark` corner brackets — four short L-shaped ticks set just inside the border — as the system's one "this is where you act" signal. Diagonal geometry elsewhere (the git lane graph, icon strokes) is restricted to straight runs and true 45° turns; nothing curves.

## Components

### Buttons
- **Shape:** zero radius (0), 1px border.
- **Primary:** filled sage (`accent-fill` `#3e7342`) with a sage border and ivory text, `8px 14px 6px` padding, label typography (11.5px tracked uppercase). Hover adds an inset ivory ring rather than changing the fill — ivory here is intentional raw ivory, since it sits on a fixed-color fill that doesn't shift with theme.
- **Ghost (default `.btn`):** transparent background, sage `border-strong` outline, text in `--text`; hover fills with `bg-hover`.
- **Danger/Stop:** danger-red text and a translucent danger border; hover fills with a faint danger tint.
- **Icon buttons:** 28×28px, transparent until hover (`bg-hover` fill, `border` outline); an "on" state simply switches text color to full `--text` — no fill change.

### Chips
- **Style:** transparent background, sage `border-strong`, label typography in `accent-text`, uppercase and tracked.
- **Branch variant:** untracked, mono type, quieter `border` color, used specifically for the git branch chip in the topbar.

### Cards / Containers (Tool Cards)
- **Corner Style:** zero radius.
- **Background:** forest (panel color), escalating to a danger-tinted border when the tool errored.
- **Shadow Strategy:** none — see Elevation & Depth; separation comes from the 1px border and a `bg-hover` state on the clickable header.
- **Border:** 1px `border`, or translucent danger on error.
- **Internal Padding:** `10px 12px` body, `7px 10px 7px 12px` header.

### Inputs / Fields
- **Style:** `bg-input` background, 1px `border`, zero radius, no visible focus glow — focus swaps the border to `border-strong` (sage) and, for framed composer boxes, lights the `--mark` corner ticks.
- **Focus:** border-color transition only (`0.15s`); the composer additionally reveals its corner brackets on focus-within.
- **Disabled:** 0.4–0.5 opacity, default cursor.

### Navigation (Tab Strips)
- **Panel tabs** (left column: Chats/Files): label typography, `text-dim` at rest, `--mark` on active, marked by a `--mark` underline with a small diamond centered on it — not a filled pill.
- **Center tabs** (Agent / open files): the active tab takes the canvas (`obsidian`) background and breaks the sage rule beneath it via an inset `--mark` top border; the Agent tab specifically carries a diamond that fills `--mark` when active and lime when Claude is waiting on the user.
- **Agent tabs** (`ctab-agent`, one per running Claude session, up to 260px wide): the same diamond-tab shape as a file tab, plus three states a file tab doesn't have — the agent the composer currently talks to gets an inset bottom sage rule when it isn't the visually active tab (`is-current:not(.is-active)`); a busy agent (running or compacting) shows the `Marquee` diamonds inline; double-click or the context menu (Rename / New agent / Close / Close other agents) swaps the label for an inline rename input (`ctab-rename`, sage-bordered, normal case). A `+` cell (`ctab-new`) sits between the agent tabs and the file tabs to start a new agent (Ctrl+T).
- **Mobile treatment:** none — fixed-chrome desktop app.

### Brand Mark
The owner's own artwork, not a drawn Deco shape: an Art Deco winged crab in copper with brass legs and green eyes, shipped as raster files (`src/renderer/src/assets/logo.png`; `resources/icon.ico` / `icon.png`). It replaced the earlier code-drawn "diamond within a diamond" SVG mark. Three placements: the top bar's `.brand-logo` (a 96px-tall source image, displayed at 26px), the empty-chat `Sunburst`'s `.sun-mark` (64×45, standing on the horizon inside the inner arc, where an ivory-framed lime gem used to sit — the sunburst's rays now start at r=50 to clear it), and the OS-level app icon (window/taskbar/Alt-Tab) plus a new notification-area tray icon (click to bring the window forward; Show/Quit menu). Because it carries the owner's own provenance, it is never regenerated, recolored, or redrawn to match a token — treat it like a photograph, not a component.

### Window Chrome (Signature Component)
The native title bar is hidden (`titleBarStyle: 'hidden'`); the top bar draws the window's own chrome. `WindowControls.tsx` renders minimize, maximize↔restore, and close as three 46px-wide, full-height cells at the trailing edge, set off from the rest of the bar by a 1px hairline carrying a small sage-bordered diamond (mirroring the diamond motif used everywhere else for "a marker on a line"). Icons are hand-drawn in the same 16px/1.25px-stroke grid as the rest of `Icon.tsx`: a plain hairline for minimize, a cut-corner frame for maximize, two offset stacked frames for restore, and the 45°-cross for close. Hover fills the cell with `--bg-hover`; the close cell is the one place `--danger-fill` appears, painted under an ivory glyph. When the window loses focus, the brand mark and the whole control cluster dim to 0.5 opacity via `:root[data-window-focus='false']` — the same cue a native inactive title bar gives. Hidden entirely on macOS, which keeps its own traffic lights.

### Settings Panel
A modal (`.modal.settings-modal`, 720px) that mirrors the terminal's `/config`: a filter input, then a list of rows (`settings-row`) each showing a plain-language label, the underlying CLI key in mono, and a right-aligned control — a boolean renders as the diamond-slider `.switch` (a sage-bordered track with a rotated-square thumb that slides from `--text-dim` to `--vivid` when on), an enum renders as the shared `<select>` chevron treatment, free text renders as a mono input. Saves round-trip through the real CLI process and echo its confirmation or error text inline per row (`is-saved` in `--success`, error in `--danger`).

### Side Questions (`/btw`)
A small stack of cards (`.btw-card`) above the composer for side questions answered from the conversation so far without entering the transcript. Each card is a flat `--bg-elev` box with a 2px lime left border and a lime "btw" tag; a still-computing answer shows the same `Marquee` used everywhere else for in-flight work.

### Loading Skeletons
Placeholders stand in only while data is genuinely loading, never in place of an empty state ("No chats in this project yet." and "No commits yet." still render once the read returns empty). Every skeleton is flat `.skel` bars tinted `color-mix(var(--text) 11%, transparent)`, so one rule serves both themes. The bars pulse from 0.5 to 1 opacity, staggered by `--i` × 90ms, which is the marquee's lit-in-sequence rhythm at rest. They are static under reduced motion. Bar widths come from a fixed varied list so they read as content, not a grid. Two phases:
- **Boot skeleton** (static markup in `index.html`): the whole shell in the app's own classes (top bar with the crab and brand, left list, tab strip, composer outline, git panel, status-bar cells), with the crab and a lit marquee centered in the chat column. `public/boot.js` runs before the body parses and applies the saved theme and panel widths from the load URL, so React's first frame lands on the same geometry.
- **In-app skeletons** (`components/Skeleton.tsx`): the history list until `historyLoaded`, the git panel until `gitLoaded` (a lane line threaded through hollow placeholder diamonds, the graph's own grammar), folder rows while a directory lists, a user card + agent rule + tool card while a resumed transcript is `restoring`, the status bar and a tab placeholder until the first agent exists, and the project picker until the folder is known.

### Git Lane Graph (Signature Component)
The right panel's commit graph is drawn as SVG per row: lanes are straight vertical runs, direction changes are exact 45° diagonals (never curves — see `segmentPath` in `GitGraph.tsx`), and every commit is a diamond (a filled diamond for a normal commit, a hollow one for a merge). HEAD gets a second, larger hollow diamond ring in lime around its node, and any commit reachable from HEAD that hasn't been pushed yet is colored lime instead of its lane color — the graph is how "live/unpushed" state gets rendered outside the status bar. Lane colors cycle through eight named hues (`--lane-0`…`--lane-7`), reused by the context-usage modal's token breakdown bar for the same "categorical series" purpose.

## Do's and Don'ts

### Do:
- **Do** keep every corner at zero radius (`--radius: 0`) — buttons, inputs, cards, dialogs, tabs alike.
- **Do** render status and progress exclusively through the diamond motif and the three-diamond `Marquee` animation — no spinners, no progress bars, no skeleton shimmer.
- **Do** reserve lime for state that is live right now (HEAD, unpushed, caret, streaming, in-progress); use sage for everything else that would default to "the accent color."
- **Do** keep agent prose at a 35em measure while letting code blocks and tables run the full column width.
- **Do** use `--mark` corner brackets only on surfaces the owner is meant to act on directly (permission prompts, modals, the focused composer) — not as generic card decoration.
- **Do** draw all diagonal geometry (git lanes, icon strokes) as straight runs and true 45° turns.
- **Do** keep both themes low-glare: dark's canvas never drops toward true black, light's canvas never rises toward true white.
- **Do** reference `--mark` (never raw `--ivory`) for anything drawn as a marker on the ambient canvas or a panel; reserve raw `--ivory` for text on a fixed-color fill like `--accent-fill` or `--danger-fill`.
- **Do** hold any new color to the system's contrast floor: 4.5:1 for text against the panel tone and against `--bg-hover`, 3:1 for line tokens.

### Don't:
- **Don't** use lime as a general accent, hover color, or brand color — it reads as "this is happening now" everywhere else in the system, and using it decoratively breaks that signal.
- **Don't** add a shadow to anything that lives inside the layout (a panel, a card, a row, a button). Shadows are reserved for content that floats above the chrome (menus, toasts).
- **Don't** introduce a second warm hue alongside brass. Warmth in this palette is a single, deliberate exception, not a family.
- **Don't** reach for a rounded-bubble chat pattern for agent or user messages — replies run in the indented, rule-marked agent column; user turns are a flat-bordered card, never a bubble.
- **Don't** substitute a glyph-icon font or an external icon package; icons are hand-drawn on the same 16px/1.25px-stroke grid as everything else in `Icon.tsx`.
- **Don't** hard-code a hex value in a new component. Every dark-theme token has a light-theme counterpart already wired to the same custom property; reaching for a literal breaks silently the moment the user switches themes.
- **Don't** regenerate, recolor, or restyle the brand mark (the copper-and-brass winged crab). It's the owner's own artwork with provenance embedded in the PNG/ICO files, not a token-driven shape — treat it as a fixed asset.
