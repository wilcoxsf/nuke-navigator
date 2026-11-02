// Study 25 happenings around the park (29 Oct, later, Andrew: "more fun voxel happenings too"; 29 Oct, night: "Can we get more of those zany happenings?"): things going
// on while nobody is swinging, all in cubes. Always there: a Giants blimp circling high over the park, and a ferry crossing the bay beyond right field (the SPLASH
// HITS counter on the right-field wall went on 30 Oct). Now and then (one at a time, every 20 to 40 s, never while a ball is up):
//   SEAL         a seal bobs up in McCovey Cove, sometimes balancing a ball on its nose        MOLE      a mole in a hard hat pops out of the outfield grass and looks around
//   SERPENT      a sea serpent's three humps loop through the bay, then its head comes up     JETS      Fleet Week: five jets over the park with smoke trails
//   ESCAPEE      an Alcatraz escapee paddles a raft across the bay, ball and chain aboard      FRIES     a gull steals a fan's garlic fries in the stands
//   WHALE        a whale breaches beyond the Cove                                             FLOCKED   gulls carry a Dodger fan out of the stands into the Cove
// The park stands in the sea like an island (water25.js), and nothing else: 30 Oct, Andrew: "kill the entire road, buildings, etc in the background it's just the
// ballpark and the ocean" (King Street, Second Street, Mission Rock and its buildings went, and with them the startup, the IPO, the eviction, the driverless car and
// the cable car). Plate frame as everywhere: x to the right, y toward center field, z up, metres.
// Nothing starts while a ball is in the air, and the ones that come into the field or the Cove keep clear of the last flight's track and landing (its labels sit
// there). Oracle only. Under reduced motion nothing moves and nothing is scheduled. Sounds go out as window.__nnSound('happen-<name>-<beat>', { at }).
import { WATER_Z } from './water25.js'
import { FONT } from './vox25.js'
const GLYPH = { ...FONT, $: ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'], '!': ['#', '#', '#', '#', '#', '.', '#'] }
export const HAPPENINGS = ['seal', 'mole', 'serpent', 'jets', 'escapee', 'fries', 'flocked', 'whale', 'crabs', 'heron']
export const ON_LANDING = ['hats'] // (1 Nov) this one only comes with a landing: onLand(ev). (1 Nov, later: the KAYAK TRAFFIC JAM went; a splash is the Cove's own kayakers now, fx25.js)
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
  // 31 Oct (Andrew: "The seagulls in the gag need to be the same as the other seagulls in the park"): FRIES and FLOCKED fly the park's own voxel gull (park25.js,
  // with the face chosen under GULL FACES), flapping, at a size that reads from the broadcast seat
  const parkGull = (s) => { const m = o.gull(); m.scale.setScalar(s); root.add(m); return m }
  const flapG = (m, t, f = 9) => { const w = m.userData.wings; if (!w) return; const a = still ? 0.2 : Math.sin(t * f) * 0.5; w[0].rotation.z = -a; w[1].rotation.z = a }
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
    const gw = fly(o.gull ? parkGull(1.4) : build(gull, 0.42)), side = V(1, 0, 0).applyQuaternion(api.NN.camera.quaternion)
    const from = at.clone().addScaledVector(side, 45).add(V(0, 26, 0)), away = at.clone().addScaledVector(side, -70).add(V(0, 40, 0))
    let got = false
    return {
      step(dt, t) {
        const grab = fan.localToWorld(tr.position.clone())
        if (t < 2) { gw.position.lerpVectors(from, grab, ease(Math.min(1, t / 2))); gw.position.y += Math.sin(Math.min(1, t / 2) * Math.PI) * 4 }
        else gw.position.lerpVectors(grab, away, Math.min(1, (t - 2) / 3.4))
        const dd = (t < 2 ? grab.clone().sub(from) : away.clone().sub(grab)); gw.rotation.y = Math.atan2(dd.x, dd.z); gw.rotation.z = Math.sin(t * 14) * 0.15; flapG(gw, t, t < 2 ? 8 : 14)
        if (t > 1.1 && t - dt <= 1.1) sound('fries-caw', gw.position)
        if (!got && t >= 2) { got = true; fan.remove(tr); gw.add(tr); tr.position.set(0, -0.6, 2.3); sound('fries-grab', grab) }
        if (t > 2.3) { gs.visible = false; gu.visible = true; gu.rotation.y = Math.sin(t * 9) * 0.15; if (t - dt <= 2.3) sound('fries-hey', at) }
        return t < 6.2
      },
      end() { done(fan); done(gw) },
    }
  }
  // FLOCKED (30 Oct, night): a Dodger fan stands up in the lower bowl on the right-field side; five gulls come round him, take hold, and carry him up and out over
  // the arcade, and let go over McCovey Cove; a splash, and his cap floats
  H.flocked = () => {
    if (!fanSpots) findFans()
    const spots = (fanSpots ?? []).filter((w) => w.x - home.x > 0 && clearOf(w, 24)) // the first-base side, the Cove behind it
    if (!spots.length) return null
    const at = pick(spots), S = 0.55, me = [], gull = [], cap = []
    box(me, 0, 1, 0, 5, -1, 0, '#8a8f99'); box(me, 0, 1, 6, 10, -1, 0, '#2f5bd3'); box(me, 0, 1, 11, 12, -1, 0, '#e0b48a'); box(me, -1, 2, 13, 13, -2, 1, '#2f5bd3'); box(me, 0, 0, 10, 13, -3, -3, '#e0b48a'); box(me, 0, 0, 10, 13, 2, 2, '#e0b48a') // blue shirt and cap, arms up
    box(gull, -1, 1, 0, 1, -3, 3, '#f2f0ea'); box(gull, -1, 1, 1, 2, 3, 4, '#f2f0ea'); gull.push([0, 1, 5, '#f2c230'], [0, 1, 6, '#f2c230'], [-1, 2, 4, '#111'], [1, 2, 4, '#111'])
    for (const s of [-1, 1]) for (let k = 2; k <= 8; k++) for (let z = -1; z <= 1; z++) gull.push([s * k, 1, z, k > 6 ? '#3a3f47' : '#9aa0a8'])
    box(cap, -1, 2, 0, 0, -2, 1, '#2f5bd3')
    const fan = fly(new THREE.Group()); root.add(fan); fan.position.copy(at); facing(fan, at, P(0, 60, 0)); build(me, S, fan)
    const G = [0, 1, 2, 3, 4].map((i) => ({ g: fly(o.gull ? parkGull(1.7) : build(gull, 0.65)), a: (i / 5) * Math.PI * 2, from: at.clone().add(V(Math.cos(i) * 40, 30 + i * 3, Math.sin(i) * 40)) }))
    const cove = P(108, 122, WATER_Z), capG = fly(build(cap, 0.5)); capG.visible = false
    let splashed = false
    return {
      step(dt, t) {
        const lift = t < 2.4 ? 0 : Math.min(1, (t - 2.4) / 3.2), arc = Math.sin(lift * Math.PI) * 26, drop = t > 5.6
        const carry = at.clone().lerp(cove, lift).add(V(0, arc + (lift > 0 ? 3 : 0), 0))
        if (!drop) fan.position.copy(carry); else { const u = t - 5.6; fan.position.copy(cove).add(V(0, Math.max(0, 26 * Math.sin(Math.PI * 0.98) + 3 - u * u * 30), 0)); fan.rotation.z = u * 4 } // let go of: down he goes
        fan.rotation.y += lift > 0 && !drop ? dt * 2 : 0
        G.forEach((q, i) => { const above = fan.position.clone().add(V(Math.cos(q.a + t * 3) * 2.4, 5.4 + (i % 2) * 0.6, Math.sin(q.a + t * 3) * 2.4)); if (t < 2.0) q.g.position.lerpVectors(q.from, above, ease(Math.min(1, t / 2))); else if (!drop) q.g.position.copy(above); else q.g.position.add(V(Math.cos(q.a) * dt * 14, dt * 9, Math.sin(q.a) * dt * 14)); q.g.rotation.z = Math.sin(t * 16 + i) * 0.12; q.g.rotation.y = q.a + t; flapG(q.g, t + i, drop ? 16 : 12) }) // circling, holding on, scattering
        if (drop && !splashed && fan.position.y <= cove.y + 0.5) { splashed = true; fan.visible = false; capG.visible = true; capG.position.copy(cove).add(V(0, 0.4, 0)); sound('whale-slap', cove) }
        if (capG.visible) capG.rotation.y += dt
        if (t > 0.6 && t - dt <= 0.6) sound('fries-caw', at)
        return t < 9.0
      },
      end() { done(fan); for (const q of G) done(q.g); done(capG) },
    }
  }
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

  // ---------------- 1 Nov (Andrew, of GPT's second list: "On happeneings I like C2, C4, C7, C8, C9, C11 (might be tough)"): four of them live here ----------------
  // (C4, the glove catching fog, and C7, the clock, belong to the glove and the clock.) Two come by chance (CRABS, HERON) and one on a landing (HATS on a home run
  // into the right-field arcade; onLand below decides). The arcade is the strip behind the right-field wall, 7.3 m up and 8 m deep, then the Cove.
  const rf = (b, d, z) => { const w = (window.__cp.wallAt?.(b) ?? [340])[0] * 0.3048 + d, r = (b * Math.PI) / 180; return P(Math.sin(r) * w, Math.cos(r) * w, z) }
  const ARC_Z = 7.3
  const SPRAY = []
  for (let i = 0; i < 16; i++) SPRAY.push([((i * 7) % 9) - 4, i % 3, ((i * 5) % 7) - 3, i % 4 ? '#e9f2ff' : '#bcd8f2'])
  const splashAt = (at, s = 0.5) => { const g = fly(build(SPRAY, s)); g.position.copy(at); g.visible = false; return g }
  // a splash that rises and falls in a second
  const spray = (g, u) => { g.visible = u > 0 && u < 1; if (g.visible) { g.scale.set(1 + u * 1.5, Math.max(0.05, 4 * u * (1 - u) * 2.2), 1 + u * 1.5) } }
  // HATS: a row of fans in the right-field arcade; the one nearest the landing loses his cap, then the next, and the next, down the row; the last cap sails out
  // into the Cove. Nobody gets up.
  const SHIRTS = ['#fd5a1e', '#141414', '#f4f2ea', '#fd5a1e', '#8a8f99', '#141414', '#fd5a1e', '#f4f2ea', '#141414']
  H.hats = (arg) => {
    let b0 = 34
    if (arg) { const H2 = P(0, 0, 0), x = arg.x - H2.x, y = H2.z - arg.z; b0 = Math.min(43, Math.max(25, (Math.atan2(x, y) * 180) / Math.PI)) }
    const sgn = b0 < 35 ? 1 : -1, S = 0.55, N = 7, STEP = 2, bs = sgn > 0 ? Math.min(Math.max(b0, 25), 31) : Math.min(Math.max(b0, 38), 44) // the row runs away from the landing, inside the arcade
    const fans = SHIRTS.slice(0, N).map((shirt, i) => {
      const at = rf(bs + sgn * i * STEP, 3.2, ARC_Z), body = [], cap = []
      box(body, 0, 1, 0, 1, 0, 3, '#2b2e33'); box(body, 0, 1, 2, 6, -1, 0, shirt); box(body, 0, 1, 7, 8, -1, 0, '#e0b48a')
      box(cap, -1, 2, 0, 0, -2, 1, i % 2 ? '#141414' : '#fd5a1e'); box(cap, 3, 4, 0, 0, -1, 0, i % 2 ? '#141414' : '#fd5a1e'); cap.push([0, 1, -1, i % 2 ? '#fd5a1e' : '#141414'], [1, 1, 0, i % 2 ? '#fd5a1e' : '#141414']) // a cap and its brim
      const g = fly(new THREE.Group()); root.add(g); g.position.copy(at); facing(g, at, home); build(body, S, g)
      const cg = build(cap, S, g); cg.position.set(0, 9 * S, 0)
      return { g, cg, t0: 0.8 + i * 0.45, last: i === N - 1 }
    })
    const cove = rf(bs + sgn * N * STEP, 26, WATER_Z), plop = splashAt(cove.clone().setY(sea), 0.4)
    let splashed = -1
    sound('hats-pop', fans[0].g.position)
    return {
      step(dt, t) {
        for (const f of fans) {
          const u = t - f.t0
          if (u < 0) continue
          if (!f.last) { // up, a spin, and back down on his head
            const k = Math.min(1, u / 0.7); f.cg.position.set(0, 9 * S + 4 * k * (1 - k) * 2.6, 0); f.cg.rotation.y = k * Math.PI * 2
            if (u - dt < 0) sound('hats-pop', f.g.position)
          } else { // the last one: off into the Cove
            if (f.cg.parent === f.g) { const w = f.g.localToWorld(f.cg.position.clone()); f.g.remove(f.cg); root.add(f.cg); f.cg.position.copy(w); f.from = w; sound('hats-whee', w) }
            const k = Math.min(1, u / 2.4)
            if (k < 1) { f.cg.position.lerpVectors(f.from, cove.clone().setY(sea + 0.3), k); f.cg.position.y += Math.sin(k * Math.PI) * 14; f.cg.rotation.y += dt * 9; f.cg.rotation.z = Math.sin(u * 6) * 0.5 }
            else { if (splashed < 0) { splashed = t; sound('hats-plop', cove) } f.cg.position.y = sea + 0.25 + Math.sin(t * 2) * 0.1; f.cg.rotation.z = 0; f.cg.rotation.y += dt * 0.6 }
          }
        }
        spray(plop, splashed < 0 ? -1 : (t - splashed) / 0.7)
        return t < (fans.at(-1).t0 + 6.5)
      },
      end() { for (const f of fans) { done(f.g); if (f.cg.parent === root) done(f.cg) } done(plop) },
    }
  }
  // CRABS: six orange crabs scuttle single file along the arcade under a little walk signal; it turns to the red hand, five stop, the sixth does not and the
  // pile-up goes down the line; it flips on its back, legs going; the signal changes back, it rights itself, and they all march off the edge into the Cove
  const crabCells = (legPh) => {
    const C = []
    ell(C, 0, 1, 0, 2.6, 1.1, 1.7, (x, y) => (y >= 2 ? '#ff7a3c' : '#e2531f'))
    C.push([-1, 3, 1, '#141414'], [1, 3, 1, '#141414'], [-1, 2, 1, '#e2531f'], [1, 2, 1, '#e2531f']) // eyes on stalks, toward the field
    for (const s of [-1, 1]) { box(C, s * 3, s * 3, 1, 1, 2, 3, '#e2531f'); box(C, s * 3 - 1, s * 3 + 1, 1, 2, 4, 4, '#ff7a3c'); C.push([s * 3 + s, 2, 5, '#ff7a3c'], [s * 3 - s, 1, 5, '#ff7a3c']) } // the claws, open
    for (const s of [-1, 1]) for (const z of [-1, 0, 1]) C.push([s * 3, (z + legPh) % 2 ? 0 : 1, z - 1, '#c9441a'], [s * 4, 0, z - 1, '#c9441a']) // the legs, in two steps
    return C
  }
  const SIG = [], SIG_W = [], SIG_R = []
  box(SIG, 0, 0, 0, 9, 0, 0, '#2b2e33'); box(SIG, -2, 2, 10, 15, -1, -1, '#141414')
  box(SIG_W, -1, 1, 11, 14, 0, 0, '#141414'); SIG_W.push([0, 14, 0, '#f4f2ea'], [0, 13, 0, '#f4f2ea'], [-1, 12, 0, '#f4f2ea'], [1, 12, 0, '#f4f2ea'], [0, 12, 0, '#f4f2ea'], [-1, 11, 0, '#f4f2ea'], [1, 11, 0, '#f4f2ea']) // the walking man
  box(SIG_R, -1, 1, 11, 14, 0, 0, '#ff3b2f'); SIG_R.push([0, 14, 0, '#141414']) // the red hand
  H.crabs = () => {
    const B0 = 25, B1 = 44.5, mid = rf(35, 4, ARC_Z)
    if (!clearOf(mid, 22)) return null
    const S = 0.6, n = 6, GAP = 4.2, STOP = 33 // the lead crab stops at this bearing (each crab 3 m across: they read from the broadcast seat)
    const sig = fly(new THREE.Group()); root.add(sig); const sAt = rf(STOP + 2, 7, ARC_Z); sig.position.copy(sAt); facing(sig, sAt, home); build(SIG, S, sig)
    const walk = build(SIG_W, S, sig), red = build(SIG_R, S, sig); red.visible = false
    const crabs = Array.from({ length: n }, () => { const g = fly(new THREE.Group()); root.add(g); const a = build(crabCells(0), S, g), b = build(crabCells(1), S, g); b.visible = false; return { g, a, b, s: 0, flip: 0, z: ARC_Z, out: 0 } })
    const metres = (b) => (b * Math.PI) / 180 * ((window.__cp.wallAt?.(b) ?? [340])[0] * 0.3048 + 4) // arc length to a bearing, near enough
    const sStop = metres(STOP) - metres(B0), sEnd = metres(B1) - metres(B0), SPD = 3.4
    crabs.forEach((c, i) => { c.s = -i * GAP })
    let state = 'go', crashT = -1, greenT = 0
    sound('crabs-click', mid)
    return {
      step(dt, t) {
        const lead = crabs[0], last = crabs[n - 1]
        if (state === 'go' && lead.s >= sStop - 5) { state = 'red'; walk.visible = false; red.visible = true; sound('crabs-beep', sAt) } // the hand comes up as the first nears it
        if (state === 'red' && crashT > 0 && t > crashT + 3.6) { state = 'go2'; greenT = t; walk.visible = true; red.visible = false; sound('crabs-beep', sAt) }
        crabs.forEach((c, i) => {
          if (state === 'red' && i < n - 1) c.s = Math.min(c.s + SPD * dt, Math.max(c.s, sStop - i * GAP)) // five stop in a tidy line
          else if (state === 'red' && crashT < 0) { c.s += SPD * 1.3 * dt; if (c.s >= crabs[i - 1].s - 2.2) { c.s = crabs[i - 1].s - 2.2; crashT = t; sound('crabs-crunch', c.g.position) } } // the sixth does not
          else if (state !== 'red' || (i === n - 1 && crashT < 0)) c.s += SPD * dt * (state === 'go2' && c === last && t - greenT < 0.6 ? 0 : 1) // (the sixth rights itself first)
        })
        // the pile-up: a shove runs up the line; the sixth flips on its back, legs going, until the signal changes
        crabs.forEach((c, i) => { const u = crashT > 0 ? t - crashT - (n - 1 - i) * 0.12 : -1; c.shove = u > 0 && u < 0.35 ? Math.sin((u / 0.35) * Math.PI) * 1.4 : 0 })
        last.flip = crashT > 0 && state === 'red' ? Math.min(1, (t - crashT) / 0.3) : Math.max(0, last.flip - dt * 3)
        crabs.forEach((c, i) => {
          const s = c.s + c.shove, past = Math.max(0, s - sEnd) // past the end of the arcade: out over the edge and down into the Cove
          const b = B0 + ((B1 - B0) * Math.min(s, sEnd)) / sEnd, d = 4 + past * 0.9
          const p = rf(b, d, ARC_Z), fall = d > 10 ? Math.min(ARC_Z - WATER_Z, (d - 10) ** 2 * 0.9) : 0
          c.g.position.copy(p); c.g.position.y -= fall
          if (fall >= ARC_Z - WATER_Z && !c.wet) { c.wet = true; sound('crabs-plop', p) }
          c.g.visible = s > 0 && !c.wet
          facing(c.g, p, home) // the front toward the field: they go sideways, as crabs do
          c.g.rotation.z = c === last ? c.flip * Math.PI : 0; if (c === last) c.g.position.y += c.flip * 1.3
          const moving = state !== 'red' || (i === n - 1 && crashT < 0) || (c === last && c.flip > 0.5)
          const ph = moving ? Math.floor(t * 8 + i) % 2 : 0; c.a.visible = !ph; c.b.visible = !!ph
        })
        return t < 30 && !crabs.every((c) => c.wet)
      },
      end() { for (const c of crabs) done(c.g); done(sig) },
    }
  }
  // HERON: a great blue heron flies in off the bay and lands on top of the right-field foul pole; the pole bends; it edges down to even it out; the pole springs
  // back straight and flings it off over the Cove. Most likely at dusk in San Francisco (16:00 to 20:59 there), but it can come any time.
  const POLE = [66.32, 67.36, 33.2] // the model's pole top (wind25.js), plate frame
  const dusk = () => { try { const h = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hour12: false })); return h >= 16 && h <= 20 } catch { return true } }
  const HER = [], WING = []
  ell(HER, 0, 9, 0, 3, 1.5, 1.3, (x, y) => (y >= 10 ? '#5f7186' : '#7d8fa3')); box(HER, -4, -3, 9, 9, 0, 0, '#5f7186')
  for (let k = 0; k <= 4; k++) HER.push([2 + Math.floor(k / 3), 10 + k, 0, '#c9d3dc']) // the long neck
  box(HER, 3, 4, 15, 15, 0, 0, '#f4f2ea'); HER.push([2, 16, 0, '#141414'], [1, 16, 0, '#141414'], [4, 15, 1, '#141414']); box(HER, 5, 7, 15, 15, 0, 0, '#f2c230') // a white head, a black crest, the bill
  for (const z of [-1, 1]) box(HER, 0, 0, 0, 7, z, z, '#c9a24a') // the long legs
  for (const s of [-1, 1]) for (let x = -3; x <= 2; x++) for (let k = 1; k <= 7; k++) if (k <= 7 - Math.abs(x + 0.5)) WING.push([x, 10, s * (1 + k), k > 5 ? '#2f3a48' : '#5f7186'])
  H.heron = (arg, forced) => {
    if (!forced && !dusk() && Math.random() < 0.6) return null
    const base = P(POLE[0], POLE[1], 9), tip = P(POLE[0], POLE[1], POLE[2])
    if (!clearOf(tip, 18)) return null
    const L = POLE[2] - 9, side = V(1, 0, 0).applyQuaternion(api.NN.camera.quaternion).setY(0).normalize(), out = P(140, 150, 30)
    // the pole: accent cubes from the top of the wall up, bent by d metres at the top (a quarter circle near enough)
    const n = 26, pole = new THREE.InstancedMesh(cube, lam('#f0802a'), n), m4 = new THREE.Matrix4(), q = new THREE.Vector3()
    pole.frustumCulled = false; fly(pole); root.add(pole)
    const at = (f, d) => q.copy(base).addScaledVector(side, d * f * f).add(V(0, L * f - (d * d * f) / (3 * L), 0))
    const drawPole = (d) => { for (let i = 0; i < n; i++) { at(i / (n - 1), d); m4.makeScale(0.75, (L / n) * 1.15, 0.75).setPosition(q); pole.setMatrixAt(i, m4) } pole.instanceMatrix.needsUpdate = true }
    const S = 0.4, bird = fly(new THREE.Group()); root.add(bird); build(HER, S, bird); const wings = build(WING, S, bird)
    let d = 0, v = 0, perch = 1, flung = null, landed = false
    const spring = (dt, want, k, damp) => { for (let h = dt; h > 1e-6; h -= 1 / 120) { const e = Math.min(h, 1 / 120); v += ((want - d) * k - v * damp) * e; d += v * e } } // small steps: a slow frame is a quarter second
    sound('heron-call', out)
    return {
      step(dt, t) {
        if (t < 2.6) { // in off the bay, wings beating
          const k = ease(t / 2.6); bird.position.lerpVectors(out, tip, k); bird.position.y += Math.sin(k * Math.PI) * 8
          const dd = tip.clone().sub(out); along(bird, dd.x, dd.z); wings.visible = true; wings.rotation.x = Math.sin(t * 10) * 0.6
        } else if (!flung) {
          if (!landed) { landed = true; sound('heron-land', tip); wings.visible = false; wings.rotation.x = 0 }
          perch = t < 3.6 ? 1 : Math.max(0.82, 1 - (t - 3.6) * 0.075) // it edges down the pole to even the weight out
          const want = t < 6.2 ? 6 * perch ** 3 : -7 // the bend it would settle at; then the pole lets go
          spring(dt, want, 26, t < 6.2 ? 7 : 1.5)
          if (t >= 6.2 && d < -2) { flung = { p: bird.position.clone(), v: V(0, 18, 0).addScaledVector(side, -14), t }; sound('heron-squawk', bird.position) }
          at(perch, d); bird.position.copy(q).add(V(0, 0.1, 0)); bird.rotation.z = -Math.atan2(2 * d * perch, L) * 0.8 // it leans with the pole
          along(bird, side.x, side.z); bird.rotation.y += Math.sin(t * 2.5) * 0.15 // and teeters
        } else { // flung: up, tumbling, then it gets its wings out and makes for the bay
          const u = t - flung.t
          spring(dt, 0, 30, 1.6) // the pole rings down
          flung.v.y -= 9 * dt; bird.position.addScaledVector(flung.v, dt)
          bird.rotation.z = u < 1.4 ? u * 9 : 0; wings.visible = u > 0.9; wings.rotation.x = Math.sin(t * 13) * 0.7
          if (u > 1.4) { flung.v.lerp(out.clone().sub(bird.position).setY(4).normalize().multiplyScalar(16), Math.min(1, dt * 2)); along(bird, flung.v.x, flung.v.z) }
        }
        drawPole(d)
        return t < 11
      },
      end() { done(bird); done(pole) },
    }
  }
  // the landings: a home run into the right-field arcade knocks the caps off down the row (a splash belongs to the Cove's kayakers, fx25.js). Returns what it started.
  function onLand(ev) {
    if (still || !ev?.at) return null
    const h = P(0, 0, 0), x = ev.at.x - h.x, y = h.z - ev.at.z, b = (Math.atan2(x, y) * 180) / Math.PI, r = Math.hypot(x, y), z = ev.at.y - h.y
    const wl = (window.__cp.wallAt?.(b) ?? [340])[0] * 0.3048
    if (['GONE', 'NUKE', 'SCRAPER', 'POLE'].includes(ev.key) && b > 22 && b < 46 && r > wl - 1 && r < wl + 10 && z > 4) return start('hats', true, ev.at) ? 'hats' : null
    return null
  }

  // ---------------- the scheduler: one at a time, every 20 to 40 s, never while a ball is up ----------------
  let t = 0, wall = performance.now(), active = null, nextAt = o.firstAt ?? 18, gap = [20, 40], bag = []
  const log = []
  function start(name, forced, arg) {
    if (active) stop()
    const run = H[name]?.(arg, forced)
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
    force: (name, at) => start(name, true, at), onLand, events: ON_LANDING.slice(), stop, active: () => active?.name ?? null, clock: () => t, since: () => (active ? t - active.t0 : null), log: () => log.map((l) => ({ ...l })), names: HAPPENINGS.slice(),
    setGap(lo, hi) { gap = [lo, hi]; nextAt = Math.min(nextAt, t + hi) },
    splash: () => splashN, setSplash(n) { splashN = nextN = n; setDigits(n) }, bump,
    splashSign: () => splashG, root, live: () => live.size, groupOf: (name) => (active?.name === name ? [...live] : []),
    set visible(v) { root.visible = v },
  }
}
