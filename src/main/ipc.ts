import { deleteSession, getSessionMessages, listSessions, renameSession } from '@anthropic-ai/claude-agent-sdk'
import { app, clipboard, dialog, ipcMain, shell, type BrowserWindow } from 'electron'
import { existsSync } from 'node:fs'
import type { EffortLevel, PermissionDecision, PermissionMode, StartSessionOptions } from '../shared/types'
import { ClaudeSession } from './claude'
import { loadConfig, saveConfig } from './config'
import * as files from './files'
import * as git from './git'

export function registerIpc(win: BrowserWindow): void {
  const sessions = new Map<string, ClaudeSession>()
  const closeAll = () => {
    for (const s of sessions.values()) s.close()
  }
  const session = (key: string) => {
    const s = sessions.get(key)
    if (!s) throw new Error('Session is not running')
    return s
  }

  ipcMain.handle('config:get', () => loadConfig())
  ipcMain.handle('config:set', (_e, patch) => saveConfig(patch))
  ipcMain.handle('config:pickFolder', async () => {
    const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
    return r.canceled ? null : r.filePaths[0]
  })

  ipcMain.handle('claude:start', (_e, opts: StartSessionOptions) => {
    // Otherwise the SDK reports a missing cwd as a misleading "binary failed to launch".
    if (!existsSync(opts.cwd)) throw new Error(`Folder does not exist: ${opts.cwd}`)
    // The UI drives one live session at a time; closing strays also covers dev hot-reloads that
    // recreate the renderer store without stopping its session. Revisit for background sessions.
    closeAll()
    const s = new ClaudeSession(win.webContents, opts, () => sessions.delete(opts.key))
    sessions.set(opts.key, s)
  })
  ipcMain.handle('claude:send', (_e, key: string, text: string) => session(key).send(text))
  ipcMain.handle('claude:interrupt', (_e, key: string) => session(key).interrupt())
  ipcMain.handle('claude:setModel', (_e, key: string, model?: string) => session(key).setModel(model))
  ipcMain.handle('claude:setPermissionMode', (_e, key: string, mode: PermissionMode) =>
    session(key).setPermissionMode(mode),
  )
  ipcMain.handle('claude:setEffort', (_e, key: string, effort: EffortLevel | null) => session(key).setEffort(effort))
  ipcMain.handle('claude:contextUsage', (_e, key: string) => session(key).contextUsage())
  ipcMain.handle('claude:respondPermission', (_e, key: string, id: string, decision: PermissionDecision) =>
    session(key).respondPermission(id, decision),
  )
  ipcMain.handle('claude:stop', (_e, key: string) => sessions.get(key)?.close())

  ipcMain.handle('history:list', (_e, cwd: string) => listSessions({ dir: cwd, limit: 300 }))
  ipcMain.handle('history:messages', (_e, id: string, cwd: string) => getSessionMessages(id, { dir: cwd }))
  ipcMain.handle('history:rename', (_e, id: string, title: string, cwd: string) => renameSession(id, title, { dir: cwd }))
  ipcMain.handle('history:remove', (_e, id: string, cwd: string) => deleteSession(id, { dir: cwd }))

  ipcMain.handle('git:status', (_e, cwd: string) => git.status(cwd))
  ipcMain.handle('git:graph', (_e, cwd: string, limit?: number) => git.graph(cwd, limit))

  const watcher = new files.FolderWatcher(win.webContents)
  ipcMain.handle('fs:list', (_e, dir: string, root: string) => files.list(dir, root))
  ipcMain.handle('fs:read', (_e, path: string) => files.read(path))
  ipcMain.handle('fs:watch', (_e, root: string) => watcher.watch(root))
  ipcMain.handle('shell:reveal', (_e, path: string) => shell.showItemInFolder(path))
  ipcMain.handle('shell:open', async (_e, path: string) => {
    const error = await shell.openPath(path)
    if (error) throw new Error(error)
  })
  ipcMain.handle('shell:copy', (_e, text: string) => clipboard.writeText(text))

  app.on('before-quit', () => {
    closeAll()
    watcher.close()
  })
  // A renderer reload loses every session key, so don't leave orphaned CLI processes behind.
  win.webContents.on('did-start-navigation', (details) => {
    if (details.isMainFrame && !details.isSameDocument) closeAll()
  })
}
