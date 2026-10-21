// Dinger Dojo v0: set exit speed, launch angle and direction, watch the ball fly through Oracle Park, and get a verdict against the real wall.
// Physics: RK4 with drag and Magnus lift, aerodynamics from the differentiable-physics net (Cd = 0.373 + 0.149 S) with lift calibrated on 30,000 real
// fly balls (CL = 1.52 S / (1 + 2.55 S); average miss against Statcast projected distance -0.1 ft, typical error 15.8 ft),
// game air density from temperature and humidity, spin from the linear prior that held up on wood-bat data (backspin -763 + 120 x launch angle rpm,
// sidespin -849 x hand - 94 x direction rpm). Wall: distance and height by bearing extracted from the park model (right-center height assumed).
// Three interface skins share the same controls: ?mode=dojo&ui=A|B|C. Everything shown is a prediction, never a measurement.
const NN = window.__nn
const { THREE, scene } = NN
const Q = new URLSearchParams(location.search)
const FT = 0.3048, RPM = (2 * Math.PI) / 60, G = 9.81, MASS = 0.145, RAD = 0.0366, AREA = Math.PI * RAD * RAD
const HOME = { x: 0.3, z: 1.0 }
let wall = null

const state = {
  ev: Number(Q.get('ev')) || 105, la: Number(Q.get('la')) || 28, dir: Q.get('dir') !== null ? Number(Q.get('dir')) : 30,
  hand: Q.get('hand') === 'L' ? -1 : 1, temp: Number(Q.get('temp')) || 62, wind: Number(Q.get('wind')) || 0, ui: (Q.get('ui') || 'A').toUpperCase(),
}

function airDensity(tF, rh = 60, hPa = 1013) {
  const t = ((tF - 32) * 5) / 9, tk = t + 273.15
  const pv = (rh / 100) * 6.1078 * 10 ** ((7.5 * t) / (t + 237.3)) * 100
  return ((hPa * 100 - pv) / (287.058 * tk)) + pv / (461.495 * tk)
}

// frame: x toward right field, y toward center field, z up (metres). Returns the path and what happened.
function fly(s) {
  const rho = airDensity(s.temp)
  const phi = (s.dir * Math.PI) / 180, th = (s.la * Math.PI) / 180, v0 = s.ev * 0.44704
  const wb = Math.max(0, -763 + 120 * s.la) * RPM, ws = (-s.hand * 849 - 94 * s.dir) * RPM
  const r = [Math.cos(phi), -Math.sin(phi), 0]
  const om = [wb * r[0], wb * r[1], ws], wm = Math.hypot(...om) + 1e-9
  const wind = [0, (s.wind * 0.44704), 0] // what-if wind along the field (positive = toward center field)
  let p = [0, 0, 1.0]
  let v = [v0 * Math.cos(th) * Math.sin(phi), v0 * Math.cos(th) * Math.cos(phi), v0 * Math.sin(th)]
  const q = (0.5 * rho * AREA) / MASS
  const acc = (vv) => {
    const rel = [vv[0] - wind[0], vv[1] - wind[1], vv[2] - wind[2]]
    const sp = Math.hypot(...rel) + 1e-9, S = (RAD * wm) / sp
    const cd = 0.3728 + 0.1492 * S, cl = (1.524 * S) / (1 + 2.5479 * S) // lift scaled 1.45x so the average miss on real fly balls is zero (science/dojo_calibrate.py)
    const cr = [om[1] * rel[2] - om[2] * rel[1], om[2] * rel[0] - om[0] * rel[2], om[0] * rel[1] - om[1] * rel[0]]
    return [-q * cd * sp * rel[0] + (q * cl * sp * cr[0]) / wm, -q * cd * sp * rel[1] + (q * cl * sp * cr[1]) / wm, -q * cd * sp * rel[2] + (q * cl * sp * cr[2]) / wm - G]
  }
  const dt = 0.01, path = [{ p: [...p], t: 0 }]
  let t = 0, peak = 1, verdict = null
  const bearingOf = (pp) => (Math.atan2(pp[0], pp[1]) * 180) / Math.PI
  const wallAt = (b) => {
    const k = Math.min(Math.max(b, -47), 47) + 47, i = Math.floor(k), f = k - i
    const j = Math.min(i + 1, 94)
    return [wall.wall_ft[i] * (1 - f) + wall.wall_ft[j] * f, wall.height_ft[i] * (1 - f) + wall.height_ft[j] * f]
  }
  while (t < 12) {
    const k1 = acc(v)
    const v2 = v.map((x, i) => x + 0.5 * dt * k1[i]), k2 = acc(v2)
    const v3 = v.map((x, i) => x + 0.5 * dt * k2[i]), k3 = acc(v3)
    const v4 = v.map((x, i) => x + dt * k3[i]), k4 = acc(v4)
    const np = p.map((x, i) => x + (dt / 6) * (v[i] + 2 * v2[i] + 2 * v3[i] + v4[i]))
    const nv = v.map((x, i) => x + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]))
    t += dt
    if (!verdict) {
      const rOld = Math.hypot(p[0], p[1]) / FT, rNew = Math.hypot(np[0], np[1]) / FT
      const bNew = bearingOf(np)
      const [W, H] = wallAt(bNew)
      if (rOld < W && rNew >= W && np[2] > 0) {
        const f = (W - rOld) / (rNew - rOld), zc = (p[2] + f * (np[2] - p[2])) / FT
        if (Math.abs(bNew) > 45.5) verdict = { kind: 'FOUL', text: 'FOUL BALL', wallFt: W, wallH: H, cross: zc, ft: rNew }
        else if (zc > H) verdict = { kind: 'GONE', text: 'GONE', wallFt: W, wallH: H, cross: zc, ft: rNew, clearBy: zc - H }
        else verdict = { kind: 'WALL', text: 'OFF THE WALL', wallFt: W, wallH: H, cross: zc, ft: rNew, short: H - zc }
      }
    }
    p = np
    v = nv
    peak = Math.max(peak, p[2])
    path.push({ p: [...p], t })
    if (p[2] <= 0 || (verdict && verdict.kind === 'WALL')) break
  }
  const last = path[path.length - 1].p
  const landFt = Math.hypot(last[0], last[1]) / FT, landB = bearingOf(last)
  if (!verdict) verdict = Math.abs(landB) > 45.5 ? { kind: 'FOUL', text: 'FOUL BALL', ft: landFt } : { kind: 'PLAY', text: 'IN PLAY', ft: landFt }
  return { path, verdict, peakFt: peak / FT, hang: t, landFt, landB, rho, wb: wb / RPM, ws: ws / RPM }
}

// ---------- scene: path ribbon, ball, landing burst ----------
let ribbon = null, ball = null, burst = null, anim = null
const toWorld = (p) => new THREE.Vector3(HOME.x + p[0], p[2], HOME.z - p[1])
function colors() {
  if (NN.real) return Object.fromEntries(Object.entries(NN.VIBES[NN.vibe()].ribbon).map(([k, v]) => [k, new THREE.Color(v)]))
  return { GONE: 0xff5a3c, WALL: 0xffd23f, PLAY: 0x7fe3d4, FOUL: 0xb0b0b0 }
}
const inkOf = () => (NN.real ? new THREE.Color(NN.VIBES[NN.vibe()].ink) : new THREE.Color(0x1d2a6d))
const outlineLevel = () => (NN.real ? NN.VIBES[NN.vibe()].outline : 0)
// cartoon outline: a slightly larger back-face copy in ink colour (ribbon and ball), a bigger flat copy under the burst
function outlineOf(mesh, k) {
  const lv = outlineLevel()
  if (!lv) return
  const o = mesh.clone(false)
  o.position.set(0, 0, 0)
  o.material = new THREE.MeshBasicMaterial({ color: inkOf(), side: THREE.BackSide })
  const g = mesh.geometry
  if (g.type === 'TubeGeometry') { o.geometry = new THREE.TubeGeometry(g.parameters.path, g.parameters.tubularSegments, g.parameters.radius * k * (lv > 1 ? 1.35 : 1), 8, false) }
  else o.scale.setScalar(k * (lv > 1 ? 1.2 : 1))
  mesh.add(o)
}
function burstOutline(b) {
  const lv = outlineLevel()
  if (!lv) return
  const o = new THREE.Mesh(b.geometry, new THREE.MeshBasicMaterial({ color: inkOf(), side: THREE.DoubleSide }))
  o.scale.setScalar(lv > 1 ? 1.2 : 1.1)
  o.position.z = -0.05
  b.add(o)
}
function draw(res) {
  for (const n of ['sampleRibbon', 'sampleBurst']) { const o = scene.getObjectByName(n); if (o) o.visible = false }
  if (ribbon) { scene.remove(ribbon); ribbon.geometry.dispose() }
  if (burst) scene.remove(burst)
  const pts = res.path.filter((_, i) => i % 4 === 0).map((s) => toWorld(s.p))
  if (pts.length < 3) return
  ribbon = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 0.8, 8, false), new THREE.MeshBasicMaterial({ color: colors()[res.verdict.kind] }))
  scene.add(ribbon)
  outlineOf(ribbon, 1.7)
  if (!ball) { ball = new THREE.Mesh(new THREE.SphereGeometry(2.4, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff })); scene.add(ball) }
  for (const c of [...ball.children]) ball.remove(c)
  outlineOf(ball, 1.25)
  const shape = new THREE.Shape()
  for (let i = 0; i < 24; i++) { const rr = i % 2 ? 4 : 11, a = (i / 24) * Math.PI * 2; shape[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr) }
  burst = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: colors()[res.verdict.kind], side: THREE.DoubleSide }))
  burst.position.copy(pts[pts.length - 1]).add(new THREE.Vector3(0, 6, 0))
  burst.quaternion.copy(NN.camera.quaternion)
  scene.add(burst)
  burstOutline(burst)
  anim = { pts, t0: performance.now(), dur: 2600 }
}
function tick() {
  if (anim && ball) {
    const f = Math.min((performance.now() - anim.t0) / anim.dur, 1), i = Math.floor(f * (anim.pts.length - 1))
    ball.position.copy(anim.pts[i])
    if (burst) burst.visible = f > 0.97
    if (window.__fixedTime !== undefined) { ball.position.copy(anim.pts[anim.pts.length - 1]); if (burst) burst.visible = true }
  }
  requestAnimationFrame(tick)
}

// ---------- interface ----------
const CSS = `
#dojo{position:fixed;inset:0;pointer-events:none;font-family:Arial,Helvetica,sans-serif;z-index:5}
#dojo>*{pointer-events:auto}
#dojo .row{display:flex;align-items:center;gap:8px;margin:5px 0}
#dojo label{min-width:74px;font-size:11px;letter-spacing:.06em;text-transform:uppercase}
#dojo input[type=range]{flex:1;min-width:120px}
#dojo .val{min-width:54px;text-align:right;font-weight:700;font-variant-numeric:tabular-nums}
#dojo button{cursor:pointer;font:inherit}
#dj-skins{position:absolute;top:10px;right:12px;font-size:11px;font-weight:700;background:rgba(255,255,255,.75);color:#1d2a6d;padding:3px 6px;border-radius:3px}
#dj-skins button{margin-left:4px;padding:3px 8px}
#dj-vibe{position:absolute;right:12px;bottom:128px;display:flex;gap:4px;align-items:center;font-size:11px;font-weight:700;background:rgba(0,0,0,.5);color:#fff;padding:6px 8px;border-radius:4px}
#dj-vibe button{padding:3px 9px}#dj-vibename{min-width:104px;text-align:right;letter-spacing:.1em;margin-right:4px}
#dj-ctl{position:absolute;top:44px;left:12px;width:310px;padding:10px 12px}
#dj-out{position:absolute;top:44px;right:12px;width:290px;padding:10px 12px}
#dj-verdict{font-weight:900;line-height:1;margin-bottom:6px}
#dj-nums div{display:flex;justify-content:space-between;padding:2px 0;font-size:13px}
#dj-nums b{font-variant-numeric:tabular-nums}
#dj-note{font-size:10px;opacity:.7;margin-top:6px;line-height:1.3}
#dojo.ui-A #dj-ctl,#dojo.ui-A #dj-out{background:rgba(6,14,28,.78);color:#bfe9ff;border:1px solid #2cc4ff;border-radius:2px;font-family:Consolas,'Courier New',monospace;backdrop-filter:blur(3px)}
#dojo.ui-A #dj-title{position:absolute;top:10px;left:12px;color:#2cc4ff;font:700 13px Consolas,monospace;letter-spacing:.3em}
#dojo.ui-A #dj-verdict{font-size:34px;letter-spacing:.08em;color:#fff;border-bottom:1px solid #2cc4ff;padding-bottom:6px}
#dojo.ui-A #dj-verdict.GONE{color:#ff7a59}#dojo.ui-A #dj-verdict.WALL{color:#ffd23f}#dojo.ui-A #dj-verdict.PLAY{color:#7fe3d4}
#dojo.ui-A input[type=range]{accent-color:#2cc4ff}#dojo.ui-A #dj-skins button{background:#06101c;color:#2cc4ff;border:1px solid #2cc4ff}
#dojo.ui-A #dj-skins button.on{background:#2cc4ff;color:#06101c}
#dojo.ui-B #dj-ctl,#dojo.ui-B #dj-out{background:#fff;color:#1d2a6d;border:3px solid #1d2a6d;box-shadow:6px 6px 0 #ff5a3c;transform:rotate(-.6deg)}
#dojo.ui-B #dj-out{transform:rotate(.8deg);box-shadow:6px 6px 0 #ffd23f}
#dojo.ui-B #dj-title{position:absolute;top:8px;left:12px;background:#ffd23f;color:#1d2a6d;border:3px solid #1d2a6d;padding:2px 10px;font:900 18px Arial;letter-spacing:.04em;transform:rotate(-1.5deg);box-shadow:3px 3px 0 #1d2a6d}
#dojo.ui-B #dj-verdict{font-size:40px;font-style:italic;color:#fff;background:#1d2a6d;padding:6px 10px;text-shadow:3px 3px 0 #ff5a3c;transform:rotate(-1.5deg);display:inline-block}
#dojo.ui-B #dj-verdict.GONE:before{content:'KA-BLAM! '}#dojo.ui-B #dj-verdict.WALL:before{content:'THUD! '}
#dojo.ui-B input[type=range]{accent-color:#ff5a3c}#dojo.ui-B #dj-skins button{background:#fff;color:#1d2a6d;border:2px solid #1d2a6d;font-weight:900}
#dojo.ui-B #dj-skins button.on{background:#1d2a6d;color:#fff}
#dojo.ui-C #dj-ctl{background:#14081f;color:#ff4bd8;border:2px solid #ff4bd8;box-shadow:0 0 14px #ff4bd8aa;border-radius:14px;top:auto;bottom:122px;left:12px;width:auto;display:flex;gap:18px;flex-wrap:wrap;max-width:calc(100vw - 340px)}
#dojo.ui-C #dj-ctl .row{margin:2px 0;min-width:240px}#dojo.ui-C #dj-ctl label{color:#c8ff3a}
#dojo.ui-C #dj-out{background:#000;color:#c8ff3a;border:2px solid #c8ff3a;box-shadow:0 0 14px #c8ff3aaa;border-radius:6px;font-family:'Courier New',monospace;top:44px}
#dojo.ui-C #dj-title{position:absolute;top:8px;left:12px;color:#ff4bd8;font:900 22px 'Courier New',monospace;letter-spacing:.2em;text-shadow:0 0 10px #ff4bd8}
#dojo.ui-C #dj-verdict{font-size:38px;color:#ff4bd8;text-shadow:0 0 12px #ff4bd8;letter-spacing:.1em}
#dojo.ui-C #dj-verdict.GONE{color:#c8ff3a;text-shadow:0 0 14px #c8ff3a}
#dojo.ui-C input[type=range]{accent-color:#ff4bd8}#dojo.ui-C #dj-skins button{background:#14081f;color:#ff4bd8;border:1px solid #ff4bd8}
#dojo.ui-C #dj-skins button.on{background:#ff4bd8;color:#14081f}
`
window.__dojoFly = fly // exposed for the screenshot and test scripts
const SKIN_BUTTONS = /(#dojo\.ui-[ABC]) #dj-skins button(\.on)?/g // the vibe buttons wear whichever skin is on
const CSS_ALL = CSS.replace(SKIN_BUTTONS, '$1 #dj-skins button$2,$1 #dj-vibe button$2')
document.getElementById('look')?.remove() // the look switcher label would sit under the Dojo title
const root = document.createElement('div')
root.id = 'dojo'
root.innerHTML = `<style>${CSS_ALL}</style>
<div id="dj-title">DINGER DOJO</div>
<div id="dj-skins">SKIN <button data-ui="A">A</button><button data-ui="B">B</button><button data-ui="C">C</button></div>
${NN.real ? '<div id="dj-vibe"><span id="dj-vibename"></span>' + [1, 2, 3, 4, 5].map((n) => `<button data-v="${n}">${n}</button>`).join('') + '</div>' : ''}
<div id="dj-ctl"></div>
<div id="dj-out"><div id="dj-verdict"></div><div id="dj-nums"></div><div id="dj-note"></div></div>`
document.body.appendChild(root)
const ctl = document.getElementById('dj-ctl')
const sliders = [
  ['ev', 'Exit speed', 60, 125, 1, (v) => `${v} mph`], ['la', 'Launch angle', -10, 60, 1, (v) => `${v}°`],
  ['dir', 'Direction', -50, 50, 1, (v) => (v < -5 ? `${-v}° LF` : v > 5 ? `${v}° RF` : 'CF')],
  ['temp', 'Temperature', 40, 100, 1, (v) => `${v}°F`], ['wind', 'What-if wind', -20, 20, 1, (v) => (v === 0 ? 'calm' : `${Math.abs(v)} mph ${v > 0 ? 'out' : 'in'}`)],
]
ctl.innerHTML = sliders.map(([k, l, lo, hi, st]) => `<div class="row"><label>${l}</label><input type="range" id="s-${k}" min="${lo}" max="${hi}" step="${st}"><span class="val" id="v-${k}"></span></div>`).join('') +
  `<div class="row"><label>Batter</label><button id="hand" style="padding:3px 10px"></button></div>`

function render(res) {
  const v = res.verdict
  const el = document.getElementById('dj-verdict')
  el.textContent = v.text
  el.className = v.kind
  const rows = [['Distance', `${Math.round(res.landFt)} ft`], ['Peak height', `${Math.round(res.peakFt)} ft`], ['Hang time', `${res.hang.toFixed(1)} s`]]
  if (v.wallFt) rows.push(['Wall there', `${Math.round(v.wallFt)} ft, ${v.wallH.toFixed(0)} ft tall`], ['Height at wall', `${v.cross.toFixed(0)} ft`])
  if (v.kind === 'GONE') rows.push(['Cleared by', `${v.clearBy.toFixed(0)} ft`])
  if (v.kind === 'WALL') rows.push(['Short by', `${v.short.toFixed(0)} ft`])
  rows.push(['Backspin / sidespin', `${Math.round(res.wb)} / ${Math.round(res.ws)} rpm`], ['Air density', `${res.rho.toFixed(3)} kg/m³`])
  document.getElementById('dj-nums').innerHTML = rows.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('')
  document.getElementById('dj-note').textContent =
    'PREDICTION. Spin is a typical-ball estimate; wall from the park model (right-center height assumed); wind is what-if only.'
  NN.setStat(state.ev, state.la, res.landFt)
}
function update() {
  for (const [k, , , , , f] of sliders) {
    document.getElementById(`s-${k}`).value = state[k]
    document.getElementById(`v-${k}`).textContent = f(state[k])
  }
  document.getElementById('hand').textContent = state.hand > 0 ? 'RIGHT-HANDED' : 'LEFT-HANDED'
  root.className = `ui-${state.ui}`
  for (const b of root.querySelectorAll('#dj-skins button')) b.classList.toggle('on', b.dataset.ui === state.ui)
  if (NN.real) {
    document.getElementById('dj-vibename').textContent = `${NN.vibe()} ${NN.VIBES[NN.vibe()].name}`
    for (const b of root.querySelectorAll('#dj-vibe button')) b.classList.toggle('on', Number(b.dataset.v) === NN.vibe())
  }
  const res = fly(state)
  draw(res)
  render(res)
  window.__dojo = res
}
ctl.addEventListener('input', (e) => { if (e.target.id?.startsWith('s-')) { state[e.target.id.slice(2)] = Number(e.target.value); update() } })
document.getElementById('hand').addEventListener('click', () => { state.hand *= -1; update() })
for (const b of root.querySelectorAll('#dj-skins button')) b.addEventListener('click', () => { state.ui = b.dataset.ui; update() })
for (const b of root.querySelectorAll('#dj-vibe button')) b.addEventListener('click', () => NN.setVibe(Number(b.dataset.v)))
addEventListener('nn-vibe', () => { if (window.__dojoReady) update() })
addEventListener('keydown', (e) => { if (NN.real && '12345'.includes(e.key) && e.target.tagName !== 'INPUT') NN.setVibe(Number(e.key)) })

fetch('/oracle_wall.json').then((r) => r.json()).then((w) => { wall = w; update(); tick(); window.__dojoReady = true })
