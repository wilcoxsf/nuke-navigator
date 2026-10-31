// Study 25 happenings around the park (29 Oct, later, Andrew: "more fun voxel happenings too"; 29 Oct, night: "Can we get more of those zany happenings?"): things going
// on while nobody is swinging, all in cubes. Always there: a Giants blimp circling high over the park, and a ferry crossing the bay beyond right field (the SPLASH
// HITS counter on the right-field wall went on 30 Oct). Now and then (one at a time, every 20 to 40 s, never while a ball is up):
//   SEAL         a seal bobs up in McCovey Cove, sometimes balancing a ball on its nose        MOLE      a mole in a hard hat pops out of the outfield grass and looks around
//   SERPENT      a sea serpent's three humps loop through the bay, then its head comes up     JETS      Fleet Week: five jets over the park with smoke trails
//   ESCAPEE      an Alcatraz escapee paddles a raft across the bay, ball and chain aboard      FRIES     a gull steals a fan's garlic fries in the stands
//   WHALE        a whale breaches beyond the Cove
// The park stands in the sea like an island (water25.js), and nothing else: 30 Oct, Andrew: "kill the entire road, buildings, etc in the background it's just the
// ballpark and the ocean" (King Street, Second Street, Mission Rock and its buildings went, and with them the startup, the IPO, the eviction, the driverless car and
// the cable car). Plate frame as everywhere: x to the right, y toward center field, z up, metres.
// Nothing starts while a ball is in the air, and the ones that come into the field or the Cove keep clear of the last flight's track and landing (its labels sit
// there). Oracle only. Under reduced motion nothing moves and nothing is scheduled. Sounds go out as window.__nnSound('happen-<name>-<beat>', { at }).
import { WATER_Z } from './water25.js'
import { FONT } from './vox25.js'
const GLYPH = { ...FONT, $: ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'], '!': ['#', '#', '#', '#', '#', '.', '#'] }
export const HAPPENINGS = ['seal', 'mole', 'serpent', 'jets', 'escapee', 'fries', 'whale']
export function initHappen25(api, o = {}) {
  const { THREE, scene } = api.NN
  const toWorld = window.__cp.toWorld, cube = new THREE.BoxGeometry(1, 1, 1), still = !!o.still
  const matC = {}, lam = (c) => (matC[c] ??= new THREE.MeshLambertMaterial({ color: c, flatShading: true }))
  const root = new THREE.Group(); scene.add(root)
  const P = (x, y, z = 0) => toWorld([x, y, z]), V = (x, y, z) => new THREE.Vector3(x, y, z)
  const sound = (k, at) => { try { window.__nnSound?.('happen-' + k, { at: at?.clone?.() ?? at }) } catch { /* the sound is optional */ } }
  const rnd = (a, b) => a + Math.random() * (b - a), pick = (l) => l[Math.floor(Math.random() * l.length)], ease = (k) => k * k * (3 - 2 * k)
  const build = (cells, size, parent = root) => { // [x, y, z, color] in cube units around the origin
    const g = new THREE.Group(), byC = {}, m4 = new THREE.Matrix4()
    for (const [x, y, z, c] of cells) (byC[c] ??= []).push([x, y, z])
    for (const [c, list] of Object.entries(byC)) { const m = new THREE.InstancedMesh(cube, lam(c), list.length); list.forEach(([x, y, z], i) => m.setMatrixAt(i, m4.makeScale(size, size, size).setPosition(x * size, y * size, z * size))); g.add(m) }
    parent.add(g); return g
  }
  const box = (out, x0, x1, y0, y1, z0, z1, c) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) out.push([x, y, z, typeof c === 'function' ? c(x, y, z) : c]) }
  const ell = (out, cx, cy, cz, rx, ry, rz, c) => { for (let x = Math.floor(cx - rx); x <= cx + rx; x++) for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let z = Math.floor(cz - rz); z <= cz + rz; z++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 <= 1) out.push([x, y, z, typeof c === 'function' ? c(x, y, z) : c]) }
  const text = (out, s, color, x0, y0, z) => { let x = x0; for (const ch of String(s).toUpperCase()) { const rows = GLYPH[ch] ?? GLYPH[' ']; rows.forEach((r, j) => [...r].forEach((q, i) => { if (q === '#') out.push([x + i, y0 + 6 - j, z, color]) })); x += rows[0].length + 1 } return x - x0 - 1 }
  const textW = (s) => [...String(s).toUpperCase()].reduce((w, ch) => w + (GLYPH[ch] ?? GLYPH[' '])[0].length + 1, -1)
  const along = (g, dx, dz) => { g.rotation.y = Math.atan2(-dz, dx) } // the model's +x along a world direction
  const facing = (g, at, to) => { g.rotation.y = Math.atan2(to.x - at.x, to.z - at.z) } // the model's +z toward a world point
  const kill = (g) => { g.parent?.remove(g); g.traverse((m) => m.isInstancedMesh && m.dispose()) }
  const sea = toWorld([0, 0, WATER_Z]).y, H0 = P(0, 0, 0), home = H0.clone()
  const plateZ = (w) => w.y - H0.y

  // ---------------- always there: the blimp and the ferry (29 Oct, later) ----------------
  const B = []
  for (let x = -11; x <= 11; x++) for (let y = -5; y <= 5; y++) for (let z = -5; z <= 5; z++) {
    const e = (x / 11) ** 2 + (y / 5) ** 2 + (z / 5) ** 2
    if (e > 1 || e < 0.6) continue
    const band = Math.abs(y) <= 1, sf = band && Math.abs(z) >= 4 && ((x >= -3 && x <= -1) || (x >= 1 && x <= 3)) && (y === 0 || x === -3 || x === 1)
    B.push([x, y, z, sf ? '#141414' : band ? '#fd5a1e' : '#d9dbe0'])
  }
  for (const [y, z] of [[0, 4], [0, -4], [4, 0], [-4, 0]]) for (let x = -13; x <= -10; x++) B.push([x, y + Math.sign(y) * (x + 13 > 1 ? 0 : 1), z + Math.sign(z) * (x + 13 > 1 ? 0 : 1), '#fd5a1e'])
  for (let x = -2; x <= 2; x++) for (let z = -1; z <= 1; z++) B.push([x, -6, z, '#2b2e33'])
  const blimp = build(B, 1.4)
  const mid = P(0, 90, 0)
  const F = []
  for (let x = -9; x <= 9; x++) for (let z = -3; z <= 3; z++) { const taper = Math.abs(x) > 7 ? Math.abs(x) - 7 : 0; if (Math.abs(z) > 3 - taper) continue; F.push([x, 0, z, '#f4f2ea'], [x, 1, z, Math.abs(z) === 3 - taper ? '#2f5bd3' : '#f4f2ea']) }
  for (let x = -6; x <= 5; x++) for (let z = -2; z <= 2; z++) for (let y = 2; y <= 3; y++) F.push([x, y, z, Math.abs(z) === 2 && x % 2 ? '#1f2a3a' : '#e9e6dc'])
  for (let y = 4; y <= 6; y++) F.push([1, y, 0, y === 6 ? '#fd5a1e' : '#141414'])
  const ferry = build(F, 1.2)

  // ---------------- the SPLASH HITS counter on the right-field wall (placed once the park model is in) ----------------
  let splashG = null, digits = null, splashN = 0, flipT = -1, nextN = 0
  const digitCells = (n) => { const c = []; text(c, String(n).padStart(3, '0'), '#fd5a1e', 0, 0, 0); return c }
  // on the face of the right-field wall toward the pole, below its top like the real outfield signs, so it never rises into the clearance tags over the wall
  let SPL = 0.3
  function placeSplash() {
    const b = 36, wl = window.__cp.wallAt?.(b) ?? [330, 25], d = wl[0] * 0.3048 - 0.45, r = (b * Math.PI) / 180, px = Math.sin(r) * d, py = Math.cos(r) * d
    SPL = Math.min(0.45, Math.max(0.18, (wl[1] * 0.3048 - 1.2) / 21))
    const g = new THREE.Group(), at = P(px, py, 0.6); g.position.copy(at); facing(g, at, home); root.add(g)
    const cells = [], w = textW('SPLASH HITS')
    box(cells, -2, w + 1, -2, 18, -1, -1, (x, y) => (x === -2 || x === w + 1 || y === -2 || y === 18 ? '#fd5a1e' : '#0d1f3a'))
    text(cells, 'SPLASH HITS', '#f4f2ea', 0, 9, 0)
    const panel = build(cells, SPL, g); panel.position.set(-(w / 2) * SPL, 2 * SPL, 0)
    splashG = g; setDigits(splashN)
  }
  function setDigits(n) {
    if (!splashG) return
    if (digits) kill(digits)
    digits = build(digitCells(n), SPL * 1.15, splashG)
    const w = textW(String(n).padStart(3, '0')) * SPL * 1.15
    digits.position.set(-w / 2, 2 * SPL + 0.2 * SPL, 0.2 * SPL)
  }
  // a downward ray into the park model: the plate height of its top surface at (x, y)
  const ray = new THREE.Raycaster()
  function topAt(x, y) {
    const st = window.__nn?.stadium
    if (!st) return null
    ray.set(P(x, y, 140), V(0, -1, 0)); ray.far = 200
    const hit = ray.intersectObject(st, true)[0]
    return hit ? plateZ(hit.point) : null
  }

  // ---------------- what is going on with the ball: keep out of its way ----------------
  const flying = () => { const cp = window.__cp, a = cp.anim?.(); return !!a && (cp.progress?.() ?? 1) < 1 }
  const clearOf = (w, r) => { // a world point well away from the last flight's track and landing (its labels stand there)
    const a = window.__cp.anim?.()
    if (!a) return true
    if (a.at && Math.hypot(a.at.x - w.x, a.at.z - w.z) < r) return false
    const pts = a.pts ?? []
    for (let i = 0; i < pts.length; i += 3) if (Math.hypot(pts[i].x - w.x, pts[i].z - w.z) < r) return false
    const se = window.__mix25?.seance?.()
    if (se?.at && Math.hypot(se.at.x - w.x, se.at.z - w.z) < r) return false
    return true
  }

  // ---------------- the happenings: start(arg) returns a stepper (dt, t) -> alive, and an end ----------------
  const live = new Set()
  const fly = (g) => { live.add(g); return g }
  const done = (g) => { live.delete(g); kill(g) }
  const H = {}
  // SEAL: up in the Cove, bobbing; half the time a ball on its nose
  H.seal = () => {
    const S = 0.45, C = []
    ell(C, 0, 3, 0, 2.2, 4.2, 2.0, (x, y) => (x >= 1 && y < 5 ? '#8a8178' : '#4f4a45'))
    ell(C, 1, 8, 0, 1.9, 1.7, 1.7, '#4f4a45')
    box(C, 2, 3, 7, 7, -1, 1, '#6a635c'); C.push([4, 7, 0, '#111'], [2, 9, -1, '#111'], [2, 9, 1, '#111'], [3, 7, -2, '#c9c4bc'], [3, 7, 2, '#c9c4bc'])
    box(C, 0, 1, 2, 3, -3, -3, '#4f4a45'); box(C, 0, 1, 2, 3, 3, 3, '#4f4a45')
    const spots = [[100, 45], [112, 78], [96, 105], [124, 58], [118, 120]].map(([x, y]) => P(x, y, WATER_Z)).filter((w) => clearOf(w, 30))
    if (!spots.length) return null
    const at = pick(spots), g = fly(build(C, S)), toHome = home.clone().sub(at)
    along(g, toHome.x, toHome.z)
    const ballOn = Math.random() < 0.5, bc = []
    ell(bc, 0, 0, 0, 1.3, 1.3, 1.3, (x, y) => (Math.abs(x - y) <= 0 ? '#d8262c' : '#f4f2ea'))
    const ball = build(bc, 0.3, g); ball.position.set(4.2 * S, 10.6 * S, 0); ball.visible = ballOn
    let hop = false, quit = -1
    return {
      step(dt, t) {
        if (quit < 0 && (flying() || t > 10)) quit = t
        const out = quit < 0 ? Math.min(1, t / 1.0) : Math.max(0, 1 - (t - quit) / 0.8)
        g.position.set(at.x, sea - 2.4 - (1 - out) * 3.2 + Math.sin(t * 2.4) * 0.25, at.z)
        g.rotation.z = ballOn ? 0.25 + Math.sin(t * 1.7) * 0.06 : Math.sin(t * 1.3) * 0.08
        if (t > 1.1 && t - dt <= 1.1) sound('seal-arf', at)
        if (ballOn) { ball.rotation.y += dt * 6; const k = t - 5.2; ball.position.y = 10.6 * S + (k > 0 && k < 0.9 ? 6 * k * (0.9 - k) * 4 : 0); if (!hop && k > 0) { hop = true; sound('seal-hop', at) } }
        return !(quit >= 0 && t - quit > 0.8)
      },
      end() { done(g) },
    }
  }
  // MOLE: out of the outfield grass in a hard hat, looks both ways, ducks
  H.mole = () => {
    let at = null
    for (let k = 0; k < 14 && !at; k++) {
      const b = rnd(-30, 30), wl = (window.__cp.wallAt?.(b) ?? [380])[0] * 0.3048, d = rnd(62, wl - 12), r = (b * Math.PI) / 180, w = P(Math.sin(r) * d, Math.cos(r) * d, 0)
      if (clearOf(w, 28)) at = w
    }
    if (!at) return null
    const S = 0.34, C = [], D = []
    ell(C, 0, 3, 0, 2.2, 3.4, 2.2, '#4a3426'); box(C, 2, 3, 3, 4, -1, 1, '#e89aa6'); C.push([4, 4, 0, '#c4566a'], [2, 5, -1, '#111'], [2, 5, 1, '#111'])
    box(C, 2, 2, 1, 2, -2, -2, '#e89aa6'); box(C, 2, 2, 1, 2, 2, 2, '#e89aa6')
    ell(C, 0, 6.6, 0, 2.5, 1.3, 2.5, (x, y) => (y <= 6 ? '#e0a21c' : '#f2c230')); C.push([2, 7, 0, '#f4f2ea'], [3, 7, 0, '#fff7c2'])
    for (let a = 0; a < 26; a++) { const ang = (a / 26) * Math.PI * 2, r = 3.4 + (a % 3) * 0.4; D.push([Math.round(Math.cos(ang) * r), a % 2, Math.round(Math.sin(ang) * r), a % 3 ? '#6b4a2c' : '#4f3520']) }
    const g = fly(build(C, S)), dirt = fly(build(D, S)), toHome = home.clone().sub(at)
    along(g, toHome.x, toHome.z); dirt.position.copy(at); dirt.scale.setScalar(0.001)
    let quit = -1
    return {
      step(dt, t) {
        if (quit < 0 && (flying() || t > 5)) { quit = t; sound('mole-duck', at) }
        if (t > 0.6 && t - dt <= 0.6) sound('mole-pop', at)
        if (t > 2.4 && t - dt <= 2.4) sound('mole-squeak', at)
        const up = quit < 0 ? ease(Math.min(1, Math.max(0, (t - 0.3) / 0.6))) : Math.max(0, 1 - (t - quit) / 0.25)
        dirt.scale.setScalar(Math.min(1, t / 0.4) * (quit < 0 ? 1 : Math.max(0.001, 1 - (t - quit - 1.2) / 0.8)))
        g.position.set(at.x, at.y - 7.5 * S + up * 7.5 * S, at.z)
        g.rotation.y = Math.atan2(-toHome.z, toHome.x) + (t > 1.4 && quit < 0 ? Math.sin((t - 1.4) * 2.4) * 0.8 : 0)
        return !(quit >= 0 && t - quit > 2.2)
      },
      end() { done(g); done(dirt) },
    }
  }
  // SERPENT: three humps looping through the bay beyond the Cove, then a head with a forked tongue; it dives
  H.serpent = () => {
    const S = 0.8, hump = []
    for (let x = -6; x <= 6; x++) for (let y = -2; y <= 6; y++) for (let z = -1; z <= 1; z++) {
      const d = Math.hypot(x, y)
      if (y >= -1 && Math.abs(d - 4) <= 1.3) hump.push([x, y, z, d < 3.6 ? '#7fbf7a' : '#2f7d4f'])
      if (z === 0 && y >= 0 && Math.abs(d - 5.6) <= 0.5 && x % 2 === 0) hump.push([x, y, z, '#f2c230'])
    }
    const hd = []
    box(hd, 0, 1, 0, 6, -1, 1, '#2f7d4f'); box(hd, -1, 4, 6, 8, -1, 1, '#2f7d4f'); box(hd, 2, 4, 6, 6, -1, 1, '#7fbf7a')
    hd.push([2, 9, -1, '#f2e14c'], [2, 9, 1, '#f2e14c'], [3, 9, -1, '#111'], [3, 9, 1, '#111'], [4, 6, -1, '#f4f2ea'], [4, 6, 1, '#f4f2ea'], [0, 9, 0, '#f2c230'], [-1, 9, 0, '#f2c230'])
    const base = P(170, 30, WATER_Z)
    if (!clearOf(base, 30) || !clearOf(P(170, 110, WATER_Z), 30)) return null
    const g = fly(new THREE.Group()); root.add(g); g.position.copy(base); along(g, 0, -1)
    const humps = [0, 1, 2].map(() => build(hump, S, g)), head = build(hd, S, g)
    const tongue = build([[5, 7, 0, '#d8262c'], [6, 7, -1, '#d8262c'], [6, 7, 1, '#d8262c']], S, head)
    sound('serpent-splash', base)
    let hiss = false
    return {
      step(dt, t) {
        const go = t * 4 // metres along the bay
        humps.forEach((h, i) => { const ph = t * 2.1 - i * 1.3; h.position.set(go - i * 13, Math.sin(ph) * 2.6 - 2.4 - (t > 12 ? (t - 12) * 3 : 0), 0); h.visible = t < 15 })
        const hk = t < 8 ? 0 : t < 9.2 ? ease((t - 8) / 1.2) : t < 12 ? 1 : Math.max(0, 1 - (t - 12) / 0.8)
        head.position.set(go + 13, -11 * S + hk * 11 * S, 0); head.rotation.y = t > 9.2 && t < 12 ? -0.9 + Math.sin((t - 9.2) * 2) * 0.4 : 0
        head.visible = hk > 0.01; tongue.visible = Math.floor(t * 5) % 3 === 0
        if (!hiss && t > 9) { hiss = true; sound('serpent-hiss', g.localToWorld(head.position.clone())) }
        return t < 15
      },
      end() { done(g) },
    }
  }
  // STARTUP: the sign on the roof comes down and a new company's goes up
  // JETS: Fleet Week, five in a delta over the park with smoke trails
  const JET = []
  box(JET, 0, 15, 0, 1, -1, 0, (x) => (x > 12 ? '#1d3f86' : '#14306b')); box(JET, 9, 11, 2, 2, -1, 0, '#8fd3ff')
  for (let x = 3; x <= 10; x++) { const w = Math.round((10 - x) * 0.9) + 1; box(JET, x, x, 0, 0, -1 - w, w, (xx, y, z) => (Math.abs(z + 0.5) >= w - 0.5 ? '#f2c230' : '#14306b')) }
  box(JET, 0, 2, 2, 5, -1, 0, '#14306b'); box(JET, 0, 0, 2, 5, -1, 0, '#f2c230')
  H.jets = () => {
    const S = 0.6, from = P(-430, -60, 95), to = P(430, 250, 95), dir = to.clone().sub(from), side = V(-dir.z, 0, dir.x).normalize(), fw = dir.clone().normalize()
    const off = [[0, 0], [-10, -8], [-10, 8], [-20, -16], [-20, 16]], jets = off.map(() => { const g = fly(build(JET, S)); along(g, dir.x, dir.z); return g })
    const N = 460, puff = new THREE.InstancedMesh(cube, lam('#f4f6fa'), N), pf = [], d = new THREE.Object3D()
    fly(puff); root.add(puff); puff.frustumCulled = false
    let next = 0, passed = false
    sound('jets-roar', from)
    return {
      step(dt, t) {
        const k = Math.min(1, t / 6.5)
        jets.forEach((g, i) => { const [b, s] = off[i]; g.position.copy(from).addScaledVector(dir, k).addScaledVector(fw, b).addScaledVector(side, s); g.visible = k < 1 })
        if (k < 1 && t > next) { next = t + 0.08; for (const g of jets) if (pf.length < N) pf.push({ p: g.position.clone().addScaledVector(fw, -1), b: t }) }
        pf.forEach((q, i) => { const a = t - q.b, sc = a > 3.5 ? 0.001 : Math.min(3, 1 + a * 1.2) * (1 - Math.max(0, a - 2.5)); d.position.copy(q.p); d.position.y -= a * 0.6; d.scale.setScalar(Math.max(0.001, sc)); d.updateMatrix(); puff.setMatrixAt(i, d.matrix) })
        for (let i = pf.length; i < N; i++) { d.scale.setScalar(0.001); d.updateMatrix(); puff.setMatrixAt(i, d.matrix) }
        puff.instanceMatrix.needsUpdate = true
        if (!passed && k > 0.5) { passed = true; sound('jets-pass', jets[0].position) }
        return t < 10.5
      },
      end() { for (const g of jets) done(g); done(puff) },
    }
  }
  // ESCAPEE: an Alcatraz escapee in stripes paddling a log raft across the bay, his ball and chain riding along
  H.escapee = () => {
    const S = 0.45, R = [], man = [], pad = []
    box(R, -5, 5, 0, 0, -4, 4, (x, y, z) => (z % 2 ? '#7a5230' : '#5f3e22')); box(R, -5, -5, 1, 1, -4, 4, '#3b2a1a')
    ell(R, 3, 2, 2, 1.1, 1.1, 1.1, '#111'); R.push([2, 1, 0, '#555'], [1, 1, -1, '#555'], [0, 1, -1, '#555'])
    box(man, 0, 1, 1, 3, 0, 1, (x, y) => (y % 2 ? '#111' : '#f2f2f2')); box(man, 0, 1, 4, 7, 0, 1, (x, y) => (y % 2 ? '#111' : '#f2f2f2')); box(man, 0, 1, 8, 9, 0, 1, '#e0b48a'); box(man, 0, 1, 10, 10, 0, 1, (x, y, z) => (x === z ? '#111' : '#f2f2f2'))
    box(pad, 0, 0, -3, 5, 0, 0, '#a0703f'); box(pad, 0, 0, -5, -4, -1, 1, '#a0703f')
    const from = P(192, 300, WATER_Z), to = P(168, 10, WATER_Z)
    if (!clearOf(P(170, 140, WATER_Z), 25)) return null
    const g = fly(new THREE.Group()); root.add(g); build(R, S, g)
    const m = build(man, S, g); m.position.set(-0.5 * S, 1 * S, -0.5 * S); const p = build(pad, S, m); p.position.set(1.5 * S, 6 * S, 1.5 * S)
    const dir = to.clone().sub(from); along(g, dir.x, dir.z)
    sound('escapee-siren', from)
    let strokes = 0
    return {
      step(dt, t) {
        const k = Math.min(1, t / 30)
        g.position.lerpVectors(from, to, k); g.position.y = sea + 0.1 + Math.sin(t * 1.8) * 0.15; g.rotation.z = Math.sin(t * 1.3) * 0.05
        p.rotation.x = Math.sin(t * 3.2) * 0.9; p.position.z = (Math.sin(t * 3.2) > 0 ? 1.5 : -0.5) * S
        if (Math.floor(t * 3.2 / Math.PI) > strokes) { strokes++; if (strokes % 3 === 0) sound('escapee-paddle', g.position) }
        return t < 30
      },
      end() { done(g) },
    }
  }
  // FRIES: a fan in the lower bowl with a boat of garlic fries; a gull comes in, takes the lot and goes; the fan stands up, arms in the air
  let fanSpots = null
  const findFans = () => { fanSpots = [[-36, 8], [-58, 24], [-76, 56], [60, 8], [64, 24], [66, 56]].map(([x, y]) => { const z = topAt(x, y); return z == null || z < 1.2 || z > 14 ? null : P(x, y, z) }).filter(Boolean) } // the lower bowl down both lines (foul ground is at field level)
  H.fries = () => {
    if (!fanSpots) findFans()
    const spots = (fanSpots ?? []).filter((w) => clearOf(w, 24))
    if (!spots.length) return null
    const at = pick(spots), S = 0.36, sit = [], up = [], tray = [], gull = []
    box(sit, 0, 1, 0, 1, 0, 3, '#2b2e33'); box(sit, 0, 1, 2, 6, -1, 0, '#fd5a1e'); box(sit, 0, 1, 7, 8, -1, 0, '#e0b48a'); box(sit, -1, 2, 9, 9, -2, 1, '#141414'); box(sit, 0, 1, 5, 5, 1, 3, '#fd5a1e')
    box(up, 0, 1, 0, 5, -1, 0, '#2b2e33'); box(up, 0, 1, 6, 10, -1, 0, '#fd5a1e'); box(up, 0, 1, 11, 12, -1, 0, '#e0b48a'); box(up, -1, 2, 13, 13, -2, 1, '#141414'); box(up, 0, 0, 10, 13, -3, -3, '#e0b48a'); box(up, 0, 0, 10, 13, 2, 2, '#e0b48a')
    box(tray, -1, 1, 0, 0, -1, 1, (x, y, z) => ((x + z) % 2 ? '#d8262c' : '#f4f2ea')); box(tray, -1, 1, 1, 2, -1, 1, (x, y, z) => ((x * 3 + z + y) % 2 ? '#f2c94c' : '#e3b13e'))
    box(gull, -1, 1, 0, 1, -3, 3, '#f2f0ea'); box(gull, -1, 1, 1, 2, 3, 4, '#f2f0ea'); gull.push([0, 1, 5, '#f2c230'], [0, 1, 6, '#f2c230'], [-1, 2, 4, '#111'], [1, 2, 4, '#111'])
    for (const s of [-1, 1]) for (let k = 2; k <= 8; k++) for (let z = -1; z <= 1; z++) gull.push([s * k, 1, z, k > 6 ? '#3a3f47' : '#9aa0a8'])
    const fan = fly(new THREE.Group()); root.add(fan); fan.position.copy(at); facing(fan, at, P(0, 60, 0))
    const gs = build(sit, S, fan), gu = build(up, S, fan); gu.visible = false
    const tr = build(tray, S * 0.9, fan); tr.position.set(0.5 * S, 6 * S, 3.6 * S)
    const gw = fly(build(gull, 0.42)), side = V(1, 0, 0).applyQuaternion(api.NN.camera.quaternion)
    const from = at.clone().addScaledVector(side, 45).add(V(0, 26, 0)), away = at.clone().addScaledVector(side, -70).add(V(0, 40, 0))
    let got = false
    return {
      step(dt, t) {
        const grab = fan.localToWorld(tr.position.clone())
        if (t < 2) { gw.position.lerpVectors(from, grab, ease(Math.min(1, t / 2))); gw.position.y += Math.sin(Math.min(1, t / 2) * Math.PI) * 4 }
        else gw.position.lerpVectors(grab, away, Math.min(1, (t - 2) / 3.4))
        const dd = (t < 2 ? grab.clone().sub(from) : away.clone().sub(grab)); gw.rotation.y = Math.atan2(dd.x, dd.z); gw.rotation.z = Math.sin(t * 14) * 0.3
        if (t > 1.1 && t - dt <= 1.1) sound('fries-caw', gw.position)
        if (!got && t >= 2) { got = true; fan.remove(tr); gw.add(tr); tr.position.set(0, -0.6, 2.3); sound('fries-grab', grab) }
        if (t > 2.3) { gs.visible = false; gu.visible = true; gu.rotation.y = Math.sin(t * 9) * 0.15; if (t - dt <= 2.3) sound('fries-hey', at) }
        return t < 6.2
      },
      end() { done(fan); done(gw) },
    }
  }
  // CABLECAR: one rolls the length of King Street on the rails, riders hanging off both sides, bell going
  // WHALE (29 Oct, later): up, a twist, a slap
  const Wc = []
  for (let x = -6; x <= 6; x++) for (let y = -2; y <= 2; y++) for (let z = -2; z <= 2; z++) { if ((x / 6.5) ** 2 + (y / 2.5) ** 2 + (z / 2.5) ** 2 > 1) continue; Wc.push([x, y, z, y <= -1 && x > -4 ? '#e9e6dc' : '#3a4250']) }
  for (const z of [-3, -2, 2, 3]) Wc.push([-7, 0, z, '#3a4250']); Wc.push([5, 1, 2, '#111'], [5, 1, -2, '#111'])
  const whale = build(Wc, 1.1); whale.visible = false
  const splash = build(Array.from({ length: 14 }, (_, i) => [((i * 7) % 9) - 4, 0, ((i * 5) % 7) - 3, '#e9f2ff']), 0.9); splash.visible = false
  let breaches = 0
  H.whale = () => {
    breaches++; whale.visible = true
    const w = P(215 + Math.random() * 60, 230 + Math.random() * 120, WATER_Z)
    sound('whale-blow', w)
    let slapped = false
    return {
      step(dt, t) {
        const u = t / 2.6, h = Math.max(-6, 22 * u * (1 - u) * 4 - 6)
        whale.position.set(w.x + u * 6, sea + h, w.z); whale.rotation.z = 1.2 - u * 2.2; whale.rotation.x = u * 1.4
        splash.visible = u > 0.85 && u < 1.25; if (splash.visible) { splash.position.set(w.x + 6, sea + (u - 0.85) * 18 - 20 * (u - 0.85) ** 2, w.z); splash.scale.setScalar(1 + (u - 0.85) * 4) }
        if (!slapped && u > 0.85) { slapped = true; sound('whale-slap', w) }
        return u < 1.3
      },
      end() { whale.visible = false; splash.visible = false },
    }
  }

  // ---------------- the scheduler: one at a time, every 20 to 40 s, never while a ball is up ----------------
  let t = 0, wall = performance.now(), active = null, nextAt = o.firstAt ?? 18, gap = [20, 40], bag = []
  const log = []
  function start(name, forced) {
    if (active) stop()
    const run = H[name]?.()
    if (!run) return false
    active = { name, run, t0: t, forced: !!forced }
    log.push({ name, start: t, end: null })
    return true
  }
  function stop() {
    if (!active) return
    try { active.run.end() } catch (e) { console.warn('happening end', active.name, e) }
    const l = log.findLast((x) => x.name === active.name && x.end == null); if (l) l.end = t
    active = null; nextAt = t + rnd(gap[0], gap[1])
  }
  function nextName() {
    if (!bag.length) bag = HAPPENINGS.slice().sort(() => Math.random() - 0.5)
    return bag.pop()
  }
  function step(dt) {
    t += dt
    if (!still) {
      // the blimp: a lap every four minutes, 120 m up, nose along its way; the ferry across the bay and back, a minute and a half each way
      const a = (t / 240) * Math.PI * 2, r = 230
      blimp.position.set(mid.x + Math.cos(a) * r, sea + 120 + Math.sin(t * 0.3) * 2, mid.z + Math.sin(a) * r); blimp.rotation.y = -a - Math.PI / 2
      const f = (t / 90) % 2, k = f < 1 ? f : 2 - f
      ferry.position.copy(P(300, -150 + k * 650, WATER_Z + 0.6)); ferry.rotation.y = f < 1 ? Math.PI / 2 : -Math.PI / 2
    }
    if (splashG && flipT >= 0) {
      flipT += dt
      if (flipT < 0.14) digits.scale.y = Math.max(0.001, 1 - flipT / 0.14)
      else if (splashN !== nextN) { splashN = nextN; setDigits(splashN); digits.scale.y = 0.001; sound('splash-flip', splashG.position) }
      else { digits.scale.y = Math.min(1, (flipT - 0.14) / 0.14); if (flipT > 0.28) { flipT = -1; digits.scale.y = 1 } }
    }
    // (30 Oct, later, Andrew: "The splash hit counter is in the wrong spot it looks awful - let's just kill it entirely"): the SPLASH HITS sign is never put up
    if (o.splashes && splashG && flipT < 0) { const n = Number(o.splashes()) || 0; if (n !== splashN) bump(n) }
    if (active) {
      let alive = false
      try { alive = active.run.step(dt, t - active.t0) } catch (e) { console.warn('happening', active.name, e) }
      if (!alive) stop()
    } else if (!still && t > nextAt && !flying()) {
      for (let k = 0; k < HAPPENINGS.length && !start(nextName()); k++);
      if (!active) nextAt = t + 5 // nothing could go (a ball's labels in the way): try again soon
    }
  }
  function bump(n) { nextN = n ?? splashN + 1; if (still) { splashN = nextN; setDigits(splashN); return } flipT = 0 }
  step(0)
  api.NN.frames.push(() => { const now = performance.now(), dt = Math.min(0.25, (now - wall) / 1000); wall = now; step(dt) })
  return {
    blimp, ferry, whale, breaches: () => breaches, breach() { start('whale', true) },
    force: (name) => start(name, true), stop, active: () => active?.name ?? null, clock: () => t, since: () => (active ? t - active.t0 : null), log: () => log.map((l) => ({ ...l })), names: HAPPENINGS.slice(),
    setGap(lo, hi) { gap = [lo, hi]; nextAt = Math.min(nextAt, t + hi) },
    splash: () => splashN, setSplash(n) { splashN = nextN = n; setDigits(n) }, bump,
    splashSign: () => splashG, root, live: () => live.size, groupOf: (name) => (active?.name === name ? [...live] : []),
    set visible(v) { root.visible = v },
  }
}
