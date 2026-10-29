// SEAT SEANCE for Study 25 (28 Oct, night, Andrew: "insanely wide... I want a legit probability cloud and at some point it's gotta tell me the actual seat number"):
// 400 ghosts of this ball flown with only the uncertainty that is left once the ball is hit (Statcast's own error on speed, angle and direction, the carry and the
// side spin the model can't see, a breath of wind), so the cloud is the size of a few sections, not the outfield. The landings are binned on a 2 m grid and drawn as a
// voxel heat map (a column per cell, as tall as its share); the busiest cell is the call: section, row and seat, staked in voxel letters.
// The seat map (sections by bearing, rows by depth behind the wall, seats along the row) is approximate: section numbers and groupings are from RateYourSeats and
// Wikipedia (28 Oct, night), the bearings are spread over each group, rows are 0.84 m deep and seats 0.51 m wide. A best guess, said as one.
import * as THREE from 'three'
import { voxCells, voxText, voxPost, keepReadable } from './cockpits/vox25.js'

const N = 400
const SPREAD = { ev: 0.6, la: 0.6, dir: 1.2, temp: 1, wind: 1.5, dwb: 150, dws: 200 }
const CELL = 2 // meters
// [first bearing, last bearing, section, area, rows]: rows is the number of rows; bleacher rows run A, 1, 2...
const SECTIONS = [
  [-48, -44, '135', 'LOWER BOX', 31], [-44, -38, '136', 'BLEACHERS', 27], [-38, -32, '137', 'BLEACHERS', 27], [-32, -26, '138', 'BLEACHERS', 27], [-26, -20, '139', 'BLEACHERS', 27],
  [-20, -14, '140', 'BLEACHERS', 27], [-14, -8, '141', 'BLEACHERS', 27], [-8, -2, '142', 'BLEACHERS', 27], [-2, 4, '143', 'BLEACHERS', 27], [4, 10, '144', 'BLEACHERS', 27],
  [10, 15, '145', 'ARCADE', 7], [15, 19, '146', 'ARCADE', 6], [19, 23, '147', 'ARCADE', 6], [23, 27, '148', 'ARCADE', 5], [27, 31, '149', 'ARCADE', 5],
  [31, 35, '150', 'ARCADE', 4], [35, 40, '151', 'ARCADE', 3], [40, 45, '152', 'ARCADE', 3], [45, 49, '101', 'LOWER BOX', 27],
]
const gauss = (r) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r())
const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }

export function seatSeance25(api) {
  let group = null
  const home = api.toWorld([0, 0, 0])
  const clear = () => { if (!group) return; api.NN.scene.remove(group); group = null }
  const bearingOf = (p) => (Math.atan2(p.x - home.x, -(p.z - home.z)) * 180) / Math.PI
  const distM = (p) => Math.hypot(p.x - home.x, p.z - home.z)
  // where a landing point is, in words: a seat in the stands, the Cove, the street, or short of the wall
  function seatAt(p, kind) {
    if (kind === 'SPLASH') return { what: 'cove', line: 'MCCOVEY COVE', short: 'THE COVE' }
    if (kind === 'STREET') return { what: 'street', line: 'OUT OF THE PARK', short: 'THE STREET' }
    if (kind !== 'STANDS') return { what: 'field', line: kind === 'FOUL' ? 'FOUL' : 'IN THE PARK', short: kind === 'FOUL' ? 'FOUL' : 'NO SEAT' }
    const b = bearingOf(p), s = SECTIONS.find((x) => b >= x[0] && b < x[1]) ?? (b < 0 ? SECTIONS[0] : SECTIONS[SECTIONS.length - 1])
    const wall = (api.wallAt?.(b) ?? [400, 8])[0] * 0.3048, deep = Math.max(0, distM(p) - wall)
    const ri = Math.min(s[4] - 1, Math.floor(deep / 0.84)), row = s[3] === 'BLEACHERS' ? (ri === 0 ? 'A' : String(ri)) : String(ri + 1)
    // seats count up toward right field ("lower numbers on the right" facing the field from these sections), 0.51 m each along the arc
    const r = distM(p), w = ((s[1] - s[0]) * Math.PI) / 180 * r, n = Math.max(1, Math.floor(w / 0.51)), seat = 1 + Math.min(n - 1, Math.floor(((b - s[0]) / (s[1] - s[0])) * n))
    return { what: 'seat', sec: s[2], area: s[3], row, seat, line: `SEC ${s[2]} ROW ${row} SEAT ${seat}`, short: `${s[3]} ${s[2]}` }
  }
  function land(st) {
    const res = api.fly(st, { floor: -8 })
    let kind = res.verdict.kind, at
    if (kind === 'GONE' || kind === 'FOUL') { const h = api.findLanding(res.path); at = h.point; if (kind === 'GONE') kind = h.kind } else at = api.toWorld(res.path[res.path.length - 1].p)
    return { at, kind }
  }
  function run(state, colors) {
    clear()
    const rng = mulberry(11), pts = []
    for (let k = 0; k < N; k++) pts.push(land({ ...state, ev: state.ev + SPREAD.ev * gauss(rng), la: state.la + SPREAD.la * gauss(rng), dir: state.dir + SPREAD.dir * gauss(rng), temp: state.temp + SPREAD.temp * gauss(rng), wind: (state.wind ?? 0) + SPREAD.wind * gauss(rng), dwb: SPREAD.dwb * gauss(rng), dws: (state.dws ?? 0) + SPREAD.dws * gauss(rng) }))
    // the heat map: count per 2 m cell, a voxel column per cell (1 m cubes), as tall as its share of the busiest cell, dim to accent with the count
    const cells = new Map()
    for (const p of pts) { const k = Math.round(p.at.x / CELL) + ',' + Math.round(p.at.z / CELL); const c = cells.get(k) ?? { n: 0, y: 0, x: Math.round(p.at.x / CELL) * CELL, z: Math.round(p.at.z / CELL) * CELL, kinds: {} }; c.n++; c.y += p.at.y; c.kinds[p.kind] = (c.kinds[p.kind] ?? 0) + 1; cells.set(k, c) }
    const list = [...cells.values()].sort((a, b) => b.n - a.n), top = list[0], max = top.n
    group = new THREE.Group()
    const ramp = [colors.dim, colors.tx, colors.acc]
    for (const c of list) {
      const h = Math.max(1, Math.round((c.n / max) * 7)), col = ramp[Math.min(2, Math.floor((c.n / max) * 3))], base = c.y / c.n
      const vc = []
      for (let j = 0; j < h; j++) vc.push([0, j, 0, col])
      const g = voxCells(THREE, vc, 1.1); g.position.set(c.x, base, c.z); group.add(g)
    }
    // the call: the busiest cell's middle, named, on a stake over the cloud
    const kind = Object.entries(top.kinds).sort((a, b) => b[1] - a[1])[0][0], at = new THREE.Vector3(top.x, top.y / top.n, top.z), call = seatAt(at, kind)
    const stakeTop = at.clone().add(new THREE.Vector3(0, 16, 0)), label = voxText(THREE, call.line, { px: 0.55, color: colors.acc, back: '#141414' })
    label.position.copy(stakeTop); keepReadable(api, label, 120, 0.4, 2.2)
    group.add(voxPost(THREE, at.clone().add(new THREE.Vector3(0, 9, 0)), stakeTop, { px: 0.4, gap: 1, color: colors.acc }), label)
    api.NN.scene.add(group)
    // how tight: the share inside the call's section, and the radius that holds half and nine in ten of the ghosts
    const d = pts.map((p) => Math.hypot(p.at.x - at.x, p.at.z - at.z)).sort((a, b) => a - b), ft = (m) => Math.round(m / 0.3048)
    const tally = {}, zones = {}
    for (const p of pts) { tally[p.kind] = (tally[p.kind] ?? 0) + 1; const z = seatAt(p.at, p.kind).short; zones[z] = (zones[z] ?? 0) + 1 }
    return { N, at, call, tally, half: ft(d[Math.floor(N * 0.5)]), most: ft(d[Math.floor(N * 0.9)]), zones: Object.entries(zones).sort((a, b) => b[1] - a[1]), share: top.n / N, cells: list.length }
  }
  return { run, clear, seatAt, SECTIONS }
}
