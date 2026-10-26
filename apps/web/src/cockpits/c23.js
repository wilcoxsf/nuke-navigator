// Study 23, WIRE ONLY: the Oracle Park wireframe by itself, full screen, to judge it. Drag to orbit, wheel to zoom. Buttons: camera presets (home, bird's eye, behind the plate, from the left-field
// corner, from the right-field corner, from centre field), the line set (FULL is the new wire: thick heavy lines, field markings, the measured wall in the accent colour, a lower crease angle for the
// bowl, contours on the outer stands; PLAIN is the old look), contours on or off, markings on or off. No flight, no ball, no stats.
import { SKEL_CSS } from './skel.js'
import { THEME_CSS, themePicker, pressEl, finishUI } from './skel2.js'
import { BTN_TILT_CSS, tiltButtons } from './skel3.js'

const VIEWS = {
  home: ['HOME', [0.3, 150, 170], [0.3, 0, -85]],
  bird: ["BIRD'S EYE", [0.3, 300, -50], [0.3, 0, -62]],
  plate: ['BEHIND PLATE', [0.3, 5, 24], [0.3, 10, -150]],
  lf: ['LF CORNER', [-95, 34, -20], [10, 2, -75]],
  rf: ['RF CORNER', [105, 34, -20], [-5, 2, -75]],
  cf: ['FROM CENTER', [0.3, 30, -105], [0.3, 0, 10]],
}

export async function build(root, api, U) {
  const { css, windowSync } = U
  css('cp23', SKEL_CSS + THEME_CSS + BTN_TILT_CSS + `
#cp .c23{position:absolute;inset:0;pointer-events:none}
#cp .c23 .bar{position:absolute;left:10px;right:10px;top:8px;display:flex;justify-content:space-between;gap:12px;align-items:center;white-space:nowrap}
#cp .c23 .bar .grp{display:flex;gap:6px;align-items:center;font:8px PS2P,monospace;color:var(--dim);flex-wrap:wrap}
#cp .c23 .bt{font:8px/1 PS2P,monospace;padding:6px 9px;box-shadow:0 3px 0 var(--e);pointer-events:auto}
#cp .c23 .bt.on{background:var(--tx);color:var(--k);box-shadow:0 1px 0 var(--e)}
#cp .c23 .hint{position:absolute;left:12px;bottom:10px;font-size:15px;color:var(--dim);pointer-events:none}
#cp .c23 .stat{position:absolute;right:12px;bottom:10px;font-size:15px;color:var(--dim);pointer-events:none;text-align:right}
`)
  root.classList.add('skel')
  window.__cpNoFlight = true
  api.NN.setFpsCap(30)
  const q = new URLSearchParams(location.search)
  let view = q.get('view') || 'home', lines = q.get('wire') === 'plain' ? 'plain' : 'full', contours = q.get('step') !== '0', marks = q.get('marks') !== '0', stands = ['full', 'clean', 'ghost', 'quiet', 'terrace'].includes(q.get('stands')) ? q.get('stands') : 'ghost'
  root.innerHTML = `<div class="c23"><div class="bar"><span class="grp">${Object.entries(VIEWS).map(([k, v]) => `<span class="bt" data-v="${k}">${v[0]}</span>`).join('')}</span>
    <span class="grp">STANDS <span class="bt" data-s="full">FULL</span><span class="bt" data-s="clean">CLEAN</span><span class="bt" data-s="ghost">GHOST</span><span class="bt" data-s="quiet">QUIET</span><span class="bt" data-s="terrace">TERRACE</span> &nbsp; LINES <span class="bt" data-l="full">NEW</span><span class="bt" data-l="plain">PLAIN</span> <span class="bt" id="c23c">CONTOURS</span><span class="bt" id="c23m">MARKINGS</span> <span id="c23a"></span></span></div>
    <div class="hint">DRAG TO ORBIT &nbsp; WHEEL TO ZOOM &nbsp; RIGHT-DRAG TO PAN</div><div class="stat" id="c23s"></div></div>`
  const E = (id) => root.querySelector(id)
  const showWire = () => {
    api.NN.setDuo(null)
    const cs = getComputedStyle(root), t = { tx: cs.getPropertyValue('--tx').trim(), k: cs.getPropertyValue('--k').trim(), acc: cs.getPropertyValue('--acc').trim() }
    api.NN.setPix({ pix: 0, mode: 0 })
    const rich = lines === 'plain' ? {} : { fatHeavy: 1.8, faintAngle: 40, faintMin: 0.8, marks, wall: (b) => api.wallAt?.(b), accent: t.acc, stands, fun: true, step: contours ? (stands === 'terrace' ? 2.5 : stands === 'quiet' ? 4 : stands === 'ghost' ? 6 : 5) : 0, contourOuter: stands === 'terrace' ? 12 : stands === 'quiet' ? 20 : stands === 'ghost' ? 40 : 70 }
    api.NN.setWire(true, { split: true, angle: 78, step: 0, hidden: true, opacity: 0.9, color: t.tx, face: t.k, fog: [230, 560], rebuild: !!showWire.built, ...rich })
    showWire.built = true
    const st = api.NN.wireStats
    E('#c23s').textContent = lines === 'plain' || !st ? 'PLAIN LINES' : `${st.stands.toUpperCase()}: ${Math.round(st.heavy / 1000)}K HEAVY  ${Math.round(st.faint / 1000)}K FAINT  ${Math.round((st.contours || 0) / 1000)}K CONTOUR`
  }
  const paint = () => {
    root.querySelectorAll('[data-v]').forEach((b) => b.classList.toggle('on', b.dataset.v === view))
    root.querySelectorAll('[data-l]').forEach((b) => b.classList.toggle('on', b.dataset.l === lines))
    root.querySelectorAll('[data-s]').forEach((b) => b.classList.toggle('on', b.dataset.s === stands && lines === 'full'))
    E('#c23c').classList.toggle('on', contours && lines === 'full')
    E('#c23m').classList.toggle('on', marks && lines === 'full')
  }
  const camTo = (k) => { const [, p, t] = VIEWS[k]; api.NN.camera.position.set(...p); api.NN.controls.target.set(...t); api.NN.controls.update(); view = k; paint() }
  themePicker(root, E('#c23a'), api, 23, 'orange', { park: true, onChange: () => showWire() })
  tiltButtons(root)
  windowSync(api, root, { zoom: 1.0 })
  root.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => { pressEl(b); camTo(b.dataset.v) }))
  root.querySelectorAll('[data-l]').forEach((b) => b.addEventListener('click', () => { pressEl(b); lines = b.dataset.l; showWire(); paint() }))
  root.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('click', () => { pressEl(b); stands = b.dataset.s; lines = 'full'; showWire(); paint() }))
  E('#c23c').addEventListener('click', () => { pressEl(E('#c23c')); contours = !contours; showWire(); paint() })
  E('#c23m').addEventListener('click', () => { pressEl(E('#c23m')); marks = !marks; showWire(); paint() })
  addEventListener('keydown', (e) => { const k = { 1: 'home', 2: 'bird', 3: 'plate', 4: 'lf', 5: 'rf', 6: 'cf' }[e.key]; if (k) camTo(k); const sk = { q: 'full', w: 'clean', e: 'ghost', r: 'quiet', t: 'terrace' }[e.key]; if (sk) { stands = sk; lines = 'full'; showWire(); paint() } })
  finishUI(root, { minW: 900, minH: 560 })
  showWire()
  setTimeout(() => { camTo(view); api.setPreview(true); api.update() }, 80) // one redraw with the flag set removes the ghost flight the dojo drew before this study loaded
  paint()
  return { render() {}, beat() {} }
}
