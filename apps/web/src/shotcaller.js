// SHOT CALLER: click a spot in the park (a seat, the arcade, the cove) and get the swings that put a ball there, flown through the same engine, plus the real
// Oracle home runs that came down closest to it. The search: for a small grid of exit speeds and launch angles, aim the launch direction (two corrections for the
// spin hook) so the ball lands on the spot's bearing, follow it into the stands, keep the swings whose landing point is within a few metres of the click.
// Real-ball landings are the engine's landings anchored to Statcast distance and bearing (as in Landing Party), not seat records.
// 29 Oct (Andrew: SHOT CALLER is its own mode; PLAY IT shows the most common flight paths): every swing that gets there comes back, ranked by how common a ball hit
// like that is (o.weight, the study's count of real balls at that speed and angle); the three most common are drawn, the first brightest.
import * as THREE from 'three'
import { voxDots, voxPost, voxText, keepReadable } from './cockpits/vox25.js'
import { ORANGE } from './cockpits/orange25.js'

// a soft round puff for the FOG cloud, drawn once: a disc that thins to nothing at its edge
let puff = null
const puffTex = () => { if (puff) return puff; const N = 64, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), r = g.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.6, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, N, N); puff = new THREE.CanvasTexture(c); return puff }
const R_OK = 4.5 // metres between the clicked spot and a swing's landing point
export const GRID = { la: [14, 44, 2], ev: [90, 120, 2] } // launch angles and exit speeds tried: first, last, step
export function shotCaller(api, balls, o = {}) {
  const { NN } = api
  const home = api.toWorld([0, 0, 0])
  let group = null, real = null
  const ray = new THREE.Raycaster()
  const clear = () => { if (!group) return; { const h = NN.hideForNormal, i = h?.indexOf(group.userData.cloudG) ?? -1; if (i >= 0) h.splice(i, 1) } NN.scene.remove(group); group.traverse((x) => { if (x.userData.vox) return; x.geometry?.dispose(); x.material?.dispose?.() }); group = null }
  const bearingOf = (p) => (Math.atan2(p.x - home.x, -(p.z - home.z)) * 180) / Math.PI
  const distFt = (p) => Math.hypot(p.x - home.x, p.z - home.z) / 0.3048
  const land = (st) => {
    const res = api.fly(st, { floor: -8 })
    const k = res.verdict.kind
    const h = k === 'GONE' || k === 'FOUL' ? api.findLanding(res.path) : null, at = h ? h.point : api.toWorld(res.path[res.path.length - 1].p)
    return { res, at, kind: k, idx: h?.index ?? res.path.length - 1 } // (3 Nov: where it meets the seats, so a drawn way stops there)
  }
  function realLandings() {
    if (real) return real
    real = balls.filter((b) => b.park === 'SF' && b.hr).map((b) => ({ b, ...land({ ...api.state, ev: b.ev, la: b.la, dir: b.dir, hand: b.s === 'R' ? 1 : -1, temp: b.temp, wind: 0, carry: b.carry, dws: b.dws ?? 0, tab: false }) }))
    return real
  }
  // screen point (client px) to a spot on the park model, or null
  function pick(cx, cy) {
    const el = NN.renderer?.domElement ?? document.querySelector('canvas'), r = el.getBoundingClientRect()
    ray.setFromCamera(new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), NN.camera)
    const hits = ray.intersectObject(NN.stadium, true)
    return hits.length ? hits[0].point : null
  }
  function call(spot, state, color = ORANGE.o, opt = {}) {
    clear()
    const tb = bearingOf(spot), hand = state.hand ?? 1, temp = state.temp ?? 62, found = [], pastWall = distFt(spot) > (api.wallAt?.(tb) ?? [0])[0] + 1
    for (let la = GRID.la[0]; la <= GRID.la[1]; la += GRID.la[2]) for (let ev = GRID.ev[0]; ev <= GRID.ev[1]; ev += GRID.ev[2]) {
      const st = { ...api.state, ev, la, hand, temp, wind: 0, xwind: 0, dws: 0, carry: 1, tab: true, carryOverride: null } // (1 Nov, night; playtest: a crosswind left over from the dojo went into the search but not into the flight)
      let dir = tb, L = null
      for (let it = 0; it < 3; it++) { L = land({ ...st, dir }); const lb = bearingOf(L.at); if (Math.abs(lb - tb) < 0.4) break; dir += tb - lb }
      const miss = L.at.distanceTo(spot)
      if (pastWall && L.kind !== 'GONE') continue // a seat needs a home run: a ball on the track under the front row is close but not there (playtest)
      if (miss <= R_OK) found.push({ ev, la, dir: Math.round(dir * 10) / 10, miss, L })
    }
    // 3 Nov (Andrew, on two screengrabs: "Where it actually lands is a function of height and distance, and the model right now is not getting the grey line or ribbons
    // right on where the selected seat is. Insofar as we're reverse solving it should land right the fuck there right?"): the grid above only finds the swings that
    // come down within a few metres; each is then solved exactly, so its flight passes through the seat itself (its distance out from the plate and its height):
    // the aim is turned until the ball is on the seat's bearing when it gets that far out, and the exit speed (to the hundredth of a mph, the launch angle held) until
    // it is at the seat's height there. The drawn way and the swing flown both end on the seat
    const D = Math.hypot(spot.x - home.x, spot.z - home.z), zs = spot.y - home.y
    const atD = (ev, la, dir) => {
      const res = api.fly({ ...api.state, ev, la, dir, hand, temp, wind: 0, xwind: 0, dws: 0, carry: 1, tab: true, carryOverride: null }, { floor: -8 }), P = res.path
      const q = P.findIndex((s) => Math.hypot(s.p[0], s.p[1]) >= D)
      if (q < 1) return null
      const s0 = P[q - 1].p, s1 = P[q].p, d0 = Math.hypot(s0[0], s0[1]), d1 = Math.hypot(s1[0], s1[1]), k = (D - d0) / Math.max(1e-6, d1 - d0)
      const p = [s0[0] + (s1[0] - s0[0]) * k, s0[1] + (s1[1] - s0[1]) * k, s0[2] + (s1[2] - s0[2]) * k]
      return { res, q, p, z: p[2], b: (Math.atan2(p[0], p[1]) * 180) / Math.PI }
    }
    for (const f of found) {
      let ev = f.ev, dir = f.dir, a = atD(ev, f.la, dir)
      for (let it = 0; it < 10 && a; it++) {
        const eb = tb - a.b, ez = a.z - zs
        if (Math.abs(eb) < 0.02 && Math.abs(ez) < 0.05) break
        dir += eb
        const b = atD(ev + 0.3, f.la, dir), a2 = atD(ev, f.la, dir)
        if (!b || !a2) break
        const slope = (b.z - a2.z) / 0.3
        if (Math.abs(slope) > 1e-3) ev -= Math.max(-3, Math.min(3, (a2.z - zs) / slope))
        a = atD(ev, f.la, dir)
      }
      if (!a) continue
      f.evx = Math.round(ev * 100) / 100; f.dirx = dir; f.miss = Math.hypot(a.b - tb, a.z - zs)
      f.L = { res: a.res, idx: a.q - 1, at: api.toWorld(a.p), kind: 'GONE' } // the way drawn ends on the seat
    }
    // ranked by how common (Study 25), or the softest, a typical and the hardest (Study 24, no weight)
    for (const f of found) f.w = opt.weight ? opt.weight(f.ev, f.la) : 1
    if (opt.weight) found.sort((a, b) => b.w - a.w || a.miss - b.miss); else found.sort((a, b) => a.ev - b.ev || a.miss - b.miss)
    const picks = opt.weight ? found.slice(0, 3) : found.length ? [found[0], found[Math.floor(found.length / 2)], found[found.length - 1]].filter((x, i, a) => a.indexOf(x) === i) : []
    const near = realLandings().map((r) => ({ ...r, d: r.at.distanceTo(spot) })).sort((a, b) => a.d - b.d).slice(0, 5)
    group = new THREE.Group()
    if (o.vox) {
      // Study 25 (28 Oct, night): voxels. A ring of cubes on the spot, each swing that gets there as a line of small cubes, the nearest real landings as bone cubes
      const ring = Array.from({ length: 28 }, (_, k) => { const a = (k / 28) * Math.PI * 2; return spot.clone().add(new THREE.Vector3(Math.cos(a) * 3, 0.6, Math.sin(a) * 3)) })
      group.add(voxDots(THREE, ring, { px: 0.7, color }))
      // 2 Nov, night (Andrew: "the arcs should feel like a probability cloud / frontier not just 2-5 arcs that are hovering there"); 3 Nov (Andrew: "def has to be a
      // cloud that links up visually with the frontier on the RHS -- can we just have it be semi opaque and eschew the voxel art in this instance? Give me 5 different
      // cloud options"): every way in at once, see-through, in the frontier's own color and with its own rule for how strong (0.22 + 0.78 x the square root of how
      // common, the chart's cells), so the bright part of the chart is the bright part of the cloud. opt.cloud picks the look (SHOT CALLER: THE WAYS IN):
      //   1 RIBBONS: a see-through tube for each way, thicker and stronger the more common     2 FOG: soft round puffs wherever the ways go, densest where most do
      //   3 SHEET: one see-through skin stretched across the ways in order of launch angle     4 HAIR: a thin line for each way, like a long exposure
      //   5 CORE AND RIM: the most common half of the swings as one strong band, the rest as faint threads round it
      if (found.length) {
        const look = opt.cloud ?? 1, mx = Math.max(...found.map((f) => f.w)), K = (f) => Math.sqrt(f.w / mx), A = (k) => 0.22 + 0.78 * k
        const pathOf = (f, n = 160) => { const P = f.L.res.path.slice(0, (f.L.idx ?? f.L.res.path.length - 1) + 1).map((q) => api.toWorld(q.p)).concat([f.L.at]) /* (3 Nov, Andrew, on a screengrab: the ways ran on past the seat down to the field's level; each now ends where it meets the seat) */, c = new THREE.CatmullRomCurve3(P, false, 'centripetal'); return c.getSpacedPoints(n) }
        const mat = (a) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: a, depthWrite: false, fog: false, side: THREE.DoubleSide })
        const cloud = new THREE.Group(); cloud.renderOrder = 24
        if (look === 1) for (const f of found) { const k = K(f); cloud.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pathOf(f)), 220, 0.18 + 0.5 * k, 12, false), mat(A(k) * 0.13))) /* (3 Nov: "a little smoother": 160 points a way, 220 rings, 12 round) */ }
        else if (look === 2) {
          const CELL = 2.4, cells = new Map()
          for (const f of found) { const seen = new Set(); for (const w of pathOf(f, 90)) { const key = Math.round(w.x / CELL) + ',' + Math.round(w.y / CELL) + ',' + Math.round(w.z / CELL); if (seen.has(key)) continue; seen.add(key); const c = cells.get(key) ?? { w: 0, x: 0, y: 0, z: 0, n: 0 }; c.w += f.w; c.x += w.x; c.y += w.y; c.z += w.z; c.n++; cells.set(key, c) } }
          const all = [...cells.values()], cm = Math.max(...all.map((c) => c.w)), tex = puffTex()
          for (const c of all) { const k = Math.sqrt(c.w / cm); if (k < 0.1) continue; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity: A(k) * 0.16, depthWrite: false, fog: false })); sp.position.set(c.x / c.n, c.y / c.n, c.z / c.n); sp.scale.setScalar(2.6 + 4 * k); cloud.add(sp) }
        } else if (look === 3) {
          const ord = found.slice().sort((a, b) => a.la - b.la || a.ev - b.ev), N = 48, P = ord.map((f) => pathOf(f, N))
          for (let i = 0; i + 1 < ord.length; i++) {
            const a = P[i], b = P[i + 1], pos = [], k = (K(ord[i]) + K(ord[i + 1])) / 2
            for (let j = 0; j < N; j++) pos.push(a[j].x, a[j].y, a[j].z, b[j].x, b[j].y, b[j].z, b[j + 1].x, b[j + 1].y, b[j + 1].z, a[j].x, a[j].y, a[j].z, b[j + 1].x, b[j + 1].y, b[j + 1].z, a[j + 1].x, a[j + 1].y, a[j + 1].z)
            const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cloud.add(new THREE.Mesh(g, mat(A(k) * 0.1)))
          }
        } else if (look === 4) for (const f of found) { const k = K(f); cloud.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pathOf(f, 80)), new THREE.LineBasicMaterial({ color, transparent: true, opacity: A(k) * 0.45, depthWrite: false, fog: false }))) }
        else {
          // the core: the most common swings until they hold half the weight, as wide faint tubes over each other (one band); the rest as threads
          const ord = found.slice().sort((a, b) => b.w - a.w), tot = ord.reduce((t, f) => t + f.w, 0)
          let run = 0
          for (const f of ord) { const core = run < tot / 2; run += f.w; cloud.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pathOf(f)), 220, core ? 1.1 : 0.12, core ? 12 : 6, false), mat(core ? 0.07 : 0.14 * A(K(f))))) }
        }
        group.add(cloud); NN.hideForNormal?.push(cloud); group.userData.cloudG = cloud // (the ink pass reads normals: a see-through cloud stays out of it)
        group.userData.cloud = cloud.children.length; group.userData.cloudLook = look
      }
      group.add(voxDots(THREE, near.map((n) => n.at.clone().add(new THREE.Vector3(0, 0.6, 0))), { px: 1.2, color: '#e8e1c9' }))
      // the locator (2 Nov, home stretch; GPT red team III, A25: "a small orange ring deep in a huge stadium"; Andrew: "there should most certainly be a seat locator"):
      // a beam of cubes straight up from the seat, and the seat's name on top of it, readable from anywhere
      if (opt.label) {
        const top = spot.clone().add(new THREE.Vector3(0, 13, 0)), label = voxText(THREE, opt.label, { px: 0.55, color, back: '#141414' })
        label.position.copy(top).add(new THREE.Vector3(0, 1.2, 0)); keepReadable(api, label, 140, 0.5, 2.2, { prio: 5 })
        group.add(voxPost(THREE, spot.clone().add(new THREE.Vector3(0, 1.4, 0)), top, { px: 0.7, gap: 1.1, color }), label)
        group.userData.locator = label
      }
      NN.scene.add(group)
      return { spot: { bearing: tb, ft: distFt(spot), height: (spot.y - home.y) / 0.3048 }, at: spot.clone(), found: found.length, picks, ways: found, near, grid: GRID }
    }
    const mat = new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true })
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 3.0, 32), mat)
    ring.rotation.x = -Math.PI / 2
    ring.position.copy(spot).add(new THREE.Vector3(0, 0.3, 0))
    ring.renderOrder = 21
    group.add(ring)
    for (const p of picks) {
      const pts = p.L.res.path.filter((_, k) => k % 4 === 0).map((q) => api.toWorld(q.p))
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85, depthTest: false })))
    }
    const dm = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true, opacity: 0.8 })
    for (const n of near) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 6), dm); m.position.copy(n.at); m.renderOrder = 20; group.add(m) }
    NN.scene.add(group)
    return { spot: { bearing: tb, ft: distFt(spot), height: spot.y / 0.3048 }, found: found.length, picks, near }
  }
  return { pick, call, clear, warm: realLandings, locator: () => group?.userData.locator ?? null, cloud: () => group?.userData.cloud ?? 0 }
}
