// Cockpit loader: Study 25, the one interface (31 Oct: cockpits 1 to 24 and the Alt + arrow keys between them are gone, at Andrew's per-item yes).
import * as U from './core.js'
import * as C25 from './c25.js'

export async function start(n, api) {
  U.css('cp-base', U.BASE_CSS)
  const root = U.h('div', { id: 'cp' })
  document.body.appendChild(root)
  const inst = (await C25.build(root, api, U)) || {}
  // draw at most once per animation frame: dragging an input fires many updates, and each render rebuilds the SVG and DOM
  let pendingRes = null, raf = 0
  window.__cpRender = (res) => { pendingRes = res; if (!raf) raf = requestAnimationFrame(() => { raf = 0; inst.render?.(pendingRes) }) }
  window.__cpBeat = (b) => inst.beat?.(b)
  if (window.__dojo) inst.render?.(window.__dojo)
  if (window.__cpLastBeat) inst.beat?.(window.__cpLastBeat)
  window.__cpInst = inst
  document.title = 'Nuke Navigator'
}
