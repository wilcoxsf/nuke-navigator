// Study 25 stage (4 Nov, night): data shown in the park itself. Andrew: "If possible I'd love the data visuals to be diegetic / on the field in nature". After his look
// (5 Nov: "Light towers kill entirely"; "no flight trails"; runners: "I think we just have like the bases lit up with voxel where there are runners ... Simpler"; "The zone
// at the plate is a good idea but it just isn't showing up right now - also the ball and trail need to be the pitch color. We don't need 2 trails, just the one") two
// switches, each off to start:
//   ON BASE (GR): DINGER DEJA-VU's real runners, as lit bases (the data says which bases were taken, not who was on them)
import { voxCells } from './vox25.js'

export const RUNNER_LOOKS = [
  { c: 1, name: 'OFF', desc: 'the bases as they are' },
  { c: 2, name: 'LIT BASES', desc: 'a taken base glows: a stack of bright voxels on the bag' },
  { c: 3, name: 'BEACONS', desc: 'a thin column of light standing up from each taken base' },
  { c: 4, name: 'GHOSTS ON BASE', desc: 'a little sheet ghost standing on each taken bag' },
  { c: 5, name: 'LIT BASES THAT SCORE', desc: 'lit bases; after a home run each light runs the bases home, the batter\'s too' },
]

const BONE = '#e8e1c9', FT = 0.3048
// (5 Nov, Andrew: "I like ghosts on base but let's give them giants hats too"): a black cap, an orange SF patch on the front, the bill out over the eyes
const GHOST = () => { const c = [], W = '#f4f3ee', K = '#16181b', O = '#fd5a1e'; for (let y = 0; y < 9; y++) { const r = y > 6 ? 1 : 2; for (let x = -r; x <= r; x++) for (let z = -1; z <= 1; z++) if (!(y === 0 && (x + 7) % 2)) c.push([x, y, z, W]) } c.push([-1, 6, 2, K], [1, 6, 2, K]); for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) c.push([x, 9, z, K]); c.push([0, 10, 0, K], [0, 10, 1, K], [-1, 10, 0, K], [1, 10, 0, K]); for (let x = -1; x <= 1; x++) c.push([x, 9, 2, K], [x, 9, 3, K]); c.push([0, 10, 2, O], [-1, 10, 1, O], [1, 10, 1, O]); return c }

export function initStage25(api, o = {}) {
  const { THREE, scene } = api.NN
  const g = new THREE.Group(); g.name = 'stage25'; scene.add(g)
  const look = () => ({ gr: 1, zg: 1, ...(o.look?.() ?? {}) })
  const pc = () => o.colors?.()?.pc || o.colors?.()?.mk || '#7fd4ff'
  const W = (x, y, z) => api.toWorld([x, y, z])
  const home = W(0, 0, 0), now = () => performance.now()
  const hide = (m) => { api.NN.hideForNormal?.push(m); return m }
  const unhide = (root) => { const h = api.NN.hideForNormal; root.traverse((x) => { const k = h?.indexOf(x) ?? -1; if (k >= 0) h.splice(k, 1) }) }
  const dispose = (root) => { g.remove(root); unhide(root); root.traverse((x) => { if (x.userData?.vox) return; x.geometry?.dispose?.(); x.material?.dispose?.() }) }

  // ---- ON BASE ----
  const BASES = [[0, 0], [19.4, 19.4], [0, 38.8], [-19.4, 19.4]].map(([x, y]) => W(x, y, 0))
  let crew = null, crewKey = '', runs = [] // runs: lights running home after a home run
  const basic = (c, op = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: op < 1, opacity: op, depthWrite: op >= 1, fog: false })
  function marker(L, k) {
    const m = new THREE.Group(), at = BASES[k]
    if (L === 2 || L === 5) { for (let y = 0; y < 4; y++) { const b = hide(new THREE.Mesh(new THREE.BoxGeometry(2.6 - y * 0.5, 0.6, 2.6 - y * 0.5), basic(y === 3 ? '#ffffff' : BONE))); b.position.set(0, 0.3 + y * 0.6, 0); b.rotation.y = Math.PI / 4; m.add(b) } }
    if (L === 3) { const b = hide(new THREE.Mesh(new THREE.BoxGeometry(0.5, 16, 0.5), basic(BONE, 0.55))); b.position.y = 8; m.add(b); const cap = hide(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 1.4), basic('#ffffff'))); cap.position.y = 0.25; cap.rotation.y = Math.PI / 4; m.add(cap) }
    if (L === 4) { const v = voxCells(THREE, GHOST(), 0.42); m.add(v) }
    m.position.copy(at); g.add(m)
    return m
  }
  function clearCrew() { if (crew) for (const m of crew.marks) dispose(m); for (const r of runs) dispose(r.m); crew = null; runs = []; crewKey = '' }
  function sync({ ball, mode }) {
    const L = look()
    if (L.gr === 1 || !ball || mode !== 'replay') { if (crew || runs.length) clearCrew(); return }
    const key = [ball.d, ball.b, ball.ev, L.gr].join()
    if (key === crewKey) return
    clearCrew(); crewKey = key
    const on = [[1, ball.r1], [2, ball.r2], [3, ball.r3]].filter(([, x]) => x).map(([k]) => k)
    crew = { on, marks: on.map((k) => marker(L.gr, k)), L: L.gr }
  }
  function score() { // LIT BASES THAT SCORE: a light from each taken base, and one from home, runs the bases to home
    if (!crew || crew.L !== 5) return
    for (const k of [...crew.on, 0]) { const m = hide(new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), basic('#ffffff'))); m.position.copy(BASES[k]); g.add(m); runs.push({ m, leg: k, s: 0, done: false }) }
    for (const mk of crew.marks) mk.visible = false
  }
  let lastT = now()
  api.NN.frames.push(() => {
    const t = now(), dt = Math.min(0.25, Math.max(0.001, (t - lastT) / 1000)); lastT = t
    if (crew && crew.L === 4) crew.marks.forEach((m, i) => { m.position.y = BASES[0].y + Math.abs(Math.sin(t / 260 + i)) * 0.35 })
    if (crew && crew.L === 3) crew.marks.forEach((m) => { const b = m.children[0]; if (b) b.material.opacity = 0.4 + 0.25 * Math.sin(t / 300) })
    for (const r of runs) {
      if (r.done) continue
      const A = BASES[r.leg % 4], B = BASES[(r.leg + 1) % 4]
      r.s += (16 * dt) / A.distanceTo(B)
      if (r.s >= 1) { r.s = 0; r.leg++; if (r.leg % 4 === 0) { r.done = true; r.m.visible = false; continue } }
      const A2 = BASES[r.leg % 4], B2 = BASES[(r.leg + 1) % 4]
      r.m.position.copy(A2).lerp(B2, r.s); r.m.position.y = A2.y + 0.7 + Math.abs(Math.sin(t / 90)) * 0.5
    }
  })

  return {
    launch() { if (runs.length) clearCrew() }, // (a new swing: the bases as they were; the next sync lights them again)
    fly() {},
    land(hr) { if (hr) score() },
    sync(x) { sync(x) },
    crew: () => (crew ? { on: crew.on, look: crew.L, runs: runs.map((r) => ({ leg: r.leg, done: r.done })) } : null),
  }
}
