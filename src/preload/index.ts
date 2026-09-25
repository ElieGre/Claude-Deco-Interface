import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { Api, ClaudeEvent, FsChange } from '../shared/types'

const invoke = (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args)

const api: Api = {
  platform: process.platform,
  window: {
    minimize: () => invoke('window:minimize'),
    toggleMaximize: () => invoke('window:toggleMaximize'),
    close: () => invoke('window:close'),
    isMaximized: () => invoke('window:isMaximized'),
    onMaximizedChange: (cb) => {
      const listener = (_e: IpcRendererEvent, maximized: boolean) => cb(maximized)
      ipcRenderer.on('window:maximized', listener)
      return () => ipcRenderer.removeListener('window:maximized', listener)
    },
  },
  config: {
    get: () => invoke('config:get'),
    set: (patch) => invoke('config:set', patch),
    pickFolder: () => invoke('config:pickFolder'),
  },
  claude: {
    start: (opts) => invoke('claude:start', opts),
    send: (key, text) => invoke('claude:send', key, text),
    interrupt: (key) => invoke('claude:interrupt', key),
    setModel: (key, model) => invoke('claude:setModel', key, model),
    setPermissionMode: (key, mode) => invoke('claude:setPermissionMode', key, mode),
    setEffort: (key, effort) => invoke('claude:setEffort', key, effort),
    contextUsage: (key) => invoke('claude:contextUsage', key),
    respondPermission: (key, id, decision) => invoke('claude:respondPermission', key, id, decision),
    sideQuestion: (key, question) => invoke('claude:sideQuestion', key, question),
    info: (key, kind) => invoke('claude:info', key, kind),
    exportConversation: (key) => invoke('claude:exportConversation', key),
    setAdditionalDirectories: (key, dirs) => invoke('claude:setAdditionalDirectories', key, dirs),
    stop: (key) => invoke('claude:stop', key),
    onEvent: (cb) => {
      const listener = (_e: IpcRendererEvent, event: ClaudeEvent) => cb(event)
      ipcRenderer.on('claude:event', listener)
      return () => ipcRenderer.removeListener('claude:event', listener)
    },
  },
  history: {
    list: (cwd) => invoke('history:list', cwd),
    messages: (id, cwd) => invoke('history:messages', id, cwd),
    rename: (id, title, cwd) => invoke('history:rename', id, title, cwd),
    remove: (id, cwd) => invoke('history:remove', id, cwd),
    fork: (id, cwd) => invoke('history:fork', id, cwd),
  },
  git: {
    status: (cwd) => invoke('git:status', cwd),
    graph: (cwd, limit) => invoke('git:graph', cwd, limit),
  },
  cliConfig: {
    list: (cwd) => invoke('cliConfig:list', cwd),
    set: (cwd, key, value) => invoke('cliConfig:set', cwd, key, value),
  },
  files: {
    list: (dir, root) => invoke('fs:list', dir, root),
    read: (path) => invoke('fs:read', path),
    watch: (root) => invoke('fs:watch', root),
    onChanged: (cb) => {
      const listener = (_e: IpcRendererEvent, change: FsChange) => cb(change)
      ipcRenderer.on('fs:changed', listener)
      return () => ipcRenderer.removeListener('fs:changed', listener)
    },
  },
  shell: {
    reveal: (path) => invoke('shell:reveal', path),
    open: (path) => invoke('shell:open', path),
    copy: (text) => invoke('shell:copy', text),
    saveText: (defaultName, text) => invoke('shell:saveText', defaultName, text),
  },
}

contextBridge.exposeInMainWorld('api', api)
