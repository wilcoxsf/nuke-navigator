// Study 25 landing number (1 Nov, Andrew: "I don't want 'landed' feet then it should just say the ft as a hover number. But chunky voxel, above where it landed"):
// the distance alone, in voxel digits three cubes deep (the face in its color, the sides darker), facing the camera at a readable size (vox25.js keepReadable).
// 2 Nov (Andrew: "I want count up with the number counting up the whole time, grey or pitch color when not a HR and then orange once it clears the wall"): it rides
// from the crack, counting the feet the ball has gone, in the pitch color until the ball clears the wall, then the hot color (COUNT-UP COLOR: orange or the nuke's
// GEIGER); when the ball comes down it settles on the landing's feet, with a little pop. The motion is on an inner group so the placement and the pop never fight.
// Two places (LANDING NUMBER, LN, in the side menu; 2 Nov, later: "count up directly over the ball and count up where it lands over the destination"):
//   2 OVER THE BALL: it moves with the ball, the height counting too ("a counter for both height and distance if it's riding"), then settles over the spot
//   3 OVER THE SPOT: it waits over where the ball will come down and counts up there
// 2 Nov, later (Andrew: "it is not riding the ball"): keepReadable put a piece back on the spot it was made at every frame, so a ride moved nothing. Its base moves
// with it now, and while it flies it is fixed (it holds its place, the other tags step round it) instead of stepping aside or standing down.
// 2 Nov, night (Andrew, on a screengrab of a 484 sitting on the arc: "can't have that"; "can we get the number to take a dip and be like dripping wet when there's a
// splash hit? It would be fun if every once in a while the number went over too and had to tick back"):
//   CLEAR OF THE ARC: settled, it tries a few spots round the one in front of the landing and keeps the first whose box on the screen no part of the flight crosses
//   THE DIP: on a splash hit it comes down into the Cove, sinks to its middle, comes up wet (bluer) and dripping, and climbs out to its spot, drying as it goes
//   THE OVERSHOOT: about one landing in six it counts past the feet by a few and ticks back down
// 2 Nov, night (Andrew: "attention to detail things that make users say 'wow that's a nice touch' ... surprise me"):
//   GEIGER: past the wall the count-up ticks like a Geiger counter (o.geiger, a click every few feet, faster the farther it goes), and it pops once as it heats up
//   404: a 404 ft landing scrambles its digits for a moment before it settles     A CHIP: a 450 ft one knocks a cube off a digit, which tumbles down past the stake
//   TOUCH: settled, a click on it counts it up again. (3 Nov, Andrew: "The wiggling number not it": no wobble under the pointer)
// 3 Nov (Andrew: "The number cannot jump to a completely different spot when it lands - if anything it has to move slowly to a new area"): clear of the arc, it
// glides to its new spot over 1.6 s, its stake taken down while it goes and put up again when it gets there
import { VOX_FONT, voxCells, voxText, voxPost, keepReadable, readable } from './vox25.js'

export const LAND_LOOKS = [
  { c: 2, name: 'OVER THE BALL', desc: 'the count-up moves with the ball, its distance and its height, then settles over the spot where it came down' },
  { c: 3, name: 'OVER THE SPOT', desc: 'the count-up waits over the spot where the ball will come down, counting as it flies' },
]
// 2 Nov, later (Andrew, on a screengrab: "we can get it closer to the real landing location right?"): it settles 4 m over the spot, not 10, held there (it no longer
// steps aside for other pieces), with a dotted line in its color down to where the ball came down
// Home stretch (GPT red team III, A1 and A3: the number tangled with a Cove landing, its debris and the scoreboard): it settles 12 m toward the camera from the spot,
// so whatever happens at the landing is behind it. (Drawing it over the park with no depth test fails: the park's ink pass outlines what is behind it on top.)
// 3 Nov (Andrew: "I still don't like the dotted line behind the full distance number and the actual distance. I think we have that number closer to the actual spot it
// landed"): no stake; it settles 3 m in front of the spot and 3 m up, and its other spots are a short step away
const DEEP = 3, RIDE = 5, LIFT = 3, FRONT = 3 // a deep digit; how far over the ball it rides, how far up and toward the camera it settles (m)
const WET = '#5fd3ff' // the Cove's spray (fx25.js)
const live = new Set(), hover = new Set(), chips = []
let hooked = false
const shown = (g) => { for (let p = g; p; p = p.parent) if (!p.visible) return false; return true }
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u))

// one glyph's cells, three deep: the face at z 0, the sides behind it
function glyph(rows, face, side) {
  const out = []
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '#') for (let z = 0; z < DEEP; z++) out.push([i, 6 - j, -z, z === 0 ? face : side]) }))
  return out
}
export function voxDigits(THREE, text, px, face, side) {
  const g = new THREE.Group(), parts = []
  let x = 0
  for (const ch of String(text)) { const rows = VOX_FONT[ch] ?? VOX_FONT[' ']; parts.push({ ch, x, w: rows[0].length }); x += rows[0].length + 1 }
  const width = x - 1
  for (const p of parts) { const d = voxCells(THREE, glyph(VOX_FONT[p.ch] ?? VOX_FONT[' '], face, side), px); d.position.x = (p.x + p.w / 2 - width / 2) * px; g.add(d) } // centred on the whole number
  g.userData.width = width * px
  return g
}

// o: at (the landing spot, world), ft (the landing's feet), cool (its color before the wall), hot (after), gone (a home run), look, spot (counts over the spot),
// up (the height's color), avoid (world points the settled number keeps off on the screen: the flight), splash (a splash hit: THE DIP)
// the returned group's userData: ride(ft, pos, hot, upFt) while the ball flies (pos the ball, world; upFt its height, shown when riding), settle() when it comes down
export function landNumber(api, o) {
  const { THREE } = api.NN, ft = Math.round(o.ft), px = 1.1
  const C = (c) => new THREE.Color(c), dark = (c) => '#' + C(c).lerp(C('#000000'), 0.55).getHexString(), hex = (c) => '#' + C(c).getHexString()
  const wet = (c, k) => '#' + C(c).lerp(C(WET), k).getHexString()
  const outer = new THREE.Group(), inner = new THREE.Group()
  outer.add(inner)
  inner.rotation.y = -0.35 // turned a little off the camera, so the sides show and it reads as a block, not a sticker
  let num = null, key = '', upKey = '', upN = null, shownN = null
  const build = (n, color, up) => {
    const k = n + color, uk = up == null ? '' : String(up)
    if (k === key && uk === upKey) return
    if (num) inner.remove(num)
    key = k; upKey = uk; shownN = n
    num = voxDigits(THREE, n, px, hex(color), dark(color))
    const unit = voxText(THREE, 'FT', { px: px * 0.45, color: '#e8e1c9' }); unit.position.set(num.userData.width / 2 + px * 3, 0, 0); num.add(unit)
    // the height, a smaller line over the distance: its digits in the zenith post's color, FT HIGH in bone
    upN = null
    if (up != null) {
      const h = new THREE.Group(), d = voxDigits(THREE, up, px * 0.5, hex(o.up ?? '#e8e1c9'), dark(o.up ?? '#e8e1c9')), w = voxText(THREE, 'FT HIGH', { px: px * 0.3, color: '#e8e1c9' })
      d.position.x = -w.userData.width / 2 - px; w.position.x = d.userData.width / 2 + px * 0.5
      h.add(d, w); h.position.y = px * 9; num.add(h); upN = up
    }
    inner.add(num)
    if (outer.userData.read) outer.userData.read.box = null // its size changed: keepReadable measures it again
  }
  const place = (v) => { outer.position.copy(v); outer.userData.read?.base.copy(v) }
  const at = o.at.clone(), hotC = () => (o.gone ? o.hot : o.cool)
  let stake = null, plan = null
  const staked = (top) => {
    if (stake) { stake.parent?.remove(stake); stake = null }
    if (!outer.parent || !o.stake) return // (3 Nov: no stake unless asked for)
    stake = voxPost(THREE, at, top.clone().add(new THREE.Vector3(0, -0.4, 0)), { px: 0.35, gap: 0.8, color: hex(hotC()) }); stake.userData.stake = true; outer.parent.add(stake)
  }
  // the spots it may settle on: in front of the landing (toward the camera, a little up), then a step to either side, up, and both
  const spots = () => {
    const cam = api.NN.camera, toward = new THREE.Vector3(cam.position.x - at.x, 0, cam.position.z - at.z)
    const base = at.clone().addScaledVector(toward.lengthSq() > 1 ? toward.normalize() : toward, FRONT).add(new THREE.Vector3(0, LIFT, 0))
    const R = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion).setY(0).normalize(), U = new THREE.Vector3(0, 1, 0), d = Math.max(5, base.distanceTo(cam.position) * 0.035)
    // and further out over the field in front of the wall, clear of a board or a sign right behind the landing
    return [[0, 0], [1, 0], [-1, 0], [0, 1], [2, 0], [-2, 0], [1, 1], [-1, 1], [0, 2], [2, 1], [-2, 1]].map(([r, u]) => base.clone().addScaledVector(R, r * d * 1.4).addScaledVector(U, u * d))
      .concat([3, 6, 10].flatMap((k) => [0, 1, -1, 2, -2].map((r) => base.clone().addScaledVector(toward, FRONT * k).addScaledVector(R, r * d * 1.4))))
  }
  // how many of the flight's points fall inside the number's box on the screen (keepReadable's rect, -1..1 both ways); the scoreboard and the signs (the fixed pieces
  // that hold their place, prio 8 and up) count as a lot of points: 519 over a board that already says 519 FT is a tangle (2 Nov, night)
  const pv = new THREE.Vector3()
  const crossings = (r = outer.userData.read?.rect) => {
    if (!r) return null
    const mx = (r.x1 - r.x0) * 0.08, my = (r.y1 - r.y0) * 0.12
    let n = 0
    for (const p of o.avoid ?? []) { pv.copy(p).project(api.NN.camera); if (pv.z < 1 && pv.x > r.x0 - mx && pv.x < r.x1 + mx && pv.y > r.y0 - my && pv.y < r.y1 + my) n++ }
    for (const q of readable()) if (q.prio >= 8 && q.rect && !q.off && q.rect.x0 < r.x1 && q.rect.x1 > r.x0 && q.rect.y0 < r.y1 && q.rect.y1 > r.y0) n += 40
    return n
  }
  const settle = () => {
    if (outer.userData.settled) return
    const now = performance.now(), fixed = window.__fixedTime !== undefined
    const odds = window.__cpOverOdds ?? (navigator.webdriver ? 0 : 1 / 6)
    const overBy = !fixed && Math.random() < odds ? 3 + Math.floor(Math.random() * 9) : 0
    plan = { t0: now, list: spots(), i: 0, best: null, wait: 0, dip: !!o.splash && !fixed, overBy: ft === 404 ? 0 : overBy, ticked: 0, wetUntil: 0, glitch: ft === 404 && !fixed, chip: ft >= 450 && !fixed }
    outer.userData.settled = now
    if (plan.dip) { place(at.clone().add(new THREE.Vector3(0, LIFT, 0))); build(ft, hotC(), null); return } // THE DIP plays first (tick)
    place(plan.list[0]); build(ft + overBy, hotC(), null); staked(plan.list[0])
  }
  let heatT = 0, clickN = 0, gap = 6
  const geiger = (n, far) => { if (n - clickN < gap) return; clickN = n; gap = far ? 1 + Math.random() * 3 : 2 + Math.random() * 7; o.geiger?.() }
  const ride = (n, pos, hot, up) => {
    if (outer.userData.settled) return
    place(o.spot ? at.clone().add(new THREE.Vector3(0, LIFT, 0)) : pos.clone().add(new THREE.Vector3(0, RIDE, 0)))
    const m = Math.max(0, Math.round(n))
    if (hot && !heatT) { heatT = performance.now(); clickN = m }
    if (hot) geiger(m, m >= 430)
    build(m, hot ? o.hot : o.cool, o.spot || up == null ? null : Math.max(0, Math.round(up)))
  }
  ride(0, o.from ?? at, false, 0)
  outer.userData.isTag = true
  outer.userData.landNumber = { look: o.look ?? 2, ft }
  keepReadable(api, outer, 230, 0.45, 3, { prio: 2, fixed: true })
  const g = new THREE.Group()
  g.add(outer)
  g.userData.ride = ride
  g.userData.settle = settle
  // for the tests: the number, its color, the height it shows (null when none), and where it is in the world after the frame's placing; plan: the spot it took
  // (which of the tries), how many flight points its box still crosses, whether it dipped or overshot, and whether it is done moving
  g.userData.num = () => ({ n: Number(key.match(/^\d+/)?.[0]), color: key.replace(/^\d+/, ''), up: upN, settled: !!outer.userData.settled, pos: outer.getWorldPosition(new THREE.Vector3()), shown: shown(outer), spot: plan ? plan.i : null, cross: plan ? crossings() : null, dip: !!plan?.dip0, over: plan?.overBy ?? 0, done: !!plan?.done, drips: drips?.count ?? 0 })
  // the drips: small cubes falling off the bottom of the digits, in the number's own frame (so they scale with it)
  let drips = null
  const DR = 14, dripS = []
  const dripTick = (t, dt) => {
    if (!drips) { drips = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: WET, flatShading: true, fog: false }), DR); drips.frustumCulled = false; inner.add(drips); for (let i = 0; i < DR; i++) dripS.push({ x: 0, y: 0, v: 0, d: Math.random() * 0.8 }) }
    const w = (num?.userData.width ?? 10) * 0.9, m4 = new THREE.Matrix4(), on = t < 3.2
    let n = 0
    for (const d of dripS) {
      d.d -= dt
      if (d.d > 0) continue
      if (d.y < -px * 14 || d.v === 0) { if (!on) continue; d.x = (Math.random() - 0.5) * w; d.y = px * (Math.random() < 0.5 ? 0 : 1); d.v = -0.5; d.d = Math.random() * 0.25 }
      d.v -= 40 * dt; d.y += d.v * dt
      const s = px * (0.32 + 0.12 * (n % 3)); m4.makeScale(s, s * 1.5, s).setPosition(d.x, d.y, px * 0.5); drips.setMatrixAt(n++, m4)
    }
    drips.count = n; drips.instanceMatrix.needsUpdate = true
    return n > 0 || on
  }
  // the pop as it settles, then THE DIP, the hunt for a clear spot, the overshoot's tick back
  let lastT = 0
  outer.userData.tick = (now) => {
    const dt = Math.min(0.05, lastT ? (now - lastT) / 1000 : 0.016); lastT = now
    if (!shown(outer)) return
    if (!outer.userData.settled) { const h = heatT ? (now - heatT) / 1000 : 9; inner.scale.setScalar(h < 0.28 ? 1 + 0.18 * Math.sin((h / 0.28) * Math.PI) : 1); return }
    if (!plan) return
    const P = plan, t = (now - P.t0) / 1000
    if (P.dip) {
      P.dip0 = true
      // down into the water to its middle (0 to 0.45 s), under with a wobble (to 0.9), up wet (to 1.5), then over to its spot (to 2.3)
      const sc = outer.scale.x || 1, sink = LIFT + px * 3.5 * sc, top = at.clone().add(new THREE.Vector3(0, LIFT, 0))
      if (t < 0.45) place(top.clone().add(new THREE.Vector3(0, -sink * ease(t / 0.45), 0)))
      else if (t < 0.9) { place(top.clone().add(new THREE.Vector3(0, -sink + Math.sin(t * 18) * 0.3, 0))); if (!P.wetUntil) { P.wetUntil = now + 4200; build(ft, wet(hotC(), 0.55), null) } }
      else if (t < 1.5) place(top.clone().add(new THREE.Vector3(0, -sink * (1 - ease((t - 0.9) / 0.6)), 0)))
      else if (t < 2.3) place(top.clone().lerp(P.list[0], ease((t - 1.5) / 0.8)))
      else { P.dip = false; P.t0 = now; place(P.list[0]); staked(P.list[0]); if (P.overBy) build(ft + P.overBy, wet(hotC(), 0.4), null) }
      if (t >= 0.9) dripTick(t - 0.9, dt)
      return
    }
    if (drips) dripTick((now - P.t0) / 1000 + 1.4, dt)
    // the pop (on the spot it took), then drying off after the dip
    inner.scale.setScalar(t < 0.35 ? 1 + 0.2 * Math.sin((t / 0.35) * Math.PI) : 1)
    if (P.glide) { const u = Math.min(1, (now - P.glide.t0) / 1600); place(P.glide.from.clone().lerp(P.glide.to, ease(u))); if (u >= 1) { staked(P.glide.to); P.glide = null } }
    if (P.chip && t > 0.12) { P.chip = false; chipOff() }
    if (P.glitch) { if (t < 0.7) { if (!P.gl || now - P.gl > 60) { P.gl = now; build(100 + Math.floor(Math.random() * 900), hotC(), null) } return } P.glitch = false; o.geiger?.() }
    // a click counts it up again (0.8 s, the Geiger with it past the wall's feet)
    if (P.recount) { const u = Math.min(1, (now - P.recount) / 800), n = Math.round(ft * (1 - (1 - u) ** 3)); if (o.gone && n >= (o.wallFt ?? 330)) geiger(n, n >= 430); build(n, o.gone && n >= (o.wallFt ?? 330) ? hotC() : o.cool, null); if (u < 1) return; P.recount = 0; P.t0 = now - 400 }
    const wetK = P.wetUntil ? Math.max(0, (P.wetUntil - now) / 4200) * 0.55 : 0
    // THE OVERSHOOT: hold a beat past the feet, then a foot at a time back down
    let n = ft
    if (P.overBy && P.ticked < P.overBy) { const k = Math.floor(Math.max(0, t - 0.45) / 0.07); P.ticked = Math.min(P.overBy, k); n = ft + P.overBy - P.ticked }
    build(n, wetK > 0.02 ? wet(hotC(), Math.round(wetK * 10) / 10) : hotC(), null)
    // CLEAR OF THE ARC: once its box is measured where it is (after the pop), every spot is scored from that one box, moved to each spot's place on the screen
    // (keepReadable holds a piece about the same size on the screen wherever it stands), and it moves once, to the first spot nothing crosses, or the least crossed
    if (P.done || t < 0.4) return
    const r0 = outer.userData.read?.rect
    if (!r0) { if (t > 4) P.done = true; return }
    const c0 = pv.copy(P.list[P.i]).project(api.NN.camera).clone()
    let best = null
    for (let i = 0; i < P.list.length; i++) {
      const c = pv.copy(P.list[i]).project(api.NN.camera); if (c.z > 1) continue
      const dx = c.x - c0.x, dy = c.y - c0.y, r = { x0: r0.x0 + dx, x1: r0.x1 + dx, y0: r0.y0 + dy, y1: r0.y1 + dy }
      const off = r.x0 < -0.98 || r.x1 > 0.98 || r.y0 < -0.95 || r.y1 > 0.9 ? 30 : 0 // (and on the screen)
      const n = crossings(r) + off
      if (!best || n < best.n) best = { n, i }
      if (n === 0) break
    }
    if (best && best.i !== P.i) { P.i = best.i; if (stake) { stake.parent?.remove(stake); stake = null } P.glide = { from: outer.position.clone(), to: P.list[P.i].clone(), t0: now } }
    P.done = true
  }
  // A CHIP: one cube off the top of the first digit, knocked loose, tumbling down past the stake to the landing and lying there a moment
  function chipOff() {
    if (!outer.parent || !num) return
    const sc = outer.scale.x || 1, R = new THREE.Vector3(1, 0, 0).applyQuaternion(api.NN.camera.quaternion).setY(0).normalize()
    const p = outer.getWorldPosition(new THREE.Vector3()).addScaledVector(R, -num.userData.width * 0.38 * sc).add(new THREE.Vector3(0, px * 6.5 * sc, 0))
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: hex(hotC()), flatShading: true, fog: false })); m.scale.setScalar(px * sc); m.position.copy(p); outer.parent.add(m)
    const v = R.clone().multiplyScalar(-3).add(new THREE.Vector3(0, 6, 0)), floor = at.y + px * sc * 0.5
    let t = 0, last = performance.now(), bounced = false
    chips.push(() => {
      const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt
      v.y -= 24 * dt; m.position.addScaledVector(v, dt); m.rotation.x += 7 * dt; m.rotation.z += 4 * dt
      if (m.position.y < floor) { m.position.y = floor; if (!bounced) { bounced = true; o.chip?.() } v.multiplyScalar(0.3); v.y = Math.abs(v.y) * 0.4 }
      if (t > 3.2 || !outer.parent) { m.parent?.remove(m); m.geometry.dispose(); m.material.dispose(); return false }
      return true
    })
  }
  g.userData.recount = () => { if (plan && !plan.dip && !plan.glitch) { plan.recount = performance.now(); clickN = 0 } }
  g.userData.rect = () => (outer.userData.settled && shown(outer) ? outer.userData.read?.rect ?? null : null)
  // for the touches (touches25.js): the top of the number in the world, its width and scale, the camera's right
  g.userData.perch = () => { const sc = outer.scale.x || 1, p = outer.getWorldPosition(new THREE.Vector3()); return { top: p.clone().add(new THREE.Vector3(0, px * 7 * sc * (inner.scale.y || 1), 0)), w: (num?.userData.width ?? 10) * sc, sc, R: new THREE.Vector3(1, 0, 0).applyQuaternion(api.NN.camera.quaternion).setY(0).normalize(), live: !!outer.parent && shown(outer) && !!outer.userData.settled && !plan?.dip } }
  hover.add(g); g.userData.born = outer.userData.born = performance.now()
  live.add(outer)
  if (!hooked) {
    hooked = true
    /* (11 Nov, the soak test: a number whose track has left the scene still has a parent, the track, so "no parent" never let go of it, and every old track stayed
       alive through this hover set, about 0.3 MB a swing. Now both sets let go once the number's root is not the scene: after it has been seen there, or 5 s on) */
    const gone = (n, now) => { let r = n; while (r.parent) r = r.parent; if (r === api.NN.scene) { n.userData.seen = true; return false } return n.userData.seen || now - (n.userData.born ?? 0) > 5000 }
    api.NN.frames.push(() => {
      const now = performance.now()
      for (const g of hover) if (gone(g, now)) hover.delete(g)
      for (const n of live) { if (gone(n, now)) { live.delete(n); continue } n.userData.tick(now) }
      for (let i = chips.length - 1; i >= 0; i--) if (!chips[i]()) chips.splice(i, 1)
    })
    // TOUCH: a click on a settled number (a press and a let-go that barely moved) counts it up again
    const at = (e) => { const cv = api.NN.renderer?.domElement; if (!cv) return null; const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1] }
    const under = (e) => { const q = at(e); if (!q) return null; for (const g of hover) { if (!g.parent) { hover.delete(g); continue } const r = g.userData.rect(); if (r && q[0] > r.x0 && q[0] < r.x1 && q[1] > r.y0 && q[1] < r.y1) return g } return null }
    let down = null
    addEventListener('pointerdown', (e) => { down = e.button === 0 ? { x: e.clientX, y: e.clientY, g: under(e) } : null }, true)
    addEventListener('pointerup', (e) => { if (down?.g && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5 && under(e) === down.g) down.g.userData.recount(); down = null }, true)
  }
  return g
}
