import { app, BrowserWindow, Menu, shell, Tray } from 'electron'
import { join } from 'node:path'
import { loadConfig, WINDOW_BG } from './config'
import { registerIpc } from './ipc'

// The owner's Deco crab mark: .ico carries every size Windows asks for (taskbar, tray, Alt+Tab, shortcuts).
const ICON = join(app.getAppPath(), 'resources', process.platform === 'win32' ? 'icon.ico' : 'icon.png')

function createWindow(): BrowserWindow {
  const { theme, layout } = loadConfig()
  const win = new BrowserWindow({
    width: 1600,
    height: 950,
    minWidth: 960,
    minHeight: 600,
    title: 'Claude Interface',
    icon: ICON,
    // No native title bar: the renderer's top bar is the window chrome (drag region + our own controls).
    // 'hidden' keeps the resize edges, snapping and the window shadow that a bare frame: false would lose.
    titleBarStyle: 'hidden',
    backgroundColor: WINDOW_BG[theme],
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Shown immediately rather than on ready-to-show: cold starts on this machine take seconds, and a frame in the
  // theme's own color (with the boot mark from index.html) beats an invisible window.

  // Links in chat open in the real browser, never inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e, url) => {
    if (url !== win.webContents.getURL()) {
      e.preventDefault()
      void shell.openExternal(url)
    }
  })

  // Theme and layout ride in the URL so the boot skeleton and first paint already match the saved window.
  const query = { theme, layout: JSON.stringify(layout) }
  if (process.env.ELECTRON_RENDERER_URL) void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}?${new URLSearchParams(query)}`)
  else void win.loadFile(join(import.meta.dirname, '../renderer/index.html'), { query })
  return win
}

// The default menu binds Ctrl+W (close window) and Ctrl+R (reload, which would stop every agent).
// Keep only editing, zoom and DevTools; tab shortcuts are handled in the renderer.
function setMenu(): void {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { role: 'editMenu' },
      {
        label: 'View',
        submenu: [{ role: 'toggleDevTools' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }],
      },
    ]),
  )
}

/** Notification-area icon: click brings the window forward; the menu offers the same plus Quit. */
function createTray(win: BrowserWindow): Tray {
  const tray = new Tray(ICON)
  const show = () => {
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  }
  tray.setToolTip('Claude Interface')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Show Claude Interface', click: show },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]),
  )
  tray.on('click', show)
  return tray
}

// Held at module scope so the tray icon isn't garbage-collected away.
let tray: Tray | null = null

// Group the taskbar button under this app's own identity (and icon) instead of the generic Electron one.
if (process.platform === 'win32') app.setAppUserModelId('com.claude-interface.app')

app.whenReady().then(() => {
  setMenu()
  const win = createWindow()
  registerIpc(win)
  tray = createTray(win)
})

app.on('window-all-closed', () => app.quit())
