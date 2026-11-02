// Study 25 effects in the park (no screen shake, nothing glows: flat squares and thin rings in the theme colors, with stepped fades so they read as pixels):
//   contact: a spark of squares at the plate during the hit-stop    flight: a pixel trail behind the ball
//   home run: confetti (F2) or the landing moments (moments25.js)    splash hit: ripple rings and droplets in McCovey Cove, and one of five acts by the Cove's kayakers
//   Karl: dithered fog banks drift across the park and the wireframe hazes over
// Positions come from the engine's own toWorld (meters, home plate at the origin, y up).
import { loadModels, cloneModel } from './models25.js'
import { WATER_Z } from './water25.js'
export function initFx25(api, col, o = {}) {
  const { THREE, scene, camera } = api.NN
  const toWorld = window.__cp.toWorld
  const parts = []
  const STEPS = 4
  const mats = new Map()
  // shared materials per color and opacity step, so hundreds of short-lived bits cost little; each bit is a small tumbling cube (28 Oct, night: voxels everywhere)
  const sq = (c, a) => { const k = c + ':' + a; if (!mats.has(k)) mats.set(k, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: a / STEPS, depthWrite: false, fog: false })); return mats.get(k) }
  const step = (x) => Math.max(0, Math.min(STEPS, Math.ceil(x * STEPS)))
  const bit = new THREE.BoxGeometry(1, 1, 1)
  function particle(c, pos, vel, life, size, g = 9.8, drag = 0) {
    const s = new THREE.Mesh(bit, sq(c, STEPS)); s.position.copy(pos); s.scale.setScalar(size * 0.7); s.rotation.set(rnd(0, 3), rnd(0, 3), 0); scene.add(s)
    const v = vel.clone(), spin = rnd(-6, 6); let t = 0
    parts.push((dt) => {
      t += dt; v.y -= g * dt; if (drag) v.multiplyScalar(1 - drag * dt); s.position.addScaledVector(v, dt); s.rotation.x += spin * dt
      const a = step(1 - t / life); if (a <= 0) { scene.remove(s); return false }
      s.material = sq(c, a); return true
    })
  }
  const rnd = (a, b) => a + Math.random() * (b - a)
  const V = (x, y, z) => new THREE.Vector3(x, y, z)

  // ---- contact: squares thrown out in the screen plane from the contact point ----
  let trailAt = 0, trailCol = null
  function contact(ev) {
    const p = ev.pts[0], r = V(1, 0, 0).applyQuaternion(camera.quaternion), u = V(0, 1, 0).applyQuaternion(camera.quaternion)
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, sp = rnd(10, 22); particle(i % 2 ? col().acc : col().tx, p, r.clone().multiplyScalar(Math.cos(a) * sp).add(u.clone().multiplyScalar(Math.sin(a) * sp)), 0.32, 1.1, 0) }
    trailCol = ['GONE'].includes(ev.kind) ? col().acc : col().tx
  }
  // ---- the trail: a square dropped behind the ball every 40 ms ----
  function fly(pos, f) {
    const now = performance.now()
    if (!trailCol || f <= 0 || f >= 0.97 || now - trailAt < 40) return
    trailAt = now
    particle(trailCol, pos, V(0, 0, 0), 0.75, 1.5, 0)
  }

  // (fireworks over center field were cut on 28 Oct: invisible from the broadcast camera; the landing moments in moments25.js replace them)

  // ---- confetti (the F2 effects option): orange and bone squares fluttering down over the infield ----
  function confetti() {
    const c = col()
    for (let i = 0; i < 160; i++) {
      const p = toWorld([rnd(-60, 60), rnd(10, 120), rnd(45, 80)])
      particle(i % 3 ? c.acc : c.tx, p, V(rnd(-2, 2), rnd(-3, 0), rnd(-2, 2)), rnd(3, 5), rnd(0.8, 1.5), 2.2, 0.9)
    }
    o.sound?.('crowd')
  }
  let style = o.style ?? 'moments'

  // ---- McCovey Cove: voxel kayakers (Blender, models25.js) floating at the sea's level beyond right field, in six hull colors ----
  // 1 Nov, later (Andrew: "The kayak traffic jam looks lame, let's have like 5 different things that COULD happen if there's a splash hit, all of which need to be from
  // the kayaks already there we can't spawn in new kayaks. One of them should be someone jumping in the water to get it"): a splash sets off one of five acts (ACTS
  // below), never the same one twice running, played by these six. Props come and go (the ball, a swimmer, dizzy stars); kayaks never do.
  const kayaks = []
  const HULLS = ['#e4002b', '#f2bc40', '#2f6fd6', '#1fa37a', '#f26b21', '#efe9dc']
  // the paddler's and the paddle's materials in kayak.glb (build_kayak.py: skin, vest, jersey and arms, cap and blades, shaft); the hull is '#e4002b'. The model is
  // one mesh per color, so the paddler twists and leans as these meshes turning about the seat
  const PADDLER = new Set(['#e0b48a', '#f2bc40', '#f26b21', '#111111', '#9aa0aa'])
  const SEAT = [0.35, 0.52] // the seat in the model (x forward, y up, before the 1.6 scale)
  let M = null, level = 0, ct = 0
  const H0 = () => toWorld([0, 0, 0]) // the plate
  async function buildKayaks() {
    if (!o.cove) return
    const pts = []
    for (const dir of [14, 18, 22, 26, 30, 34, 38]) for (const ev of [114, 120]) {
      const res = api.fly({ ...api.state, ev, la: 27, dir, hand: -1, wind: 0, carry: 1, dws: 0, temp: 70 }, {})
      const L = window.__cp.findLanding?.(res.path)
      if (L?.kind === 'SPLASH') pts.push(L.point.clone())
    }
    if (pts.length < 2) return
    M = await loadModels(THREE)
    if (!M.kayak) return
    level = toWorld([0, 0, WATER_Z]).y // the sea's surface (water25.js): the hulls sit in it, not under it
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group(), boat = cloneModel(M.kayak, 1.6), kit = []
      boat.traverse((m) => { if (m.isMesh && m.material.name === '#e4002b') m.material.color.set(HULLS[i]); if (m.isMesh && PADDLER.has(m.material.name)) kit.push(m) })
      g.add(boat)
      const p = pts[i % pts.length].clone().add(V(rnd(-14, 14), 0, rnd(-14, 14)))
      p.y = level - 0.25
      g.position.copy(p); g.rotation.y = rnd(0, Math.PI * 2)
      scene.add(g)
      kayaks.push({ g, boat, kit, home: p.clone(), ph: rnd(0, 6), sp: rnd(5.5, 9), back: 0, act: false, bob: 0, cheer: 0 })
    }
    parts.push((dt) => {
      ct += dt
      for (const k of kayaks) {
        k.bob = Math.sin(ct * 1.4 + k.ph) * 0.12
        if (k.cheer > 0) k.cheer -= dt
        if (k.act) continue // an act places it
        if (k.back > 0 && steer(k, k.home, dt, k.sp) <= 1.5) k.back = 0
        if (!k.back) k.boat.rotation.x = Math.sin(ct * 1.1 + k.ph) * 0.05 // a little roll on the swell
        float(k)
      }
      if (act) { act.t += dt; let go = false; try { go = act.run.step(dt, act.t) && act.t < 26 } catch (e) { console.warn('splash act', act.name, e) } if (!go) endAct() }
      return true
    })
  }
  // ---- moving a kayak: turn toward a heading, paddle toward a point (stops `near` short), float at the sea with the swell, a bounce for the one who got it ----
  const hop = (k) => (k.cheer > 0 ? Math.abs(Math.sin(k.cheer * 9)) * 0.9 : 0)
  const float = (k, up = 0) => { k.g.position.y = k.home.y + k.bob + hop(k) + up }
  const swell = (k) => { k.boat.rotation.x = Math.sin(ct * 1.1 + k.ph) * 0.05 }
  const headTo = (k, p) => Math.atan2(-(p.z - k.g.position.z), p.x - k.g.position.x)
  function turn(k, want, dt, rate = 2.5) {
    let dy = want - k.g.rotation.y
    while (dy > Math.PI) dy -= 2 * Math.PI
    while (dy < -Math.PI) dy += 2 * Math.PI
    k.g.rotation.y += Math.sign(dy) * Math.min(Math.abs(dy), rate * dt)
    return Math.abs(dy)
  }
  function steer(k, goal, dt, sp, near = 1.5) {
    const g = k.g, dist = Math.hypot(goal.x - g.position.x, goal.z - g.position.z)
    if (dist <= near) return dist
    turn(k, headTo(k, goal), dt)
    const s = Math.min(sp * dt, dist - near * 0.5)
    g.position.x += Math.cos(g.rotation.y) * s; g.position.z -= Math.sin(g.rotation.y) * s
    k.boat.rotation.x = Math.sin(ct * 9 + k.ph) * 0.12 // paddling hard
    return dist
  }
  // the others paddle up to a ring round the spot and turn to look
  function watch(k, p, dt, R = 18) {
    const dx = k.g.position.x - p.x, dz = k.g.position.z - p.z, d = Math.hypot(dx, dz) || 1
    if (d > R + 2) steer(k, V(p.x + (dx / d) * R, 0, p.z + (dz / d) * R), dt, 4.5)
    else { turn(k, headTo(k, p), dt, 1.2); swell(k) }
    float(k)
  }
  const kitShow = (k, on) => { for (const m of k.kit) m.visible = on }
  // the paddler (and the paddle) twisted round the seat by yaw and leaned sideways by lean (toward the kayak's left for a plus lean)
  const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3()
  function pose(k, yaw = 0, lean = 0) {
    _e.set(lean, yaw, 0); _q.setFromEuler(_e); _p.set(SEAT[0], SEAT[1], 0).applyQuaternion(_q)
    for (const m of k.kit) { m.quaternion.copy(_q); m.position.set(SEAT[0] - _p.x, SEAT[1] - _p.y, -_p.z) }
  }
  // the kayak rolled about its length, round a point c metres up, so a full roll turns it hull up in the water and back
  function roll(k, r, c = 0.65) { k.boat.rotation.x = r; k.boat.position.set(0, c - c * Math.cos(r), -c * Math.sin(r)) }
  const sideOf = (k, p) => { const a = k.g.rotation.y; return Math.sign((p.x - k.g.position.x) * Math.sin(a) + (p.z - k.g.position.z) * Math.cos(a)) || 1 } // + = the kayak's left
  const at = (k, x, y, z = 0) => k.boat.localToWorld(V(x, y, z)) // a point on the model
  const head = (k) => at(k, 0.36, 1.55)
  const hands = (k) => at(k, 0.42, 2.2)
  const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)
  const arc = (a, b, h, u) => V(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u + 4 * h * u * (1 - u), a.z + (b.z - a.z) * u)
  const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u))

  // ---- props: the ball (the voxel model, 0.95 m so it reads from the stands' distance), a swimmer in the paddlers' colors, dizzy stars ----
  let ballP = null, swimP = null, starP = null
  const lam = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true })
  function ballProp() {
    if (ballP) return ballP
    const g = new THREE.Group()
    if (M?.ball) {
      const b = cloneModel(M.ball, 1), bb = new THREE.Box3().setFromObject(b), s = 0.95 / Math.max(0.01, bb.max.x - bb.min.x), c = bb.getCenter(V(0, 0, 0))
      b.scale.setScalar(s); b.position.copy(c.multiplyScalar(-s)); g.add(b)
    } else { const b = new THREE.Mesh(bit, lam('#f4f2ea')); b.scale.setScalar(0.9); g.add(b) }
    g.visible = false; scene.add(g); ballP = g
    return g
  }
  function swimmerProp() {
    if (swimP) return swimP
    const g = new THREE.Group()
    const box = (c, w, h, d, x, y, z, parent = g) => { const m = new THREE.Mesh(bit, lam(c)); m.scale.set(w, h, d); m.position.set(x, y, z); parent.add(m); return m }
    box('#1d1d1f', 0.18, 0.5, 0.16, 0, 0.25, -0.12); box('#1d1d1f', 0.18, 0.5, 0.16, 0, 0.25, 0.12) // legs
    box('#f26b21', 0.36, 0.52, 0.42, 0, 0.76, 0) // the jersey
    box('#f2bc40', 0.44, 0.34, 0.5, 0, 0.84, 0) // the life vest
    box('#e0b48a', 0.32, 0.32, 0.32, 0, 1.2, 0) // head
    box('#111111', 0.36, 0.14, 0.36, -0.02, 1.4, 0); box('#f26b21', 0.2, 0.05, 0.3, 0.22, 1.36, 0) // the cap, its orange brim forward (+x)
    g.userData.arms = [-1, 1].map((s) => { const a = new THREE.Group(); a.position.set(0, 1.0, s * 0.3); box('#f26b21', 0.14, 0.5, 0.14, 0, -0.22, 0, a); g.add(a); return a })
    g.scale.setScalar(1.6); g.visible = false; scene.add(g); swimP = g
    return g
  }
  function starsProp() {
    if (starP) return starP
    const g = new THREE.Group()
    for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(bit, lam('#ffd23f')); m.scale.setScalar(0.32); g.add(m) }
    g.visible = false; scene.add(g); starP = g
    return g
  }
  const ballFloat = (p) => { const b = ballProp(); b.visible = true; b.position.set(p.x, level + 0.3 + Math.sin(ct * 2.2) * 0.1, p.z); b.rotation.y += 0.01 }
  const ballHeld = (k) => { const b = ballProp(); b.visible = true; b.position.copy(hands(k)) }
  function sprayAt(p, n = 24, up = [6, 13]) { for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), s = rnd(1, 4); particle(i % 3 ? '#5fd3ff' : col().tx, V(p.x, level + 0.2, p.z), V(Math.cos(a) * s, rnd(up[0], up[1]), Math.sin(a) * s), rnd(0.8, 1.2), 0.9, 16) } }
  // where a point is in the plate frame (x right, y to center field), and whether it is out on the Cove (the landing finder's own test, seance.js)
  const plate = (p) => { const h = H0(); return [p.x - h.x, h.z - p.z] }
  const onCove = (p) => { const [x, y] = plate(p); return x > 25 && Math.hypot(x, y) > 126 && (Math.atan2(x, y) * 180) / Math.PI > 26 }

  // ---- the acts. Each gets the spot and the kayaks nearest first, and returns step(dt, t) (false when done) and end() ----
  let act = null, lastAct = null, lastMarks = [], winner = null
  const mark = (m) => { if (act && !act.marks.includes(m)) act.marks.push(m) }
  const say = (k, p, a = {}) => o.sound?.('cove-' + k, { at: p.clone?.() ?? p, ...a })
  function got(k) { winner = k; k.cheer = 1.8; mark('catch'); o.onCatch?.(k); say('cheer', k.g.position, { vol: 0.5 }) }
  const ACTS = {}

  // THE DIVE: the nearest one paddles close, stands up, cannonballs in, swims to the ball and holds it up; the empty kayak drifts off on the push; back aboard to cheers
  ACTS.dive = (p, [A, ...rest]) => {
    const s = swimmerProp(), arms = s.userData.arms
    let ph = 'go', t0 = 0, from = null, to = null, kick = V(0, 0, 0), spin = 0
    const swimTo = (q, dt, sp = 2.4) => {
      const d = Math.hypot(q.x - s.position.x, q.z - s.position.z), a = Math.atan2(-(q.z - s.position.z), q.x - s.position.x)
      s.rotation.y = a; if (d > 0.05) { const m = Math.min(sp * dt, d); s.position.x += Math.cos(a) * m; s.position.z -= Math.sin(a) * m }
      s.position.y = level - 1.45 + Math.sin(ct * 6) * 0.12
      return d
    }
    const stroke = (both = true) => { arms[0].rotation.set(0, 0, ct * 7); if (both) arms[1].rotation.set(0, 0, ct * 7 + Math.PI) }
    return {
      step(dt, t) {
        for (const k of rest) watch(k, p, dt, 20)
        if (ph !== 'hold' && ph !== 'back' && ph !== 'climb' && ph !== 'cheer') ballFloat(p)
        if (ph === 'go') {
          const d = steer(A, p, dt, 9, 10); float(A)
          if (d <= 10 || t > 6) { ph = 'stand'; t0 = t; kitShow(A, false); s.visible = true; arms.forEach((a) => a.rotation.set(0, 0, 0)); say('whoosh', A.g.position, { vol: 0.4 }) }
          return true
        }
        if (ph === 'stand') { // up on the seat, arms up, a crouch
          const u = (t - t0) / 0.6; turn(A, headTo(A, p), dt, 3); swell(A); float(A)
          s.position.copy(at(A, SEAT[0], SEAT[1])); s.rotation.set(0, headTo(A, p), 0); s.scale.set(1.6, 1.6 * (1 - 0.25 * Math.sin(Math.min(1, u) * Math.PI)), 1.6)
          arms.forEach((a) => a.rotation.set(0, 0, 2.7 * ease(u))); mark('stand')
          if (u >= 1) { ph = 'jump'; t0 = t; from = s.position.clone(); const d = V(p.x - from.x, 0, p.z - from.z).normalize(); to = V(p.x - d.x * 2.6, level - 1.45, p.z - d.z * 2.6); kick = d.multiplyScalar(-2.8) }
          return true
        }
        A.g.position.addScaledVector(kick, dt); kick.multiplyScalar(Math.max(0, 1 - 0.5 * dt)) // the push off sends the empty kayak back
        if (ph === 'jump' || ph === 'go2' || ph === 'hold') { spin += dt * 0.35; A.g.rotation.y += dt * 0.35 * Math.max(0, 1 - spin) }
        if (ph === 'jump') { // the cannonball: tucked, a turn in the air
          const u = (t - t0) / 0.9; float(A); A.boat.rotation.x = Math.sin(((t - t0) / 0.9) * Math.PI * 3) * 0.3 * (1 - Math.min(1, (t - t0) / 0.9))
          s.position.copy(arc(from, to, 4.2, Math.min(1, u))); s.scale.set(1.6, 1.6 * 0.62, 1.6); s.rotation.z = -Math.min(1, u) * Math.PI * 2; arms.forEach((a) => a.rotation.set(0, 0, 1.4))
          if (u >= 1) { ph = 'go2'; t0 = t; s.rotation.z = 0; s.scale.setScalar(1.6); sprayAt(to, 46, [8, 16]); ripple(V(to.x, level, to.z), 2, 9); say('splash', to); mark('dive') }
          return true
        }
        float(A); swell(A)
        if (ph === 'go2') { stroke(); if (swimTo(p, dt) < 1.3 || t - t0 > 8) { ph = 'hold'; t0 = t; got(A) } return true }
        if (ph === 'hold') { // the ball up high, bobbing
          arms[0].rotation.set(0, 0, Math.PI); arms[1].rotation.set(0, 0, Math.sin(ct * 8) * 0.6); s.position.y = level - 1.2 + Math.abs(Math.sin(ct * 5)) * 0.35
          ballProp().visible = true; ballProp().position.copy(s.localToWorld(V(0, 1.8, -0.3)))
          if (t - t0 > 1.8) { ph = 'back'; t0 = t }
          return true
        }
        if (ph === 'back') { // back to the kayak, one arm swimming, the ball still up
          arms[0].rotation.set(0, 0, Math.PI); arms[1].rotation.set(0, 0, ct * 7)
          ballProp().position.copy(s.localToWorld(V(0, 1.8, -0.3)))
          if (swimTo(A.g.position, dt, 2.6) < 2.4 || t - t0 > 9) { ph = 'climb'; t0 = t; from = s.position.clone() }
          return true
        }
        if (ph === 'climb') {
          const u = Math.min(1, (t - t0) / 0.8), seat = at(A, SEAT[0], SEAT[1]); s.position.copy(from.clone().lerp(seat, ease(u))); s.position.y += Math.sin(u * Math.PI) * 1.2
          ballProp().position.copy(s.localToWorld(V(0, 1.8, -0.3)))
          if (u >= 1) { ph = 'cheer'; t0 = t; s.visible = false; kitShow(A, true); A.cheer = 1.8; say('cheer', A.g.position, { vol: 0.5 }) }
          return true
        }
        ballHeld(A)
        return t - t0 < 2.2
      },
    }
  }

  // CAPSIZE: the two nearest race in nose to nose, bump, and one rolls hull up, sits upside down a moment, then rolls all the way round; the other has the ball
  ACTS.capsize = (p, [A, B, ...rest]) => {
    const T = 3.2, goal = (k) => { const d = V(k.g.position.x - p.x, 0, k.g.position.z - p.z).normalize(); return V(p.x + d.x * 4.6, 0, p.z + d.z * 4.6) }
    const gA = goal(A), gB = goal(B), spA = Math.min(15, Math.max(5, flat(A.g.position, gA) / T)), spB = Math.min(15, Math.max(5, flat(B.g.position, gB) / T))
    let ph = 'go', t0 = 0, push = null, bub = 0
    return {
      step(dt, t) {
        for (const k of rest) watch(k, p, dt, 20)
        if (ph === 'go') {
          ballFloat(p)
          const a = steer(A, gA, dt, spA), b = steer(B, gB, dt, spB); float(A); float(B)
          if ((a <= 1.5 && b <= 1.5) || t > 6.5) { ph = 'bump'; t0 = t; say('bonk', p); sprayAt(p, 16, [4, 8]); mark('bump'); push = [A, B].map((k) => V(k.g.position.x - p.x, 0, k.g.position.z - p.z).normalize().multiplyScalar(4)) }
          return true
        }
        const u = t - t0
        if (u < 0.4) { A.g.position.addScaledVector(push[0], dt); B.g.position.addScaledVector(push[1], dt) }
        float(A); float(B); swell(A)
        if (u < 0.5) ballFloat(p)
        else { if (!winner) got(A); ballHeld(A) }
        // the roll: over in 0.6 s, hull up for 1.8 s, round the rest of the way in 0.9 s
        const r = u < 0.15 ? 0 : u < 0.75 ? Math.PI * ease((u - 0.15) / 0.6) : u < 2.55 ? Math.PI : u < 3.45 ? Math.PI * (1 + ease((u - 2.55) / 0.9)) : 0
        roll(B, r)
        if (r > 2.5) mark('roll')
        if (u > 0.75 && u < 2.55 && (bub += dt) > 0.12) { bub = 0; const q = B.g.position; particle('#e9f2ff', V(q.x + rnd(-1.5, 1.5), level, q.z + rnd(-1.5, 1.5)), V(0, rnd(2, 4), 0), 0.5, 0.5, 0) }
        if (u > 0.15 && u - dt <= 0.15) { say('splash', B.g.position, { vol: 0.6 }); sprayAt(B.g.position, 26, [5, 10]) }
        if (u > 3.45 && u - dt <= 3.45) { say('splash', B.g.position, { vol: 0.5 }); sprayAt(B.g.position, 14, [3, 7]); mark('upright') }
        return u < 5
      },
    }
  }

  // THE STEAL: the nearest one paddles up slowly and leans out for it; another comes flying across, snatches it and keeps going; the first slaps the water
  ACTS.steal = (p, [A, ...rest]) => {
    const toA = V(A.g.position.x - p.x, 0, A.g.position.z - p.z).normalize()
    // the thief: whoever comes in most from the side
    const B = rest.slice().sort((a, b) => Math.abs(V(a.g.position.x - p.x, 0, a.g.position.z - p.z).normalize().dot(toA)) - Math.abs(V(b.g.position.x - p.x, 0, b.g.position.z - p.z).normalize().dot(toA)))[0]
    const others = rest.filter((k) => k !== B)
    const side = V(-toA.z, 0, toA.x).multiplyScalar(Math.sign(V(B.g.position.x - p.x, 0, B.g.position.z - p.z).dot(V(-toA.z, 0, toA.x))) || 1)
    const S = V(p.x + side.x * 24, 0, p.z + side.z * 24), beyond = V(p.x - side.x * 26, 0, p.z - side.z * 26)
    let ph = 'go', t0 = 0, reach = 0, slaps = 0
    return {
      step(dt, t) {
        for (const k of others) watch(k, p, dt, 20)
        if (ph === 'go') {
          ballFloat(p)
          const a = steer(A, p, dt, 4.5, 6.2); float(A)
          if (a <= 6.2) { reach = Math.min(1, reach + dt / 1.2); pose(A, 0, 0.45 * reach * sideOf(A, p)); swell(A) }
          const b = steer(B, S, dt, 11, 3); float(B); if (b <= 3) { turn(B, headTo(B, p), dt, 3); swell(B) }
          if ((reach > 0.5 && b <= 3) || t > 8) { ph = 'dash'; t0 = t; say('whoosh', B.g.position, { vol: 0.7 }) }
          return true
        }
        steer(B, beyond, dt, 16, 2); float(B)
        if (ph === 'dash') {
          ballFloat(p); float(A); swell(A); pose(A, 0, 0.45 * sideOf(A, p))
          if (flat(B.g.position, p) < 3 || t - t0 > 4) { ph = 'slap'; t0 = t; got(B); mark('steal') }
          return true
        }
        ballHeld(B)
        const u = t - t0; float(A)
        // a beat of disbelief, then three slaps of the paddle on the water, rocking the boat
        if (u > 0.7 && slaps < 3 && u > 0.7 + slaps * 0.45) { slaps++; const sd = (slaps % 2 ? 1 : -1); const q = at(A, 0.6, 0.4, sd * 2.2); sprayAt(q, 18, [4, 9]); say('splash', q, { vol: 0.4 }); mark('slap') }
        const w = u > 0.7 && u < 2.3 ? Math.sin((u - 0.7) * Math.PI / 0.45) * 0.5 : 0
        pose(A, w * 0.6, w * 0.7); A.boat.rotation.x = w * 0.18
        return u < 4.2
      },
    }
  }

  // PADDLE FUNGO: the nearest one paddles alongside, winds up and swats the ball back toward the park with the paddle; it arcs and plops in again, and the whole
  // Cove turns and chases it; whoever gets there first has it
  ACTS.fungo = (p, [A, ...rest]) => {
    const [px, py] = plate(p), r = Math.hypot(px, py), inX = -px / r, inY = -py / r
    // toward the plate, and along the Cove away from its near end, so it comes down on the water
    let tx = inY, ty = -inX
    if ((Math.atan2(px + tx, py + ty) * 180) / Math.PI < (Math.atan2(px, py) * 180) / Math.PI) { tx = -tx; ty = -ty }
    const dx = inX * 0.45 + tx * 0.9, dy = inY * 0.45 + ty * 0.9, dl = Math.hypot(dx, dy)
    const L = p.clone(); L.x += (dx / dl) * 22; L.z -= (dy / dl) * 22
    for (let i = 0; i < 30 && !onCove(L); i++) { const [lx, ly] = plate(L), lr = Math.hypot(lx, ly); L.x += (lx / lr) * 1.5; L.z -= (ly / lr) * 1.5 } // out from the plate until it is water
    L.y = level
    let ph = 'go', t0 = 0, ball0 = null
    return {
      step(dt, t) {
        if (ph === 'go' || ph === 'swing') for (const k of rest) watch(k, p, dt, 18)
        if (ph === 'go') {
          ballFloat(p)
          const a = steer(A, p, dt, 9, 3.6); float(A)
          if (a <= 3.6 || t > 7) { ph = 'swing'; t0 = t }
          return true
        }
        if (ph === 'swing') { // wind up, then the swat
          const u = t - t0, sd = sideOf(A, p); float(A); swell(A)
          pose(A, u < 0.6 ? -1.1 * ease(u / 0.6) * sd : -1.1 * sd + 2.4 * sd * ease((u - 0.6) / 0.16), 0)
          ballFloat(p)
          if (u >= 0.68) { ph = 'flight'; t0 = t; ball0 = ballProp().position.clone(); say('bonk', p); sprayAt(p, 14, [4, 9]); mark('swat') }
          return true
        }
        if (ph === 'flight') {
          const u = (t - t0) / 1.7; float(A); swell(A); pose(A, 1.3 * sideOf(A, p) * (1 - ease((t - t0) / 1.2)), 0)
          for (const k of rest) { turn(k, headTo(k, L), dt, 3); float(k); swell(k) } // all heads turn after it
          const b = ballProp(); b.position.copy(arc(ball0, V(L.x, level + 0.3, L.z), 14, Math.min(1, u))); b.rotation.x += dt * 12
          if (u >= 1) { ph = 'chase'; t0 = t; sprayAt(L, 30, [6, 12]); ripple(L, 2, 10); say('splash', L); mark('plop') }
          return true
        }
        if (ph === 'chase') {
          ballFloat(L); let first = null
          for (const k of [A, ...rest]) { const d = steer(k, L, dt, k.sp + 4, 3.2); float(k); if (d <= 3.2 && !first) first = k }
          if (first || t - t0 > 9) { ph = 'won'; t0 = t; if (first) got(first); else got(A) }
          return true
        }
        for (const k of [A, ...rest]) { if (k !== winner) { turn(k, headTo(k, winner.g.position), dt, 1.5); swell(k) } float(k) }
        ballHeld(winner)
        return t - t0 < 2.6
      },
    }
  }

  // HEAD BONK: the ball skips off the water and bonks the nearest one on the head (stars go round), pops up high, and another paddles under it and catches it
  ACTS.bonk = (p, [A, B, ...rest]) => {
    const L = A.g.position.clone().lerp(B.g.position, 0.6); L.y = level
    if (!onCove(L)) L.copy(B.g.position).setY(level)
    const st = starsProp()
    let ph = 'skip', t0 = 0, h0 = null, dizzy = 0, spB = 6
    return {
      step(dt, t) {
        for (const k of rest) watch(k, p, dt, 20)
        if (ph !== 'skip') float(A)
        if (ph === 'skip') { // off the water, up and onto the head
          float(A); swell(A); turn(A, headTo(A, p), dt, 0.8)
          const u = t / 0.85, b = ballProp(); b.visible = true; b.position.copy(arc(V(p.x, level + 0.3, p.z), head(A), 6, Math.min(1, u))); b.rotation.z += dt * 10
          float(B); swell(B)
          if (u >= 1) { ph = 'pop'; t0 = t; h0 = head(A); say('bonk', h0); mark('bonk'); dizzy = 2.4; spB = Math.min(15, Math.max(6, flat(B.g.position, L) / 1.5)) }
          return true
        }
        if (dizzy > 0) { // wobbling, the stars going round the cap
          dizzy -= dt; const w = Math.sin(ct * 11) * 0.35 * Math.min(1, dizzy); pose(A, w * 0.4, w); A.boat.rotation.x = w * 0.3
          st.visible = dizzy > 0; const c = head(A)
          st.children.forEach((m, i) => { const a = ct * 5 + (i / 5) * Math.PI * 2; m.position.set(c.x + Math.cos(a) * 1.1, c.y + 0.9, c.z + Math.sin(a) * 1.1); m.rotation.y += dt * 6 })
          if (dizzy <= 0) { pose(A); swell(A) }
        } else swell(A)
        const sB = steer(B, L, dt, spB, 2.2); float(B)
        if (ph === 'pop') { // up high, over to the catch
          const u = (t - t0) / 1.5, b = ballProp(); b.position.copy(arc(h0, V(L.x, level + 0.3, L.z), 9, Math.min(1, u))); b.rotation.z += dt * 8
          if (u >= 1) {
            if (sB <= 4.5) { ph = 'won'; t0 = t; got(B) }
            else { ph = 'float'; t0 = t; sprayAt(L, 20, [5, 10]); say('splash', L, { vol: 0.6 }); mark('plop') }
          }
          return true
        }
        if (ph === 'float') { ballFloat(L); if (sB <= 3 || t - t0 > 8) { ph = 'won'; t0 = t; got(B) } return true }
        ballHeld(B); turn(B, headTo(B, A.g.position), dt, 1.5)
        return t - t0 < 2.6 || dizzy > 0
      },
    }
  }

  function startAct(name, p0) {
    if (!kayaks.length || !ACTS[name]) return false
    if (act) endAct()
    winner = null
    const p = p0.clone(); p.y = level
    const near = kayaks.slice().sort((a, b) => flat(a.g.position, p) - flat(b.g.position, p))
    for (const k of kayaks) { k.act = true; k.back = 0 }
    act = { name, run: ACTS[name](p, near), t: 0, marks: [] }
    lastAct = name
    return true
  }
  // everyone gets their paddler back, rights the boat and paddles home
  function endAct() {
    if (!act) return
    const a = act
    act = null; lastMarks = a.marks
    try { a.run.end?.() } catch { /* the act is over anyway */ }
    for (const k of kayaks) { k.act = false; k.back = 1; kitShow(k, true); pose(k); roll(k, 0) }
    for (const g of [ballP, swimP, starP]) if (g) g.visible = false
  }
  const pickAct = () => { const n = Object.keys(ACTS).filter((k) => k !== lastAct); return n[Math.floor(Math.random() * n.length)] }
  // voxel ripples (28 Oct, night): rings of cubes that spread across the water, each cube riding the ring outward, fading in steps
  function ripple(at, rings = 4, R0 = 26) {
    const c = col(), cy = '#5fd3ff'
    for (let r = 0; r < rings; r++) {
      const n = 40, m = new THREE.InstancedMesh(bit, new THREE.MeshBasicMaterial({ color: r % 2 ? c.tx : cy, transparent: true, depthWrite: false, fog: false }), n), m4 = new THREE.Matrix4()
      m.position.copy(at); m.position.y += 0.3; scene.add(m)
      let t = -r * 0.22
      parts.push((dt) => {
        t += dt; const k = Math.max(0, t) / 1.6, R = 1 + k * R0, sz = 0.7 + k * 0.6
        for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; m4.makeScale(sz, sz * 0.5, sz).setPosition(Math.cos(a) * R, 0, Math.sin(a) * R); m.setMatrixAt(i, m4) }
        m.instanceMatrix.needsUpdate = true
        m.material.opacity = t < 0 ? 0 : step(1 - k) / STEPS
        if (k >= 1) { scene.remove(m); m.material.dispose(); return false }
        return true
      })
    }
  }
  // ---- a splash hit: ripple rings and droplets, then one of the acts ----
  function splash(at, noAct) {
    const c = col(), cy = '#5fd3ff'
    ripple(at)
    for (let i = 0; i < 36; i++) { const a = rnd(0, Math.PI * 2), up = rnd(9, 20), out = rnd(1, 6); particle(i % 3 ? cy : c.tx, at, V(Math.cos(a) * out, up, Math.sin(a) * out), rnd(1.1, 1.7), 1.2, 16) }
    o.sound?.('water')
    if (!noAct) startAct(pickAct(), at)
  }

  // ---- Karl the fog ----
  let fogOn = false, fogGroup = null, fog0 = null
  const fogTex = (() => {
    const N = 64, c = document.createElement('canvas'); c.width = c.height = N
    const g = c.getContext('2d'), B = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const d = Math.hypot(x - N / 2, (y - N / 2) * 1.6) / (N / 2), v = Math.max(0, 1 - d) ** 1.3
      if (v * 16 > B[y % 4][x % 4]) { g.fillStyle = '#fff'; g.fillRect(x, y, 1, 1) }
    }
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; return t
  })()
  // K1 WHISPER and K2 MARINE LAYER (28 Oct, Andrew: "too bright and imposing"): cold grey-blue, thin banks low over the bay and the outfield, none closer than 125 m
  // to the plate, so the infield and the ball's climb stay clear; K3 PEA SOUP is the 27 Oct fog. op = sprite opacity, near / far scale the scene's distance haze.
  const KARL = { 1: { op: 0.08, near: 0.85, far: 0.92, horn: 0.35 }, 2: { op: 0.15, near: 0.72, far: 0.82, horn: 0.5 }, 3: { op: 0.32, near: 0.5, far: 0.68, horn: 1, old: true } }
  let fogLevel = 1, banks = []
  function karl(on, level = fogLevel) {
    if (on === fogOn && level === fogLevel) return
    if (fogOn && fogGroup) { scene.remove(fogGroup); fogGroup = null }
    fogOn = on; fogLevel = level
    if (on) {
      const K = KARL[level] ?? KARL[1]
      o.sound?.('horn', { vol: K.horn })
      fogGroup = new THREE.Group()
      const m = new THREE.SpriteMaterial({ map: fogTex, color: K.old ? col().tx : '#9aa9ba', transparent: true, opacity: 0, depthWrite: false, fog: false })
      banks = []
      for (let i = 0; i < 11; i++) {
        const s = new THREE.Sprite(m), b = K.old ? rnd(-60, 60) : rnd(-55, 65), r = K.old ? rnd(40, 200) : rnd(125, 240), h = K.old ? rnd(18, 60) : rnd(3, 13)
        s.position.copy(toWorld([r * Math.sin((b * Math.PI) / 180), r * Math.cos((b * Math.PI) / 180), h]))
        if (K.old) s.scale.set(rnd(120, 220), rnd(40, 70), 1); else s.scale.set(rnd(90, 170), rnd(12, 22), 1)
        fogGroup.add(s); banks.push({ s, v: rnd(2.5, 5), r, h, b, old: K.old })
      }
      scene.add(fogGroup)
      if (scene.fog) { fog0 ??= [scene.fog.near, scene.fog.far]; scene.fog.near = fog0[0] * K.near; scene.fog.far = fog0[1] * K.far }
      let t = 0
      const g = fogGroup
      parts.push((dt) => {
        if (g !== fogGroup) { scene.remove(g); return false }
        t += dt; m.opacity = Math.min(K.op, t * 0.2)
        // K1 and K2 drift round their own ring (left field toward the bay), so a bank never comes nearer the plate; K3 slides sideways as on 27 Oct
        for (const k of banks) {
          if (k.old) { k.s.position.x += k.v * dt; if (k.s.position.x > 260) k.s.position.x = -260; continue }
          k.b += ((k.v / k.r) * 180 * dt) / Math.PI; if (k.b > 70) k.b = -60
          const br = (k.b * Math.PI) / 180; k.s.position.copy(toWorld([k.r * Math.sin(br), k.r * Math.cos(br), k.h]))
        }
        return true
      })
    } else {
      if (fogGroup) scene.remove(fogGroup)
      fogGroup = null
      if (scene.fog && fog0) { scene.fog.near = fog0[0]; scene.fog.far = fog0[1] }
    }
  }

  // the effects keep their own wall clock (steps of up to a quarter second): the engine hands frames a clamped step, so on a slow device the kayaks crawled
  let wall = performance.now()
  api.NN.frames.push(() => { const now = performance.now(), dt = Math.min(0.25, (now - wall) / 1000); wall = now; for (let i = parts.length - 1; i >= 0; i--) if (!parts[i](dt)) parts.splice(i, 1) })
  buildKayaks()
  return {
    contact, fly,
    land(ev, o = {}) { trailCol = null; if (ev.key === 'SPLASH') splash(ev.at, o.noAct); if (['GONE', 'NUKE', 'SPLASH', 'SCRAPER', 'POLE'].includes(ev.key) && style === 'confetti') confetti() },
    setStyle(v) { style = v }, style: () => style, confetti, particle, sq, STEPS,
    bonk(at) { for (let i = 0; i < 40; i++) { const a = rnd(0, Math.PI * 2), up = rnd(6, 16); particle(i % 2 ? '#e4002b' : '#ffffff', at, V(Math.cos(a) * rnd(3, 9), up, Math.sin(a) * rnd(3, 9)), rnd(0.9, 1.4), 1.3, 14) } },
    splash, karl, karlOn: () => fogOn, karlLevel: () => fogLevel, fogK: () => { const K = fogOn ? KARL[fogLevel] ?? KARL[1] : null; return K ? [K.near, K.far] : [1, 1] },
    // for the tests: each bank's distance from the plate in meters (the sideways drift can only take it farther) and its height, and the sprite opacity
    karlBanks: () => banks.map((k) => { const w = k.s.position, p0 = toWorld([0, 0, 0]); return { d: Math.hypot(w.x - p0.x, w.z - p0.z), h: k.h, op: k.s.material.opacity } }),
    count: () => parts.length, kayaks: () => kayaks.length,
    // for the tests: each kayak's height (its group sits at the waterline) and whether it is the voxel model
    kayakBoats: () => kayaks.map((k) => ({ y: k.home.y + 0.25, model: !!k.boat })),
    winner: () => winner,
    // the splash acts (1 Nov, later): force one at a point, their names, the one running (with its time and the beats it has hit), the last one's beats, stop it
    splashAct: (name, at) => startAct(name, at), splashActs: () => Object.keys(ACTS), lastSplashAct: () => lastAct, endSplashAct: endAct,
    actNow: () => (act ? { name: act.name, t: act.t, marks: act.marks.slice() } : null), actMarks: () => (act ? act.marks.slice() : lastMarks.slice()),
    kayakState: () => kayaks.map((k) => ({ x: k.g.position.x, z: k.g.position.z, act: k.act, roll: k.boat.rotation.x, kit: k.kit.length, shown: k.kit.every((m) => m.visible) })),
  }
}
