// Dinger Dojo v0: set exit speed, launch angle and direction, watch the ball fly through Oracle Park, and get a verdict against the real wall.
// Physics: RK4 with drag and Magnus lift, aerodynamics from the differentiable-physics net (Cd = 0.373 + 0.149 S) with lift calibrated on 30,000 real
// fly balls (CL = 1.52 S / (1 + 2.55 S); average miss against Statcast projected distance -0.1 ft, typical error 15.8 ft),
// game air density from temperature and humidity, spin from the linear prior that held up on wood-bat data (backspin -763 + 120 x launch angle rpm,
// sidespin -849 x hand - 94 x direction rpm). Wall: distance and height by bearing extracted from the park model (right-center height assumed).
// Three interface skins share the same controls: ?mode=dojo&ui=A|B|C. Everything shown is a prediction, never a measurement.
import { initSeance, findLanding } from './seance.js'
import { initFx } from './fx.js'
import { STATES, classify, pickHead, pickSub, fill } from './callouts.js'
import { mulberry32 } from './comparisons.js'
import { initKrab } from './krab.js'
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
function fly(s, opt = {}) {
  const rho = airDensity(s.temp)
  const phi = (s.dir * Math.PI) / 180, th = (s.la * Math.PI) / 180, v0 = s.ev * 0.44704
  const wb = Math.max(0, -763 + 120 * s.la + (s.dwb || 0)) * RPM, ws = (-s.hand * 849 - 94 * s.dir + (s.dws || 0)) * RPM
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
    const floor = opt.floor ?? 0, through = verdict && (verdict.kind === 'GONE' || verdict.kind === 'FOUL') // Seat Seance follows homers on past the wall
    if ((p[2] <= 0 && !(floor < 0 && through)) || p[2] <= floor || (verdict && verdict.kind === 'WALL')) break
  }
  const last = path[path.length - 1].p
  const landFt = Math.hypot(last[0], last[1]) / FT, landB = bearingOf(last)
  if (!verdict) verdict = Math.abs(landB) > 45.5 ? { kind: 'FOUL', text: 'FOUL BALL', ft: landFt } : { kind: 'PLAY', text: 'IN PLAY', ft: landFt }
  return { path, verdict, peakFt: peak / FT, hang: t, landFt, landB, rho, wb: wb / RPM, ws: ws / RPM }
}

// ---------- scene: path ribbon, ball, landing burst ----------
let ribbon = null, ball = null, burst = null, anim = null, apex = null
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
const wallDistAt = (b) => (wall ? wall.wall_ft[Math.round(Math.min(Math.max(b, -47), 47) + 47)] : 0)
const TONE = { GONE: 'gone', NUKE: 'nuke', SPLASH: 'splash', SCRAPER: 'scraper', WALL: 'wall', CLOSE: 'close', FLY: 'play', WARNING: 'play', LINER: 'play', GROUNDER: 'play', POPUP: 'play', FOUL: 'foul', POLE: 'scraper' }
const rngC = Q.get('seed') ? mulberry32(Number(Q.get('seed'))) : Math.random
const recentHeads = []
let fx = null
const hex = (c) => `#${new THREE.Color(c).getHexString()}`
// zenith of the flight, marked in the 3D scene: a dashed plumb line down to the ground, a diamond at the top and a lettered height tag
function placeApex(src, res) {
  if (apex) { scene.remove(apex); apex.traverse((o) => { o.geometry?.dispose?.(); o.material?.map?.dispose?.() }); apex = null }
  let ai = 0
  src.forEach((q, i) => { if (q.p[2] > src[ai].p[2]) ai = i })
  const top = toWorld(src[ai].p), gnd = top.clone()
  gnd.y = 0.3
  const ink = inkOf(), main = new THREE.Color('#ffd23f')
  apex = new THREE.Group()
  const dashMat = new THREE.MeshBasicMaterial({ color: ink }), len = top.y - gnd.y, n = Math.max(2, Math.floor(len / 5))
  for (let k = 0; k < n; k++) {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, (len / n) * 0.55, 6), dashMat)
    d.position.set(gnd.x, gnd.y + (k + 0.5) * (len / n), gnd.z)
    apex.add(d)
  }
  const foot = new THREE.Mesh(new THREE.RingGeometry(1.5, 2.2, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: ink, side: THREE.DoubleSide }))
  foot.position.copy(gnd)
  apex.add(foot)
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(2.4), new THREE.MeshBasicMaterial({ color: main }))
  const gemInk = new THREE.Mesh(new THREE.OctahedronGeometry(2.4), new THREE.MeshBasicMaterial({ color: ink, side: THREE.BackSide }))
  gemInk.scale.setScalar(1.32)
  gem.add(gemInk)
  gem.position.copy(top)
  apex.add(gem)
  if (fx?.label) {
    const tag = fx.label(`ZENITH ${Math.round(res.peakFt)} FT`, '#ffd23f', hex(ink))
    tag.scale.set(26, 8.6, 1)
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(NN.camera.quaternion) // beside the gem, away from the blast word
    tag.position.copy(top).addScaledVector(right, 17).add(new THREE.Vector3(0, 3, 0))
    tag.renderOrder = 15
    apex.add(tag)
  }
  apex.userData.at = ai / Math.max(1, src.length - 1)
  apex.visible = window.__fixedTime !== undefined
  scene.add(apex)
}
function draw(res) {
  for (const n of ['sampleRibbon', 'sampleBurst']) { const o = scene.getObjectByName(n); if (o) o.visible = false }
  if (ribbon) { scene.remove(ribbon); ribbon.geometry.dispose() }
  if (burst) { scene.remove(burst); burst = null }
  fx?.clear()
  const src = res.visPath ?? res.path
  const pts = src.filter((_, i) => i % 4 === 0 || i === src.length - 1).map((s) => toWorld(s.p))
  if (pts.length < 3) return
  ribbon = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 0.8, 8, false), new THREE.MeshBasicMaterial({ color: colors()[res.verdict.kind] }))
  scene.add(ribbon)
  outlineOf(ribbon, 1.7)
  placeApex(src, res)
  if (!ball) { ball = new THREE.Mesh(new THREE.SphereGeometry(2.4, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff })); scene.add(ball) }
  for (const c of [...ball.children]) ball.remove(c)
  outlineOf(ball, 1.25)
  const at = (res.landing?.point ?? pts[pts.length - 1]).clone()
  at.y = Math.max(at.y, 0.5)
  const beats = pickHead(res.key, rngC, recentHeads)
  const v = res.verdict
  const bw = Math.min(Math.max(res.landB, -47), 47) + 47
  const vars = {
    ft: Math.round(res.landFt), ev: state.ev, la: state.la, peak: Math.round(res.peakFt), hang: res.hang.toFixed(1), clear: Math.round(v.clearBy ?? 0),
    short: Math.round(v.short ?? 0), wall: Math.round(v.wallH ?? 0), wallft: Math.round(wall?.wall_ft?.[Math.round(bw)] ?? 0), cross: Math.round(v.cross ?? 0),
    off: Math.abs(Math.abs(res.landB) - 45).toFixed(1), side: res.landB < 0 ? 'left' : 'right',
  }
  anim = { pts, t0: performance.now(), dur: 2600, beats, sub: fill(pickSub(res.key, rngC), vars), key: res.key, tone: TONE[res.key], at, kind: v.kind, shown: -2, exploded: false }
  showBeat(-1)
  if (window.__fixedTime !== undefined) { ball.position.copy(pts[pts.length - 1]); finish() }
}
function showBeat(i) { // i = -1: waiting for the first word; the last beat comes with the blast
  if (!anim || anim.shown === i) return
  anim.shown = i
  const el = document.getElementById('dj-verdict')
  const last = i === anim.beats.length - 1
  el.className = last ? `st-${anim.tone} ${res0Kind()}` : 'st-wait'
  el.innerHTML = i < 0 ? '<span class="beat">. . .</span>' : `<span class="beat">${anim.beats[i]}</span>`
  document.getElementById('dj-state').textContent = last ? STATES[anim.key].label : 'TRACKING'
  document.getElementById('dj-sub').textContent = last ? anim.sub : ''
  window.__scoreboard?.show(last ? 'final' : 'beat', anim, i)
}
const res0Kind = () => anim?.kind ?? ''
function finish() {
  if (!anim || anim.exploded) return
  anim.exploded = true
  showBeat(anim.beats.length - 1)
  if (!fx) return
  const kindColor = hex(colors()[anim.kind] ?? 0xffffff)
  const pal = { main: kindColor, accent: '#ffd23f', ink: hex(inkOf()) }
  const sc = Math.min(2.2, Math.max(0.8, NN.camera.position.distanceTo(anim.at) / 220))
  fx.explode(anim.tone, anim.at, pal, sc)
  window.__krab?.react(anim.tone, anim.at)
  if (window.__fixedTime !== undefined) fx.step(Number(Q.get('fxt') ?? 0.4))
}
function tick() {
  if (anim && ball) {
    const f = Math.min((performance.now() - anim.t0) / anim.dur, 1), i = Math.floor(f * (anim.pts.length - 1))
    if (window.__fixedTime === undefined) ball.position.copy(anim.pts[i])
    const n = anim.beats.length
    if (apex && f >= apex.userData.at) apex.visible = true // the zenith tag appears as the ball passes the top
    if (n > 1) for (let k = 0; k < n - 1; k++) if (f >= (k / (n - 1)) * 0.8 && anim.shown < k) showBeat(k)
    if (f > 0.97 && !anim.exploded) finish()
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
#dj-state{font:700 10px Consolas,monospace;letter-spacing:.2em;margin:0 0 3px}
#dj-sub{font:700 11px Consolas,monospace;letter-spacing:.04em;min-height:14px;margin:0 0 6px}
#dj-fig,.tape{display:none}
#dojo.ui-B #dj-ctl,#dojo.ui-B #dj-out{background-color:#fff;background-image:linear-gradient(rgba(29,42,109,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(29,42,109,.08) 1px,transparent 1px);background-size:16px 16px;color:#1d2a6d;border:3px solid #1d2a6d;box-shadow:6px 6px 0 #ff5a3c;transform:rotate(-.5deg)}
#dojo.ui-B #dj-out{transform:rotate(.6deg);box-shadow:6px 6px 0 #ffd23f;width:310px}
#dojo.ui-B .tape{display:block;margin:-10px -12px 8px;padding:3px 0;background:repeating-linear-gradient(-45deg,#1d2a6d 0 9px,#ffd23f 9px 18px);border-bottom:3px solid #1d2a6d}
#dojo.ui-B .tape i{display:inline-block;margin-left:10px;padding:1px 8px;background:#1d2a6d;color:#ffd23f;font:900 10px Consolas,monospace;letter-spacing:.18em;font-style:normal}
#dojo.ui-B #dj-title{position:absolute;top:8px;left:12px;background:#ffd23f;color:#1d2a6d;border:3px solid #1d2a6d;padding:2px 10px;font:900 18px Arial;letter-spacing:.04em;transform:rotate(-1.5deg);box-shadow:3px 3px 0 #1d2a6d}
#dojo.ui-B #dj-ctl{counter-reset:rw}#dojo.ui-B #dj-ctl .row{counter-increment:rw}
#dojo.ui-B #dj-ctl label{min-width:104px;font:900 11px Consolas,monospace;letter-spacing:.08em}
#dojo.ui-B #dj-ctl label::before{content:counter(rw);display:inline-block;width:15px;height:15px;line-height:12px;margin-right:6px;text-align:center;border:2px solid #1d2a6d;border-radius:50%;font:900 9px Consolas,monospace}
#dojo.ui-B .val{background:#1d2a6d;color:#ffd23f;padding:1px 6px;font-family:Consolas,monospace;min-width:62px}
#dojo.ui-B input[type=range]{-webkit-appearance:none;appearance:none;height:24px;background:linear-gradient(#1d2a6d,#1d2a6d) 0 50%/100% 3px no-repeat,repeating-linear-gradient(90deg,#1d2a6d 0 2px,transparent 2px 12px) 0 100%/100% 6px no-repeat;outline:none}
#dojo.ui-B input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:15px;height:24px;background:#ffd23f;border:3px solid #1d2a6d;border-radius:2px;box-shadow:2px 2px 0 #ff5a3c}
#dojo.ui-B #dj-skins button{background:#fff;color:#1d2a6d;border:2px solid #1d2a6d;font-weight:900}
#dojo.ui-B #dj-skins button.on{background:#1d2a6d;color:#fff}
#dojo.ui-B #dj-verdict{font:900 italic 30px/1.05 'Arial Black',Impact,Arial;color:#fff;background:#1d2a6d;padding:16px 20px;margin:2px 0 6px;text-shadow:3px 3px 0 #ff5a3c;min-height:64px;display:flex;align-items:center;justify-content:center;text-align:center;clip-path:polygon(0% 14%,5% 0%,13% 10%,23% 0%,33% 9%,45% 0%,55% 10%,67% 0%,77% 9%,89% 0%,96% 12%,100% 40%,96% 60%,100% 84%,92% 100%,80% 90%,68% 100%,56% 91%,44% 100%,32% 90%,20% 100%,10% 90%,0% 100%,4% 60%,0% 40%)}
#dojo.ui-B #dj-fig{display:block;margin:4px 0 6px;border:2px solid #1d2a6d;background:#fff}
#dojo.ui-B #dj-fig figcaption{font:700 9px Consolas,monospace;letter-spacing:.14em;padding:1px 6px;background:#1d2a6d;color:#fff}
#dojo.ui-B #dj-fig svg{display:block;width:100%;height:auto}
#dojo.ui-B #dj-nums div{font:700 12px Consolas,monospace;border-bottom:1px dotted #1d2a6d55}
#dojo.ui-B #dj-nums i{display:inline-block;width:14px;height:14px;line-height:11px;margin-right:6px;text-align:center;font:900 9px Consolas,monospace;font-style:normal;border:2px solid #1d2a6d;border-radius:50%}
#dojo.ui-B #dj-note{font:700 8.5px/1.3 Consolas,monospace;letter-spacing:.06em;text-transform:uppercase;opacity:.75;border-top:2px solid #1d2a6d;padding-top:4px}
#dj-verdict .beat{display:inline-block;animation:beatPop .38s cubic-bezier(.2,1.6,.4,1) both}
#dojo.ui-B #dj-verdict.st-wait{background:#1d2a6d;color:#fff;text-shadow:none}
#dojo.ui-B #dj-verdict.st-gone{background:#ff5a3c;color:#fff;text-shadow:3px 3px 0 #1d2a6d}
#dojo.ui-B #dj-verdict.st-nuke{background:#e52911;color:#ffd23f;text-shadow:3px 3px 0 #1d2a6d;animation:nuke .14s linear infinite}
#dojo.ui-B #dj-verdict.st-splash{background:#0aa8d6;color:#fff;text-shadow:3px 3px 0 #0d2b4a;animation:wave 1.3s ease-in-out infinite}
#dojo.ui-B #dj-verdict.st-scraper{background:#ffd23f;color:#1d2a6d;text-shadow:3px 3px 0 #fff;animation:scrape .09s linear 6}
#dojo.ui-B #dj-verdict.st-wall{background:#9a5a48;color:#fff;text-shadow:3px 3px 0 #1d2a6d;animation:thud .5s cubic-bezier(.3,1.4,.5,1) both}
#dojo.ui-B #dj-verdict.st-close{background:#b9bdc6;color:#1d2a6d;text-shadow:3px 3px 0 #fff;animation:shiver .12s linear 8}
#dojo.ui-B #dj-verdict.st-play{background:#7fe3d4;color:#1d2a6d;text-shadow:3px 3px 0 #fff}
#dojo.ui-B #dj-verdict.st-foul{background:#c4c4c4;color:#1d2a6d;text-shadow:3px 3px 0 #fff;transform:skewX(-8deg)}
@keyframes beatPop{0%{transform:scale(.3) rotate(-7deg);opacity:0}60%{transform:scale(1.2) rotate(2deg);opacity:1}100%{transform:scale(1) rotate(0)}}
@keyframes nuke{0%{transform:translate(2px,-2px) scale(1.04)}25%{transform:translate(-3px,1px) scale(1)}50%{transform:translate(2px,2px) scale(1.05)}75%{transform:translate(-2px,-1px) scale(1)}100%{transform:translate(2px,-2px) scale(1.04)}}
@keyframes wave{0%,100%{transform:skewX(-6deg) translateY(0)}50%{transform:skewX(6deg) translateY(-4px)}}
@keyframes scrape{0%{transform:translateX(-2px)}50%{transform:translateX(2px)}100%{transform:translateX(-2px)}}
@keyframes thud{0%{transform:translateY(-22px) scale(1.2)}35%{transform:translateY(7px) scale(.97)}65%{transform:translateY(-3px)}100%{transform:none}}
@keyframes shiver{0%{transform:rotate(-1.4deg)}50%{transform:rotate(1.4deg)}100%{transform:rotate(-1.4deg)}}
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
${NN.real && Q.get('vibes') ? '<div id="dj-vibe"><span id="dj-vibename"></span>' + [1, 2, 3, 4, 5].map((n) => `<button data-v="${n}">${n}</button>`).join('') + '</div>' : ''}
<div id="dj-ctl"></div>
<div id="dj-out"><div class="tape"><i>VERDICT PLATE 02</i></div><div id="dj-state"></div><div id="dj-verdict"></div><div id="dj-sub"></div><figure id="dj-fig"><figcaption>FIG. 1  FLIGHT, SIDE ELEVATION</figcaption><div id="dj-svg"></div></figure><div id="dj-nums"></div><div id="dj-note"></div></div>`
document.body.appendChild(root)
const ctl = document.getElementById('dj-ctl')
const sliders = [
  ['ev', 'Exit speed', 60, 125, 1, (v) => `${v} mph`], ['la', 'Launch angle', -10, 60, 1, (v) => `${v}°`],
  ['dir', 'Direction', -50, 50, 1, (v) => (v < -5 ? `${-v}° LF` : v > 5 ? `${v}° RF` : 'CF')],
  ['temp', 'Temperature', 40, 100, 1, (v) => `${v}°F`], ['wind', 'What-if wind', -20, 20, 1, (v) => (v === 0 ? 'calm' : `${Math.abs(v)} mph ${v > 0 ? 'out' : 'in'}`)],
]
ctl.innerHTML = '<div class="tape"><i>CONTROL PANEL 01</i></div>' + sliders.map(([k, l, lo, hi, st]) => `<div class="row"><label>${l}</label><input type="range" id="s-${k}" min="${lo}" max="${hi}" step="${st}"><span class="val" id="v-${k}"></span></div>`).join('') +
  `<div class="row"><label>Batter</label><button id="hand" style="padding:3px 10px"></button></div>`

const svgEl = (tag, attrs, text) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}>${text ?? ''}</${tag}>`
function schematic(res) {
  const W = 300, H = 128, x0 = 26, x1 = 290, yB = 106, yT = 14
  const src = res.visPath ?? res.path
  const pr = src.map((q) => [Math.hypot(q.p[0], q.p[1]) / FT, q.p[2] / FT])
  const v = res.verdict
  const xmax = Math.max(pr[pr.length - 1][0], (v.wallFt ?? 0) + 30, 150) * 1.05
  const ymax = Math.max(res.peakFt * 1.15, (v.wallH ?? 0) + 14, 40)
  const X = (r) => x0 + (r / xmax) * (x1 - x0), Y = (h) => yB - (Math.max(h, -4) / ymax) * (yB - yT)
  const ink = '#1d2a6d', accent = '#ff5a3c'
  let g = svgEl('rect', { x: 0, y: 0, width: W, height: H, fill: '#fff' })
  for (let r = 100; r < xmax; r += 100) g += svgEl('line', { x1: X(r), x2: X(r), y1: yT - 6, y2: yB, stroke: ink, 'stroke-opacity': 0.18, 'stroke-dasharray': '2 3' }) + svgEl('text', { x: X(r), y: yB + 11, 'text-anchor': 'middle', 'font-size': 7, fill: ink, 'font-family': 'Consolas,monospace' }, `${r}`)
  g += svgEl('line', { x1: x0 - 4, x2: x1 + 4, y1: yB, y2: yB, stroke: ink, 'stroke-width': 2 })
  if (v.wallFt) { // wall: hatched block at its distance and height
    const wx = X(v.wallFt), wh = (v.wallH / ymax) * (yB - yT)
    g += svgEl('rect', { x: wx - 2.5, y: yB - wh, width: 5, height: wh, fill: accent, stroke: ink, 'stroke-width': 1.5 })
    g += svgEl('line', { x1: wx + 8, x2: wx + 8, y1: yB, y2: yB - wh, stroke: ink, 'stroke-width': 1 }) + svgEl('line', { x1: wx + 5, x2: wx + 11, y1: yB - wh, y2: yB - wh, stroke: ink }) + svgEl('line', { x1: wx + 5, x2: wx + 11, y1: yB, y2: yB, stroke: ink })
    const left = wx > W - 92
    g += svgEl('text', { x: left ? wx - 6 : wx + 13, y: yB - wh - 5, 'text-anchor': left ? 'end' : 'start', 'font-size': 8, 'font-weight': 900, fill: ink, 'font-family': 'Consolas,monospace' }, `C ${Math.round(v.wallFt)} FT / ${v.wallH.toFixed(0)} FT`)
  }
  const d = pr.filter((_, i) => i % 3 === 0).map(([r, h], i) => `${i ? 'L' : 'M'}${X(r).toFixed(1)} ${Y(h).toFixed(1)}`).join(' ')
  g += svgEl('path', { d, fill: 'none', stroke: ink, 'stroke-width': 5, 'stroke-linecap': 'round' }) + svgEl('path', { d, fill: 'none', stroke: '#ffd23f', 'stroke-width': 2.4, 'stroke-linecap': 'round' })
  let ap = 0
  pr.forEach(([, h], i) => { if (h > pr[ap][1]) ap = i })
  const [ar, ah] = pr[ap]
  g += svgEl('line', { x1: X(ar), x2: X(ar), y1: yB, y2: Y(ah), stroke: ink, 'stroke-dasharray': '3 2' }) + svgEl('circle', { cx: X(ar), cy: Y(ah), r: 3, fill: '#fff', stroke: ink, 'stroke-width': 2 })
  g += svgEl('text', { x: X(ar) + 5, y: Y(ah) - 3, 'font-size': 8, 'font-weight': 900, fill: ink, 'font-family': 'Consolas,monospace' }, `B ${Math.round(res.peakFt)} FT`)
  const la = (state.la * Math.PI) / 180, R = 20
  g += svgEl('path', { d: `M${x0 + R} ${yB} A${R} ${R} 0 0 0 ${x0 + R * Math.cos(la)} ${yB - R * Math.sin(la)}`, fill: 'none', stroke: accent, 'stroke-width': 2 })
  g += svgEl('text', { x: x0 + R + 4, y: yB - 4, 'font-size': 8, 'font-weight': 900, fill: accent, 'font-family': 'Consolas,monospace' }, `A ${state.la}°`)
  const [lr] = pr[pr.length - 1]
  g += svgEl('path', { d: `M${X(lr) - 4} ${yB - 4} L${X(lr) + 4} ${yB + 4} M${X(lr) + 4} ${yB - 4} L${X(lr) - 4} ${yB + 4}`, stroke: accent, 'stroke-width': 2.4 })
  g += svgEl('text', { x: Math.min(X(lr), x1 - 30), y: yB + 21, 'font-size': 8, 'font-weight': 900, fill: ink, 'font-family': 'Consolas,monospace' }, `D ${Math.round(res.landFt)} FT`)
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${g}</svg>`
}
function render(res) {
  const v = res.verdict
  const rows = [['A', 'Launch', `${state.ev} mph, ${state.la}°`], ['D', 'Distance', `${Math.round(res.landFt)} ft`], ['B', 'Peak height', `${Math.round(res.peakFt)} ft`], ['', 'Hang time', `${res.hang.toFixed(1)} s`]]
  if (v.wallFt) rows.push(['C', 'Wall there', `${Math.round(v.wallFt)} ft, ${v.wallH.toFixed(0)} ft tall`], ['', 'Height at wall', `${v.cross.toFixed(0)} ft`])
  if (v.kind === 'GONE') rows.push(['', 'Cleared by', `${v.clearBy.toFixed(0)} ft`])
  if (v.kind === 'WALL') rows.push(['', 'Short by', `${v.short.toFixed(0)} ft`])
  rows.push(['', 'Back / sidespin', `${Math.round(res.wb)} / ${Math.round(res.ws)} rpm`], ['', 'Air density', `${res.rho.toFixed(3)} kg/m³`])
  document.getElementById('dj-nums').innerHTML = rows.map(([k, a, b]) => `<div><span>${k ? `<i>${k}</i>` : ''}${a}</span><b>${b}</b></div>`).join('')
  document.getElementById('dj-svg').innerHTML = schematic(res)
  document.getElementById('dj-note').textContent = 'Prediction. Spin is a typical-ball estimate; wall from the park model (right-center height assumed); wind is what-if only.'
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
  if (NN.real && Q.get('vibes')) {
    document.getElementById('dj-vibename').textContent = `${NN.vibe()} ${NN.VIBES[NN.vibe()].name}`
    for (const b of root.querySelectorAll('#dj-vibe button')) b.classList.toggle('on', Number(b.dataset.v) === NN.vibe())
  }
  const res = fly(state)
  if (NN.real && NN.stadium && res.verdict.wallFt && (res.verdict.kind === 'GONE' || res.verdict.kind === 'FOUL')) { // follow it past the wall to the seats, street or water
    const ext = fly(state, { floor: -8 })
    res.landing = findLanding(NN, ext.path, toWorld)
    res.visPath = ext.path.slice(0, res.landing.index + 1)
  }
  res.key = classify(res, state, res.landing?.kind === 'SPLASH' ? 'SPLASH' : null, wallDistAt(res.landB))
  draw(res)
  render(res)
  window.__dojo = res
  window.__seanceRefresh?.()
}
window.__dojoProbe = (o) => { // classify a swing without drawing it (for tuning the demo cases)
  const st = { ...state, ...o }, res = fly(st)
  let landing = null
  if (NN.real && NN.stadium && res.verdict.wallFt && (res.verdict.kind === 'GONE' || res.verdict.kind === 'FOUL')) landing = findLanding(NN, fly(st, { floor: -8 }).path, toWorld)
  return { key: classify(res, st, landing?.kind === 'SPLASH' ? 'SPLASH' : null, wallDistAt(res.landB)), ft: Math.round(res.landFt), clear: res.verdict.clearBy, short: res.verdict.short, land: landing?.kind, at: landing && [landing.point.x, landing.point.y, landing.point.z].map((v) => +v.toFixed(1)), idx: landing?.index }
}
ctl.addEventListener('input', (e) => { if (e.target.id?.startsWith('s-')) { state[e.target.id.slice(2)] = Number(e.target.value); update() } })
document.getElementById('hand').addEventListener('click', () => { state.hand *= -1; update() })
for (const b of root.querySelectorAll('#dj-skins button')) b.addEventListener('click', () => { state.ui = b.dataset.ui; update() })
for (const b of root.querySelectorAll('#dj-vibe button')) b.addEventListener('click', () => NN.setVibe(Number(b.dataset.v)))
addEventListener('nn-vibe', () => { if (window.__dojoReady) update() })
addEventListener('nn-stadium', () => { if (window.__dojoReady) update() }) // the park model arrives after the wall data: redo the landing once it is here
addEventListener('keydown', (e) => { if (NN.real && Q.get('vibes') && '12345'.includes(e.key) && e.target.tagName !== 'INPUT') NN.setVibe(Number(e.key)) })

fetch('/oracle_wall.json').then((r) => r.json()).then((w) => { wall = w; update(); tick(); fx = initFx(NN); window.__fx = fx; window.__krab = initKrab(NN, { wallDistM: (bd) => wallDistAt(bd) * FT }); initSeance({ NN, state, fly, toWorld, colors }); update(); window.__dojoReady = true })
