// Study 25 infield in voxels (29 Oct, later, Andrew: "Give me a raised voxel mound, voxel bases"; then, night: the mound and bases "are overlapping with the stadium
// model ... zero stadium model and this area and full voxel for basepaths, infield dirt, bases"). The model's own infield (its dirt, grass square, mound, rubber, plate and
// bases, a metre from where the flights start) is cut out (c25.js, under()), and the whole infield is built here in the plate frame the flights use (toWorld: x to
// the right, y toward center field, z up), to the rule book:
//   the dirt skin: everything within 95 ft of the front of the rubber on the fair side, plus 3 ft past the foul lines, plus the 13 ft circle round the plate;
//   the infield grass: inside the base paths (3 ft each side of the lines), with 10 ft cutouts round the bases, mowed in a diagonal check;
//   a grass border round it all (the model's triangles that were cut reach up to two metres past the skin, and nothing may show through);
//   chalk: the foul lines out to the wall, the batter's boxes, the catcher's box and the running lane;
//   the raised mound (higher than the real 10 inches so it reads from the broadcast seat) and the rubber; the bases as fat bags; the plate as a pentagon.
// Ground slabs are 0.3 m square, the dirt 0.08 m thick, the grass 0.1 m (a lip at the edge of the skin), the chalk just proud of the dirt.
const FT = 0.3048, IN = 0.0254, R2 = Math.SQRT1_2
// the layout, in the plate frame (metres); m grows (or shrinks) each part
const ab = (x, y) => [(y + x) * R2, (y - x) * R2] // along the first-base line, along the third-base line
const skinArc = (x, y, m = 0, mf = m) => { const [a, b] = ab(x, y); return Math.hypot(x, y - 60.5 * FT) <= 95 * FT + m && a >= -3 * FT - mf && b >= -3 * FT - mf }
const plateCircle = (x, y, m = 0) => Math.hypot(x, y - 0.7 * FT) <= 13 * FT + m
// the model's triangles to cut: a little inside the skin (a cut triangle can reach two metres past its centre, and the grass border covers that), and the plate
// circle only from just behind the plate forward (the model's triangles behind it fan out far into foul ground); ground level only
export const infieldCut = (x, y) => skinArc(x, y, -0.6) || (plateCircle(x, y, -0.6) && y >= -1.4)
export function initDiamond25(api, o = {}) {
  const { THREE, scene } = api.NN
  const toWorld = window.__cp.toWorld, g = new THREE.Group(), cube = new THREE.BoxGeometry(1, 1, 1), d = new THREE.Object3D()
  const mat = {}, lam = (c) => (mat[c] ??= new THREE.MeshLambertMaterial({ color: c, flatShading: true }))
  const groups = {}
  const put = (c, x, y, z, sx, sy, sz, yaw = 0) => { (groups[c] ??= []).push([x, y, z, sx, sy, sz, yaw]) } // yaw: turned about the vertical (a chalk piece along its line)
  const DIRT = ['#a8703f', '#9c6638', '#8f5f36'], GRASS = ['#2f6b3a', '#285f33'], EDGE = '#24552e', CHALK = '#f4f2ea'
  // ---- the ground: dirt, grass and the border, 0.3 m slabs ----
  const G = 0.3, hash = (i, j) => ((i * 73856093) ^ (j * 19349663)) >>> 0
  const mound = (x, y) => Math.hypot(x, y - 59 * FT) <= 9 * FT
  const isGrass = (x, y) => {
    const [a, b] = ab(x, y)
    if (!(a > 3 * FT && b > 3 * FT && a < 87 * FT && b < 87 * FT)) return false
    for (const [bx, by] of [[90 * FT * R2, 90 * FT * R2], [-90 * FT * R2, 90 * FT * R2], [0, 90 * FT * Math.SQRT2]]) if (Math.hypot(x - bx, y - by) <= 10 * FT) return false
    return !plateCircle(x, y)
  }
  let ground = 0
  for (let i = Math.floor(-36 / G); i <= Math.ceil(36 / G); i++) for (let j = Math.floor(-7 / G); j <= Math.ceil(52 / G); j++) {
    const x = (i + 0.5) * G, y = (j + 0.5) * G
    const inFill = skinArc(x, y, 2.0, 2.5) || plateCircle(x, y, 1.0)
    if (!inFill || mound(x, y)) continue
    const dirt = (skinArc(x, y) || plateCircle(x, y)) && !isGrass(x, y), h = hash(i, j)
    if (dirt) put(DIRT[h % 7 === 0 ? 2 : h % 3 === 0 ? 1 : 0], x, y, 0.04, G, G, 0.08)
    else {
      const [a, b] = ab(x, y), inner = isGrass(x, y)
      put(inner ? GRASS[(Math.floor(a / (12 * FT)) + Math.floor(b / (12 * FT))) & 1] : EDGE, x, y, 0.05, G, G, 0.1) // the infield mowed in a check; the border plain
    }
    ground++
  }
  // ---- chalk: 0.1 m lines a hair over the dirt (and over the grass where a line crosses it) ----
  // each line in pieces of about 0.3 m laid end to end along it (cubes square to the field read as a dashed saw-tooth on the diagonals)
  const CW = 0.1, line = (x0, y0, x1, y1) => { const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / 0.3)), yaw = Math.atan2(y1 - y0, x1 - x0); for (let k = 0; k < n; k++) { const x = x0 + ((x1 - x0) * (k + 0.5)) / n, y = y0 + ((y1 - y0) * (k + 0.5)) / n; put(CHALK, x, y, isGrass(x, y) ? 0.105 : 0.085, L / n + 0.01, CW, 0.02, yaw) } }
  const box = (x0, y0, x1, y1) => { line(x0, y0, x1, y0); line(x1, y0, x1, y1); line(x1, y1, x0, y1); line(x0, y1, x0, y0) }
  // the foul lines from the back point of the plate to the wall (Oracle's measured wall at the lines)
  const wallM = (b) => ((api.wallAt?.(b) ?? [b < 0 ? 339 : 309, 8])[0]) * FT
  const lf = wallM(-45), rf = wallM(45)
  line(0, 0, rf * R2, rf * R2); line(0, 0, -lf * R2, lf * R2)
  // the batter's boxes: 4 by 6 ft, 6 inches off each side of the plate, centred on it; the catcher's box behind, 43 inches wide, 8 ft back from the boxes' front
  const pc = 8.5 * IN // the plate's middle, from its back point
  for (const s of [-1, 1]) box(s * (8.5 + 6) * IN, pc - 3 * FT, s * (8.5 + 6 + 48) * IN, pc + 3 * FT)
  line(-21.5 * IN, pc - 3 * FT, -21.5 * IN, pc + 3 * FT - 8 * FT); line(21.5 * IN, pc - 3 * FT, 21.5 * IN, pc + 3 * FT - 8 * FT); line(-21.5 * IN, pc + 3 * FT - 8 * FT, 21.5 * IN, pc + 3 * FT - 8 * FT)
  // the running lane: the last 45 ft to first base, 3 ft into foul ground
  { const s = (a, b) => [(a - b) * R2, (a + b) * R2]; const p0 = s(45 * FT, -3 * FT), p1 = s(90 * FT, -3 * FT), q0 = s(45 * FT, 0); line(...p0, ...p1); line(...q0, ...p0) }
  // ---- the mound: 18 ft across, centred 59 ft out, a dome 0.75 m high in 0.3 m cubes, two dirt tones; the rubber 24 by 6 inches, its front edge 60.5 ft out ----
  const MV = 0.3, R = 9 * FT, H = o.moundH ?? 0.75, cy = 59 * FT
  for (let x = -R; x <= R; x += MV) for (let y = -R; y <= R; y += MV) {
    const r = Math.hypot(x, y)
    if (r > R) continue
    const h = Math.max(MV * 0.5, H * (1 - (r / R) ** 2)), n = Math.max(1, Math.round(h / MV))
    for (let k = 0; k < n; k++) put((Math.round(x / MV) * 7 + Math.round(y / MV) * 3 + k) % 5 === 0 ? '#8f5f36' : '#a8703f', x, cy + y, MV * (k + 0.5), MV, MV, MV)
  }
  const top = H + 0.04
  put(CHALK, 0, 60.5 * FT - 3 * IN, top, 0.61, 0.15, 0.1)
  // the bases: 15-inch bags made 0.5 m and 0.16 m tall (a cartoon size), set as diamonds where the rule book puts them: first and third inside fair ground with their
  // back corners on the lines 90 ft out (so their middles 7.5 inches in from each edge), second centred on the corner of the square
  const xy = (a, b) => [(a - b) * R2, (a + b) * R2]
  const bags = [xy(90 * FT - 7.5 * IN, 7.5 * IN), xy(7.5 * IN, 90 * FT - 7.5 * IN), xy(90 * FT, 90 * FT)]
  const bag = (x, y) => { const B = 0.1; for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) if (Math.abs(i) + Math.abs(j) <= 2.5) put(Math.abs(i) + Math.abs(j) === 2 ? '#d9d4c7' : CHALK, x + (i - j) * B * R2, y + (i + j) * B * R2, 0.12, B * 1.1, B * 1.1, 0.16) }
  for (const b of bags) bag(...b)
  // home plate: the pentagon (17 inches across, the point toward the catcher) in 0.07 m cubes, a hair over the dirt
  const HV = 0.07
  for (let x = -8.5 * IN; x <= 8.5 * IN; x += HV) for (let y = 0; y <= 17 * IN; y += HV) { const inside = y >= 8.5 * IN || y >= Math.abs(x); if (inside) put(CHALK, x, y, 0.1, HV, HV, 0.04) }
  // (30 Oct, the speed pass: the flat ground was 22,000 slabs) runs of same-colored flat slabs along a line toward center field become one long slab; the look is the same
  for (const c of Object.keys(groups)) {
    const keep = [], runs = new Map()
    for (const e of groups[c]) { const [x, y, z, sx, sy, sz, yaw] = e; if (yaw || sz > 0.1) { keep.push(e); continue } const k = [x.toFixed(3), z, sx, sy, sz].join(); (runs.get(k) ?? runs.set(k, []).get(k)).push(e) }
    for (const list of runs.values()) {
      list.sort((a, b) => a[1] - b[1])
      let r = list[0].slice()
      for (const e of list.slice(1)) { const end = r[1] + r[4] / 2; if (Math.abs(e[1] - e[4] / 2 - end) < 1e-3) { const y0 = r[1] - r[4] / 2, y1 = e[1] + e[4] / 2; r[1] = (y0 + y1) / 2; r[4] = y1 - y0 } else { keep.push(r); r = e.slice() } }
      keep.push(r)
    }
    groups[c] = keep
  }
  for (const [c, list] of Object.entries(groups)) {
    const m = new THREE.InstancedMesh(cube, lam(c), list.length)
    list.forEach(([x, y, z, sx, sy, sz, yaw], i) => { const p = toWorld([x, y, z]); d.position.copy(p); d.rotation.set(0, yaw, 0); d.scale.set(sx, sz, sy); d.updateMatrix(); m.setMatrixAt(i, d.matrix) })
    m.frustumCulled = false
    g.add(m)
  }
  scene.add(g)
  const h0 = toWorld([0, 0, 0])
  return {
    group: g, cubes: () => Object.values(groups).reduce((a, l) => a + l.length, 0), set visible(v) { g.visible = v },
    // the cut (c25.js): world metres in; the model's infield at ground level (its mound stands 0.3 m, its bags 0.1 m)
    under: (x, y, z) => y > -0.5 && y < 1.2 && infieldCut(x - h0.x, -(z - h0.z)),
    // for the tests: the parts and where they sit (plate frame), and the layout tests
    parts: () => ({ ground, bases: bags.map(([x, y]) => [x, y]), mound: [0, cy, H], rubber: [0, 60.5 * FT - 3 * IN], foul: [lf, rf] }),
    inFill: (x, y) => skinArc(x, y, 2.0, 2.5) || plateCircle(x, y, 1.0),
  }
}
