// Study 25 stage (4 Nov, night): data shown in the park itself, across every mode. Andrew: "If possible I'd love the data visuals to be diegetic / on the field in
// nature ... what are some other ones we could physically show on this to justify the full 3D model"; then, on the list: "Give me 2 as an option for me to look at.
// For 3 I like that idea but it could be tough to execute, try with multiple options for what the runners look like (crabs, ghosts, etc) and let me look ... Yes to 8
// as something I can see and choose, give me multiple options too. If any other trails / flight things that add oomph while it's in flight let me know. Sure to 10
// if we can do it, again as an option." Four switches, each off to start:
//   THE LIGHT TOWERS (TW): the lamps on the park's own light towers are the exit-speed meter
//   GHOST RUNNERS (GR): DINGER DEJA-VU's real runners on the bases, trotting home after a home run (with the batter)
//   THE ZONE GHOST (ZG): DINGER DEJA-VU's pitch, where it crossed the zone
//   FLIGHT TRAILS (TR): what the ball leaves behind as it flies and slows
import { voxCells } from './vox25.js'
import { NUKE_MARKS } from '../landing.js'
import { parkHit } from '../seance.js'

export const TOWER_LOOKS = [
  { c: 1, name: 'OFF', desc: 'the towers stay as they are' },
  { c: 2, name: 'BANK BY BANK', desc: 'the lamps come on one bank after another off the bat: the harder it is hit, the more of them; every one blinks when it goes out' },
  { c: 3, name: 'ALL AT ONCE', desc: 'every lamp at once, brighter the harder it is hit' },
  { c: 4, name: 'CHASE', desc: 'a light runs up and round the towers while the ball flies, faster the harder it was hit' },
]
export const RUNNER_LOOKS = [
  { c: 1, name: 'OFF', desc: 'no runners' },
  { c: 2, name: 'GHOSTS', desc: 'little sheet ghosts on the bases' },
  { c: 3, name: 'CRABS', desc: 'crabs, claws up, scuttling home' },
  { c: 4, name: 'LITTLE GIANTS', desc: 'tiny voxel ballplayers in cream, black caps' },
  { c: 5, name: 'GULLS', desc: 'seagulls, waddling round' },
  { c: 6, name: 'LITTLE BOYS', desc: 'the bombs themselves, waddling home' },
]
export const ZONE_LOOKS = [
  { c: 1, name: 'OFF', desc: 'no zone' },
  { c: 2, name: 'AT THE PLATE', desc: 'the zone its true size over the plate, a tunnel of rings from the mound to where the pitch crossed' },
  { c: 3, name: 'OVER THE PLATE', desc: 'a big ghost zone floating over home, nine boxes, the one it crossed lit' },
  { c: 4, name: 'ON THE GRASS', desc: 'the zone painted big on the grass in front of the plate, the spot it crossed lit' },
]
export const TRAIL_LOOKS = [
  { c: 1, name: 'OFF', desc: 'only the flight line' },
  { c: 2, name: 'SHEDDING', desc: 'the ball sheds voxels as it flies, big off the bat and smaller as it slows; they drift down and fade' },
  { c: 3, name: 'COMET', desc: 'a tail behind the ball, long when it is fast, shrinking as it slows' },
  { c: 4, name: 'SONIC RINGS', desc: 'a ring left every tenth of a second: far apart off the bat, bunching up as it slows' },
  { c: 5, name: 'EMBERS', desc: 'orange sparks thrown off the ball, more when it is fast' },
  { c: 6, name: 'AFTERIMAGES', desc: 'ghost copies of the ball left behind, fading' },
]

const BONE = '#e8e1c9', DIMC = '#2a2d33', ORANGE = '#ff7a00', FT = 0.3048
// the runners, as cells [x, y, z, color] (x across, y up, z toward the way they face)
const FIG = {
  2: () => { const c = [], W = '#f4f3ee'; for (let y = 0; y < 9; y++) { const r = y > 6 ? 1 : 2; for (let x = -r; x <= r; x++) for (let z = -1; z <= 1; z++) if (!(y === 0 && (x + 7) % 2)) c.push([x, y, z, W]) } c.push([-1, 6, 2, '#16181b'], [1, 6, 2, '#16181b']); return c },
  3: () => { const c = [], R = '#c8452c', D = '#8f2c1c'; for (let x = -3; x <= 3; x++) for (let z = -1; z <= 1; z++) c.push([x, 1, z, R]); for (let x = -2; x <= 2; x++) c.push([x, 2, 0, R]); for (const s of [-1, 1]) { c.push([s * 4, 2, 1, R], [s * 4, 3, 1, R], [s * 5, 4, 1, R], [s * 3, 4, 1, R]); for (const z of [-1, 0, 1]) c.push([s * 4, 0, z, D]) } c.push([-1, 3, 1, '#16181b'], [1, 3, 1, '#16181b']); return c },
  4: () => { const c = [], U = '#efe6cf', K = '#16181b', S = '#ff7a00', F = '#d9a27a'; for (const x of [-1, 1]) { c.push([x, 0, 0, K], [x, 1, 0, S], [x, 2, 0, U]) } for (let y = 3; y < 7; y++) for (let x = -1; x <= 1; x++) c.push([x, y, 0, U]); c.push([-2, 5, 0, U], [2, 5, 0, U]); for (let x = -1; x <= 1; x++) c.push([x, 7, 0, F], [x, 8, 0, F]); for (let x = -1; x <= 1; x++) c.push([x, 9, 0, K]); c.push([0, 9, 1, K], [0, 9, 2, K]); return c },
  5: () => { const c = [], W = '#f4f3ee', G = '#9aa0a8', Y = '#e8b33a'; for (let z = -2; z <= 2; z++) c.push([0, 2, z, W]); for (let z = -1; z <= 1; z++) c.push([0, 3, z, W]); c.push([0, 4, 2, W], [0, 5, 2, W], [0, 5, 3, Y], [0, 0, 0, Y], [0, 1, 0, Y]); for (const s of [-1, 1]) for (let z = -1; z <= 1; z++) c.push([s, 3, z, G]); return c },
  6: () => NUKE_MARKS[16](false, { giants: true }),
}

export function initStage25(api, o = {}) {
  const { THREE, scene } = api.NN
  const g = new THREE.Group(); g.name = 'stage25'; scene.add(g)
  const look = () => ({ tw: 1, gr: 1, zg: 1, tr: 1, ...(o.look?.() ?? {}) })
  const W = (x, y, z) => api.toWorld([x, y, z])
  const home = W(0, 0, 0)
  const now = () => performance.now()

  // ---- THE LIGHT TOWERS: found once by dropping rays over the outfield; a tall, thin thing standing over 30 m up is a tower. A bank of lamps on each ----
  let towers = null, lamps = null, lampOn = [], tw = { t0: -1e9, f: 0, gone: 0 }
  function findTowers() {
    if (towers) return towers
    const hits = []
    for (let b = -88; b <= 88; b += 1.5) for (let r = 60; r <= 220; r += 3) {
      const rad = (b * Math.PI) / 180, p = W(r * Math.sin(rad), r * Math.cos(rad), 90), h = parkHit(api.NN, p, new THREE.Vector3(0, -1, 0), 120)
      if (h && h.point.y > home.y + 33) hits.push(h.point.clone())
    }
    const groups = []
    for (const p of hits) { const k = groups.find((q) => Math.hypot(q.x - p.x, q.z - p.z) < 9); if (k) { k.n++; k.x += (p.x - k.x) / k.n; k.z += (p.z - k.z) / k.n; k.y = Math.max(k.y, p.y); k.xs.push(p.x); k.zs.push(p.z) } else groups.push({ x: p.x, y: p.y, z: p.z, n: 1, xs: [p.x], zs: [p.z] }) }
    towers = groups.filter((q) => q.n <= 30 && Math.max(...q.xs) - Math.min(...q.xs) < 14 && Math.max(...q.zs) - Math.min(...q.zs) < 14) // (thin: not the scoreboard, not a roof)
      .sort((a, b) => Math.atan2(a.x - home.x, home.z - a.z) - Math.atan2(b.x - home.x, home.z - b.z))
    return towers
  }
  function buildLamps() {
    if (lamps) return
    const T = findTowers(); if (!T.length) return
    const per = 12, n = T.length * per
    lamps = new THREE.InstancedMesh(new THREE.BoxGeometry(2, 2, 0.6), new THREE.MeshBasicMaterial({ fog: false }), n)
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler()
    T.forEach((t, k) => {
      e.set(0, Math.atan2(home.x - t.x, home.z - t.z), 0); q.setFromEuler(e)
      for (let i = 0; i < per; i++) { const cx = (i % 4) - 1.5, cy = Math.floor(i / 4); const off = new THREE.Vector3(cx * 2.5, cy * 2.5 + 3, 0).applyQuaternion(q); m4.compose(new THREE.Vector3(t.x, t.y, t.z).add(off), q, new THREE.Vector3(1, 1, 1)); lamps.setMatrixAt(k * per + i, m4); lamps.setColorAt(k * per + i, new THREE.Color(DIMC)) }
    })
    lamps.instanceMatrix.needsUpdate = true; lamps.instanceColor.needsUpdate = true
    lamps.renderOrder = 20; g.add(lamps); api.NN.hideForNormal?.push(lamps)
    lampOn = Array(n).fill(0)
  }
  const cA = new THREE.Color(DIMC), cB = new THREE.Color('#fffaf0'), cW = new THREE.Color()
  function paintLamps(t) {
    const L = look(); if (!lamps) return
    lamps.visible = L.tw > 1
    if (L.tw === 1) return
    const n = lampOn.length, age = t - tw.t0, f = tw.f
    for (let i = 0; i < n; i++) {
      let v = 0
      if (L.tw === 2) { const want = Math.round(f * n), on = i < want && age > i * (420 / Math.max(1, want)); v = on ? 1 : 0 }
      if (L.tw === 3) v = age < 6000 ? f * Math.min(1, age / 180) * (age > 4200 ? Math.max(0, 1 - (age - 4200) / 1800) : 1) : 0
      if (L.tw === 4) v = tw.flying ? (Math.floor(age / (140 - 90 * f)) % n === i || Math.floor(age / (140 - 90 * f) - n / 2) % n === i ? 1 : 0.12) : 0
      if (L.tw === 2 && age > 6500) v *= Math.max(0, 1 - (age - 6500) / 1500)
      if (tw.gone && t - tw.gone < 1400) v = Math.floor((t - tw.gone) / 175) % 2 ? 1 : 0.2 // (it went out: every lamp blinks)
      if (Math.abs(v - lampOn[i]) > 0.01) { lampOn[i] = v; lamps.setColorAt(i, cW.copy(cA).lerp(cB, v)); lamps.instanceColor.needsUpdate = true }
    }
  }

  // ---- FLIGHT TRAILS: one pool of cubes and one of rings, worked each frame ----
  const MAXC = 420, cubes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ fog: false, transparent: true, opacity: 0.85, depthWrite: false }), MAXC)
  cubes.instanceMatrix.setUsage(THREE.DynamicDrawUsage); cubes.count = 0; cubes.frustumCulled = false; g.add(cubes); api.NN.hideForNormal?.push(cubes)
  for (let i = 0; i < MAXC; i++) cubes.setColorAt(i, new THREE.Color(BONE))
  const parts = [], rings = []
  let fl = null // { last, t, v0, lastDrop, hist: [] }
  const m4 = new THREE.Matrix4(), qI = new THREE.Quaternion(), V = new THREE.Vector3(), Sc = new THREE.Vector3(), cc = new THREE.Color()
  function spawn(p) { made++; if (parts.length >= MAXC) parts.shift(); parts.push(p) }
  function ring(at, dir, size) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(size, 0.14, 4, 20), new THREE.MeshBasicMaterial({ color: BONE, transparent: true, opacity: 0.7, depthWrite: false, fog: false }))
    r.position.copy(at); r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize()); r.userData.t = now(); g.add(r); api.NN.hideForNormal?.push(r); rings.push(r)
  }
  let calls = 0, made = 0
  function fly(pos0, fr) {
    calls++
    const L = look(), t = now(), pos = pos0?.isVector3 ? pos0 : Array.isArray(pos0) ? W(...pos0) : null
    if (!pos) return
    if (!fl) fl = { last: pos.clone(), t, v0: 0, drop: t, hist: [] }
    const dt = Math.max(1, t - fl.t), v = pos.distanceTo(fl.last) / dt, dir = pos.clone().sub(fl.last)
    if (v > 0 && !fl.v0) fl.v0 = v
    const k = fl.v0 ? Math.max(0.15, Math.min(1.2, v / fl.v0)) : 1 // (how fast it is now, against off the bat)
    fl.hist.push({ p: pos.clone(), t }); if (fl.hist.length > 90) fl.hist.shift()
    // (spawned along the stretch since the last frame, each at its own moment, so the trail is the same at any frame rate)
    const along = (every, fn) => { const span = Math.max(1, t - fl.t); while (t - fl.drop >= every) { fl.drop += every; const f = Math.min(1, Math.max(0, 1 - (t - fl.drop) / span)); fn(fl.last.clone().lerp(pos, f), fl.drop) } }
    if (L.tr === 2) along(32, (p, at) => spawn({ p, v: new THREE.Vector3((Math.random() - 0.5) * 0.4, -0.2, (Math.random() - 0.5) * 0.4), s: 0.5 + 1.5 * k, t: at, life: 1400, col: BONE, g: 2.5 }))
    if (L.tr === 5) along(Math.max(6, 22 / k), (p, at) => spawn({ p, v: new THREE.Vector3((Math.random() - 0.5) * 7, Math.random() * 3 - 1, (Math.random() - 0.5) * 7), s: 0.3 + 0.35 * Math.random(), t: at, life: 520 + Math.random() * 300, col: Math.random() < 0.75 ? ORANGE : '#ffd2a0', g: 9 }))
    if (L.tr === 6) along(70, (p, at) => spawn({ p, v: new THREE.Vector3(), s: 2.1, t: at, life: 560, col: BONE, g: 0 }))
    if (L.tr === 4 && dir.lengthSq() > 1e-6) along(100, (p) => ring(p, dir, 1.3 + 1.2 * k))
    fl.k = k; fl.last.copy(pos); fl.t = t
  }
  function drawTrails(t, dt = 1 / 60) {
    const L = look()
    let n = 0
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i], a = (t - p.t) / p.life; if (a >= 1) { parts.splice(i, 1); continue } }
    for (const p of parts) {
      if (n >= MAXC) break
      const a = (t - p.t) / p.life
      p.v.y -= p.g * dt; p.p.addScaledVector(p.v, dt)
      const s = p.s * (1 - a)
      m4.compose(p.p, qI, Sc.set(s, s, s)); cubes.setMatrixAt(n, m4); cubes.setColorAt(n, cc.set(p.col)); n++
    }
    // COMET: the last stretch of the flight, as long as the ball is fast, tapering back
    if (L.tr === 3 && fl?.hist.length > 2 && flying) {
      const keep = Math.max(3, Math.round(4 + 40 * (fl.k ?? 1))), H = fl.hist.slice(-keep)
      H.forEach((h, i) => { if (n >= MAXC) return; const f = (i + 1) / H.length, s = 0.3 + 1.7 * f * (fl.k ?? 1); m4.compose(h.p, qI, Sc.set(s, s, s)); cubes.setMatrixAt(n, m4); cubes.setColorAt(n, cc.set(BONE).lerp(new THREE.Color(DIMC), 1 - f)); n++ })
    }
    cubes.count = n; cubes.instanceMatrix.needsUpdate = true; if (cubes.instanceColor) cubes.instanceColor.needsUpdate = true
    for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i], a = (t - r.userData.t) / 900; if (a >= 1) { g.remove(r); r.geometry.dispose(); r.material.dispose(); const h = api.NN.hideForNormal, k = h?.indexOf(r) ?? -1; if (k >= 0) h.splice(k, 1); rings.splice(i, 1); continue } r.scale.setScalar(1 + 0.6 * a); r.material.opacity = 0.7 * (1 - a) }
  }

  // ---- GHOST RUNNERS: on the bases for DINGER DEJA-VU's ball; after a home run, every runner and the batter trot home ----
  const BASES = [[0, 0], [19.4, 19.4], [0, 38.8], [-19.4, 19.4]].map(([x, y]) => W(x, y, 0))
  let crew = [], crewKey = '', crewLook = 0, trotT = 0
  function clearCrew() { for (const c of crew) g.remove(c.m); crew = []; crewKey = '' }
  function makeRunner(base, L) {
    const m = voxCells(THREE, FIG[L.gr](), L.gr === 6 ? 0.34 : 0.55) // (cartoon-big: they have to read from the broadcast camera)
    const p = BASES[base].clone(); if (base) p.lerp(BASES[(base + 1) % 4], 0.1) // (a little lead)
    m.position.copy(p); g.add(m)
    return { m, base, leg: base, s: 0 }
  }
  function sync({ ball, mode }) {
    const L = look()
    if (L.gr === 1 || !ball || mode !== 'replay') { if (crew.length) clearCrew(); return }
    const key = [ball.d, ball.b, ball.ev, L.gr].join()
    if (key === crewKey) return
    clearCrew(); crewKey = key; crewLook = L.gr; trotT = 0
    for (const [k, on] of [[1, ball.r1], [2, ball.r2], [3, ball.r3]]) if (on) crew.push(makeRunner(k, L))
  }
  function trot() { if (!crew.length && !crewKey) return; const L = look(); if (L.gr === 1) return; crew.push(makeRunner(0, L)); trotT = now() + 500 }
  function moveCrew(t, dt = 1 / 60) {
    for (const c of crew) {
      const bob = Math.abs(Math.sin(t / 140 + c.base)) * 0.12
      if (!trotT || t < trotT) { c.m.position.y = BASES[0].y + bob * 0.5; const nx = BASES[(c.base + 1) % 4]; c.m.rotation.y = Math.atan2(nx.x - c.m.position.x, nx.z - c.m.position.z); continue }
      if (c.done) continue
      const a = BASES[c.leg % 4], b = BASES[(c.leg + 1) % 4], d = a.distanceTo(b)
      c.s += (13 * dt) / d // (13 m/s: a brisk, cartoon trot)
      if (c.s >= 1) { c.s = 0; c.leg++; if (c.leg % 4 === 0) { c.done = true; c.m.visible = false; continue } }
      const A = BASES[c.leg % 4], B = BASES[(c.leg + 1) % 4]
      c.m.position.copy(A).lerp(B, c.s); c.m.position.y = A.y + bob * 4; c.m.rotation.y = Math.atan2(B.x - A.x, B.z - A.z)
    }
  }

  // ---- THE ZONE GHOST ----
  let zone = null, zoneKey = ''
  function clearZone() { if (zone) { g.remove(zone); zone.traverse((x) => { x.geometry?.dispose?.(); x.material?.dispose?.() }); const h = api.NN.hideForNormal; zone.traverse((x) => { const k = h?.indexOf(x) ?? -1; if (k >= 0) h.splice(k, 1) }) } zone = null; zoneKey = '' }
  function syncZone({ ball, mode }) {
    const L = look()
    if (L.zg === 1 || !ball || mode !== 'replay' || ball.px == null || ball.pz == null) { if (zone) clearZone(); return }
    const key = [ball.d, ball.b, ball.px, ball.pz, L.zg].join(); if (key === zoneKey) return
    clearZone(); zoneKey = key
    zone = new THREE.Group(); g.add(zone)
    const st = (ball.st ?? 3.4) * FT, sb = (ball.sb ?? 1.6) * FT, hw = 0.708 * FT, px = ball.px * FT, pz = ball.pz * FT
    const mat = (c, op = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: op < 1, opacity: op, depthWrite: op >= 1, fog: false })
    const bar = (a, b, w, c, op) => { const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.BoxGeometry(w, w, d.length()), mat(c, op)); m.position.copy(a).add(b).multiplyScalar(0.5); m.lookAt(b); zone.add(m); api.NN.hideForNormal?.push(m); return m }
    const cube = (p, s, c, op) => { const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), mat(c, op)); m.position.copy(p); zone.add(m); api.NN.hideForNormal?.push(m); return m }
    // where, in the zone's own frame (u across, v up), the pitch crossed; which of nine boxes
    const u = (px + hw) / (2 * hw), v = (pz - sb) / (st - sb), inZ = u >= 0 && u <= 1 && v >= 0 && v <= 1, bi = Math.min(2, Math.max(0, Math.floor(u * 3))), bj = Math.min(2, Math.max(0, Math.floor(v * 3)))
    const frame = (P, ux, vy, s, nine, flat = false) => { // P(u, v) -> world point; flat: lying on the grass
      const cs = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([a, b]) => P(a, b))
      for (let k = 0; k < 4; k++) bar(cs[k], cs[(k + 1) % 4], s, BONE, 0.85)
      if (nine) for (const f of [1 / 3, 2 / 3]) { bar(P(f, 0), P(f, 1), s * 0.5, BONE, 0.35); bar(P(0, f), P(1, f), s * 0.5, BONE, 0.35) }
      if (nine && inZ) { const c = P((bi + 0.5) / 3, (bj + 0.5) / 3); const m = cube(c, 1, ORANGE, 0.35); m.scale.set(ux / 3, flat ? 0.02 : vy / 3, flat ? vy / 3 : 0.02) }
    }
    if (L.zg === 2) {
      const P = (a, b) => W(-hw + a * 2 * hw, 0.2, sb + b * (st - sb)); frame(P, 2 * hw, st - sb, 0.025, false)
      const hit = W(px, 0.2, pz), from = W(0, 18.0, 1.85)
      for (let k = 1; k <= 12; k++) { const f = k / 13, p = from.clone().lerp(hit, f), r = new THREE.Mesh(new THREE.TorusGeometry(0.12 + 0.18 * (1 - f), 0.012, 4, 16), mat(BONE, 0.25 + 0.4 * f)); r.position.copy(p); r.lookAt(hit); zone.add(r); api.NN.hideForNormal?.push(r) }
      cube(hit, 0.11, ORANGE)
    } else if (L.zg === 3) {
      const K = 11, P = (a, b) => W((-hw + a * 2 * hw) * K, -0.5, 10 + (b - 0.5) * (st - sb) * K); frame(P, 2 * hw * K, (st - sb) * K, 0.16, true)
      cube(W(px * K, -0.45, 10 + ((pz - sb) / (st - sb) - 0.5) * (st - sb) * K), 0.7, ORANGE)
    } else {
      const K = 14, P = (a, b) => W((-hw + a * 2 * hw) * K, 3 + b * (st - sb) * K, 0.3); frame(P, 2 * hw * K, (st - sb) * K, 0.22, true, true)
      cube(W(px * K, 3 + v * (st - sb) * K, 0.4), 0.9, ORANGE)
    }
  }

  // ---- the clock ----
  let flying = false
  let lastT = now()
  api.NN.frames.push(() => { const t = now(), dt = Math.min(0.25, Math.max(0.001, (t - lastT) / 1000)); lastT = t; paintLamps(t); drawTrails(t, dt); moveCrew(t, dt) }) // (its own clock: the same speed at any frame rate)
  return {
    launch(ev) { flying = true; fl = null; if (crew.some((c) => c.done || c.leg !== c.base)) clearCrew(); // (each new swing puts the runners back where they were)
      tw = { t0: now(), f: Math.max(0.08, Math.min(1, (ev - 80) / (118 - 80))), gone: 0, flying: true }; if (look().tw > 1) buildLamps() },
    fly,
    land(hr) { flying = false; tw.flying = false; if (hr) { tw.gone = now(); trot() } fl = null },
    sync(x) { sync(x); syncZone(x); if (look().tw > 1) buildLamps(); if (lamps) lamps.visible = look().tw > 1 },
    towers: () => findTowers().map((t) => ({ x: +t.x.toFixed(1), y: +t.y.toFixed(1), z: +t.z.toFixed(1), n: t.n })),
    crew: () => crew.map((c) => ({ base: c.base, leg: c.leg, done: !!c.done })),
    zone: () => !!zone,
    parts: () => parts.length + rings.length,
    dbg: () => ({ calls, made, tr: look().tr, parts: parts.length, rings: rings.length }),
  }
}
