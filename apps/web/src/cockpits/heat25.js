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
import { readHitter, cutsOf, typeOf } from './hitter25.js'
import { voxCells } from './vox25.js'
import { NUKE_MARKS } from '../landing.js'
import { parkHit } from '../seance.js'
// (6 Nov, Andrew: "the missiles here were green and orange for ones hit at oracle and then the color of the ballpark they hit it out at if it's away - the bomb and fins
// matching that color scheme"): a bomb's body and fins by the park its home run was hit in, the home team's colors brightened to read on the dark park
const BOMB_HOME = ['#9dff00', '#ff7a00'], BOMB_NONE = ['#e8e1c9', '#8a8f99']
const BOMB_TEAM = { ARI: ['#e0455a', '#e3d4ad'], AZ: ['#e0455a', '#e3d4ad'], ATL: ['#e8365a', '#eaaa00'], ATH: ['#efb21e', '#1f7a4d'], OAK: ['#efb21e', '#1f7a4d'], BAL: ['#f2691e', '#1b1c1f'],
  BOS: ['#e24a55', '#3b5b9a'], CHC: ['#4a7dff', '#e8365a'], CWS: ['#c4ced4', '#1b1c1f'], CIN: ['#e8344c', '#f2f0ea'], CLE: ['#ef3e4a', '#3b5b9a'], COL: ['#9b6bff', '#c4ced4'],
  DET: ['#3d6bb3', '#fa4616'], HOU: ['#eb6e1f', '#2b4a8c'], KC: ['#4a8fe0', '#bd9b60'], LAA: ['#e0263c', '#c4ced4'], LAD: ['#2f7fd1', '#f2f0ea'], MIA: ['#00a3e0', '#ef3340'],
  MIL: ['#ffc52f', '#2b4a8c'], MIN: ['#d31145', '#3b5b9a'], NYM: ['#ff5910', '#2b5bb5'], NYY: ['#3d5a99', '#f2f0ea'], PHI: ['#e81828', '#3b5b9a'], PIT: ['#fdb827', '#1b1c1f'],
  SD: ['#ffc425', '#6b4a2b'], SEA: ['#0aa3a3', '#3b5b9a'], STL: ['#c41e3a', '#fedb00'], TB: ['#8fbce6', '#2b4a8c'], TEX: ['#3d6bb3', '#e0263c'], TOR: ['#2f7fd1', '#e8365a'], WSH: ['#e0263c', '#f2f0ea'] }
export const bombColors = (park) => (park === 'SF' ? BOMB_HOME : BOMB_TEAM[park] ?? BOMB_NONE)
const DOWN = { x: 0, y: -1, z: 0 }

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
// 4 Nov (Andrew: "I like ice and fire the most but I want more options for 3 color gradients - one color then white then the third"); later ("I think it's either ice and
// fire or dodgers - I want a cool / hot heatmap. Give me 10 options like that, with the orange always being the orange we're using everywhere else"): cool, white, then
// SAFETY ORANGE (#ff7a00, the study's one orange, orange25.js ORANGE_LOCK 3); only the cool end changes. None is green, which is for gone
const W = '#f4f3ee', HOT = '#ff7a00'
export const GRADS = [
  { c: 4, name: 'ICE AND FIRE', stops: ['#1b5f8c', W, HOT], desc: 'deep ice blue' },
  { c: 2, name: 'DODGERS', stops: ['#005a9c', W, HOT], desc: 'Dodger blue' },
  { c: 24, name: 'GLACIER', stops: ['#2c7fb8', W, HOT], desc: 'a brighter glacier blue' },
  { c: 25, name: 'COBALT', stops: ['#1f3fbf', W, HOT], desc: 'cobalt' },
  { c: 26, name: 'INDIGO', stops: ['#3a3f9e', W, HOT], desc: 'blue going violet' },
  { c: 27, name: 'NAVY', stops: ['#14213d', W, HOT], desc: 'near-black navy: the hard end almost disappears' },
  { c: 28, name: 'TEAL', stops: ['#0f6e6e', W, HOT], desc: 'cold sea teal' },
  { c: 29, name: 'STEEL', stops: ['#43506b', W, HOT], desc: 'steel blue-grey' },
  { c: 30, name: 'ARCTIC', stops: ['#5f9fd6', W, HOT], desc: 'pale arctic blue: the softest cold' },
  { c: 31, name: 'BAY AT NIGHT', stops: ['#0b2545', W, HOT], desc: 'the bay after dark' },
]
//   THE PILLARS (4 Nov, Andrew: "Def pillars for the seats - give me more options on how far they go up and down, how smooth they are, etc."): three switches
export const PILLAR_HEIGHTS = [
  { c: 2, name: 'MEDIUM', m: 5, desc: 'up to 5 m: a skyline you can read from the broadcast seat' },
  { c: 1, name: 'LOW', m: 2.2, desc: 'up to 2 m: a relief, close to the seats' },
  { c: 3, name: 'TALL', m: 9, desc: 'up to 9 m: towers' },
  { c: 4, name: 'TOWERING', m: 14, desc: 'up to 14 m: a city' },
]
export const PILLAR_SHAPES = [
  { c: 1, name: 'BLOCKY', desc: 'every tile at its own cell\'s height: steps between cells' },
  { c: 2, name: 'SMOOTH', desc: 'heights and colors slide between the cells, so the skyline rolls' },
  { c: 3, name: 'TERRACES', desc: 'five heights only, like contour terraces' },
  { c: 4, name: 'NEEDLES', desc: 'thin pillars with gaps between: a bed of nails' },
]
export const PILLAR_WAYS = [
  { c: 1, name: 'EASY STANDS TALL', desc: 'the easier to reach, the taller' },
  { c: 2, name: 'HARD STANDS TALL', desc: 'the harder to reach, the taller: walls of difficulty' },
]
//   PILLAR PAINT (4 Nov, evening; GPT's red team: the pillars wear the same white, peach and blue as the real seats and melt into them; Andrew: "9a but give me
//   options"): where the gradient goes on a pillar
export const PILLAR_PAINTS = [
  { c: 1, name: 'FULL COLOR', desc: 'the whole pillar in the gradient' },
  { c: 2, name: 'TOPS ONLY', desc: 'near-black pillars, the color only on a cap at the top' },
  { c: 3, name: 'TOP BAND', desc: 'near-black pillars with a deep band of color at the top' },
  { c: 4, name: 'SHADED SIDES', desc: 'sides in a dark version of the color, the cap in the full color' },
]
export const DARK = '#1d2024'
// SIDE SHADE (4 Nov, night, Andrew: "Shaded sides great pick I love it, give me options for levels of shading"): how much of the color the sides keep
export const SIDE_SHADES = [
  { c: 1, name: 'LIGHT', keep: 0.7, desc: 'the sides keep seven tenths of the color' },
  { c: 2, name: 'AS FIRST SHOWN', keep: 0.42, desc: 'the sides keep four tenths: the one he liked' },
  { c: 3, name: 'DEEP', keep: 0.25, desc: 'a quarter of the color: the caps glow' },
  { c: 4, name: 'NEAR BLACK', keep: 0.12, desc: 'almost black sides, only the caps carry the map' },
]
//   THE BLAST CAMERA (4 Nov, evening; the red team: from straight down the middle the front rows hide the back ones; Andrew: "10a sure but give me options")
//   [where it sits, what it looks at], plate frame in metres: x toward right field, y out to center, z up
// 5 Nov (Andrew: "Blast radius needs to go further back still - see screengrab you can't see the left field arcade and the controls are in the way. Give me different
// viewpoint options, each of which where you can see the whole field"): each at its own fixed zoom (z), whatever the window's size, the park framed clear of AIR and WIND
export const BLAST_CAMS = [
  { c: 1, name: 'HIGH BEHIND HOME', at: [0, -80, 178], to: [0, 112, 0], z: 1.12, desc: 'high behind the plate, looking straight out: the whole park, foul pole to foul pole' },
  { c: 2, name: 'BLIMP', at: [0, 52, 300], to: [0, 106, 0], z: 1.14, desc: 'almost straight down from over the infield: the park as a map, nothing hiding anything' },
  { c: 3, name: 'THIRD-BASE SIDE', at: [-120, -40, 175], to: [12, 102, 0], z: 1.03, desc: 'high over the third-base seats, looking across: right field and the arcade face you' },
  { c: 4, name: 'FIRST-BASE SIDE', at: [120, -40, 175], to: [-12, 102, 0], z: 1.03, desc: 'high over the first-base seats, looking across: left field and the bleachers face you' },
]
//   THE BOMBS ARRIVE (4 Nov, evening, the surprise round): how a player's Little Boys get to where their home runs come down
export const BOMB_DROPS = [
  { c: 1, name: 'BOMBING RUN', desc: 'one after another out of the sky, oldest first, a ring on the ground as each lands' },
  { c: 2, name: 'CARPET', desc: 'a sweep from the left-field line to the right-field line, all falling in a wave' },
  { c: 3, name: 'POP UP', desc: 'each grows up out of the spot it came down on' },
  { c: 4, name: 'JUST THERE', desc: 'no motion: they are simply there' },
]
//   BLAST CONTRAST (4 Nov, Andrew: "let me see what it looks like with more contrast"): how the mph become colors
export const CONTRASTS = [
  { c: 2, name: 'STRETCHED', desc: 'the field and the seats each stretched over their own easiest to hardest, so both use the whole run of color' },
  { c: 1, name: 'ONE SCALE', desc: 'one scale for everything, 96 to 118 mph: the field stays warm, the blue is up the back of the seats' },
  { c: 3, name: 'RANKED', desc: 'each part ranked against the rest: the most contrast, an even spread of every color' },
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
  const put = (m, k, v) => { m.set(k, v); while (m.size > 12) m.delete(m.keys().next().value); return v } // (the last 12 airs only)
  const covePt = (x, y) => x > 25 && Math.hypot(x, y) > 126 && (Math.atan2(x, y) * 180) / Math.PI > 26 // (fx25.js's own test: plate frame, metres)
  // (4 Nov, night: building this grid was most of BLAST RADIUS's wait once the mph came off the device; it is built a wedge at a time, in the background too)
  let gridPart = null
  const gridCtx = () => { const h = home(); return { h, h0: h.y, water: api.toWorld([0, 0, -1.6]).y, blockers: (o.blockers?.() ?? []).filter(Boolean) } }
  function gridRow(i, C) {
    const { h, h0, water, blockers } = C
      const row = []
      for (let j = 0; j < ROWS; j++) {
        const pts = []
        for (let rr = 0; rr < 2; rr++) {
          const bm = mid(i), r0 = wallOf(bm)[0] + 2 + ROW_FT * (j + (rr + 0.5) / 2), arc = ((STEP * Math.PI) / 180) * r0 * FT, nb = Math.max(1, Math.round(arc / SAMPLE))
          for (let k = 0; k < nb; k++) {
            const b = B0 + STEP * (i + (k + 0.5) / nb), rFt = wallOf(b)[0] + 2 + ROW_FT * (j + (rr + 0.5) / 2), a = (b * Math.PI) / 180, x = rFt * FT * Math.sin(a), y = rFt * FT * Math.cos(a), w = api.toWorld([x, y, 0])
            const past = (rFt - wallOf(b)[0]) * FT, cap = h0 + wallOf(b)[1] * FT + 0.62 * past + 3.5 // (the stands rise about 0.6 m a metre back; nothing much above that is a place a ball lands: not a ledge of the board)
            const hit = parkHit(api.NN, new THREE.Vector3(w.x, cap, w.z), DOWN, cap - h0 + 6)
            let at = hit && hit.point.y > h0 - 4 ? hit.point.clone() : covePt(x, y) ? new THREE.Vector3(w.x, water, w.z) : null
            // a ball comes down from the plate's side at 30 to 50 degrees: where the sky that way is shut (under an overhang, behind the board) it cannot land
            // (4 Nov, later; Andrew's screengrabs: tiles behind and under the board) the scoreboard and its sign are not part of the park's model, so they are asked too; and
            // nothing may be straight over the point (under a deck, under the board)
            if (at) {
              const from = at.clone().add(new THREE.Vector3(0, 0.4, 0)), back = new THREE.Vector3(h.x - at.x, 0, h.z - at.z).normalize()
              const shut = (d, far) => !!parkHit(api.NN, from, d, far) || (blockers.length && (ray.set(from, d), (ray.far = far), ray.intersectObjects(blockers, true).length > 0))
              const open = !shut(new THREE.Vector3(0, 1, 0), 40) && [30, 45, 60].some((e) => { const r = (e * Math.PI) / 180; return !shut(back.clone().multiplyScalar(Math.cos(r)).setY(Math.sin(r)), 120) })
              ray.far = Infinity
              if (!open) at = null
            }
            if (at) pts.push(new THREE.Vector3(w.x, at.y, w.z))
          }
        }
        // (4 Nov, later: "still some shit in the stand") walking out from the wall, the stands rise steadily; a point far over the row before it, or over its own cell's
        // middle, is something standing on the stands (a light tower's platform, a sign), not a place a ball comes down
        const prev = row[j - 1], base = prev ? prev.y : h0 + wallOf(mid(i))[1] * FT, med = pts.length ? [...pts].sort((a, b) => a.y - b.y)[Math.floor(pts.length / 2)].y : 0
        const keep = pts.filter((v) => v.y <= base + 0.9 * ROW_FT * FT + 2.5 && v.y <= med + 3.5)
        row.push(keep.length ? { pts: keep, y: keep.reduce((t, v) => t + v.y, 0) / keep.length, c: keep.reduce((t, v) => t.add(v), new THREE.Vector3()).multiplyScalar(1 / keep.length) } : prev ? { ...prev, pts: [], gap: true } : null)
      }
      return row.map((x) => (x?.gap ? null : x))
  }
  function seatGrid() {
    if (grid) return grid
    if (!api.NN.stadium) return Array.from({ length: N }, () => Array(ROWS).fill(null)) // (red team 10: nothing to land on yet; not kept)
    api.NN.stadium?.updateMatrixWorld(true)
    const P = gridPart ?? { rows: [], C: gridCtx() }
    for (let i = P.rows.length; i < N; i++) P.rows.push(gridRow(i, P.C))
    grid = P.rows; gridPart = null
    return grid
  }
  function seatGridAsync(done, slice = 8) {
    if (grid) { done?.(grid); return }
    if (!api.NN.stadium) { addEventListener('nn-stadium', () => seatGridAsync(done, slice), { once: true }); return }
    if (!gridPart) { api.NN.stadium?.updateMatrixWorld(true); gridPart = { rows: [], C: gridCtx() } }
    const P = gridPart
    const tick = () => { if (grid) { done?.(grid); return } if (gridPart !== P) return; const t = performance.now(); while (P.rows.length < N && performance.now() - t < slice) P.rows.push(gridRow(P.rows.length, P.C)); if (P.rows.length < N) setTimeout(tick, 16); else { grid = P.rows; gridPart = null; done?.(grid) } }
    setTimeout(tick, 0)
  }
  // ---- HOW HARD ----
  const cacheH = new Map()
  const goes = (a, ev, la, dir) => api.fly(st(a, ev, la, dir), { floor: -8 }).verdict.kind === 'GONE'
  // worked out a few wedges at a time (hardAsync) so the page keeps drawing while it goes; hard() does it all at once (the tests, a warm cache)
  // 4 Nov, night (Andrew: "When I click blast radius it take 3-4 seconds to load FYI, can we shorten that?"): each air's answer is also kept on the device (a few KB),
  // and warm() works a normal night out quietly in the background, in thin slices, a few seconds after the page is up; opening BLAST RADIUS then has it at once
  const HARD_V = 'nn25.hard.v2.'
  const stored = (key) => { if (cacheH.has(key)) return cacheH.get(key); try { const j = JSON.parse(localStorage.getItem(HARD_V + key) ?? 'null'); if (j?.wall?.length === N && j.seat?.length === N) { const out = { air: JSON.parse(key), wall: j.wall, seat: j.seat }; put(cacheH, key, out); return out } } catch (err) { void err } return null }
  function hard() { const a = air(), key = JSON.stringify(a), had = stored(key); if (had) return had; const job = start(a); while (job.i < N) step(job); return finish(job) }
  const jobs = new Map()
  function hardAsync(done, a = air(), slice = 24) {
    const key = JSON.stringify(a), had = stored(key)
    if (had) { if (done) queueMicrotask(() => done(had)); return had } // (red team 9)
    if (!api.NN.stadium) { addEventListener('nn-stadium', () => hardAsync(done, a, slice), { once: true }); return null } // (red team 10: not before the park is in)
    if (jobs.has(key)) { const j = jobs.get(key); j.done.push(done); j.slice = Math.max(j.slice, slice); return null }
    if (slice >= 24) for (const [k, j] of jobs) if (j.fg) { j.dead = true; jobs.delete(k) } // (red team 6: only the air asked for last is worked out)
    const job = start(a); job.done = [done]; job.slice = slice; job.fg = slice >= 24; jobs.set(key, job)
    const tick = () => { if (job.dead) return; const t = performance.now(); while (job.i < N && performance.now() - t < job.slice) step(job); if (job.i < N) setTimeout(tick, job.slice < 24 ? 16 : 0); else { jobs.delete(key); const out = finish(job); for (const f of job.done) f?.(out) } }
    setTimeout(tick, 0)
    return null
  }
  const ready = () => stored(JSON.stringify(air()))
  const cancel = () => { for (const [k, j] of jobs) if (j.fg) { j.dead = true; jobs.delete(k) } }
  // the warm-up: this air (a normal night), then the hitter list, in 10 ms slices with 16 ms rests between
  function warm(a) { const b = { ...a, hand: -a.hand }; seatGridAsync(() => hardAsync(() => hardAsync(() => setTimeout(() => { try { hitters() } catch (err) { void err } }, 400), b, 10), a, 10)) } // (both sides of the plate: the dojo's batter may be either)
  // 4 Nov, evening (GPT's red team: "Seat threshold is clearance, not a landing solution", and the wall's aim was set once, at 108 mph and 28 degrees; our own check
  // agreed: a third of the seat numbers came down a row or more off, and many in the next wedge over). Now every flight is credited to where it really comes down:
  // for each wedge and four launch angles (24, 28, 32, 36), aimed so a 110 mph ball comes down on that bearing, the softest speed that leaves the park (halving, to the
  // mph), then every mph up from there until it lands past the last row. Each flight that leaves goes into the wall of the wedge it comes down in, and the seat cell it
  // first touches (findLanding: the first thing in the park it hits), keeping the softest. A cell no flight came down in, with flights on both sides of it, takes
  // the middle of its two neighbors (marked).
  const LAS = [24, 28, 32, 36]
  const start = (a) => ({ a, i: 0, G: seatGrid(), wall: Array(N).fill(null), seat: Array.from({ length: N }, () => Array(ROWS).fill(null)) })
  const finish = (job) => {
    const { G, wall, seat } = job
    for (let i = 0; i < N; i++) if (!wall[i]) { const p = wall[i - 1], q = wall[i + 1]; if (p && q) wall[i] = { ev: Math.round((p.ev + q.ev) / 2), la: p.la, dir: mid(i), fill: true } }
    for (let i = 0; i < N; i++) for (let j = 0; j < ROWS; j++) {
      if (seat[i][j] || !G[i][j]) continue
      const pairs = [[seat[i][j - 1], seat[i][j + 1]], [seat[i - 1]?.[j], seat[i + 1]?.[j]]].find(([p, q]) => p && q && !p.fill && !q.fill)
      if (pairs) seat[i][j] = { ev: Math.round((pairs[0].ev + pairs[1].ev) / 2), la: pairs[0].la, dir: mid(i), fill: true }
    }
    const out = { air: job.a, wall, seat }, key = JSON.stringify(job.a); put(cacheH, key, out); try { localStorage.setItem(HARD_V + key, JSON.stringify({ wall, seat })) } catch (err) { void err } return out
  }
  function step(job) {
    const { a, G, wall, seat } = job, i = job.i++, b = mid(i)
    for (const la of LAS) {
      let dir = b
      for (let k = 0; k < 2; k++) { const r = api.fly(st(a, 110, la, dir), { floor: -8 }); if (r.landB == null) break; dir += b - r.landB }
      if (!goes(a, 132, la, dir)) continue
      let lo = 80, hi = 132
      while (hi - lo > 0.5) { const m = (lo + hi) / 2; if (goes(a, m, la, dir)) hi = m; else lo = m }
      for (let ev = Math.floor(lo) + 1; ev <= 132; ev++) { // (every whole mph above the last one that stayed in)
        const res = api.fly(st(a, ev, la, dir), { floor: -8 }); if (res.verdict.kind !== 'GONE') continue
        const w = where(api.findLanding(res.path).point); if (w.i < 0) continue
        if (!wall[w.i] || ev < wall[w.i].ev) wall[w.i] = { ev, la, dir }
        if (w.j >= ROWS) break // (past the last row: harder only goes farther)
        if (w.j >= 0 && G[w.i][w.j] && (!seat[w.i][w.j] || ev < seat[w.i][w.j].ev)) seat[w.i][w.j] = { ev, la, dir }
      }
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
    // (4 Nov, evening; GPT's red team: "The 463 recorded Oracle home runs do not reconcile to the 396 shown in the seven zones"): each one is counted once, in one of
    // these: came down in the map (in the seats, or past the last row), the physics keeps it in the park (the flight as recorded, flown again, falls short), or it
    // wraps round a pole (comes down outside the lines)
    const wedge = Array(N).fill(0), seat = Array.from({ length: N }, () => Array(ROWS).fill(0)), hrs = (o.balls ?? []).filter((b) => b.park === 'SF' && b.hr)
    const tally = { n: hrs.length, mapped: 0, seated: 0, past: 0, short: 0, wrap: 0, kinds: {} }
    for (const b of hrs) {
      const res = api.fly({ ...api.state, ev: b.ev, la: b.la, dir: b.dir, hand: b.s === 'R' ? 1 : -1, temp: b.temp, wind: 0, xwind: 0, carry: b.carry, dws: b.dws ?? 0, tab: false }, { floor: -8 })
      if (res.verdict.kind !== 'GONE') { tally.short++; tally.kinds[res.verdict.kind] = (tally.kinds[res.verdict.kind] ?? 0) + 1; continue }
      const w = where(api.findLanding(res.path).point)
      if (w.i < 0) { tally.wrap++; continue }
      tally.mapped++; wedge[w.i]++; if (w.j >= 0 && w.j < ROWS) { seat[w.i][w.j]++; tally.seated++ } else tally.past++
    }
    record = { n: hrs.length, wedge, seat, tally }
    return record
  }
  // ---- A PLAYER ----
  function shares(balls, a, keep = false) {
    const n = Array(N).fill(0), out = Array(N).fill(0), pts = [], seat = Array.from({ length: N }, () => Array(ROWS).fill(0))
    for (const b of balls) {
      if (Math.abs(b.dir) > 45) continue
      const res = api.fly(st({ ...a, hand: b.hand ?? a.hand }, b.ev, b.la, b.dir, { dws: b.dws ?? 0 }), { floor: -8 }), gone = res.verdict.kind === 'GONE', i = sectorOf(b.dir)
      n[i]++; if (gone) out[i]++
      if (keep) { const L = gone ? api.findLanding(res.path) : null, at = gone ? L.point : api.toWorld(res.path[res.path.length - 1].p), end = Math.min(res.path.length, (L?.index ?? res.path.length - 1) + 1), step = Math.max(1, Math.floor(end / 36)), trail = []; for (let q = 0; q < end; q += step) trail.push(api.toWorld(res.path[q].p)); trail.push(at.clone()); pts.push({ at, gone, trail, b: b.ref, kind: L?.kind ?? null, spray: b.dir * (b.hand ?? 1) }); if (gone) { const w = where(at); if (w.i >= 0 && w.j >= 0 && w.j < ROWS) seat[w.i][w.j]++ } }
    }
    return { n, out, pts, seat, rate: n.map((k, i) => (k ? out[i] / k : null)) }
  }
  const cacheP = new Map()
  function leagueDeep() {
    const a = air(), key = JSON.stringify({ ...a, hand: 0 })
    if (cacheP.has(key)) return cacheP.get(key)
    const rows = (o.pool?.rows ?? []).filter((r) => r[3] >= DEEP).map((r) => ({ ev: r[0], la: r[1], dir: r[2], hand: r[5] === 'L' ? -1 : 1 }))
    const s = shares(rows, a)
    put(cacheP, key, s)
    return s
  }
  // 4 Nov (Andrew: "For each player I want only their home runs not all of their deep balls, and I want some description for what type of hitter they are in histograms
  // (pull / push, where are they hitting it to, at what launch angle, at what exit velo?)"): their home runs (any park, July 2023 on) flown here in this air; the field is
  // how many of them go each way, the seats where they come down; prof: what kind of hitter the home runs say they are
  // 4 Nov, later (Andrew: "For each player I want like a 'customized heatmap' ... we should have a profile of where they hit like all of their balls as a proxy for
  // where they're likely to hit a home run, and then we only show the actual nuke diagrams for the home runs"): the map is built from every ball of theirs in the set
  // (335 ft and more, and the home runs). The field: the share of them going each way (each ball spread over the wedges round it, 4 degrees wide). The seats: each
  // ball flown here at its own speed and angle, and at 4 and 8 degrees either side of where it went (weighted 1, 0.7, 0.35), so a 400 ft fly to center also says
  // what it would have done a little to the side; where the ones that go out come down. The Little Boys are only their real home runs.
  const SPREAD = [[0, 1]] // (4 Nov, night: one flight a ball, picking a player was the other wait; the spread to each side is now the wider blend in show())
  const ballsOf = (id) => (o.balls ?? []).filter((b) => String(b.b) === String(id) && (b.ft >= DEEP || b.hr)).map((b) => ({ ev: b.ev, la: b.la, dir: b.dir, hand: b.s === 'L' ? -1 : 1, dws: b.dws ?? 0, ft: b.ft, hr: !!b.hr, s: b.s, ref: b }))
  const outsOf = (pts) => pts.map((p) => { const w = where(p.at); return { gone: p.gone, b: w.b, spray: p.spray, area: p.kind === 'SPLASH' ? 'cove' : w.b < -7 ? 'bleachers' : w.b >= 22 ? 'arcade' : 'center' } }) // (the left-field bleachers; the arcade along right)
  const cacheY = new Map()
  function player(id) {
    const a = air(), key = id + JSON.stringify(a)
    if (cacheY.has(key)) return cacheY.get(key)
    const mine = ballsOf(id), hrB = mine.filter((b) => b.hr), s = shares(hrB, a, true)
    const field = Array(N).fill(0), seat = Array.from({ length: N }, () => Array(ROWS).fill(0))
    for (const b of mine) {
      for (let i = 0; i < N; i++) { const d = mid(i) - b.dir; field[i] += Math.exp((-d * d) / 32) }
      for (const [off, w] of SPREAD) {
        const dir = b.dir + off; if (Math.abs(dir) > 45) continue
        const res = api.fly(st({ ...a, hand: b.hand }, b.ev, b.la, dir, { dws: b.dws }), { floor: -8 }); if (res.verdict.kind !== 'GONE') continue
        const wh = where(api.findLanding(res.path).point); if (wh.i >= 0 && wh.j >= 0 && wh.j < ROWS) seat[wh.i][wh.j] += w
      }
    }
    const fTot = field.reduce((t, x) => t + x, 0) || 1, sTot = seat.flat().reduce((t, x) => t + x, 0) || 1
    const out = { id, air: a, n: mine.length, hr: hrB.length, hrOut: s.pts.filter((p) => p.gone).length, n5: s.n, out5: s.out, rate: s.rate, pts: s.pts, hrSeat: s.seat,
      field: field.map((x) => x / fTot), seat: seat.map((r) => r.map((x) => x / sTot)), prof: profile(hrB), read: readHitter(mine, outsOf(s.pts)) }
    const T = hitters(); out.type = typeOf(out.read, T.cuts); out.rank = T
    { const G = seatGrid(), water = api.toWorld([0, 0, -1.6]).y; let best = null; for (let i = 0; i < N; i++) for (let j = 0; j < ROWS; j++) { const v = out.seat[i][j]; if (v > 0 && G[i][j] && (!best || v > best.v)) best = { i, j, v, c: G[i][j].c.clone(), cove: G[i][j].y < water + 1 } } out.best = best }
    put(cacheY, key, out)
    return out
  }
  // every hitter with 12 or more balls in the set, read and typed (their home runs flown here for the badges; the cuts are thirds over all of them)
  const cacheT = new Map()
  function hitters() {
    const a = air(), key = JSON.stringify(a)
    if (cacheT.has(key)) return cacheT.get(key)
    const n = new Map(); for (const b of o.balls ?? []) if (b.ft >= DEEP || b.hr) n.set(String(b.b), (n.get(String(b.b)) ?? 0) + 1)
    const list = [...n.entries()].filter(([, k]) => k >= 12).map(([id]) => { const mine = ballsOf(id), hrB = mine.filter((b) => b.hr); return { id, read: readHitter(mine, outsOf(shares(hrB, a, true).pts)) } })
    const cuts = cutsOf(list.map((x) => x.read))
    for (const x of list) x.type = typeOf(x.read, cuts)
    const T = { cuts, list }
    put(cacheT, key, T)
    return T
  }
  // pulled (to their own side: left for a righty, right for a lefty, more than 15 degrees), up the middle, or the other way; the middle half of their speeds and angles
  function profile(hrs) {
    if (!hrs.length) return null
    const q = (v, k) => { const x = [...v].sort((p, r) => p - r); return x[Math.min(x.length - 1, Math.floor(k * x.length))] }
    const pull = hrs.filter((b) => (b.hand > 0 ? b.dir < -15 : b.dir > 15)).length, oppo = hrs.filter((b) => (b.hand > 0 ? b.dir > 15 : b.dir < -15)).length, mid = hrs.length - pull - oppo
    const ev = hrs.map((b) => b.ev), la = hrs.map((b) => b.la), ft = hrs.map((b) => b.ft), spray = hrs.map((b) => b.dir * b.hand) // spray: negative pulled, positive the other way
    const sides = new Set(hrs.map((b) => b.ref.s))
    return { n: hrs.length, pull: pull / hrs.length, mid: mid / hrs.length, oppo: oppo / hrs.length, ev, la, spray, ft, ev25: q(ev, 0.25), ev75: q(ev, 0.75), la25: q(la, 0.25), la75: q(la, 0.75), ftMid: q(ft, 0.5), ftMax: Math.max(...ft), side: sides.size > 1 ? 'S' : [...sides][0] }
  }

  // ---- drawing: a carpet of flat voxel tiles, one InstancedMesh per layer, each tile knowing its cell (for pointing) ----
  const clear = () => { if (!group) return; { const h = api.NN.hideForNormal; for (const m of [group.userData.soft, ...(group.userData.sheets ?? [])]) { const i = h?.indexOf(m) ?? -1; if (i >= 0) h.splice(i, 1) } } scene.remove(group); group.traverse((x) => { if (x.userData.vox) return; x.geometry?.dispose?.(); x.material?.dispose?.() }); group = null; cells = []; meshes = []; hi = null }
  const stepOf = (S, v) => S[Math.max(0, Math.min(S.length - 1, Math.floor(v * S.length - 1e-9)))]
  const look = () => ({ g: 30, f: 4, s: 2, k: 2, ph: 2, ps: 1, pd: 1, pp: 4, bd: 1, pk: 2, ct: 1, ...(o.look?.() ?? {}) })
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
    m.userData.cell = tiles.map((t) => t.cell); m.userData.tiles = tiles; m.userData.h = h
    group.add(m); meshes.push(m)
    return m
  }
  // view: { metric: 'hard' | 'many' | 'player', data }
  function show(view) {
    clear()
    group = new THREE.Group(); group.userData.heat = view.metric
    const ground = home().y + 0.05, G = seatGrid(), fan = [], seats = [], soft = [], d = view.data, risers = []
    const L = look(), stops = gradOf(L.g), col = (v) => colorAt(stops, v)
    // the scale: one for all, each layer over its own range, or ranked (an ease 0..1, 1 easy)
    const wallEv = d.wall ? d.wall.map((x) => x?.ev ?? null) : [], seatEv = d.seat && view.metric === 'hard' ? d.seat.flat().map((x) => x?.ev ?? null) : []
    const scaler = (list) => {
      const v = list.filter((x) => x != null).sort((a, b) => a - b)
      if (L.k === 1 || !v.length) return (ev) => (ev == null ? 0 : 1 - (ev - HARD_RUN[0]) / (HARD_RUN[1] - HARD_RUN[0]))
      if (L.k === 3) return (ev) => (ev == null ? 0 : 1 - v.filter((x) => x < ev).length / Math.max(1, v.length - 1))
      const lo = v[0], hi = v[v.length - 1]; return (ev) => (ev == null ? 0 : hi > lo ? 1 - (ev - lo) / (hi - lo) : 1)
    }
    const easeW = scaler(wallEv), easeS = scaler(seatEv), ease = easeS
    // (4 Nov, evening; the red team: "Zero is an observed value, not missing data", and HOW MANY is under one home run a cell, so single ones read as hot spots;
    // Andrew: 11a) the counts are colored smoothed over the cells round each (a wedge either side, a row either side, half weight, only over cells that exist), a
    // zero is the cold end, and a gap is only where there is nothing to land on. Pointing still gives the exact count.
    const sm = view.metric === 'hard' ? null : (() => {
      const raw = d.seat, out = raw.map((r) => r.map(() => 0))
      const R = view.metric === 'player' ? 2 : 1, KW = [1, 0.5, 0.25] // (a player: two wedges either side, as their balls would spread)
      for (let i = 0; i < N; i++) for (let j = 0; j < ROWS; j++) { if (!G[i][j]) continue; let t = 0, w = 0; for (let di = -R; di <= R; di++) for (let dj = -1; dj <= 1; dj++) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= N || jj >= ROWS || !G[ii][jj]) continue; const k = KW[Math.abs(di)] * (dj ? 0.5 : 1); t += k * (raw[ii][jj] ?? 0); w += k } out[i][j] = w ? t / w : 0 }
      return out
    })()
    const smW = view.metric === 'many' ? d.wedge.map((_, i) => { let t = 0, w = 0; for (let di = -1; di <= 1; di++) { const ii = i + di; if (ii < 0 || ii >= N) continue; const k = di ? 0.5 : 1; t += k * d.wedge[ii]; w += k } return t / w }) : null
    const smMax = sm ? Math.max(1e-9, ...sm.flat()) : 1, smWMax = smW ? Math.max(1e-9, ...smW) : 1, fMax = d.field ? Math.max(1e-9, ...d.field) : 1
    const fanVal = (i) => (view.metric === 'hard' ? easeW(d.wall[i]?.ev) : view.metric === 'many' ? Math.sqrt(smW[i] / smWMax) : Math.sqrt(d.field[i] / fMax)) // (a player: the share of all their balls going each way)
    const seatVal = (i, j) => (view.metric === 'hard' ? ease(d.seat[i][j]?.ev) : Math.sqrt(sm[i][j] / smMax))
    const tops = new Map() // cell -> the tops of its tiles (the outline sits on them)
    const fieldV = Array(N).fill(null), wedgeId = Array(N).fill(-1)
    // SMOOTH pillars: a value at any point, slid between the middles of the cells round it (bearing across, depth back); cells with nothing say nothing
    const smoothAt = (p) => {
      const w = where(p), fi = (w.b - B0) / STEP - 0.5, fj = (w.ft - wallOf(Math.max(-45, Math.min(45, w.b)))[0] - 2) / ROW_FT - 0.5, i0 = Math.floor(fi), j0 = Math.floor(fj)
      let t = 0, wt = 0
      for (const [di, dj] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const ii = i0 + di, jj = j0 + dj; if (ii < 0 || jj < 0 || ii >= N || jj >= ROWS || !G[ii]?.[jj]) continue; const v = seatVal(ii, jj); if (v == null) continue; const k = (1 - Math.abs(fi - ii)) * (1 - Math.abs(fj - jj)); if (k <= 0) continue; t += v * k; wt += k }
      return wt ? t / wt : null
    }
    for (let i = 0; i < N; i++) {
      const v = fanVal(i), id = (wedgeId[i] = cells.push({ kind: 'wedge', i, b: mid(i) }) - 1), [wft, wh] = wallOf(mid(i)), w0 = wft - 4
      fieldV[i] = v; void w0; void wh
      for (let j = 0; j < ROWS; j++) {
        const g = G[i][j]
        if (!g) continue
        const sv = seatVal(i, j), sid = cells.push({ kind: 'seat', i, j, b: mid(i) }) - 1
        if (sv == null) continue
        if (L.s === 4) { seats.push({ p: g.c.clone().add(new THREE.Vector3(0, 0.3, 0)), col: col(sv), cell: sid, size: 0.5 + 1.9 * sv, h: 0.5 + 1.9 * sv }); continue }
        for (const p of g.pts) {
          let v = sv
          if (L.s === 2 && L.ps === 2) v = smoothAt(p) ?? sv // SMOOTH: slid between the cells round it
          if (L.s === 2 && L.ps === 3) v = Math.round(v * 4) / 4 // TERRACES: five heights
          const up = L.pd === 2 ? 1 - v : v, H = (PILLAR_HEIGHTS.find((x) => x.c === L.ph) ?? PILLAR_HEIGHTS[0]).m
          const t = { p: p.clone().add(new THREE.Vector3(0, 0.25, 0)), col: col(v), cell: sid, size: SAMPLE * (L.s === 2 && L.ps === 4 ? 0.45 : 0.86), h: L.s === 2 ? 0.3 + H * up : 0.3 }
          ;(L.s === 3 ? soft : seats).push(t)
          if (!tops.has(sid)) tops.set(sid, []); tops.get(sid).push({ x: t.p.x, y: t.p.y + t.h, z: t.p.z, r: t.size / 2 })
        }
      }
    }
    // the pillar paint: FULL COLOR as they are; otherwise a dark body and a colored cap (TOPS ONLY a thin one, TOP BAND a deep one, SHADED SIDES a dark version of
    // the color below a full-color cap)
    if (L.s === 2 && L.pp > 1) {
      const body = [], caps = [], c = new THREE.Color()
      for (const t of seats) {
        const capH = Math.min(t.h, L.pp === 3 ? Math.max(0.3, Math.min(1.4, t.h * 0.4)) : 0.24), bh = t.h - capH
        if (bh > 0.02) body.push({ ...t, h: bh, col: L.pp === 4 ? '#' + c.set(t.col).multiplyScalar((SIDE_SHADES.find((x) => x.c === L.pk) ?? SIDE_SHADES[1]).keep).getHexString() : DARK })
        caps.push({ ...t, p: t.p.clone().setY(t.p.y + bh), h: capH, rb: { y0: t.p.y, bh } })
      }
      risers.push(carpet(body, 0.3), carpet(caps, 0.3))
    } else risers.push(carpet(seats, 0.3))
    carpet(soft, 0.12, SAMPLE * 0.86, 0.6) // (SOFT: thin see-through tiles, no ink)
    group.userData.tops = tops
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
    const drops = [], topOf = new Map(); void 0 // (the bombs stand on the pillars, not inside them: the tallest tile top in their cell)
    for (const [sid, T] of tops) { const c = cells[sid]; topOf.set(c.i + ',' + c.j, Math.max(...T.map((t) => t.y))) }
    if (view.metric === 'player') for (const pt of d.pts) { // their real home runs (only those) as Little Boys, in the colors of the park each was hit in (the contrail says if it goes out here)
      const park = pt.b?.park ?? '', [bodyC, finC] = bombColors(park), cellsLB = NUKE_MARKS[16](false, {}).map((c) => (c[1] === 0 ? c : [c[0], c[1], c[2], c[3] === '#c9c2ad' ? bodyC : c[3] === '#8a8f99' || c[3] === '#7d8088' ? finC : c[3]])), m = voxCells(THREE, cellsLB, 0.22)
      const wc = where(pt.at), top = topOf.get(wc.i + ',' + wc.j)
      m.position.copy(pt.at).add(new THREE.Vector3(0, 0.15, 0)); if (top != null && top > m.position.y) m.position.y = top + 0.1
      group.add(m)
      // CONTRAILS (4 Nov, night, Andrew: "Yes to 1 for when you click on a player, as long as it's not way too loud"): its flight from the plate, a hairline, faint bone,
      // a little less faint and green for the ones that go out here; drawn in as the bomb falls. CT: 1 FAINT, 2 ONLY THE GONE ONES, 3 OFF
      let line = null
      if (L.ct !== 3 && pt.trail?.length > 1 && (L.ct !== 2 || pt.gone)) {
        const g = new THREE.BufferGeometry().setFromPoints(pt.trail)
        line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: pt.gone ? '#9dff00' : '#e8e1c9', transparent: true, opacity: pt.gone ? 0.15 : 0.07, depthWrite: false, fog: false }))
        line.renderOrder = 21; group.add(line); api.NN.hideForNormal?.push(line); (group.userData.sheets ??= []).push(line)
      }
      drops.push({ m, line, n: pt.trail?.length ?? 0, at: m.position.clone(), gone: pt.gone, ref: pt.b, home: park === 'SF', d: String(pt.b?.d ?? ''), b: where(pt.at).b })
    }
    // the best seat to catch one of theirs (the surprise round): a bone beam over the cell where the most of their likely landings come down, a slow orange diamond on it
    if (view.metric === 'player' && d.best) {
      const at = d.best.c, beam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 16, 0.3), new THREE.MeshBasicMaterial({ color: '#e8e1c9', transparent: true, opacity: 0.85, fog: false }))
      beam.position.set(at.x, at.y + 8, at.z); group.add(beam); api.NN.hideForNormal?.push(beam); (group.userData.sheets ??= []).push(beam)
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(1.5, 0), new THREE.MeshLambertMaterial({ color: '#ff7a00', flatShading: true, fog: false }))
      gem.position.set(at.x, at.y + 17.5, at.z); group.add(gem); group.userData.gem = gem
    }
    group.userData.drops = drops
    applyWhere()
    scene.add(group)
    arrive(drops, view.metric === 'player' ? L.bd : 4, view.metric === 'player' ? risers.filter(Boolean) : [])
    return group
  }
  // the bombs arriving (BOMB_DROPS); the gem turning. Nothing moves under reduced motion or a fixed test clock
  let anim = 0
  function arrive(drops, way, risers = []) {
    cancelAnimationFrame(anim)
    const still = way === 4 || window.__fixedTime !== undefined || matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const g0 = group, rings = [], puffs = []
    if (!still) {
      const order = way === 2 ? [...drops].sort((a, b) => a.b - b.b) : [...drops].sort((a, b) => a.d.localeCompare(b.d))
      order.forEach((x, k) => { x.t0 = way === 2 ? 120 + k * 14 : 160 + k * Math.min(70, 2600 / Math.max(1, order.length)); x.done = false; x.line?.geometry.setDrawRange(0, 0); if (way === 3) x.m.scale.setScalar(0.001); else x.m.position.y = x.at.y + 46 })
    }
    const t0 = performance.now(), FALL = 520
    // (5 Nov, Andrew: "let's also have the blast radius map like rise out of the ground when we pick a new player")
    const rise = still ? [] : risers.map((m) => ({ m, T: m.userData.tiles, d: m.userData.tiles.map((x) => { const c = cells[x.cell]; return 60 + 34 * (c?.j ?? 0) + 5 * Math.abs((c?.i ?? N / 2) - N / 2) + Math.random() * 40 }) }))
    const m4r = new THREE.Matrix4(), qr = new THREE.Quaternion(), vr = new THREE.Vector3(), sr = new THREE.Vector3(), up = (x) => { const k = 1.70158; return 1 + (k + 1) * Math.pow(x - 1, 3) + k * Math.pow(x - 1, 2) }
    const lift = (t) => { let busy = false; for (const R of rise) { if (R.done) continue; let left = false; R.T.forEach((x, k) => { const f = Math.max(0, Math.min(1, (t - R.d[k]) / 420)); if (f < 1) left = true; const e = f <= 0 ? 0.001 : up(f), hh = (x.h ?? R.m.userData.h) * e, sz = x.size ?? TILE * 0.82, y = x.rb ? x.rb.y0 + x.rb.bh * e : x.p.y; m4r.compose(vr.set(x.p.x, y + hh / 2, x.p.z), qr, sr.set(sz, Math.max(0.001, hh), sz)); R.m.setMatrixAt(k, m4r) }); R.m.instanceMatrix.needsUpdate = true; if (!left) R.done = true; else busy = true } return busy }
    if (rise.length) lift(0)
    const tick = () => {
      if (group !== g0 || !group) return
      const t = performance.now() - t0
      if (group.userData.gem && !still) { group.userData.gem.rotation.y = t / 900; group.userData.gem.position.y = group.userData.gem.userData.y0 ??= group.userData.gem.position.y; group.userData.gem.position.y += Math.sin(t / 500) * 0.35 }
      let busy = rise.length ? lift(t) : false
      if (!still) for (const x of drops) {
        if (x.done) continue
        const f = Math.max(0, Math.min(1, (t - x.t0) / FALL))
        if (f < 1) busy = true
        if (x.line) x.line.geometry.setDrawRange(0, Math.max(0, Math.ceil(x.n * Math.max(0, (t - x.t0 + FALL * 0.6) / (FALL * 1.6)))))
        if (way === 3) x.m.scale.setScalar(Math.max(0.001, f < 1 ? 1 - Math.pow(1 - f, 3) * (1 - 0.15 * Math.sin(f * 9)) : 1))
        else x.m.position.y = x.at.y + 46 * (1 - f * f)
        if (f >= 1) { x.done = true; x.m.position.y = x.at.y; x.m.scale.setScalar(1); x.line?.geometry.setDrawRange(0, x.n); rings.push(ring(x)); if (x.gone) puffs.push(puff(x)); o.onDrop?.(x.gone) }
      }
      for (const q of puffs) { const k = (t - q.userData.t) / 750; if (k >= 1) { q.visible = false; continue } busy = true; const grow = Math.min(1, k / 0.22), fall = k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45; q.scale.setScalar(Math.max(0.001, grow * fall)); q.position.y = q.userData.y0 + 2.2 * Math.sqrt(k) }
      for (const r of rings) { const k = (t - r.userData.t) / 420; if (k >= 1) { r.visible = false; continue } busy = true; r.scale.setScalar(0.3 + 2.6 * k); r.material.opacity = 0.8 * (1 - k) }
      if (busy || (group.userData.gem && !still)) anim = requestAnimationFrame(tick)
    }
    // (4 Nov, night, Andrew: "can we have the nukes make just a teensy explosion when they land and are a HR?"): a stem and a flared cap of GEIGER cubes that rise,
    // swell and shrink away in under a second
    const PUFF = (() => { const c = []; for (let y = 0; y < 3; y++) c.push([0, y, 0, '#9dff00']); for (const [x, z] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1], [2, 0], [-2, 0], [0, 2], [0, -2]]) c.push([x, 3, z, '#9dff00']); for (const [x, z] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) c.push([x, 4, z, '#c8ff6a']); return c })()
    const puff = (x) => { const m = voxCells(THREE, PUFF, 0.34); m.position.copy(x.at); m.userData.y0 = x.at.y; m.userData.t = performance.now() - t0; m.scale.setScalar(0.001); group.add(m); return m }
    const ring = (x) => { const r = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 24), new THREE.MeshBasicMaterial({ color: x.gone ? '#9dff00' : '#e8e1c9', transparent: true, opacity: 0.8, depthWrite: false, fog: false, side: THREE.DoubleSide })); r.rotation.x = -Math.PI / 2; r.position.copy(x.at).add(new THREE.Vector3(0, 0.2, 0)); r.userData.t = performance.now() - t0; group.add(r); api.NN.hideForNormal?.push(r); (group.userData.sheets ??= []).push(r); return r }
    anim = requestAnimationFrame(tick)
  }
  // (5 Nov, Andrew: "Hovering over particular nukes in the blast radius should show the date and allow me to click on them to bring to dinger deja vu"): the bomb
  // nearest a screen point, within 18 px of its middle; the one pointed at swells
  const pb = new THREE.Vector3()
  function bombAt(cx, cy) {
    const D = group?.userData.drops; if (!D?.length) return null
    const cv = api.NN.renderer?.domElement; if (!cv) return null
    const r = cv.getBoundingClientRect(); let best = null, bd = 18
    D.forEach((x, k) => { if (x.done === false || !x.m.visible) return; pb.copy(x.at).add(new THREE.Vector3(0, 1.4, 0)).project(api.NN.camera); if (pb.z > 1) return; const sx = r.left + ((pb.x + 1) / 2) * r.width, sy = r.top + ((1 - pb.y) / 2) * r.height, e = Math.hypot(sx - cx, sy - cy); if (e < bd) { bd = e; best = { k, b: x.ref, gone: x.gone } } })
    return best
  }
  function bombFocus(k) { const D = group?.userData.drops; if (!D) return; D.forEach((x, i) => { if (x.done !== false) x.m.scale.setScalar(i === k ? 1.9 : 1) }) }
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
    // (4 Nov, evening; the red team: "The selected polygon can float through a stair-step stand"): a seat cell is outlined on the tops of its own tiles
    const sid = cells.indexOf(cell), T = cell.kind === 'seat' ? group.userData.tops?.get(sid) : null
    if (T?.length) {
      const seg = []
      for (const t of T) { const y = t.y + 0.06, a = [t.x - t.r, t.z - t.r], b = [t.x + t.r, t.z + t.r]; seg.push(new THREE.Vector3(a[0], y, a[1]), new THREE.Vector3(b[0], y, a[1]), new THREE.Vector3(b[0], y, a[1]), new THREE.Vector3(b[0], y, b[1]), new THREE.Vector3(b[0], y, b[1]), new THREE.Vector3(a[0], y, b[1]), new THREE.Vector3(a[0], y, b[1]), new THREE.Vector3(a[0], y, a[1])) }
      hi = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), new THREE.LineBasicMaterial({ color: '#e8e1c9', transparent: true, depthTest: false }))
    } else hi = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#e8e1c9', transparent: true, depthTest: false }))
    hi.renderOrder = 30; group.add(hi)
  }
  // (4 Nov, evening; GPT's red team: does the softest swing for a seat really come down in that seat, and does the wall's really cross the wall in its own wedge?)
  // each answer flown again: where it first comes down (the cell), and 2 mph softer (it should not get there)
  function verify() {
    const H = ready(); if (!H) return null
    const a = H.air, seatRes = { n: 0, filled: 0, same: 0, row1: 0, other: 0, side: 0, softer: 0, bad: [] }, wallRes = { n: 0, filled: 0, same: 0, off: [], softerOut: 0 }
    const land = (ev, la, dir) => { const r = api.fly(st(a, ev, la, dir), { floor: -8 }); return r.verdict.kind === 'GONE' ? where(api.findLanding(r.path).point) : null }
    for (let i = 0; i < N; i++) {
      const w = H.wall[i]
      if (w) { wallRes.n++; if (w.fill) wallRes.filled++; else { const L = land(w.ev, w.la, w.dir); if (L?.i === i) wallRes.same++; else wallRes.off.push([i, L?.i ?? 'in']); const L2 = land(w.ev - 1, w.la, w.dir); if (L2?.i === i) wallRes.softerOut++ } }
      for (let j = 0; j < ROWS; j++) {
        const x = H.seat[i][j]; if (!x) continue
        seatRes.n++
        if (x.fill) { seatRes.filled++; continue }
        const L = land(x.ev, x.la, x.dir)
        if (!L) { seatRes.other++; seatRes.bad.push([i, j, 'in']); continue }
        if (L.i !== i) seatRes.side++
        if (L.i === i && L.j === j) seatRes.same++; else if (L.i === i && Math.abs(L.j - j) === 1) seatRes.row1++; else { seatRes.other++; seatRes.bad.push([i, j, L.i, L.j]) }
        const L2 = land(x.ev - 1, x.la, x.dir); if (L2 && L2.i === i && L2.j === j) seatRes.softer++
      }
    }
    return { seat: seatRes, wall: wallRes }
  }
  // (6 Nov) the bombs by where they were hit: 'all', 'home' (at Oracle) or 'away'; kept across players
  let whereOn = 'all'
  function applyWhere() { for (const x of group?.userData.drops ?? []) { const on = whereOn === 'all' || (whereOn === 'home') === x.home; x.m.visible = on; if (x.line) x.line.visible = on } }
  const bombsWhere = (w) => { whereOn = w; applyWhere() }
  return { cancel, bombAt, bombFocus, bombsWhere, bombCounts: () => { const D = group?.userData.drops ?? []; return { all: D.length, home: D.filter((x) => x.home).length, away: D.filter((x) => !x.home).length, shown: D.filter((x) => x.m.visible).length } }, gridReady: () => !!grid, gridAsync: seatGridAsync, hard, hardAsync, ready, warm, verify, many, player, hitters, leagueDeep, show, clear, cellAt, outline, sectorOf, mid, N, ROWS, ROW_FT, shown: () => group?.userData.heat ?? null, count: () => (group ? group.children.length : 0), cells: () => cells.length }
}
