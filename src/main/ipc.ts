import { deleteSession, forkSession, getSessionMessages, listSessions, renameSession } from '@anthropic-ai/claude-agent-sdk'
import { app, clipboard, dialog, ipcMain, shell, type BrowserWindow } from 'electron'
import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { AppConfig, EffortLevel, InfoKind, PermissionDecision, PermissionMode, StartSessionOptions } from '../shared/types'
import { ClaudeSession } from './claude'
import { configRunner, listSettings, setSetting } from './cliConfig'
import { loadConfig, saveConfig, WINDOW_BG } from './config'
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
  ipcMain.handle('config:set', (_e, patch: Partial<AppConfig>) => {
    if (patch.theme) win.setBackgroundColor(WINDOW_BG[patch.theme])
    return saveConfig(patch)
  })

  ipcMain.handle('window:minimize', () => win.minimize())
  ipcMain.handle('window:toggleMaximize', () => (win.isMaximized() ? win.unmaximize() : win.maximize()))
  ipcMain.handle('window:close', () => win.close())
  ipcMain.handle('window:isMaximized', () => win.isMaximized())
  win.on('maximize', () => win.webContents.send('window:maximized', true))
  win.on('unmaximize', () => win.webContents.send('window:maximized', false))
  ipcMain.handle('config:pickFolder', async () => {
    const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
    return r.canceled ? null : r.filePaths[0]
  })

  ipcMain.handle('claude:start', (_e, opts: StartSessionOptions) => {
    // Otherwise the SDK reports a missing cwd as a misleading "binary failed to launch".
    if (!existsSync(opts.cwd)) throw new Error(`Folder does not exist: ${opts.cwd}`)
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
  ipcMain.handle('claude:sideQuestion', (_e, key: string, question: string) => session(key).sideQuestion(question))
  ipcMain.handle('claude:info', (_e, key: string, kind: InfoKind) => session(key).info(kind))
  ipcMain.handle('claude:exportConversation', (_e, key: string) => session(key).exportConversation())
  ipcMain.handle('claude:setAdditionalDirectories', (_e, key: string, dirs: string[]) =>
    session(key).setAdditionalDirectories(dirs),
  )
  ipcMain.handle('claude:stop', (_e, key: string) => sessions.get(key)?.close())

  ipcMain.handle('history:list', (_e, cwd: string) => listSessions({ dir: cwd, limit: 300 }))
  ipcMain.handle('history:messages', (_e, id: string, cwd: string) => getSessionMessages(id, { dir: cwd }))
  ipcMain.handle('history:rename', (_e, id: string, title: string, cwd: string) => renameSession(id, title, { dir: cwd }))
  ipcMain.handle('history:remove', (_e, id: string, cwd: string) => deleteSession(id, { dir: cwd }))
  ipcMain.handle('history:fork', async (_e, id: string, cwd: string) => (await forkSession(id, { dir: cwd })).sessionId)

  ipcMain.handle('git:status', (_e, cwd: string) => git.status(cwd))
  ipcMain.handle('git:graph', (_e, cwd: string, limit?: number) => git.graph(cwd, limit))

  ipcMain.handle('cliConfig:list', (_e, cwd: string) => listSettings(cwd))
  ipcMain.handle('cliConfig:set', (_e, cwd: string, key: string, value: string) => setSetting(cwd, key, value))

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
  ipcMain.handle('shell:saveText', async (_e, defaultName: string, text: string) => {
    const cwd = loadConfig().cwd
    const r = await dialog.showSaveDialog(win, { defaultPath: cwd ? join(cwd, defaultName) : defaultName })
    if (r.canceled || !r.filePath) return null
    await writeFile(r.filePath, text, 'utf8')
    return r.filePath
  })

  app.on('before-quit', () => {
    closeAll()
    configRunner.close()
    watcher.close()
  })
  // A renderer reload loses every session key, so don't leave orphaned CLI processes behind.
  win.webContents.on('did-start-navigation', (details) => {
    if (details.isMainFrame && !details.isSameDocument) closeAll()
  })
}
