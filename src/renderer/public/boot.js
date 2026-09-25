// Runs before the body is parsed (a separate file because the CSP forbids inline scripts).
// Main passes the saved theme and layout as ?theme=…&layout=…, so the boot skeleton and the first React frame
// already use the right light and the right panel widths: nothing flashes or jumps when the app takes over.
;(function () {
  var q = new URLSearchParams(location.search)
  var root = document.documentElement
  root.dataset.theme = q.get('theme') === 'light' ? 'light' : 'dark'
  try {
    var l = JSON.parse(q.get('layout') || '{}')
    var left = l.leftOpen !== false
    var right = l.rightOpen !== false
    var cols = [left && (l.leftWidth || 260) + 'px 4px', 'minmax(420px, 1fr)', right && '4px ' + (l.rightWidth || 480) + 'px']
    root.style.setProperty('--boot-cols', cols.filter(Boolean).join(' '))
    if (!left) root.dataset.bootLeft = 'closed'
    if (!right) root.dataset.bootRight = 'closed'
  } catch (e) {}
})()
