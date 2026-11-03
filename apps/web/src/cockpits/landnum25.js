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
import { VOX_FONT, voxCells, voxText, voxPost, keepReadable, readable } from './vox25.js'

export const LAND_LOOKS = [
  { c: 2, name: 'OVER THE BALL', desc: 'the count-up moves with the ball, its distance and its height, then settles over the spot where it came down' },
  { c: 3, name: 'OVER THE SPOT', desc: 'the count-up waits over the spot where the ball will come down, counting as it flies' },
]
// 2 Nov, later (Andrew, on a screengrab: "we can get it closer to the real landing location right?"): it settles 4 m over the spot, not 10, held there (it no longer
// steps aside for other pieces), with a dotted line in its color down to where the ball came down
// Home stretch (GPT red team III, A1 and A3: the number tangled with a Cove landing, its debris and the scoreboard): it settles 12 m toward the camera from the spot,
// so whatever happens at the landing is behind it. (Drawing it over the park with no depth test fails: the park's ink pass outlines what is behind it on top.)
const DEEP = 3, RIDE = 5, LIFT = 4, FRONT = 12 // a deep digit; how far over the ball it rides, how far up and toward the camera it settles (m)
const WET = '#5fd3ff' // the Cove's spray (fx25.js)
const live = new Set()
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
    if (!outer.parent) return
    stake = voxPost(THREE, at, top.clone().add(new THREE.Vector3(0, -0.4, 0)), { px: 0.35, gap: 0.8, color: hex(hotC()) }); stake.userData.stake = true; outer.parent.add(stake)
  }
  // the spots it may settle on: in front of the landing (toward the camera, a little up), then a step to either side, up, and both
  const spots = () => {
    const cam = api.NN.camera, toward = new THREE.Vector3(cam.position.x - at.x, 0, cam.position.z - at.z)
    const base = at.clone().addScaledVector(toward.lengthSq() > 1 ? toward.normalize() : toward, FRONT).add(new THREE.Vector3(0, LIFT, 0))
    const R = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion).setY(0).normalize(), U = new THREE.Vector3(0, 1, 0), d = Math.max(8, base.distanceTo(cam.position) * 0.06)
    // and further out over the field in front of the wall, clear of a board or a sign right behind the landing
    return [[0, 0], [1, 0], [-1, 0], [0, 1], [2, 0], [-2, 0], [1, 1], [-1, 1], [0, 2], [2, 1], [-2, 1]].map(([r, u]) => base.clone().addScaledVector(R, r * d * 1.4).addScaledVector(U, u * d))
      .concat([2.5, 5, 8].flatMap((k) => [0, 1, -1, 2, -2].map((r) => base.clone().addScaledVector(toward, FRONT * k).addScaledVector(R, r * d * 1.4))))
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
    plan = { t0: now, list: spots(), i: 0, best: null, wait: 0, dip: !!o.splash && !fixed, overBy, ticked: 0, wetUntil: 0 }
    outer.userData.settled = now
    if (plan.dip) { place(at.clone().add(new THREE.Vector3(0, LIFT, 0))); build(ft, hotC(), null); return } // THE DIP plays first (tick)
    place(plan.list[0]); build(ft + overBy, hotC(), null); staked(plan.list[0])
  }
  const ride = (n, pos, hot, up) => {
    if (outer.userData.settled) return
    place(o.spot ? at.clone().add(new THREE.Vector3(0, LIFT, 0)) : pos.clone().add(new THREE.Vector3(0, RIDE, 0)))
    build(Math.max(0, Math.round(n)), hot ? o.hot : o.cool, o.spot || up == null ? null : Math.max(0, Math.round(up)))
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
    if (!shown(outer) || !outer.userData.settled || !plan) return
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
    if (best && best.i !== P.i) { P.i = best.i; place(P.list[P.i]); staked(P.list[P.i]) }
    P.done = true
  }
  live.add(outer)
  if (!hooked) {
    hooked = true
    api.NN.frames.push(() => {
      const now = performance.now()
      for (const n of live) { let r = n; while (r.parent) r = r.parent; if (r !== api.NN.scene && n.userData.seen) { live.delete(n); continue } if (r === api.NN.scene) n.userData.seen = true; n.userData.tick(now) }
    })
  }
  return g
}
