// Study 25 landing impact (2 Nov, night, Andrew: "We can do better on voxel effects when it lands. I'd like the option for a scuba diver, we can get some more flavor
// to these rings, we can just get some oomph on this"; "more voxel oomph"). On top of the landing moments (moments25.js) and the Cove's splash (fx25.js):
//   LANDING IMPACT (LI in THE LAB): 1 AS IT WAS, nothing more; 2 BIG IMPACT:
//     in the seats: two shockwave rings of cubes running out over the seats, riding up and down like the wave as they go; chunks of seat (orange, bone, the dark of
//       the stands) thrown up and tumbling down; a slow dust column. A NUKE (460 ft and more, or way over the wall hard) puts up a little voxel mushroom cloud instead
//       of the dust: a stem and a cap that rolls outward as it climbs, then thins away in steps
//     in the Cove: a crown of water, tall thin cubes round the spot that jump up and fall back; a foam ring riding the first ripple; a spray column
//   THE COVE (CV in THE LAB): 1 THE KAYAKS (their five acts, as it was), 2 THE SCUBA DIVER, 3 EITHER (the diver about one splash in three).
//   THE SCUBA DIVER: bubbles come up where the ball went in; a voxel diver (black suit, yellow tank, ICE mask, orange fins) surfaces holding the ball up, gives it a
//   look, a thumbs up to the plate, and sinks back down in a last burst of bubbles. Nothing glows and nothing shakes the screen (fx25.js's rule); fades step.
import { WATER_Z } from './water25.js'
import { ORANGE } from './orange25.js'

export const IMPACTS = [
  { c: 1, name: 'AS IT WAS', desc: 'the landing moments and the splash, nothing more' },
  { c: 2, name: 'BIG IMPACT', desc: 'shockwave rings that ride over the seats like the wave, chunks of seat thrown up, a dust column (a mushroom cloud on a nuke); in the Cove a crown of water, foam on the ripple and a spray column' },
]
export const COVES = [
  { c: 1, name: 'THE KAYAKS', desc: 'one of the five kayak acts, as it was' },
  { c: 2, name: 'THE SCUBA DIVER', desc: 'bubbles, then a scuba diver comes up holding the ball, gives a thumbs up to the plate and goes back down' },
  { c: 3, name: 'EITHER', desc: 'the kayaks mostly; the diver about one splash in three' },
]

export function initImpact25(api, col) {
  const { THREE, scene, camera } = api.NN
  const toWorld = window.__cp.toWorld
  const V = (x, y, z) => new THREE.Vector3(x, y, z), rnd = (a, b) => a + Math.random() * (b - a)
  const level = () => toWorld([0, 0, WATER_Z]).y
  const STEPS = 4, bit = new THREE.BoxGeometry(1, 1, 1), mats = new Map(), lams = new Map()
  const fade = (c, a) => { const k = c + ':' + a; if (!mats.has(k)) mats.set(k, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: a / STEPS, depthWrite: false, fog: false })); return mats.get(k) }
  const lam = (c) => (lams.has(c) ? lams.get(c) : lams.set(c, new THREE.MeshLambertMaterial({ color: c, flatShading: true, fog: false })).get(c))
  const stepA = (x) => Math.max(0, Math.min(STEPS, Math.ceil(x * STEPS)))
  const runs = []
  let lastT = 0
  api.NN.frames.push(() => { const now = performance.now(), dt = Math.min(0.05, lastT ? (now - lastT) / 1000 : 0.016); lastT = now; for (let i = runs.length - 1; i >= 0; i--) if (!runs[i](dt)) runs.splice(i, 1) })
  const count = { rings: 0, chunks: 0, dust: 0, mush: 0, crown: 0, diver: 0 }
  // a ring of n cubes round c (an InstancedMesh): f(i, a, t) gives each cube's [x, y, z offset, size]; life seconds; stepped fade
  function ring(c, n, color, life, f, delay = 0) {
    const m = new THREE.InstancedMesh(bit, fade(color, STEPS), n), m4 = new THREE.Matrix4()
    m.position.copy(c); m.frustumCulled = false; m.visible = false; scene.add(m)
    let t = -delay
    runs.push((dt) => {
      t += dt
      if (t < 0) return true
      m.visible = true
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, [x, y, z, s] = f(i, a, t / life); m4.makeScale(s, s, s).setPosition(x, y, z); m.setMatrixAt(i, m4) }
      m.instanceMatrix.needsUpdate = true
      const k = stepA(1 - t / life); m.material = fade(color, Math.max(1, k))
      if (t >= life) { scene.remove(m); m.dispose?.(); return false }
      return true
    })
    count.rings++
  }
  // one tumbling cube with gravity; it stops on the floor y it is given and lies there till it fades
  function chunk(color, p, v, life, size, floor = -1e9) {
    const s = new THREE.Mesh(bit, lam(color)); s.position.copy(p); s.scale.setScalar(size); s.rotation.set(rnd(0, 3), rnd(0, 3), 0); scene.add(s)
    const vel = v.clone(), spin = V(rnd(-8, 8), rnd(-8, 8), 0); let t = 0
    runs.push((dt) => {
      t += dt; vel.y -= 22 * dt; s.position.addScaledVector(vel, dt)
      if (s.position.y < floor + size / 2) { s.position.y = floor + size / 2; vel.multiplyScalar(0.35); vel.y = Math.abs(vel.y) * 0.3; spin.multiplyScalar(0.5) }
      s.rotation.x += spin.x * dt; s.rotation.y += spin.y * dt
      if (t > life * 0.75) s.scale.setScalar(size * Math.max(0.01, 1 - (t - life * 0.75) / (life * 0.25)))
      if (t >= life) { scene.remove(s); return false }
      return true
    })
    count.chunks++
  }
  // a soft rising puff (stepped fade): dust, smoke, spray
  function puff(color, p, v, life, size, grow = 1.5) {
    const s = new THREE.Mesh(bit, fade(color, STEPS)); s.position.copy(p); s.scale.setScalar(size); s.rotation.y = rnd(0, 3); scene.add(s)
    let t = 0
    runs.push((dt) => { t += dt; s.position.addScaledVector(v, dt); v.multiplyScalar(1 - 0.8 * dt); s.scale.setScalar(size * (1 + grow * (t / life))); s.material = fade(color, Math.max(1, stepA(1 - t / life))); if (t >= life) { scene.remove(s); return false } return true })
    count.dust++
  }

  // ---- in the seats ----
  function seats(at, nuke) {
    const c = col(), acc = c.acc || ORANGE.o, nk = c.nk || '#9dff00', tx = c.tx || '#e8e1c9'
    // two shockwaves riding over the seats like the wave
    ring(at.clone().add(V(0, 0.4, 0)), 44, nk, 1.1, (i, a, k) => { const R = 1.5 + 22 * Math.sqrt(k), wave = Math.max(0, Math.sin(a * 6 - k * 14)) * 1.6 * (1 - k); return [Math.cos(a) * R, wave, Math.sin(a) * R, 0.9 - 0.4 * k] })
    ring(at.clone().add(V(0, 0.3, 0)), 36, acc, 1.3, (i, a, k) => { const R = 1 + 15 * Math.sqrt(k), wave = Math.max(0, Math.sin(a * 5 + k * 12)) * 1.2 * (1 - k); return [Math.cos(a) * R, wave, Math.sin(a) * R, 0.8 - 0.3 * k] }, 0.12)
    // chunks of seat
    const floor = at.y
    for (let i = 0; i < (nuke ? 30 : 18); i++) { const a = rnd(0, Math.PI * 2), out = rnd(2, nuke ? 9 : 6); chunk([acc, tx, '#3a3d42', '#1b1c1f'][i % 4], at.clone().add(V(0, 0.6, 0)), V(Math.cos(a) * out, rnd(7, nuke ? 18 : 13), Math.sin(a) * out), rnd(1.6, 2.6), rnd(0.45, 0.95), floor) }
    if (nuke) mushroom(at)
    else for (let i = 0; i < 10; i++) puff('#b9b4a5', at.clone().add(V(rnd(-1.5, 1.5), rnd(0.5, 2), rnd(-1.5, 1.5))), V(rnd(-0.6, 0.6), rnd(1.5, 3.2), rnd(-0.6, 0.6)), rnd(1.6, 2.4), rnd(1.2, 1.9))
  }
  // a little voxel mushroom cloud: the stem climbs, the cap rolls outward over it, both thin away in steps
  function mushroom(at) {
    const c = col(), hot = c.acc || ORANGE.o, warm = '#ffb347', bone = c.tx || '#e8e1c9', smoke = '#7c7a73'
    const H = 16, life = 3.4
    for (let j = 0; j < 9; j++) puff(j % 3 ? smoke : hot, at.clone().add(V(rnd(-0.8, 0.8), 0.5, rnd(-0.8, 0.8))), V(0, H / 1.6 * (0.6 + j / 12), 0), life * 0.8, 1.3 + 0.1 * j, 0.6)
    ring(at.clone().add(V(0, 0, 0)), 30, warm, life, (i, a, k) => { const up = H * Math.min(1, k * 1.6), R = 2 + 7 * Math.min(1, k * 1.3), roll = Math.sin(a * 3 + k * 6) * 0.8; return [Math.cos(a) * R, up + roll, Math.sin(a) * R, 1.9 - 0.6 * k] })
    ring(at.clone().add(V(0, 0, 0)), 22, hot, life, (i, a, k) => { const up = H * Math.min(1, k * 1.6) + 2.4, R = 1 + 4.5 * Math.min(1, k * 1.3); return [Math.cos(a) * R, up, Math.sin(a) * R, 2.1 - 0.7 * k] }, 0.05)
    ring(at.clone().add(V(0, 0, 0)), 16, bone, life * 0.9, (i, a, k) => { const up = H * Math.min(1, k * 1.6) + 4.2, R = 0.6 + 2.2 * Math.min(1, k * 1.3); return [Math.cos(a) * R, up, Math.sin(a) * R, 1.6 - 0.5 * k] }, 0.1)
    ring(at.clone().add(V(0, 0.3, 0)), 40, smoke, 1.6, (i, a, k) => { const R = 2 + 26 * Math.sqrt(k); return [Math.cos(a) * R, 0.2, Math.sin(a) * R, 1.0 - 0.5 * k] }) // the base surge
    count.mush++
  }

  // ---- in the Cove ----
  function cove(at) {
    const c = col(), cy = '#5fd3ff', tx = c.tx || '#e8e1c9', y0 = level()
    const p = V(at.x, y0, at.z)
    // the crown: tall thin cubes that jump up round the spot and fall back
    const n = 26, m = new THREE.InstancedMesh(bit, lam(cy), n), m4 = new THREE.Matrix4(), tilt = new THREE.Quaternion(), sc = V(1, 1, 1)
    m.position.copy(p); m.frustumCulled = false; scene.add(m)
    let t = 0
    runs.push((dt) => {
      t += dt
      const k = t / 1.2, h = Math.max(0, Math.sin(Math.min(1, k) * Math.PI)) * 5.5
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, R = 1.6 + 2.6 * k, hh = h * (0.7 + 0.3 * Math.sin(i * 2.7)); tilt.setFromAxisAngle(V(-Math.sin(a), 0, Math.cos(a)), 0.35 * k); sc.set(0.45, Math.max(0.01, hh), 0.45); m4.compose(V(Math.cos(a) * R, hh / 2, Math.sin(a) * R), tilt, sc); m.setMatrixAt(i, m4) }
      m.instanceMatrix.needsUpdate = true
      if (k >= 1) { scene.remove(m); return false }
      return true
    })
    count.crown++
    // foam riding the first ripple, and a second, slower ring
    ring(p.clone().add(V(0, 0.35, 0)), 48, tx, 1.7, (i, a, k) => { const R = 2 + 25 * k, bob = Math.sin(a * 9 + k * 20) * 0.25; return [Math.cos(a) * R, bob, Math.sin(a) * R, 0.55 + 0.2 * Math.sin(i)] })
    ring(p.clone().add(V(0, 0.3, 0)), 36, cy, 2.2, (i, a, k) => { const R = 1 + 16 * k; return [Math.cos(a) * R, 0, Math.sin(a) * R, 0.7 - 0.3 * k] }, 0.35)
    // the spray column
    for (let i = 0; i < 16; i++) puff(i % 3 ? cy : tx, p.clone().add(V(rnd(-0.6, 0.6), 0.4, rnd(-0.6, 0.6))), V(rnd(-1, 1), rnd(8, 15), rnd(-1, 1)), rnd(0.9, 1.4), rnd(0.5, 0.9), 0.4)
  }

  // ---- THE SCUBA DIVER ----
  let diverG = null
  function diverModel() {
    if (diverG) return diverG
    const g = new THREE.Group(), box = (c, w, h, d, x, y, z, parent = g) => { const m = new THREE.Mesh(bit, lam(c)); m.scale.set(w, h, d); m.position.set(x, y, z); parent.add(m); return m }
    const suit = '#16181b', tank = '#f2c400', glass = '#5ce1ff', fin = ORANGE.o, skin = '#e0b48a'
    box(suit, 0.5, 0.75, 0.36, 0, 0.75, 0) // the body
    box(tank, 0.3, 0.62, 0.26, 0, 0.82, -0.3); box('#8a8f99', 0.12, 0.12, 0.12, 0, 1.18, -0.3) // the tank and its valve
    box(suit, 0.36, 0.36, 0.36, 0, 1.32, 0) // the hood
    box(skin, 0.3, 0.12, 0.06, 0, 1.24, 0.19) // a strip of face under the mask
    box(glass, 0.32, 0.16, 0.08, 0, 1.38, 0.2); box(suit, 0.36, 0.05, 0.1, 0, 1.47, 0.2) // the mask, its strap
    box('#f2efe6', 0.06, 0.06, 0.18, 0.12, 1.2, 0.26) // the regulator
    box(suit, 0.18, 0.6, 0.2, -0.13, 0.15, 0); box(suit, 0.18, 0.6, 0.2, 0.13, 0.15, 0) // legs
    box(fin, 0.24, 0.06, 0.5, -0.13, -0.18, 0.18); box(fin, 0.24, 0.06, 0.5, 0.13, -0.18, 0.18) // fins
    // arms: the right holds the ball up, the left gives the thumbs up
    const arm = (s) => { const a = new THREE.Group(); a.position.set(s * 0.32, 1.05, 0); box(suit, 0.14, 0.55, 0.14, 0, 0.25, 0, a); box(suit, 0.16, 0.16, 0.16, 0, 0.56, 0, a); g.add(a); return a }
    const R = arm(1), L = arm(-1)
    const ball = new THREE.Group(); box('#f4f2ea', 0.32, 0.32, 0.32, 0, 0, 0, ball); box('#d62a2a', 0.34, 0.05, 0.08, 0, 0.06, 0, ball); box('#d62a2a', 0.34, 0.05, 0.08, 0, -0.06, 0, ball); ball.position.set(0, 0.8, 0); R.add(ball)
    const thumb = box(skin, 0.07, 0.16, 0.07, 0, 0.72, 0.04, L); thumb.visible = false
    g.userData = { R, L, ball, thumb }
    g.scale.setScalar(2.6); g.visible = false; scene.add(g); diverG = g
    return g
  }
  function diver(at) {
    const g = diverModel(), y0 = level(), p = V(at.x, y0, at.z), cam = camera.position, U = g.userData
    const cy = '#5fd3ff', tx = col().tx || '#e8e1c9'
    g.visible = false; g.rotation.set(0, Math.atan2(cam.x - p.x, cam.z - p.z), 0)
    let t = 0, bub = 0
    count.diver++
    const bubbles = (n, spread = 0.8) => { for (let i = 0; i < n; i++) puff(i % 2 ? cy : tx, p.clone().add(V(rnd(-spread, spread), 0.2, rnd(-spread, spread))), V(rnd(-0.3, 0.3), rnd(2, 4), rnd(-0.3, 0.3)), rnd(0.5, 0.9), rnd(0.25, 0.45), 0.2) }
    runs.push((dt) => {
      t += dt
      // bubbles first (0 to 1.6 s), up out of the water to the chest (to 2.4), the ball held up, a look, the thumbs up (to 5.4), then down again (to 6.6)
      if (t < 1.6) { if ((bub += dt) > 0.12) { bub = 0; bubbles(3) } return true }
      g.visible = true
      const rise = t < 2.4 ? (t - 1.6) / 0.8 : t < 5.4 ? 1 : Math.max(0, 1 - (t - 5.4) / 1.2), e = rise * rise * (3 - 2 * rise)
      g.position.set(p.x, y0 - 4.4 + e * 3.6 + (t > 2.4 && t < 5.4 ? Math.sin(t * 3) * 0.12 : 0), p.z)
      U.R.rotation.z = -Math.PI * (t < 2.4 ? 0.2 : 0.9) // the ball arm up
      U.R.rotation.x = t > 3 && t < 3.8 ? Math.sin((t - 3) * 8) * 0.15 : 0 // a look at it, turning it over
      const thumbs = t > 3.9 && t < 5.4
      U.L.rotation.z = thumbs ? Math.PI * 0.55 : Math.PI * 0.1; U.thumb.visible = thumbs
      if (t > 5.4 && (bub += dt) > 0.1) { bub = 0; bubbles(2, 0.5) }
      if (t >= 6.8) { g.visible = false; bubbles(8, 1); return false }
      return true
    })
  }
  return {
    // ev: the landing (dojo.js __cpOnLand: key, at); o.impact (LI), o.diver (play the diver on a splash)
    land(ev, o = {}) {
      if (!ev?.at) return
      const big = o.impact === 2
      if (ev.key === 'SPLASH') { if (big) cove(ev.at); if (o.diver) diver(ev.at); return }
      if (big && ['GONE', 'NUKE', 'SCRAPER'].includes(ev.key)) seats(ev.at, ev.key === 'NUKE') // (3 Nov, the color audit: POLE is a foul off the pole; GEIGER rings are for gone)
      else if (big && (ev.key === 'WALL' || ev.key === 'CLOSE')) for (let i = 0; i < 8; i++) puff('#b9b4a5', ev.at.clone().add(V(rnd(-1, 1), 0.5, rnd(-1, 1))), V(rnd(-1, 1), rnd(1, 2.5), rnd(-1, 1)), 1.4, 1, 1.2)
    },
    diver, mushroom, count: () => ({ ...count, live: runs.length }), diverShown: () => !!diverG?.visible,
  }
}
