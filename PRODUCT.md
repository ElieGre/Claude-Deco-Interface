# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
A single developer (the owner) using it as their daily driver for Claude Code on a Windows work laptop. It is a personal tool, not distributed to teammates.

## Product Purpose
A desktop GUI (Electron + React) around the same `claude` engine the CLI uses, via the Claude Agent SDK. Success means full Claude Code CLI parity (commands, skills, plugins, MCP, permissions, hooks, settings) while the owner keeps complete control over how the interface looks and is laid out.

## Positioning
Unlike the stock CLI or the official desktop app, the whole interface is the owner's to reshape: chat, history, project files, git lane graph, and session telemetry sit in one window designed to their taste.

## Operating Context
- Long working sessions next to a terminal and editor; chat with the agent is the center of gravity.
- Left panel: chat history per project and the project file tree (files can be attached to chat context).
- Right panel: git branch, ahead/behind, changed files, and a commit lane graph across all branches.
- Status bar: model, effort, permission mode, context meter, tokens, cost.
- Corporate network: downloads are slow, so assets such as fonts should ship locally rather than from a CDN.

## Capabilities and Constraints
- Auth and config come from `~/.claude/settings.json` (Vertex); the app must not break CLI parity.
- Permission prompts, AskUserQuestion, and plan approval must stay clear and fast to act on.
- Keyboard-driven: Enter / Shift+Enter / Esc / arrow history / Shift+Tab / Ctrl+B / Ctrl+G / Ctrl+Shift+E.
- Files open read-only inside the app (viewer); editing still happens in the user's editor.
- Not built yet: attachments, @file autocomplete, virtualized lists, installer packaging.

## Brand Commitments
- The owner pinned a "Neo-Deco" visual direction (Art Deco geometry for a dense, dark developer tool) as the app's single design language, replacing earlier themes. Its spec lives with the design work, not here.

## Product Principles
1. Parity first: never trade away a CLI capability for looks.
2. The agent conversation is the primary surface; everything else supports it.
3. Dense but legible: a daily tool for hours-long sessions, so readability beats ornament whenever they conflict.
4. Everything visual is token-driven so the owner can keep reshaping it.
