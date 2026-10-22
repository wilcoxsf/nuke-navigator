// Cockpit loader: ?cp=N (1..10) swaps the Dojo's interface for one of ten different layouts of the same flight. Alt+Left / Alt+Right moves between them.
import * as U from './core.js'

export const NAMES = ['', 'DISCOVERY BANK', 'HAL RING', 'STATUS BARS', 'SCHEMATIC', 'INSTRUCTION CARD', 'FLIGHT RECORDER', 'MONOLITH', 'CINEMASCOPE', 'DEPARTURES BOARD', 'POD HUD']

export async function start(n, api) {
  if (!(n >= 1 && n <= 10)) return
  U.css('cp-base', U.BASE_CSS)
  const root = U.h('div', { id: 'cp' })
  document.body.appendChild(root)
  const mod = await import(`./c${String(n).padStart(2, '0')}.js`)
  const inst = (await mod.build(root, api, U)) || {}
  window.__cpRender = (res) => inst.render?.(res)
  window.__cpBeat = (b) => inst.beat?.(b)
  if (window.__dojo) inst.render?.(window.__dojo)
  if (window.__cpLastBeat) inst.beat?.(window.__cpLastBeat)
  window.__cpInst = inst
  document.title = `Dinger Dojo: cockpit ${n}, ${NAMES[n]}`
  addEventListener('keydown', (e) => {
    if (!e.altKey || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return
    const q = new URLSearchParams(location.search)
    q.set('cp', String(((n - 1 + (e.key === 'ArrowRight' ? 1 : -1) + 10) % 10) + 1))
    location.search = q.toString()
  })
}
