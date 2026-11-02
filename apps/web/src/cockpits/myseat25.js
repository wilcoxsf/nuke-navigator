// Study 25 MY SEAT (30 Oct, Andrew, idea 3: "yes to 3 that's a great idea if you're at a game and then you could see"): type your seat once (it is remembered on this
// device) and every real Oracle home run that came down within 10 ft of it shows: numbered voxel stakes where they landed, a ring 10 ft round the seat, and your seat
// itself as an orange voxel chair with a YOU flag. Where each ball came down is the flight engine's landing for it (as in LANDING PARTY), anchored to Statcast's
// distance and bearing, not a seat record; they are worked out once, a few at a time so the page never stalls, and kept for the visit.
import { voxText, voxPost, keepReadable } from './vox25.js'
import { ORANGE } from './orange25.js'
const FT = 0.3048
export function initMySeat25(api, balls, o = {}) {
  const { THREE, scene } = api.NN
  const oracle = balls.filter((b) => b.park === 'SF' && b.hr)
  let group = null, done = 0, working = null
  // where each home run came down, worked out in batches; onStep(done, total) after each batch
  function landings(onStep) {
    if (done >= oracle.length) return Promise.resolve(oracle)
    if (working) return working
    working = new Promise((resolve) => {
      const step = () => {
        const t0 = performance.now()
        while (done < oracle.length && performance.now() - t0 < 30) {
          const b = oracle[done++]
          if (b._seatAt) continue
          const st = { ...api.state, ev: b.ev, la: b.la, dir: b.dir, hand: b.s === 'R' ? 1 : -1, temp: b.temp, wind: 0, xwind: 0, carry: b.carry, dws: b.dws ?? 0, tab: false }
          const res = api.fly(st, { floor: -8 })
          const hit = res.verdict.kind === 'GONE' || res.verdict.kind === 'FOUL' ? api.findLanding(res.path) : { point: api.toWorld(res.path[res.path.length - 1].p), kind: 'SHORT' }
          b._seatAt = hit.point.clone(); b._seatKind = hit.kind
        }
        onStep?.(done, oracle.length)
        if (done < oracle.length) setTimeout(step, 0); else { working = null; resolve(oracle) }
      }
      step()
    })
    return working
  }
  // the home runs near a spot: within r ft, nearest first, and at least the closest k whatever the distance
  function near(at, r = 10, k = 5) {
    const all = oracle.filter((b) => b._seatAt).map((b) => ({ b, ft: Math.hypot(b._seatAt.x - at.x, b._seatAt.z - at.z) / FT })).sort((p, q) => p.ft - q.ft)
    const inside = all.filter((x) => x.ft <= r)
    return { inside, closest: inside.length >= k ? inside : all.slice(0, Math.max(k, inside.length)) }
  }
  function clear() { if (group) { scene.remove(group); group = null } }
  function show(at, list, color = ORANGE.o) {
    clear()
    group = new THREE.Group()
    const cube = new THREE.BoxGeometry(1, 1, 1), m4 = new THREE.Matrix4(), lam = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true })
    const put = (cells, c, s) => { const m = new THREE.InstancedMesh(cube, lam(c), cells.length); cells.forEach((p, i) => m.setMatrixAt(i, m4.makeScale(s, s, s).setPosition(p))); group.add(m) }
    // the chair: a seat, a back and a flag on a pole
    const C = [], V = 0.25, home = window.__cp.toWorld([0, 0, 0]), face = Math.atan2(home.x - at.x, home.z - at.z), fx = Math.sin(face), fz = Math.cos(face), sx = fz, sz = -fx
    const P = (a, b, h) => new THREE.Vector3(at.x + sx * a + fx * b, at.y + h, at.z + sz * a + fz * b)
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) C.push(P(a * V, b * V, 0.5)) // the seat
    for (let a = -2; a <= 2; a++) for (let h = 1; h <= 5; h++) C.push(P(a * V, -2.5 * V, 0.5 + h * V)) // the back
    put(C, color, V)
    const pole = []; for (let h = 0; h < 14; h++) pole.push(P(2.6 * V, -2.5 * V, 0.5 + h * V)); put(pole, '#e8e1c9', V * 0.6)
    const flag = voxText(THREE, 'YOU', { px: 0.22, color: '#141414', back: color }); flag.position.copy(P(2.6 * V, -2.5 * V, 0.5 + 15 * V)); keepReadable(api, flag, 120, 0.6, 2.2, { prio: 6 }); group.add(flag)
    // the ring, 10 ft round
    const ring = []; for (let a = 0; a < 360; a += 8) ring.push(new THREE.Vector3(at.x + Math.sin((a * Math.PI) / 180) * 10 * FT, at.y + 0.3, at.z + Math.cos((a * Math.PI) / 180) * 10 * FT)); put(ring, color, 0.22)
    // a stake and a number where each came down
    list.forEach((x, i) => {
      const p = x.b._seatAt, top = new THREE.Vector3(p.x, p.y + 4, p.z), n = voxText(THREE, String(i + 1), { px: 0.5, color, back: '#141414' })
      n.position.copy(top); keepReadable(api, n, 140, 0.5, 1.6, { prio: 2 }); group.add(n, voxPost(THREE, p, top, { px: 0.3, gap: 0.8, color }))
    })
    scene.add(group)
  }
  return { landings, near, show, clear, count: () => oracle.length, done: () => done, group: () => group }
}
