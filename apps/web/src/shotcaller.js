// SHOT CALLER: click a spot in the park (a seat, the arcade, the cove) and get the swings that put a ball there, flown through the same engine, plus the real
// Oracle home runs that came down closest to it. The search: for a small grid of exit speeds and launch angles, aim the launch direction (two corrections for the
// spin hook) so the ball lands on the spot's bearing, follow it into the stands, keep the swings whose landing point is within a few metres of the click.
// Real-ball landings are the engine's landings anchored to Statcast distance and bearing (as in Landing Party), not seat records.
// 29 Oct (Andrew: SHOT CALLER is its own mode; PLAY IT shows the most common flight paths): every swing that gets there comes back, ranked by how common a ball hit
// like that is (o.weight, the study's count of real balls at that speed and angle); the three most common are drawn, the first brightest.
import * as THREE from 'three'
import { voxDots, voxPost, voxText, keepReadable } from './cockpits/vox25.js'
import { ORANGE } from './cockpits/orange25.js'

const R_OK = 4.5 // metres between the clicked spot and a swing's landing point
export const GRID = { la: [14, 44, 2], ev: [90, 120, 2] } // launch angles and exit speeds tried: first, last, step
export function shotCaller(api, balls, o = {}) {
  const { NN } = api
  const home = api.toWorld([0, 0, 0])
  let group = null, real = null
  const ray = new THREE.Raycaster()
  const clear = () => { if (!group) return; NN.scene.remove(group); group.traverse((x) => { if (x.userData.vox) return; x.geometry?.dispose(); x.material?.dispose?.() }); group = null }
  const bearingOf = (p) => (Math.atan2(p.x - home.x, -(p.z - home.z)) * 180) / Math.PI
  const distFt = (p) => Math.hypot(p.x - home.x, p.z - home.z) / 0.3048
  const land = (st) => {
    const res = api.fly(st, { floor: -8 })
    const k = res.verdict.kind
    const at = k === 'GONE' || k === 'FOUL' ? api.findLanding(res.path).point : api.toWorld(res.path[res.path.length - 1].p)
    return { res, at, kind: k }
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
      // 2 Nov, night (Andrew: "the arcs should feel like a probability cloud / frontier not just 2-5 arcs that are hovering there"): o.cloud draws every way in at
      // once as a cloud of voxels, each 2 m cell of the air holding as much as the ways through it weigh (how common a ball hit like that is), dim and small where
      // few go, big and in the color where most do; the way picked flies over it as the preview. Without o.cloud, the three most common as lines (as it was).
      if (opt.cloud !== false && found.length) {
        const CELL = 2, cells = new Map()
        for (const f of found) { const seen = new Set(); for (const q of f.L.res.path) { const w = api.toWorld(q.p), k = Math.round(w.x / CELL) + ',' + Math.round(w.y / CELL) + ',' + Math.round(w.z / CELL); if (seen.has(k)) continue; seen.add(k); const c = cells.get(k) ?? { w: 0, x: 0, y: 0, z: 0, n: 0 }; c.w += f.w; c.x += w.x; c.y += w.y; c.z += w.z; c.n++; cells.set(k, c) } }
        const all0 = [...cells.values()], mx = Math.max(...all0.map((c) => c.w)), lv = (c) => Math.sqrt(c.w / mx), all = all0.filter((c) => lv(c) >= 0.12) // (the thinnest edge of it is noise)
        const at = (c) => new THREE.Vector3(c.x / c.n, c.y / c.n, c.z / c.n), lo = all.filter((c) => lv(c) < 0.45), hi = all.filter((c) => lv(c) >= 0.45)
        group.add(voxDots(THREE, lo.map(at), { size: (i) => 0.22 + 0.5 * lv(lo[i]), color: o.dim ?? color }), voxDots(THREE, hi.map(at), { size: (i) => 0.4 + 0.75 * lv(hi[i]), color }))
        group.userData.cloud = all.length
      } else picks.forEach((p, i) => group.add(voxDots(THREE, p.L.res.path.filter((_, k) => k % (i ? 4 : 2) === 0).map((q) => api.toWorld(q.p)), { px: i ? 0.4 : 0.55, color: i ? o.dim ?? color : color })))
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
