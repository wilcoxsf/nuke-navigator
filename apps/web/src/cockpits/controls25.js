// Study 25 dojo controls in the park (30 Oct, Andrew: "for dinger dojo I feel like launch angle I want to be able to drag an actual angle and directions the same
// thing... semi-diegetic sliders or controls"; he took LA1, DR1 and EV1, and the wind rose came with the real wind):
//   SPRAY FAN (direction): ticks every 5 degrees from line to line just past the infield dirt, the aim line out from the plate; drag its end to aim
//   PROTRACTOR (launch angle): a voxel half-dial standing beside the plate, turned to the camera; drag the launch ray up or down
//   SLINGSHOT (exit velocity): a ball in a voxel slingshot just behind the plate; pull it back, the farther the harder, off to one side to aim the other way;
//   let go and it swings (a short tug only sets the numbers)
//   WINDSOCK (wind; 30 Oct, later, Andrew: the wind rose "lags insanely - maybe we make it a wind sock on the mound?"): a pole on the mound and an orange-and-white
//   sock off the top of it, blowing the way the air goes and standing out as far as it is strong; drag the end of the sock, double-click it for calm
// 30 Oct, later (Andrew: "way too busy ... I really insanely dig this slingshot thing though is there a way to control launch angle with that too?"): the slingshot
// does it all. Pull the ball back for speed and off to one side to aim; grab the top of the fork and lean it back for a higher launch, forward for a lower one.
// The spray fan and the protractor are gone. Later still (his pick, option 1: "you can't really operate on all 3 dimensions at once well"): while the ball is
// held back, the scroll wheel or the up and down arrows set the launch angle (the fork leans with it), and the flight on the field updates as it changes.
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
  const along = (b, r, z = 0.25) => F(Math.sin(b * RAD) * r, Math.cos(b * RAD) * r, z)
  // ---- the slingshot: a fork of two posts behind the plate, two bands to the ball; its own group, scaled with the camera like the protractor ----
  const sg = new THREE.Group(); sg.position.copy(F(0, -5, 0)); g.add(sg)
  const L = (x, y, z) => new THREE.Vector3(x, z, -y) // the plate frame inside the group: x right, y toward center field, z up
  const REST = [0, 0, 1.5], sling = pool(60, '#a8703f', sg), band = pool(60, C.tx, sg), ballH = pool(1, '#f4f2ea', sg)
  const lean = () => ((st.la - 25) / 35) * 0.5 // the fork's lean back (radians) for the launch angle
  const tilt = (x, y, z) => { const a = lean(); return L(x, y - Math.sin(a) * z, Math.cos(a) * z) } // a point of the fork, leaned about its foot
  const ballLocal = () => { const p = pull ?? [0, 0], r = tilt(REST[0], 0, REST[2]); return new THREE.Vector3(r.x + p[0], r.y, r.z - p[1]) }
  const forkTop = () => sg.localToWorld(tilt(0, 0, 2.9))
  const ballAt = () => sg.localToWorld(ballLocal())
  function paintSling() {
    const pts = [], q = (x, y, z, s) => { const p = L(x, y, z); pts.push([p.x, p.y, p.z, s]) }
    const qt = (x, y, z, s) => { const p = tilt(x, y, z); pts.push([p.x, p.y, p.z, s]) }
    for (const s of [-1, 1]) for (let z = 1.2; z <= 2.4; z += 0.3) qt(s * (0.6 + (z - 1.2) * 0.4), 0, z, 0.32)
    for (let z = 0; z <= 1.2; z += 0.3) qt(0, 0, z, 0.36)
    qt(0, 0, 2.9, 0.5) // the grip on top, for the lean
    fill(sling, pts)
    const b = ballLocal(), bl = []
    for (const s of [-1, 1]) { const a = tilt(s * 1.08, 0, 2.4); for (let t = 0; t <= 1; t += 0.1) bl.push([a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t, 0.16]) }
    fill(band, bl)
    fill(ballH, [[b.x, b.y, b.z, 0.8]])
  }
  // ---- the windsock on the mound: a pole, and the sock off its top, along the wind, its length the wind's strength ----
  const C2 = F(0, 59 * FT, 0), RW = 10, pole = pool(40, C.tx), sock = pool(120, '#f0802a'), sockW = pool(60, '#f4f2ea'), windEnd = pool(1, '#f0802a')
  const poleTop = () => C2.clone().setY(C2.y + 6 * k)
  const windTip = () => { const m = Math.hypot(st.wind, st.xwind), top = poleTop(), r = (0.25 + (Math.min(25, m) / 25) * 0.75) * RW * k; if (!m) return top.clone().add(new THREE.Vector3(0.6 * k, -r * 0.8, 0)); return new THREE.Vector3(top.x + (st.xwind / m) * r, top.y - (1 - Math.min(25, m) / 25) * r * 0.6, top.z - (st.wind / m) * r) }
  function paintSock() {
    const pts = []
    for (let y = 0; y <= 6; y += 0.5) pts.push([C2.x, C2.y + y * k, C2.z, 0.35 * k])
    fill(pole, pts)
    const top = poleTop(), tip = windTip(), o1 = [], o2 = []
    for (let f = 0; f <= 1; f += 0.05) { const x = top.x + (tip.x - top.x) * f, y = top.y + (tip.y - top.y) * f, z = top.z + (tip.z - top.z) * f, w = (1.3 - f * 0.7) * k; (Math.floor(f * 5) % 2 ? o2 : o1).push([x, y, z, w]) } // orange and white bands, narrowing
    fill(sock, o1); fill(sockW, o2)
    fill(windEnd, [[tip.x, tip.y, tip.z, 1.1 * k]])
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
  const paint = () => { paintSling(); paintSock() }
  paint()
  api.NN.frames.push(() => {
    if (!g.visible) return
    const nk = Math.min(3, Math.max(0.7, camera.position.distanceTo(H0) / 110))
    if (Math.abs(nk - k) > k * 0.04) { k = nk; paint() }
    sg.scale.setScalar(k * 1.6)
    if (drag) showTag(tagFor(drag.k), handleAt(drag.k))
  })
  // ---- picking ----
  const canvas = api.NN.renderer?.domElement ?? document.querySelector('canvas')
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), v = new THREE.Vector3()
  const aim = (e) => { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera) }
  const onPlane = (n, p) => ray.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(n, p), new THREE.Vector3())
  const screen = (p) => { v.copy(p).project(camera); const r = canvas.getBoundingClientRect(); return [((v.x + 1) / 2) * r.width + r.left, ((1 - v.y) / 2) * r.height + r.top, v.z] }
  const handleAt = (kk) => (kk === 'la' ? forkTop() : kk === 'ev' ? ballAt() : windTip())
  function grabAt(e) {
    if (!g.visible || (o.enabled && !o.enabled())) return null
    let best = null, bd = 30
    for (const kk of ['ev', 'la', 'wind']) { const [x, y, z] = screen(handleAt(kk)); if (z > 1) continue; const dd = Math.hypot(x - e.clientX, y - e.clientY); if (dd < bd) { bd = dd; best = kk } }
    return best
  }
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
  const words = o.words ?? {}
  function tagFor(kk) {
    if (kk === 'dir') return words.dir ? words.dir(st.dir) : `${st.dir}°`
    if (kk === 'la') return `${st.la}°`
    if (kk === 'ev') return `${st.ev} MPH ${st.la}° ${st.dir > 0 ? 'R' : st.dir < 0 ? 'L' : ''}${st.dir ? Math.abs(st.dir) : ''}`.trim()
    const m = Math.round(Math.hypot(st.wind, st.xwind))
    return m ? `${m} MPH ${st.wind >= 0 ? 'OUT' : 'IN'}${Math.abs(st.xwind) >= 1 ? (st.xwind > 0 ? ' TO RIGHT' : ' TO LEFT') : ''}` : 'CALM'
  }
  function move(e) {
    aim(e)
    const ch = {}
    if (drag.k === 'la') { // up the screen leans it back (higher), down leans it forward, from where the grab began
      const top = drag.top ?? (drag.top = forkTop()), n = camera.position.clone().sub(top).setY(0).normalize(), p = onPlane(n, top); if (!p) return
      drag.la0 ??= st.la; drag.y0 ??= p.y
      ch.la = clamp(Math.round(drag.la0 + ((p.y - drag.y0) / (k * 1.6)) * 14), -10, 60)
    }
    else if (drag.k === 'ev') {
      const rest = sg.localToWorld(L(...REST)), p = onPlane(up, rest); if (!p) return
      const s1 = k * 1.6, fx = (p.x - rest.x) / s1, fy = -(p.z - rest.z) / s1, back = clamp(-fy, 0, 6) // in the slingshot's own meters
      pull = [clamp(fx, -4, 4), -back]
      ch.ev = Math.round(60 + (back / 6) * 65)
      if (back > 0.5) ch.dir = clamp(Math.round(Math.atan2(-fx, back) / RAD), -50, 50)
      paintSling()
    } else {
      const top = poleTop(), p = onPlane(up, top); if (!p) return
      const fx = p.x - top.x, fy = -(p.z - top.z), len = Math.hypot(fx, fy), mph = clamp(Math.round((Math.max(0, len / (RW * k) - 0.25) / 0.75) * 25), 0, 25)
      ch.wind = mph ? clamp(Math.round((mph * fy) / len), -20, 20) : 0; ch.xwind = mph ? clamp(Math.round((mph * fx) / len), -20, 20) : 0
    }
    const diff = Object.keys(ch).some((kk) => ch[kk] !== st[kk])
    Object.assign(st, ch)
    if (diff) { paint(); pend = { ...pend, ...ch }; const now = performance.now(); if (now - sentAt > 120) flush() } // (30 Oct, later: the drag lagged; every change re-flew the ball)
  }
  let pend = null, sentAt = 0
  function flush() { if (!pend) return; const ch = pend; pend = null; sentAt = performance.now(); o.set?.(ch)
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
    drag = null; pull = null; if (api.NN.controls) api.NN.controls.enabled = true; flush()
    canvas.style.cursor = ''; showTag('', null); paintSling()
    if (was === 'ev' && tugged) o.fire?.() // let go of the slingshot: it swings
  }
  canvas?.addEventListener('pointerup', end, true)
  canvas?.addEventListener('pointercancel', end, true)
  // the launch angle while the ball is held: a wheel notch or an arrow is a degree (shift: five)
  const nudge = (d) => { st.la = clamp(st.la + d, -10, 60); paint(); pend = { ...pend, la: st.la }; if (performance.now() - sentAt > 120) flush() }
  canvas?.addEventListener('wheel', (e) => { if (drag?.k !== 'ev') return; e.preventDefault(); e.stopImmediatePropagation(); nudge((e.deltaY < 0 ? 1 : -1) * (e.shiftKey ? 5 : 1)) }, { capture: true, passive: false })
  addEventListener('keydown', (e) => { if (drag?.k !== 'ev' || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return; e.preventDefault(); e.stopImmediatePropagation(); nudge((e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 5 : 1)) }, true)
  canvas?.addEventListener('dblclick', (e) => { if (grabAt(e) !== 'wind') return; e.stopImmediatePropagation(); st.wind = 0; st.xwind = 0; o.set?.({ wind: 0, xwind: 0 }); paint() }, true)
  return {
    group: g,
    set visible(v) { g.visible = v; if (!v && drag) { drag = null; pull = null; if (api.NN.controls) api.NN.controls.enabled = true; showTag('', null) } },
    get visible() { return g.visible },
    // the numbers from the state (after a typed number, a slider, a new ball)
    sync(s) { const n = { ev: Math.round(s.ev), la: Math.round(s.la), dir: Math.round(s.dir), wind: s.wind ?? 0, xwind: s.xwind ?? 0 }; if (Object.keys(n).every((kk) => n[kk] === st[kk])) return; st = n; paint() },
    // for the tests: where each handle is on screen, and a drag from one to a point
    handles: () => Object.fromEntries(['ev', 'la', 'wind'].map((kk) => [kk, screen(handleAt(kk)).slice(0, 2)])),
    dragging: () => drag?.k ?? null,
  }
}
