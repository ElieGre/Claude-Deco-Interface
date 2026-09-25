import { useEffect, useState } from 'react'
import { useApp } from '../store/app'
import { Icon } from './Icon'

/** Dark/light switch: shows the light you would switch to. */
export function ThemeToggle() {
  const theme = useApp((s) => s.theme)
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button className="icon-btn" onClick={() => useApp.getState().setTheme(next)} title={`Switch to ${next} theme (/theme)`}>
      <Icon name={next === 'light' ? 'sun' : 'moon'} />
    </button>
  )
}

/**
 * Minimize / maximize / close for the frameless window, drawn in the Neo-Deco line.
 * Also mirrors window focus onto <html data-window-focus> so the chrome can dim like a native inactive title bar.
 * macOS keeps its own traffic lights, so nothing renders there.
 */
export function WindowControls() {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    void window.api.window.isMaximized().then(setMaximized)
    const off = window.api.window.onMaximizedChange(setMaximized)
    const root = document.documentElement
    const onFocus = () => (root.dataset.windowFocus = 'true')
    const onBlur = () => (root.dataset.windowFocus = 'false')
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    return () => {
      off()
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  if (window.api.platform === 'darwin') return null
  return (
    <div className="win-controls" role="group" aria-label="Window">
      <button className="win-btn" onClick={() => void window.api.window.minimize()} title="Minimize" aria-label="Minimize">
        <Icon name="winMin" />
      </button>
      <button
        className="win-btn"
        onClick={() => void window.api.window.toggleMaximize()}
        title={maximized ? 'Restore' : 'Maximize'}
        aria-label={maximized ? 'Restore' : 'Maximize'}
      >
        <Icon name={maximized ? 'winRestore' : 'winMax'} />
      </button>
      <button className="win-btn win-close" onClick={() => void window.api.window.close()} title="Close" aria-label="Close">
        <Icon name="close" />
      </button>
    </div>
  )
}
