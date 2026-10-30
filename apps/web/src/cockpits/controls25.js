// Study 25 dojo controls in the park (30 Oct, Andrew: "for dinger dojo I feel like launch angle I want to be able to drag an actual angle and directions the same
// thing... semi-diegetic sliders or controls"; he took LA1, DR1 and EV1, and the wind rose came with the real wind):
//   SPRAY FAN (direction): ticks every 5 degrees from line to line just past the infield dirt, the aim line out from the plate; drag its end to aim
//   PROTRACTOR (launch angle): a voxel half-dial standing beside the plate, turned to the camera; drag the launch ray up or down
//   SLINGSHOT (exit velocity): a ball in a voxel slingshot just behind the plate; pull it back, the farther the harder, off to one side to aim the other way;
//   let go and it swings (a short tug only sets the numbers)
//   WIND ROSE (wind): a ring around second base with an arrow the way the air goes, as long as it is strong; drag the tip, double-click it for calm
// The typed boxes and the slider stay; these set the same numbers through o.set. A grab takes the pointer from the camera until it lets go. Sizes grow with the
// camera's distance so the handles stay grabbable from the broadcast seat.
import { voxText } from './vox25.js'
const FT = 0.3048, RAD = Math.PI / 180
export function initControls25(api, o = {}) {
  const { THREE, scene, camera } = api.NN
  const toWorld = window.__cp.toWorld, cube = new THREE.BoxGeometry(1, 1, 1), d = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0)
  const C = { acc: o.acc ?? '#f0802a', tx: o.tx ?? '#e8e1c9', dim: o.dim ?? '#8a8f99' }
  const mats = {}, mat = (c) => (mats[c] ??= new THREE.MeshBasicMaterial({ color: c, fog: false }))
  const g = new THREE.Group(); g.visible = false; scene.add(g)
  const H0 = toWorld([0, 0, 0]), F = (x, y, z) => toWorld([x, y, z])
  const pool = (n, color, parent = g) => { const m = new THREE.InstancedMesh(cube, mat(color), n); m.count = 0; m.frustumCulled = false; parent.add(m); return m }
  const fill = (m, pts) => { m.count = Math.min(pts.length, m.instanceMatrix.count); for (let i = 0; i < m.count; i++) { const p = pts[i]; d.position.set(p[0], p[1], p[2]); d.scale.setScalar(p[3]); d.updateMatrix(); m.setMatrixAt(i, d.matrix) } m.instanceMatrix.needsUpdate = true }
  let k = 1, st = { ev: 103, la: 28, dir: 0, wind: 0, xwind: 0 }, drag = null, pull = null
  // ---- the spray fan ----
  const R1 = 50, R2 = 62
  const fanTicks = pool(400, C.dim), aimLine = pool(80, C.acc), aimEnd = pool(1, C.acc)
  const along = (b, r, z = 0.25) => F(Math.sin(b * RAD) * r, Math.cos(b * RAD) * r, z)
  function paintFan() {
    const pts = []
    for (let b = -45; b <= 45; b += 5) { const long = b % 15 === 0; for (let r = R1; r <= R1 + (long ? 5 : 2.4); r += 0.8 * k) { const p = along(b, r); pts.push([p.x, p.y, p.z, (long ? 0.7 : 0.45) * k]) } }
    fill(fanTicks, pts)
    const line = []
    for (let r = 4; r < R2 - 1; r += 1.6 * k) { const p = along(st.dir, r); line.push([p.x, p.y, p.z, 0.45 * k]) }
    fill(aimLine, line)
    const e = along(st.dir, R2, 1.2 * k); fill(aimEnd, [[e.x, e.y, e.z, 2.4 * k]])
  }
  // ---- the protractor: its own group beside the plate, turned to face the camera every frame ----
  const prot = new THREE.Group(); prot.position.copy(F(9, -3, 0)); g.add(prot) // in foul ground on the first-base side
  const RP = 12, protTicks = pool(120, C.tx, prot), protRay = pool(40, C.acc, prot), protEnd = pool(1, C.acc, prot)
  function paintProt() {
    const pts = []
    for (let a = -10; a <= 60; a += 5) { const long = a % 15 === 0; for (let r = RP - (long ? 2.6 : 1.3); r <= RP; r += 0.5) pts.push([Math.cos(a * RAD) * r, Math.sin(a * RAD) * r, 0, long ? 0.6 : 0.42]) }
    for (let x = 0; x <= RP + 1; x += 0.6) pts.push([x, 0, 0, 0.32]) // the level line
    fill(protTicks, pts)
    const ray = []
    for (let r = 0.8; r <= RP + 1; r += 0.7) ray.push([Math.cos(st.la * RAD) * r, Math.sin(st.la * RAD) * r, 0, 0.55])
    fill(protRay, ray)
    fill(protEnd, [[Math.cos(st.la * RAD) * (RP + 2), Math.sin(st.la * RAD) * (RP + 2), 0, 2]])
  }
  // ---- the slingshot: a fork of two posts behind the plate, two bands to the ball; its own group, scaled with the camera like the protractor ----
  const sg = new THREE.Group(); sg.position.copy(F(0, -5, 0)); g.add(sg)
  const L = (x, y, z) => new THREE.Vector3(x, z, -y) // the plate frame inside the group: x right, y toward center field, z up
  const REST = [0, 0, 1.5], sling = pool(60, '#a8703f', sg), band = pool(60, C.tx, sg), ballH = pool(1, '#f4f2ea', sg)
  const ballLocal = () => { const p = pull ?? [0, 0]; return L(REST[0] + p[0], REST[1] + p[1], REST[2]) }
  const ballAt = () => sg.localToWorld(ballLocal())
  function paintSling() {
    const pts = [], q = (x, y, z, s) => { const p = L(x, y, z); pts.push([p.x, p.y, p.z, s]) }
    for (const s of [-1, 1]) for (let z = 1.2; z <= 2.4; z += 0.3) q(s * (0.6 + (z - 1.2) * 0.4), 0, z, 0.32)
    for (let z = 0; z <= 1.2; z += 0.3) q(0, 0, z, 0.36)
    fill(sling, pts)
    const b = ballLocal(), bl = []
    for (const s of [-1, 1]) { const a = L(s * 1.08, 0, 2.4); for (let t = 0; t <= 1; t += 0.1) bl.push([a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t, 0.16]) }
    fill(band, bl)
    fill(ballH, [[b.x, b.y, b.z, 0.8]])
  }
  // ---- the wind rose around second base ----
  const C2 = F(0, 90 * FT * Math.SQRT2, 0), RW = 10, rose = pool(80, C.tx), arrow = pool(60, '#6da7de'), windEnd = pool(1, '#6da7de')
  const windTip = () => { const m = Math.hypot(st.wind, st.xwind), r = (Math.min(25, m) / 25) * RW * k; if (!m) return C2.clone().setY(C2.y + 0.4); return new THREE.Vector3(C2.x + (st.xwind / m) * r, C2.y + 0.4, C2.z - (st.wind / m) * r) }
  function paintRose() {
    const pts = []
    for (let a = 0; a < 360; a += 10) pts.push([C2.x + Math.sin(a * RAD) * RW * k, C2.y + 0.25, C2.z - Math.cos(a * RAD) * RW * k, (a % 90 === 0 ? 0.9 : 0.5) * k])
    fill(rose, pts)
    const t = windTip(), ar = []
    for (let f = 0.08; f < 1; f += 0.08) ar.push([C2.x + (t.x - C2.x) * f, C2.y + 0.4, C2.z + (t.z - C2.z) * f, 0.4 * k])
    fill(arrow, ar)
    fill(windEnd, [[t.x, t.y, t.z, 1.6 * k]])
  }
  // the value while a handle is held, over the handle
  const tagG = new THREE.Group(); g.add(tagG)
  let tagTxt = ''
  function showTag(txt, at) {
    if (txt !== tagTxt) { tagTxt = txt; tagG.clear(); if (txt) tagG.add(voxText(THREE, txt, { px: 0.3, color: C.acc, back: '#141414' })) }
    if (!txt) return
    tagG.position.copy(at).add(new THREE.Vector3(0, 3.2 * k, 0)); tagG.scale.setScalar(k)
    tagG.rotation.y = Math.atan2(camera.position.x - tagG.position.x, camera.position.z - tagG.position.z)
  }
  const paint = () => { paintFan(); paintProt(); paintSling(); paintRose() }
  paint()
  api.NN.frames.push(() => {
    if (!g.visible) return
    const nk = Math.min(3, Math.max(0.7, camera.position.distanceTo(H0) / 110))
    if (Math.abs(nk - k) > k * 0.04) { k = nk; paint() }
    prot.scale.setScalar(k); sg.scale.setScalar(k * 1.6); prot.rotation.y = Math.atan2(camera.position.x - prot.position.x, camera.position.z - prot.position.z) // facing the camera, its level line runs to the camera's right
    if (drag) showTag(tagFor(drag.k), handleAt(drag.k))
  })
  // ---- picking ----
  const canvas = api.NN.renderer?.domElement ?? document.querySelector('canvas')
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), v = new THREE.Vector3()
  const aim = (e) => { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera) }
  const onPlane = (n, p) => ray.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(n, p), new THREE.Vector3())
  const screen = (p) => { v.copy(p).project(camera); const r = canvas.getBoundingClientRect(); return [((v.x + 1) / 2) * r.width + r.left, ((1 - v.y) / 2) * r.height + r.top, v.z] }
  const protEndAt = () => prot.localToWorld(new THREE.Vector3(Math.cos(st.la * RAD) * (RP + 2), Math.sin(st.la * RAD) * (RP + 2), 0))
  const handleAt = (kk) => (kk === 'dir' ? along(st.dir, R2, 1.2 * k) : kk === 'la' ? protEndAt() : kk === 'ev' ? ballAt() : windTip())
  function grabAt(e) {
    if (!g.visible || (o.enabled && !o.enabled())) return null
    let best = null, bd = 30
    for (const kk of ['ev', 'la', 'dir', 'wind']) { const [x, y, z] = screen(handleAt(kk)); if (z > 1) continue; const dd = Math.hypot(x - e.clientX, y - e.clientY); if (dd < bd) { bd = dd; best = kk } }
    return best
  }
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
  const words = o.words ?? {}
  function tagFor(kk) {
    if (kk === 'dir') return words.dir ? words.dir(st.dir) : `${st.dir}°`
    if (kk === 'la') return `${st.la}°`
    if (kk === 'ev') return `${st.ev} MPH`
    const m = Math.round(Math.hypot(st.wind, st.xwind))
    return m ? `${m} MPH ${st.wind >= 0 ? 'OUT' : 'IN'}${Math.abs(st.xwind) >= 1 ? (st.xwind > 0 ? ' TO RIGHT' : ' TO LEFT') : ''}` : 'CALM'
  }
  function move(e) {
    aim(e)
    const ch = {}
    if (drag.k === 'dir') { const p = onPlane(up, H0); if (!p) return; const b = Math.atan2(p.x - H0.x, -(p.z - H0.z)) / RAD; ch.dir = clamp(Math.round(b), -50, 50) }
    else if (drag.k === 'la') { const n = camera.position.clone().sub(prot.position).setY(0).normalize(), p = onPlane(n, prot.position); if (!p) return; const l = prot.worldToLocal(p.clone()); ch.la = clamp(Math.round(Math.atan2(l.y, Math.max(0.01, l.x)) / RAD), -10, 60) }
    else if (drag.k === 'ev') {
      const rest = sg.localToWorld(L(...REST)), p = onPlane(up, rest); if (!p) return
      const s1 = k * 1.6, fx = (p.x - rest.x) / s1, fy = -(p.z - rest.z) / s1, back = clamp(-fy, 0, 6) // in the slingshot's own meters
      pull = [clamp(fx, -4, 4), -back]
      ch.ev = Math.round(60 + (back / 6) * 65)
      if (back > 0.5) ch.dir = clamp(Math.round(Math.atan2(-fx, back) / RAD), -50, 50)
      paintSling()
    } else {
      const p = onPlane(up, C2); if (!p) return
      const fx = p.x - C2.x, fy = -(p.z - C2.z), len = Math.hypot(fx, fy), mph = clamp(Math.round((len / (RW * k)) * 25), 0, 25)
      ch.wind = mph ? clamp(Math.round((mph * fy) / len), -20, 20) : 0; ch.xwind = mph ? clamp(Math.round((mph * fx) / len), -20, 20) : 0
    }
    const diff = Object.keys(ch).some((kk) => ch[kk] !== st[kk])
    Object.assign(st, ch)
    if (diff) { o.set?.(ch); paint() }
  }
  canvas?.addEventListener('pointerdown', (e) => {
    const kk = e.button === 0 ? grabAt(e) : null
    if (!kk) return
    e.stopImmediatePropagation(); e.preventDefault()
    drag = { k: kk }; if (api.NN.controls) api.NN.controls.enabled = false
    try { canvas.setPointerCapture(e.pointerId) } catch {}
    canvas.style.cursor = 'grabbing'; o.sound?.('pick')
    move(e)
  }, true)
  canvas?.addEventListener('pointermove', (e) => {
    if (!drag) { if (g.visible) canvas.style.cursor = grabAt(e) ? 'grab' : ''; return }
    e.stopImmediatePropagation(); move(e)
  }, true)
  const end = (e) => {
    if (!drag) return
    e.stopImmediatePropagation()
    const was = drag.k, tugged = pull && -pull[1] > 0.8
    drag = null; pull = null; if (api.NN.controls) api.NN.controls.enabled = true
    canvas.style.cursor = ''; showTag('', null); paintSling()
    if (was === 'ev' && tugged) o.fire?.() // let go of the slingshot: it swings
  }
  canvas?.addEventListener('pointerup', end, true)
  canvas?.addEventListener('pointercancel', end, true)
  canvas?.addEventListener('dblclick', (e) => { if (grabAt(e) !== 'wind') return; e.stopImmediatePropagation(); st.wind = 0; st.xwind = 0; o.set?.({ wind: 0, xwind: 0 }); paint() }, true)
  return {
    group: g,
    set visible(v) { g.visible = v; if (!v && drag) { drag = null; pull = null; if (api.NN.controls) api.NN.controls.enabled = true; showTag('', null) } },
    get visible() { return g.visible },
    // the numbers from the state (after a typed number, a slider, a new ball)
    sync(s) { const n = { ev: Math.round(s.ev), la: Math.round(s.la), dir: Math.round(s.dir), wind: s.wind ?? 0, xwind: s.xwind ?? 0 }; if (Object.keys(n).every((kk) => n[kk] === st[kk])) return; st = n; paint() },
    // for the tests: where each handle is on screen, and a drag from one to a point
    handles: () => Object.fromEntries(['ev', 'la', 'dir', 'wind'].map((kk) => [kk, screen(handleAt(kk)).slice(0, 2)])),
    dragging: () => drag?.k ?? null,
  }
}
