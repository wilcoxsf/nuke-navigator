// Study 25 effects in the park (no screen shake, nothing glows: flat squares and thin rings in the theme colors, with stepped fades so they read as pixels):
//   contact: a spark of squares at the plate during the hit-stop    flight: a pixel trail behind the ball
//   home run: confetti (F2) or the landing moments (moments25.js)    splash hit: ripple rings and droplets in McCovey Cove, and the Cove's kayakers race to the ball
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
  // shared materials per color and opacity step, so hundreds of short-lived squares cost little
  const sq = (c, a) => { const k = c + ':' + a; if (!mats.has(k)) mats.set(k, new THREE.SpriteMaterial({ color: c, transparent: true, opacity: a / STEPS, depthWrite: false, fog: false })); return mats.get(k) }
  const step = (x) => Math.max(0, Math.min(STEPS, Math.ceil(x * STEPS)))
  function particle(c, pos, vel, life, size, g = 9.8, drag = 0) {
    const s = new THREE.Sprite(sq(c, STEPS)); s.position.copy(pos); s.scale.setScalar(size); scene.add(s)
    const v = vel.clone(); let t = 0
    parts.push((dt) => {
      t += dt; v.y -= g * dt; if (drag) v.multiplyScalar(1 - drag * dt); s.position.addScaledVector(v, dt)
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
  const kayaks = []
  const HULLS = ['#e4002b', '#f2bc40', '#2f6fd6', '#1fa37a', '#f26b21', '#efe9dc']
  async function buildKayaks() {
    if (!o.cove) return
    const pts = []
    for (const dir of [14, 18, 22, 26, 30, 34, 38]) for (const ev of [114, 120]) {
      const res = api.fly({ ...api.state, ev, la: 27, dir, hand: -1, wind: 0, carry: 1, dws: 0, temp: 70 }, {})
      const L = window.__cp.findLanding?.(res.path)
      if (L?.kind === 'SPLASH') pts.push(L.point.clone())
    }
    if (pts.length < 2) return
    const M = await loadModels(THREE)
    if (!M.kayak) return
    const level = toWorld([0, 0, WATER_Z]).y // the sea's surface (water25.js): the hulls sit in it, not under it
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group(), boat = cloneModel(M.kayak, 1.6)
      boat.traverse((m) => { if (m.isMesh && m.material.name === '#e4002b') m.material.color.set(HULLS[i]) })
      g.add(boat)
      const p = pts[i % pts.length].clone().add(V(rnd(-14, 14), 0, rnd(-14, 14)))
      p.y = level - 0.25
      g.position.copy(p); g.rotation.y = rnd(0, Math.PI * 2)
      scene.add(g)
      kayaks.push({ g, boat, home: p.clone(), ph: rnd(0, 6), target: null, sp: rnd(5.5, 9), back: 0 })
    }
    let t = 0
    parts.push((dt) => {
      t += dt
      if (raceT > 0 && (raceT -= dt) <= 0) for (const k of kayaks) { k.target = null; k.back = 1 }
      for (const k of kayaks) {
        const g = k.g
        g.position.y = k.home.y + Math.sin(t * 1.4 + k.ph) * 0.12
        k.boat.rotation.x = Math.sin(t * 1.1 + k.ph) * 0.05 // a little roll on the swell
        if (k.cheer > 0) { k.cheer -= dt; g.position.y += Math.abs(Math.sin(k.cheer * 9)) * 0.9 } // the one who got the ball bounces
        const goal = k.target ?? (k.back > 0 ? k.home : null)
        if (goal) {
          const d = V(goal.x - g.position.x, 0, goal.z - g.position.z), dist = d.length()
          if (dist > 1.5) {
            const want = Math.atan2(-d.z, d.x), cur = g.rotation.y
            let dy = want - cur; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
            g.rotation.y = cur + Math.sign(dy) * Math.min(Math.abs(dy), 2.5 * dt)
            g.position.x += Math.cos(g.rotation.y) * k.sp * dt; g.position.z -= Math.sin(g.rotation.y) * k.sp * dt
            k.boat.rotation.x = Math.sin(t * 9 + k.ph) * 0.12 // paddling hard
          } else if (k.target && !winner) { winner = k; k.cheer = 1.8; o.onCatch?.(k) }
          else if (!k.target) k.back = 0
        }
      }
      return true
    })
  }
  let winner = null, raceT = 0
  function race(at) {
    if (!kayaks.length) return
    winner = null
    for (const k of kayaks) { k.target = at.clone(); k.back = 0 }
    raceT = 9
  }
  // ---- a splash hit: ripple rings and droplets, then the race ----
  function splash(at) {
    const c = col(), cy = '#5fd3ff'
    for (let r = 0; r < 4; r++) {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: r % 2 ? c.tx : cy, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false }))
      m.position.copy(at); m.position.y += 0.3; scene.add(m)
      let t = -r * 0.22
      parts.push((dt) => { t += dt; const k = Math.max(0, t) / 1.6; m.scale.setScalar(Math.max(0.01, 1 + k * 26)); m.material.opacity = t < 0 ? 0 : step(1 - k) / STEPS; if (k >= 1) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); return false } return true })
    }
    for (let i = 0; i < 36; i++) { const a = rnd(0, Math.PI * 2), up = rnd(9, 20), out = rnd(1, 6); particle(i % 3 ? cy : c.tx, at, V(Math.cos(a) * out, up, Math.sin(a) * out), rnd(1.1, 1.7), 1.2, 16) }
    o.sound?.('water')
    race(at)
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

  api.NN.frames.push((dt) => { for (let i = parts.length - 1; i >= 0; i--) if (!parts[i](Math.min(dt, 0.1))) parts.splice(i, 1) })
  buildKayaks()
  return {
    contact, fly,
    land(ev) { trailCol = null; if (ev.key === 'SPLASH') splash(ev.at); if (['GONE', 'NUKE', 'SPLASH', 'SCRAPER', 'POLE'].includes(ev.key) && style === 'confetti') confetti() },
    setStyle(v) { style = v }, style: () => style, confetti, particle, sq, STEPS,
    bonk(at) { for (let i = 0; i < 40; i++) { const a = rnd(0, Math.PI * 2), up = rnd(6, 16); particle(i % 2 ? '#e4002b' : '#ffffff', at, V(Math.cos(a) * rnd(3, 9), up, Math.sin(a) * rnd(3, 9)), rnd(0.9, 1.4), 1.3, 14) } },
    splash, karl, karlOn: () => fogOn, karlLevel: () => fogLevel,
    // for the tests: each bank's distance from the plate in meters (the sideways drift can only take it farther) and its height, and the sprite opacity
    karlBanks: () => banks.map((k) => { const w = k.s.position, p0 = toWorld([0, 0, 0]); return { d: Math.hypot(w.x - p0.x, w.z - p0.z), h: k.h, op: k.s.material.opacity } }),
    count: () => parts.length, kayaks: () => kayaks.length,
    // for the tests: each kayak's height (its group sits at the waterline) and whether it is the voxel model
    kayakBoats: () => kayaks.map((k) => ({ y: k.home.y + 0.25, model: !!k.boat })),
    winner: () => winner,
  }
}
