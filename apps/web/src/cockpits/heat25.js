// Study 25 BLAST RADIUS (the heat map; 3 Nov, Andrew: "Some things that are now missing that were in the original vision I had for this tool: A live heatmap of how hard
// it is to hit home runs to different parts of oracle park. Pick a player and see how their specific batter profile lends itself to oracle park - their own heatmap, every
// home run they've hit, what's easier and harder in different areas").
// 3 Nov, later (Andrew: "I'd like this a a fan that sprays our starting from the infield to the outfield, and then I want an actual heatmap of seats too. I want to be
// able to visualize both how hard it is and also how many HRs have been hit empirically in each area ... How much harder to hit one 20 ft back from left center vs. right
// at the wall in triples alley? The numbers on heatmap are confusing too ... needs to be more intuitive"); later again ("Can we get higher resolution on this heatmap for
// sections? Also a full color and visual red team - it doesn't 'feel' like the rest of the tool"; "let's have these be little boys just like landing party"):
//   THE FAN: one wedge every 2.5 degrees, line to line, from the edge of the infield grass to the wall
//   THE SEATS: past the wall, a cell every 2.5 degrees across and every 10 ft back (ten rows, 100 ft), laid on the stands themselves (each corner dropped onto the
//     model), so it follows the bleachers, the arcade and the rows up the back; where there is no stand (the Cove, the street) there is no cell
//   both laid as a carpet of flat voxel tiles, like the rest of the park, in five steps of the study's own colors (no smooth gradient): dark to safety orange for
//   how easy, dark to ICE for how many. Green stays for gone: a player's home runs are Little Boys, green when one would go out here, bone when it would stay in
//   HOW HARD (the league, live): the softest swing that gets a ball to that piece of the park in the air the page is flying in (its temperature, wind and the batter's
//     side): the slowest exit speed, at its best launch angle (24 to 36 degrees), aimed so it comes down on that bearing. For a wedge, over the wall there (to the
//     mph); for a seat, still that high when it gets that far out (to 2 mph)
//   HOW MANY (the record): where the real home runs hit at Oracle since July 2023 came down, each flown in its own night's air
//   A PLAYER: their deep balls (335 ft and more, and every home run) flown here in this air; a wedge is the share aimed there that would go out, a seat how many of
//     their home runs would come down in it
// No numbers in the park: point at a wedge or a seat for what it means (cellAt), click one to keep it and compare (the study's panel says it in words).
import { voxCells } from './vox25.js'
import { NUKE_MARKS, GREEN } from '../landing.js'

export const STEPS_HARD = ['#2b211b', '#53311a', '#86461c', '#c25f18', '#ff7a00'] // hard (dark) to easy (safety orange)
export const STEPS_MANY = ['#0f2a33', '#15475a', '#1d7189', '#35a7c4', '#5ce1ff'] // few (dark) to most (ICE)
export const ZONES = [[-45, -36, 'LEFT-FIELD LINE'], [-36, -21, 'LEFT FIELD'], [-21, -7, 'LEFT-CENTER'], [-7, 7, 'CENTER FIELD'], [7, 22, 'TRIPLES ALLEY'], [22, 36, 'RIGHT FIELD'], [36, 45.1, 'RIGHT-FIELD LINE']]
export const HARD = [94, 122] // the mph the steps run over (easy to hard)
// (3 Nov, the red team: every wall at Oracle takes 97 to 110 mph, so a scale to 122 lit the whole field the same orange) the five steps are bands of mph, fixed so a
// warm night visibly brightens the park: 98 or less, 99 to 102, 103 to 106, 107 to 110, more than 110 (or out of reach)
export const BANDS = [98, 102, 106, 110]
// 3 Nov, later (Andrew: "I think we need a 2-3 color gradient to really make this readable. I am not sure if a full fan on the field is even necessary - I think it could
// just be a dense color at the warning track (or maybe the orange line at the current HR threshold changes to it) and then the seat heatmap. Give me a ton of options on
// this, gradient colors, how to visualize it, you name it"): three switches in the side menu (c25.js LAB: BG, FV, SV)
//   BLAST COLORS: a smooth three-color run, hard to easy (for HOW MANY, few to most); none of them green, which is for gone
export const GRADS = [
  { c: 1, name: 'EMBER', stops: ['#3a1d14', '#ff7a00', '#ffe3a3'], desc: 'burnt brown to safety orange to pale gold' },
  { c: 2, name: 'MAGMA', stops: ['#2a0f2e', '#d6402b', '#ffd166'], desc: 'plum to red to yellow, the classic heat map' },
  { c: 3, name: 'SUNSET', stops: ['#1d2a6d', '#e0457b', '#ffb347'], desc: 'night navy to pink to orange' },
  { c: 4, name: 'ICE AND FIRE', stops: ['#1b5f8c', '#e8e1c9', '#ff7a00'], desc: 'cold blue through bone to safety orange: cold is hard, hot is easy' },
  { c: 5, name: 'CONCRETE', stops: ['#3b3d42', '#c9c2ad', '#ff7a00'], desc: 'grey to bone to safety orange: only the easy parts carry color' },
  { c: 6, name: 'GIANTS', stops: ['#1a1714', '#fd5a1e', '#efd19f'], desc: 'black to Giants orange to the cream of the home whites' },
  { c: 7, name: 'NIGHT GAME', stops: ['#141d3a', '#3d8fb5', '#eef6f8'], desc: 'night navy to ICE to the white of the lights' },
]
//   BLAST FIELD: what the field shows
export const FIELDS = [
  { c: 2, name: 'WARNING TRACK', desc: 'a dense band of color on the warning track, the last 15 ft before the wall' },
  { c: 1, name: 'FULL FAN', desc: 'the whole outfield, a wedge every 2.5 degrees from the infield grass to the wall' },
  { c: 3, name: 'THE WALL LINE', desc: 'the line along the top of the wall (the home run line) in the color of how hard it is there' },
  { c: 4, name: 'TRACK AND WALL', desc: 'the warning track band and the wall line both' },
  { c: 5, name: 'SEATS ONLY', desc: 'nothing on the field: the seats carry it all' },
]
//   BLAST SEATS: how the seats show it
export const SEATS = [
  { c: 1, name: 'TILES', desc: 'flat voxel tiles laid on the stands' },
  { c: 2, name: 'PILLARS', desc: 'tiles that stand taller where it is easier (or more of them came down): a skyline over the stands' },
  { c: 3, name: 'SOFT', desc: 'smooth see-through cells, no voxels' },
  { c: 4, name: 'DOTS', desc: 'one cube a cell, bigger where it is easier (or more came down): points on the map, like Landing Party' },
]
const HARD_RUN = [96, 118] // the mph a gradient runs over (easy to hard); out of reach is the hard end
export const bandOf = (ev) => (ev == null ? 0 : 4 - BANDS.filter((b) => ev > b).length) // 4 easiest ... 0 hardest
const STEP = 2.5, B0 = -45, N = 36, FT = 0.3048, DEEP = 335, ROWS = 10, ROW_FT = 10, INFIELD_FT = 100, TILE = 1.6
const mid = (i) => B0 + STEP * (i + 0.5)
const sectorOf = (b) => Math.max(0, Math.min(N - 1, Math.floor((b - B0) / STEP)))
export const zoneName = (b) => (ZONES.find(([a, c]) => b >= a && b < c) ?? ZONES[3])[2]

export function initHeat25(api, o = {}) {
  const { THREE, scene } = api.NN
  const home = () => api.toWorld([0, 0, 0])
  let group = null, cells = [], meshes = [], hi = null
  const air = () => { const s = api.state; return { temp: Math.round(s.temp ?? 62), wind: Math.round(s.wind ?? 0), xwind: Math.round(s.xwind ?? 0), hand: s.hand > 0 ? 1 : -1 } }
  const st = (a, ev, la, dir, extra = {}) => ({ ...api.state, ev, la, dir, hand: a.hand, temp: a.temp, wind: a.wind, xwind: a.xwind, carry: 1, dws: 0, dwb: 0, tab: true, carryOverride: null, ...extra })
  const wallOf = (b) => api.wallAt?.(b) ?? [380, 8]
  const P = (b, rFt, z = 0) => { const r = rFt * FT, a = (b * Math.PI) / 180; return api.toWorld([r * Math.sin(a), r * Math.cos(a), z]) }
  // ---- the seats: each corner dropped onto the stands from above (the first surface under 32 m, so not a light tower or the board); none, or the field, is no seat ----
  let grid = null
  const ray = new THREE.Raycaster()
  function seatGrid() {
    if (grid) return grid
    const h0 = home().y, corner = []
    api.NN.stadium?.updateMatrixWorld(true)
    for (let i = 0; i <= N; i++) {
      const b = B0 + STEP * i, row = []
      for (let j = 0; j <= ROWS; j++) {
        const rFt = wallOf(Math.max(-45, Math.min(45, b)))[0] + 2 + ROW_FT * j, w = P(b, rFt)
        ray.set(new THREE.Vector3(w.x, h0 + 40, w.z), new THREE.Vector3(0, -1, 0))
        const hit = api.NN.stadium ? ray.intersectObject(api.NN.stadium, true).find((h) => h.point.y < h0 + 32) : null
        row.push(hit && hit.point.y > h0 + 0.8 ? new THREE.Vector3(w.x, hit.point.y, w.z) : null)
      }
      corner.push(row)
    }
    grid = corner
    return grid
  }
  // ---- HOW HARD ----
  const cacheH = new Map()
  const goes = (a, ev, la, dir) => api.fly(st(a, ev, la, dir), { floor: -8 }).verdict.kind === 'GONE'
  // worked out a few wedges at a time (hardAsync) so the page keeps drawing while it goes; hard() does it all at once (the tests, a warm cache)
  function hard() { const a = air(), key = JSON.stringify(a); if (cacheH.has(key)) return cacheH.get(key); const job = start(a); while (job.i < N) step(job); return finish(job) }
  const jobs = new Map()
  function hardAsync(done) {
    const a = air(), key = JSON.stringify(a)
    if (cacheH.has(key)) return cacheH.get(key)
    if (jobs.has(key)) { jobs.get(key).done.push(done); return null }
    const job = start(a); job.done = [done]; jobs.set(key, job)
    const tick = () => { const t = performance.now(); while (job.i < N && performance.now() - t < 24) step(job); if (job.i < N) setTimeout(tick, 0); else { jobs.delete(key); const out = finish(job); for (const f of job.done) f?.(out) } }
    setTimeout(tick, 0)
    return null
  }
  const ready = () => cacheH.get(JSON.stringify(air())) ?? null
  const start = (a) => ({ a, i: 0, G: seatGrid(), h0: home().y, wall: [], seat: [] })
  const finish = (job) => { const out = { air: job.a, wall: job.wall, seat: job.seat }; cacheH.set(JSON.stringify(job.a), out); return out }
  function step(job) {
    const { a, G, h0, wall, seat } = job, i = job.i++
    {
      const b = mid(i), [wft] = wallOf(b)
      let dir = b
      for (let k = 0; k < 3; k++) { const r = api.fly(st(a, 108, 28, dir), { floor: -8 }); if (r.landB == null) break; dir += b - r.landB }
      // over the wall there: a halving search at each of five angles, to the mph
      let w = null
      for (const la of [24, 27, 30, 33, 36]) { if (!goes(a, 132, la, dir)) continue; let lo = 80, hi = 132; while (hi - lo > 0.5) { const m = (lo + hi) / 2; if (goes(a, m, la, dir)) hi = m; else lo = m } if (!w || hi < w.ev) w = { ev: Math.round(hi), la } }
      wall.push(w)
      // each seat: its middle (how far out, how high); a ladder of speeds 2 mph apart at each angle, the first that is still that high that far out
      const T = []
      for (let j = 0; j < ROWS; j++) { const q = [G[i]?.[j], G[i + 1]?.[j], G[i]?.[j + 1], G[i + 1]?.[j + 1]]; T.push(q.every(Boolean) ? { ft: wft + 2 + ROW_FT * (j + 0.5), z: q.reduce((t, v) => t + v.y, 0) / 4 - h0 } : null) }
      const best = T.map(() => null)
      for (const la of [25, 30, 35]) for (let ev = 84; ev <= 132; ev += 2) {
        if (T.every((t, k) => !t || (best[k] && best[k].ev <= ev))) break
        const path = api.fly(st(a, ev, la, dir), { floor: -8 }).path
        T.forEach((t, k) => {
          if (!t || (best[k] && best[k].ev <= ev)) return
          const D = t.ft * FT, q = path.findIndex((s) => Math.hypot(s.p[0], s.p[1]) >= D)
          if (q < 1) return
          const s0 = path[q - 1].p, s1 = path[q].p, d0 = Math.hypot(s0[0], s0[1]), d1 = Math.hypot(s1[0], s1[1]), z = s0[2] + ((s1[2] - s0[2]) * (D - d0)) / Math.max(1e-6, d1 - d0)
          if (z >= t.z) best[k] = { ev, la }
        })
      }
      seat.push(best)
    }
  }
  // ---- HOW MANY ----
  let record = null
  function where(at) {
    const h = home(), x = at.x - h.x, y = h.z - at.z, b = (Math.atan2(x, y) * 180) / Math.PI, ft = Math.hypot(x, y) / FT, w = wallOf(Math.max(-45, Math.min(45, b)))[0]
    return { b, ft, i: Math.abs(b) <= 45 ? sectorOf(b) : -1, j: ft > w + 2 ? Math.floor((ft - w - 2) / ROW_FT) : -1 }
  }
  function many() {
    if (record) return record
    const wedge = Array(N).fill(0), seat = Array.from({ length: N }, () => Array(ROWS).fill(0)), hrs = (o.balls ?? []).filter((b) => b.park === 'SF' && b.hr)
    for (const b of hrs) {
      const res = api.fly({ ...api.state, ev: b.ev, la: b.la, dir: b.dir, hand: b.s === 'R' ? 1 : -1, temp: b.temp, wind: 0, xwind: 0, carry: b.carry, dws: b.dws ?? 0, tab: false }, { floor: -8 })
      if (res.verdict.kind !== 'GONE') continue
      const w = where(api.findLanding(res.path).point)
      if (w.i < 0) continue
      wedge[w.i]++; if (w.j >= 0 && w.j < ROWS) seat[w.i][w.j]++
    }
    record = { n: hrs.length, wedge, seat }
    return record
  }
  // ---- A PLAYER ----
  function shares(balls, a, keep = false) {
    const n = Array(N).fill(0), out = Array(N).fill(0), pts = [], seat = Array.from({ length: N }, () => Array(ROWS).fill(0))
    for (const b of balls) {
      if (Math.abs(b.dir) > 45) continue
      const res = api.fly(st({ ...a, hand: b.hand ?? a.hand }, b.ev, b.la, b.dir, { dws: b.dws ?? 0 }), { floor: -8 }), gone = res.verdict.kind === 'GONE', i = sectorOf(b.dir)
      n[i]++; if (gone) out[i]++
      if (keep) { const at = gone ? api.findLanding(res.path).point : api.toWorld(res.path[res.path.length - 1].p); pts.push({ at, gone, b: b.ref }); if (gone) { const w = where(at); if (w.i >= 0 && w.j >= 0 && w.j < ROWS) seat[w.i][w.j]++ } }
    }
    return { n, out, pts, seat, rate: n.map((k, i) => (k ? out[i] / k : null)) }
  }
  const cacheP = new Map()
  function leagueDeep() {
    const a = air(), key = JSON.stringify({ ...a, hand: 0 })
    if (cacheP.has(key)) return cacheP.get(key)
    const rows = (o.pool?.rows ?? []).filter((r) => r[3] >= DEEP).map((r) => ({ ev: r[0], la: r[1], dir: r[2], hand: r[5] === 'L' ? -1 : 1 }))
    const s = shares(rows, a)
    cacheP.set(key, s)
    return s
  }
  function player(id) {
    const a = air(), mine = (o.balls ?? []).filter((b) => String(b.b) === String(id))
    const deep = mine.filter((b) => b.ft >= DEEP || b.hr).map((b) => ({ ev: b.ev, la: b.la, dir: b.dir, hand: b.s === 'L' ? -1 : 1, dws: b.dws ?? 0, ref: b }))
    const s = shares(deep, a), hrs = shares(deep.filter((x) => x.ref.hr), a, true), L = leagueDeep()
    return { id, air: a, n: deep.length, hr: hrs.pts.length, hrOut: hrs.pts.filter((p) => p.gone).length, rate: s.rate, n5: s.n, league: L.rate, leagueN: L.n, pts: hrs.pts, seat: hrs.seat, outAll: s.out.reduce((t, x) => t + x, 0) }
  }
  // ---- drawing: a carpet of flat voxel tiles, one InstancedMesh per layer, each tile knowing its cell (for pointing) ----
  const clear = () => { if (!group) return; { const h = api.NN.hideForNormal, i = h?.indexOf(group.userData.soft) ?? -1; if (i >= 0) h.splice(i, 1) } scene.remove(group); group.traverse((x) => { if (x.userData.vox) return; x.geometry?.dispose?.(); x.material?.dispose?.() }); group = null; cells = []; meshes = []; hi = null }
  const stepOf = (S, v) => S[Math.max(0, Math.min(S.length - 1, Math.floor(v * S.length - 1e-9)))]
  const look = () => ({ g: 1, f: 2, s: 1, ...(o.look?.() ?? {}) })
  const gradOf = (g) => (GRADS.find((x) => x.c === g) ?? GRADS[0]).stops
  const colorAt = (stops, v) => { const t = Math.max(0, Math.min(1, v)) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(t)); return '#' + new THREE.Color(stops[i]).lerp(new THREE.Color(stops[i + 1]), t - i).getHexString() }
  function carpet(tiles, h, size = TILE * 0.82) {
    if (!tiles.length) return
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ flatShading: true, fog: false }), tiles.length), m4 = new THREE.Matrix4(), c = new THREE.Color()
    tiles.forEach((t, k) => { const hh = t.h ?? h; m4.makeScale(t.size ?? size, hh, t.size ?? size).setPosition(t.p.x, t.p.y + hh / 2, t.p.z); m.setMatrixAt(k, m4); m.setColorAt(k, c.set(t.col)) })
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.userData.cell = tiles.map((t) => t.cell)
    group.add(m); meshes.push(m)
  }
  // view: { metric: 'hard' | 'many' | 'player', data }
  function show(view) {
    clear()
    group = new THREE.Group(); group.userData.heat = view.metric
    const ground = home().y + 0.05, G = seatGrid(), fan = [], seats = [], soft = [], d = view.data
    const L = look(), stops = gradOf(L.g), col = (v) => colorAt(stops, v)
    const ease = (ev) => (ev == null ? 0 : 1 - (ev - HARD_RUN[0]) / (HARD_RUN[1] - HARD_RUN[0]))
    const fanVal = (i) => (view.metric === 'hard' ? ease(d.wall[i]?.ev) : view.metric === 'many' ? (d.wedge[i] ? Math.sqrt(d.wedge[i] / Math.max(1, ...d.wedge)) : null) : d.n5[i] >= 3 ? d.rate[i] : null)
    const seatVal = (i, j) => { if (view.metric === 'hard') return ease(d.seat[i][j]?.ev); const mx = Math.max(1, ...d.seat.flat()); return d.seat[i][j] ? Math.sqrt(d.seat[i][j] / mx) : null }
    const wallLine = []
    for (let i = 0; i < N; i++) {
      const v = fanVal(i), id = cells.push({ kind: 'wedge', i, b: mid(i) }) - 1, [wft, wh] = wallOf(mid(i)), w0 = wft - 4
      // the field: the whole fan, or a dense band on the warning track (the last 15 ft), and/or the wall's top line
      const from = L.f === 1 ? INFIELD_FT : L.f === 2 || L.f === 4 ? wft - 17 : null, tile = L.f === 1 ? TILE : 1.0
      if (v != null && from != null) for (let rFt = from; rFt < w0; rFt += tile / FT) { const r = rFt * FT, n = Math.max(1, Math.round(((STEP * Math.PI) / 180) * r / tile)); for (let k = 0; k < n; k++) fan.push({ p: P(B0 + STEP * (i + (k + 0.5) / n), rFt).setY(ground), col: col(v), cell: id, size: tile * 0.92 }) }
      if (v != null && (L.f === 3 || L.f === 4)) { const r = wft * FT, n = Math.max(2, Math.round(((STEP * Math.PI) / 180) * r / 0.55)); for (let k = 0; k < n; k++) { const b = B0 + STEP * (i + (k + 0.5) / n), w = wallOf(b); wallLine.push({ p: P(b, w[0], w[1] * FT + 0.05), col: col(v), cell: id, size: 0.62, h: 0.62 }) } }
      for (let j = 0; j < ROWS; j++) {
        const q = [G[i][j], G[i + 1][j], G[i + 1][j + 1], G[i][j + 1]]
        if (!q.every(Boolean)) continue
        const sv = seatVal(i, j), sid = cells.push({ kind: 'seat', i, j, b: mid(i) }) - 1
        if (sv == null) continue
        const nu = Math.max(1, Math.round(q[0].distanceTo(q[1]) / TILE)), nv = Math.max(1, Math.round(q[0].distanceTo(q[3]) / TILE))
        if (L.s === 3) { soft.push({ q, col: col(sv), cell: sid }); continue }
        if (L.s === 4) { const c4 = q[0].clone().add(q[1]).add(q[2]).add(q[3]).multiplyScalar(0.25); seats.push({ p: c4.add(new THREE.Vector3(0, 0.3, 0)), col: col(sv), cell: sid, size: 0.5 + 1.9 * sv, h: 0.5 + 1.9 * sv }); continue }
        for (let u = 0; u < nu; u++) for (let v2 = 0; v2 < nv; v2++) { const a = (u + 0.5) / nu, b2 = (v2 + 0.5) / nv, p = q[0].clone().lerp(q[1], a).lerp(q[3].clone().lerp(q[2], a), b2); seats.push({ p: p.add(new THREE.Vector3(0, 0.25, 0)), col: col(sv), cell: sid, h: L.s === 2 ? 0.3 + 4 * sv : 0.3 }) }
      }
    }
    carpet(fan, 0.18); carpet(seats, 0.3); carpet(wallLine, 0.62, 0.62)
    if (soft.length) { // SOFT: one see-through sheet, each triangle knowing its cell
      const pos = [], cl = [], tri = [], c = new THREE.Color()
      for (const x of soft) { c.set(x.col); const lift = (v) => v.clone().add(new THREE.Vector3(0, 0.3, 0)); for (const v of [x.q[0], x.q[1], x.q[2], x.q[0], x.q[2], x.q[3]].map(lift)) { pos.push(v.x, v.y, v.z); cl.push(c.r, c.g, c.b) } tri.push(x.cell, x.cell) }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3))
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, fog: false, side: THREE.DoubleSide })); m.renderOrder = 22; m.userData.tri = tri
      group.add(m); meshes.push(m); api.NN.hideForNormal?.push(m); group.userData.soft = m
    }
    if (view.metric === 'player') for (const pt of d.pts) { // their home runs as Little Boys: green when gone here, bone when not
      const cellsLB = NUKE_MARKS[16](false, { giants: o.giants?.(pt.b) }).map((c) => (pt.gone ? [c[0], c[1], c[2], GREEN[c[3]] ?? c[3]] : c)), m = voxCells(THREE, cellsLB, 0.22)
      m.position.copy(pt.at).add(new THREE.Vector3(0, 0.15, 0)); group.add(m)
    }
    scene.add(group)
    return group
  }
  // pointing: the cell under a screen point, and an outline round it (bone)
  const ndc = new THREE.Vector2()
  function cellAt(cx, cy) {
    if (!group) return null
    const cv = api.NN.renderer?.domElement; if (!cv) return null
    const r = cv.getBoundingClientRect(); ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, api.NN.camera)
    const h = ray.intersectObjects(meshes, false)[0] // (the nearest: a seat in front of a wedge wins)
    if (!h) return null
    return h.instanceId != null ? cells[h.object.userData.cell[h.instanceId]] ?? null : cells[h.object.userData.tri?.[h.faceIndex]] ?? null
  }
  function outline(cell) {
    if (hi) { group?.remove(hi); hi.geometry.dispose(); hi.material.dispose(); hi = null }
    if (!cell || !group) return
    const ground = home().y + 0.5, G = seatGrid(), i = cell.i, b0 = B0 + STEP * i, b1 = B0 + STEP * (i + 1)
    const pts = cell.kind === 'wedge' ? [P(b0, INFIELD_FT), P(b1, INFIELD_FT), P(b1, wallOf(mid(i))[0] - 4), P(b0, wallOf(mid(i))[0] - 4)].map((p) => p.setY(ground)) : [G[i][cell.j], G[i + 1][cell.j], G[i + 1][cell.j + 1], G[i][cell.j + 1]].map((p) => p.clone().add(new THREE.Vector3(0, 0.7, 0)))
    hi = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#e8e1c9', transparent: true, depthTest: false }))
    hi.renderOrder = 30; group.add(hi)
  }
  return { hard, hardAsync, ready, many, player, leagueDeep, show, clear, cellAt, outline, sectorOf, mid, N, ROWS, ROW_FT, shown: () => group?.userData.heat ?? null, count: () => (group ? group.children.length : 0), cells: () => cells.length }
}
