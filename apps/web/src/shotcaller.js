// SHOT CALLER: click a spot in the park (a seat, the arcade, the cove) and get the swings that put a ball there, flown through the same engine, plus the real
// Oracle home runs that came down closest to it. The search: for a small grid of exit speeds and launch angles, aim the launch direction (two corrections for the
// spin hook) so the ball lands on the spot's bearing, follow it into the stands, keep the swings whose landing point is within a few metres of the click.
// Real-ball landings are the engine's landings anchored to Statcast distance and bearing (as in Landing Party), not seat records.
import * as THREE from 'three'
import { voxDots } from './cockpits/vox25.js'

const R_OK = 4.5 // metres between the clicked spot and a swing's landing point
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
  function call(spot, state, color = '#f0802a') {
    clear()
    const tb = bearingOf(spot), hand = state.hand ?? 1, temp = state.temp ?? 62, found = []
    for (let la = 18; la <= 42; la += 3) for (let ev = 92; ev <= 118; ev += 2) {
      const st = { ...api.state, ev, la, hand, temp, wind: 0, dws: 0, carry: 1, tab: true }
      let dir = tb, L = null
      for (let it = 0; it < 3; it++) { L = land({ ...st, dir }); const lb = bearingOf(L.at); if (Math.abs(lb - tb) < 0.4) break; dir += tb - lb }
      const miss = L.at.distanceTo(spot)
      if (miss <= R_OK) found.push({ ev, la, dir: Math.round(dir * 10) / 10, miss, L })
    }
    found.sort((a, b) => a.ev - b.ev || a.miss - b.miss)
    const softest = found[0], picks = found.length ? [softest, found[Math.floor(found.length / 2)], found[found.length - 1]].filter((x, i, a) => a.indexOf(x) === i) : []
    const near = realLandings().map((r) => ({ ...r, d: r.at.distanceTo(spot) })).sort((a, b) => a.d - b.d).slice(0, 5)
    group = new THREE.Group()
    if (o.vox) {
      // Study 25 (28 Oct, night): voxels. A ring of cubes on the spot, each swing that gets there as a line of small cubes, the nearest real landings as bone cubes
      const ring = Array.from({ length: 28 }, (_, k) => { const a = (k / 28) * Math.PI * 2; return spot.clone().add(new THREE.Vector3(Math.cos(a) * 3, 0.6, Math.sin(a) * 3)) })
      group.add(voxDots(THREE, ring, { px: 0.7, color }))
      for (const p of picks) group.add(voxDots(THREE, p.L.res.path.filter((_, k) => k % 3 === 0).map((q) => api.toWorld(q.p)), { px: 0.45, color }))
      group.add(voxDots(THREE, near.map((n) => n.at.clone().add(new THREE.Vector3(0, 0.6, 0))), { px: 1.2, color: '#e8e1c9' }))
      NN.scene.add(group)
      return { spot: { bearing: tb, ft: distFt(spot), height: spot.y / 0.3048 }, found: found.length, picks, near }
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
  return { pick, call, clear, warm: realLandings }
}
