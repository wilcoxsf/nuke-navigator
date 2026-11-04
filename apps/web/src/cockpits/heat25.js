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
// 4 Nov (Andrew: "I like ice and fire the most but I want more options for 3 color gradients - one color then white then the third. Like ice and fire. Gimme a ton of
// options"): each runs hard (or few) through white to easy (or most); none of them green, which is for gone
const W = '#f4f3ee'
export const GRADS = [
  { c: 4, name: 'ICE AND FIRE', stops: ['#1b5f8c', W, '#ff7a00'], desc: 'cold blue, white, safety orange' },
  { c: 2, name: 'DODGERS AND GIANTS', stops: ['#005a9c', W, '#fd5a1e'], desc: 'Dodger blue where it is hard, Giants orange where it is easy' },
  { c: 3, name: 'FOG AND FLAME', stops: ['#7f93ad', W, '#ff4d00'], desc: "Karl's grey-blue, white, a hot red-orange" },
  { c: 1, name: 'NAVY AND GIANTS', stops: ['#14213d', W, '#fd5a1e'], desc: 'deep navy, white, Giants orange' },
  { c: 5, name: 'BAY AND SUNSET', stops: ['#2a6f97', W, '#f4a259'], desc: 'bay blue, white, a soft sunset orange' },
  { c: 6, name: 'TEAL AND CORAL', stops: ['#0f6e6e', W, '#ff6f59'], desc: 'teal, white, coral' },
  { c: 7, name: 'PURPLE AND GOLD', stops: ['#4b2a7b', W, '#f2b705'], desc: 'purple, white, gold' },
  { c: 8, name: 'STEEL AND RED', stops: ['#43506b', W, '#d1342f'], desc: 'steel, white, red' },
  { c: 9, name: 'PLUM AND MANGO', stops: ['#5b2a5e', W, '#ffa62b'], desc: 'plum, white, mango' },
  { c: 10, name: 'MIDNIGHT AND MAGENTA', stops: ['#1d2a6d', W, '#e0457b'], desc: 'midnight blue, white, magenta' },
  { c: 11, name: 'GRAPHITE AND ORANGE', stops: ['#2b2b2b', W, '#ff7a00'], desc: 'graphite, white, safety orange' },
  { c: 12, name: 'COBALT AND CRIMSON', stops: ['#1f3fbf', W, '#b3122e'], desc: 'cobalt, white, crimson' },
]
//   BLAST FIELD: what the field shows
// 4 Nov (Andrew: "can we literally just recolor the currently orange wall line to this color? Not like a voxel grid, just a thicker and more colored wall line in this
// gradient. Same with warning track we don't need like individual seats I want a solid gradient"): the field is drawn as solid smooth bands, the color sliding along them
export const FIELDS = [
  { c: 4, name: 'TRACK AND WALL', desc: 'the warning track as a solid band of the gradient, and the wall line thicker and in it too' },
  { c: 2, name: 'WARNING TRACK', desc: 'the warning track as a solid band of the gradient, the last 15 ft before the wall' },
  { c: 3, name: 'THE WALL LINE', desc: 'the line along the top of the wall (the home run line), thicker, in the gradient' },
  { c: 1, name: 'FULL FAN', desc: 'the whole outfield from the infield grass to the wall, one solid smooth sheet of the gradient' },
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
const STEP = 2.5, B0 = -45, N = 36, FT = 0.3048, DEEP = 335, ROWS = 16, ROW_FT = 10, INFIELD_FT = 100, TILE = 1.6
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
  // ---- where a home run can come down ----
  // 4 Nov (Andrew, on a screengrab: "blue areas way up into the literal dashboard is that on purpose? Rethink how we're drawing this mesh"; later: "there need to be more
  // areas where it could land - it could land in center field too. I want everywhere the ball could feasibly land for a HR on a heatmap - in both tiles and pillars"):
  // every cell (2.5 degrees across, 10 ft deep) from the wall out to 160 ft past it is sampled every 2 m or so, each point dropped onto whatever is really there (the
  // seats, the concourse, the batter's eye, the Fan Lot; the first surface under 34 m, so not a light tower's top), and over McCovey Cove onto the water. Every point is
  // its own tile at its own height, so nothing is stretched up a wall between two levels; a cell's height for HOW HARD is the middle of its points
  let grid = null
  const ray = new THREE.Raycaster(), SAMPLE = 2.1
  const covePt = (x, y) => x > 25 && Math.hypot(x, y) > 126 && (Math.atan2(x, y) * 180) / Math.PI > 26 // (fx25.js's own test: plate frame, metres)
  function seatGrid() {
    if (grid) return grid
    const h0 = home().y, water = api.toWorld([0, 0, -1.6]).y
    api.NN.stadium?.updateMatrixWorld(true)
    grid = []
    for (let i = 0; i < N; i++) {
      const row = []
      for (let j = 0; j < ROWS; j++) {
        const pts = []
        for (let rr = 0; rr < 2; rr++) {
          const bm = mid(i), r0 = wallOf(bm)[0] + 2 + ROW_FT * (j + (rr + 0.5) / 2), arc = ((STEP * Math.PI) / 180) * r0 * FT, nb = Math.max(1, Math.round(arc / SAMPLE))
          for (let k = 0; k < nb; k++) {
            const b = B0 + STEP * (i + (k + 0.5) / nb), rFt = wallOf(b)[0] + 2 + ROW_FT * (j + (rr + 0.5) / 2), a = (b * Math.PI) / 180, x = rFt * FT * Math.sin(a), y = rFt * FT * Math.cos(a), w = api.toWorld([x, y, 0])
            ray.set(new THREE.Vector3(w.x, h0 + 40, w.z), new THREE.Vector3(0, -1, 0))
            const hit = api.NN.stadium ? ray.intersectObject(api.NN.stadium, true).find((h) => h.point.y < h0 + 34 && h.point.y > h0 - 4) : null
            if (hit) pts.push(new THREE.Vector3(w.x, hit.point.y, w.z))
            else if (covePt(x, y)) pts.push(new THREE.Vector3(w.x, water, w.z))
          }
        }
        row.push(pts.length ? { pts, y: pts.reduce((t, v) => t + v.y, 0) / pts.length, c: pts.reduce((t, v) => t.add(v), new THREE.Vector3()).multiplyScalar(1 / pts.length) } : null)
      }
      grid.push(row)
    }
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
      for (let j = 0; j < ROWS; j++) { const g = G[i][j]; T.push(g ? { ft: wft + 2 + ROW_FT * (j + 0.5), z: g.y - h0 } : null) }
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
  const clear = () => { if (!group) return; { const h = api.NN.hideForNormal; for (const m of [group.userData.soft, ...(group.userData.sheets ?? [])]) { const i = h?.indexOf(m) ?? -1; if (i >= 0) h.splice(i, 1) } } scene.remove(group); group.traverse((x) => { if (x.userData.vox) return; x.geometry?.dispose?.(); x.material?.dispose?.() }); group = null; cells = []; meshes = []; hi = null }
  const stepOf = (S, v) => S[Math.max(0, Math.min(S.length - 1, Math.floor(v * S.length - 1e-9)))]
  const look = () => ({ g: 4, f: 4, s: 1, ...(o.look?.() ?? {}) })
  const gradOf = (g) => (GRADS.find((x) => x.c === g) ?? GRADS[0]).stops
  const colorAt = (stops, v) => { const t = Math.max(0, Math.min(1, v)) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(t)); return '#' + new THREE.Color(stops[i]).lerp(new THREE.Color(stops[i + 1]), t - i).getHexString() }
  // a solid sheet of colored triangles; tri: the cell of each triangle (for pointing). Kept out of the ink pass, so the color runs clean
  function solid(pos, cl, tri, opacity = 1) {
    if (!pos.length) return null
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3))
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: opacity < 1, opacity, depthWrite: opacity >= 1, fog: false, side: THREE.DoubleSide }))
    m.renderOrder = 22; m.userData.tri = tri
    group.add(m); meshes.push(m); api.NN.hideForNormal?.push(m); (group.userData.sheets ??= []).push(m)
    return m
  }
  function carpet(tiles, h, size = TILE * 0.82, opacity = 1) {
    if (!tiles.length) return
    const mat = opacity < 1 ? new THREE.MeshBasicMaterial({ transparent: true, opacity, depthWrite: false, fog: false }) : new THREE.MeshLambertMaterial({ flatShading: true, fog: false })
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, tiles.length), m4 = new THREE.Matrix4(), c = new THREE.Color()
    if (opacity < 1) { api.NN.hideForNormal?.push(m); (group.userData.sheets ??= []).push(m) }
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
    const fieldV = Array(N).fill(null), wedgeId = Array(N).fill(-1)
    for (let i = 0; i < N; i++) {
      const v = fanVal(i), id = (wedgeId[i] = cells.push({ kind: 'wedge', i, b: mid(i) }) - 1), [wft, wh] = wallOf(mid(i)), w0 = wft - 4
      fieldV[i] = v; void w0; void wh
      for (let j = 0; j < ROWS; j++) {
        const g = G[i][j]
        if (!g) continue
        const sv = seatVal(i, j), sid = cells.push({ kind: 'seat', i, j, b: mid(i) }) - 1
        if (sv == null) continue
        if (L.s === 4) { seats.push({ p: g.c.clone().add(new THREE.Vector3(0, 0.3, 0)), col: col(sv), cell: sid, size: 0.5 + 1.9 * sv, h: 0.5 + 1.9 * sv }); continue }
        for (const p of g.pts) (L.s === 3 ? soft : seats).push({ p: p.clone().add(new THREE.Vector3(0, 0.25, 0)), col: col(sv), cell: sid, size: SAMPLE * 0.86, h: L.s === 2 ? 0.3 + 5 * sv : 0.3 })
      }
    }
    carpet(seats, 0.3); carpet(soft, 0.12, SAMPLE * 0.86, 0.6) // (SOFT: thin see-through tiles, no ink)
    // the field, solid: a value at every bearing, slid smoothly between the wedges' middles
    const vAt = (b) => { const t = (b - B0) / STEP - 0.5, i0 = Math.max(0, Math.min(N - 1, Math.floor(t))), i1 = Math.min(N - 1, i0 + 1), f = Math.max(0, Math.min(1, t - i0)); const a0 = fieldV[i0], a1 = fieldV[i1]; return a0 == null ? a1 : a1 == null ? a0 : a0 + (a1 - a0) * f }
    const K = 6, bs = Array.from({ length: N * K + 1 }, (_, k) => B0 + (k * STEP) / K)
    const band = (rIn, rOut, lift) => { // a strip between two radii (functions of the bearing), its color at each bearing
      const pos = [], cl = [], tri = [], c = new THREE.Color()
      for (let k = 0; k + 1 < bs.length; k++) {
        const b0 = bs[k], b1 = bs[k + 1], v0 = vAt(b0), v1 = vAt(b1)
        if (v0 == null || v1 == null) continue
        const A = P(b0, rIn(b0)).setY(lift), B = P(b1, rIn(b1)).setY(lift), C = P(b1, rOut(b1)).setY(lift), D = P(b0, rOut(b0)).setY(lift), c0 = new THREE.Color(col(v0)), c1 = new THREE.Color(col(v1))
        for (const [v, cc] of [[A, c0], [B, c1], [C, c1], [A, c0], [C, c1], [D, c0]]) { pos.push(v.x, v.y, v.z); cl.push(cc.r, cc.g, cc.b) }
        const cell = wedgeId[sectorOf((b0 + b1) / 2)]; tri.push(cell, cell)
      }
      return solid(pos, cl, tri)
    }
    if (L.f === 1) band(() => INFIELD_FT, (b) => wallOf(b)[0] - 2, ground + 0.02)
    if (L.f === 2 || L.f === 4) band((b) => wallOf(b)[0] - 17, (b) => wallOf(b)[0] - 2, ground + 0.03)
    if (L.f === 3 || L.f === 4) { // the wall line: a thick tube along the top of the wall, over the park's own orange one, its color sliding along it
      const pts = bs.map((b) => P(b, wallOf(b)[0], wallOf(b)[1] * FT + 0.15)), curve = new THREE.CatmullRomCurve3(pts), segs = pts.length * 2, rad = 10
      const g = new THREE.TubeGeometry(curve, segs, 0.42, rad, false), n = g.attributes.position.count, cl = new Float32Array(n * 3), c = new THREE.Color()
      for (let k = 0; k < n; k++) { const seg = Math.floor(k / (rad + 1)), b = B0 + (seg / segs) * (N * STEP), v = vAt(b) ?? 0; c.set(col(v)); cl.set([c.r, c.g, c.b], k * 3) }
      g.setAttribute('color', new THREE.BufferAttribute(cl, 3))
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false })); m.userData.tri = Array.from({ length: g.index.count / 3 }, (_, t) => wedgeId[sectorOf(B0 + (Math.floor(t / (rad * 2)) / segs) * (N * STEP))])
      group.add(m); meshes.push(m)
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
    const pts = cell.kind === 'wedge' ? [P(b0, INFIELD_FT), P(b1, INFIELD_FT), P(b1, wallOf(mid(i))[0] - 4), P(b0, wallOf(mid(i))[0] - 4)].map((p) => p.setY(ground)) : (() => { const y = (G[i][cell.j]?.y ?? ground) + 0.7, r0 = (b) => wallOf(b)[0] + 2 + ROW_FT * cell.j, r1 = (b) => r0(b) + ROW_FT; return [P(b0, r0(b0)), P(b1, r0(b1)), P(b1, r1(b1)), P(b0, r1(b0))].map((p) => p.setY(y)) })()
    hi = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#e8e1c9', transparent: true, depthTest: false }))
    hi.renderOrder = 30; group.add(hi)
  }
  return { hard, hardAsync, ready, many, player, leagueDeep, show, clear, cellAt, outline, sectorOf, mid, N, ROWS, ROW_FT, shown: () => group?.userData.heat ?? null, count: () => (group ? group.children.length : 0), cells: () => cells.length }
}
