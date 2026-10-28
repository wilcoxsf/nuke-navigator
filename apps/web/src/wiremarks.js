// Field markings and the measured outfield wall for the wireframe park, built from real dimensions (MLB rules, in feet) around the fitted home plate and the Oracle wall profile.
// The park model has no geometry for the painted lines, so the foul lines, batter's boxes, plate, bases, mound, rubber, infield arc, plate circle, warning track and the wall are drawn here;
// every point sits on the model's own ground (a ray cast straight down onto the field mesh), so the mound rises and the field crowns exactly as the model does.
// World frame (same as the wire): x toward right field, y up, z toward home (centre field is -z); home = [x, z] of the back point of the plate. All lengths below are metres.
import * as THREE from 'three'
import { warmBVH } from './seance.js'

const FT = 0.3048, IN = 0.0254
const clampB = (b) => Math.min(47, Math.max(-47, b))

// the measured wall as a function of bearing: [distance ft, height ft]. The sampled distance is noisy where the rays hit the stands and arcade behind the wall, so a running median over 3 degrees (7 samples at half a degree) is
// applied; the height is taken from the nearest sample so the real steps stay steps.
export function smoothWallFn(wall) {
  if (!wall) return null
  const S = []
  for (let b = -47; b <= 47.001; b += 0.5) { const w = wall(clampB(b)); if (w && w[0] > 100) S.push({ b, d: w[0], h: w[1] }) }
  if (S.length < 10) return null
  const med = (arr) => { const t = [...arr].sort((x, y) => x - y); return t[t.length >> 1] }
  const D = S.map((_, i) => med(S.slice(Math.max(0, i - 3), i + 4).map((q) => q.d)))
  return (b) => {
    const x = Math.min(S[S.length - 1].b, Math.max(S[0].b, b)), i = Math.min(S.length - 2, Math.max(0, Math.floor((x - S[0].b) / 0.5))), f = (x - S[i].b) / 0.5
    return [D[i] * (1 - f) + D[i + 1] * f, (f < 0.5 ? S[i] : S[i + 1]).h]
  }
}

export function buildMarks({ stadium, home = [0.3, 1.0], wall = null }) {
  stadium.updateMatrixWorld(true)
  warmBVH({ stadium })
  const rc = new THREE.Raycaster()
  rc.firstHitOnly = true
  const down = new THREE.Vector3(0, -1, 0), org = new THREE.Vector3()
  const cache = new Map()
  const ground = (x, z) => {
    const k = Math.round(x * 2) + ',' + Math.round(z * 2)
    if (cache.has(k)) return cache.get(k)
    org.set(x, 1.5, z) // from just above field level, so the wall top and the stands are never hit
    rc.set(org, down)
    const h = rc.intersectObject(stadium, true)[0]
    const y = h ? h.point.y : 0
    cache.set(k, y)
    return y
  }
  // plate frame: u to the right, v toward centre field
  let lift0 = 0.05 // extra height for the point being built (the mound: the model's field is flat there, a real mound is 10 inches above the plate)
  const W = (u, v, lift = lift0) => { const x = home[0] + u, z = home[1] - v; return [x, ground(x, z) + lift, z] }
  const polar = (bDeg, dM) => { const b = (bDeg * Math.PI) / 180; return [dM * Math.sin(b), dM * Math.cos(b)] }
  const layers = { marks: [], wall: [], track: [], ticks: [] }
  // a polyline in plate coordinates, subdivided so it follows the ground
  const line = (layer, pts, closed = false, maxSeg = 1.2) => {
    const P = closed ? [...pts, pts[0]] : pts
    for (let i = 0; i + 1 < P.length; i++) {
      const [u0, v0] = P[i], [u1, v1] = P[i + 1], n = Math.max(1, Math.ceil(Math.hypot(u1 - u0, v1 - v0) / maxSeg))
      for (let k = 0; k < n; k++) layers[layer].push(...W(u0 + ((u1 - u0) * k) / n, v0 + ((v1 - v0) * k) / n), ...W(u0 + ((u1 - u0) * (k + 1)) / n, v0 + ((v1 - v0) * (k + 1)) / n))
    }
  }
  const circle = (layer, cu, cv, r, n = 72, from = 0, to = Math.PI * 2) => {
    const pts = []
    for (let i = 0; i <= n; i++) { const a = from + ((to - from) * i) / n; pts.push([cu + r * Math.sin(a), cv + r * Math.cos(a)]) }
    line(layer, pts, false, 0.8)
  }
  const wallAtB = (b) => { const w = wall?.(clampB(b)); return w && w[0] > 100 ? w : null } // [distance ft, height ft]

  // foul lines out to the wall
  for (const s of [-1, 1]) {
    const w = wallAtB(45 * s), d = (w ? w[0] : 330) * FT - 0.5 // stop half a metre short of the wall face
    line('marks', [[0, 0], polar(45 * s, d)], false, 2)
  }
  // home plate (17 inches across, back point toward the catcher), batter's boxes (4 by 6 feet, 6 inches off the plate), plate circle
  line('marks', [[0, 0], [8.5 * IN, 8.5 * IN], [8.5 * IN, 17 * IN], [-8.5 * IN, 17 * IN], [-8.5 * IN, 8.5 * IN]], true, 0.4)
  const bx0 = 8.5 * IN + 6 * IN, bx1 = bx0 + 4 * FT, bv0 = 8.5 * IN - 3 * FT, bv1 = 8.5 * IN + 3 * FT
  for (const s of [-1, 1]) line('marks', [[s * bx0, bv0], [s * bx1, bv0], [s * bx1, bv1], [s * bx0, bv1]], true, 0.6)
  circle('track', 0, 8.5 * IN, 13 * FT, 90)
  // bases: 15 inch squares set as diamonds, 90 feet along the foul lines (second base 127.28 feet straight out)
  const half = (15 * IN * Math.SQRT2) / 2, base = (cu, cv) => line('marks', [[cu, cv - half], [cu + half, cv], [cu, cv + half], [cu - half, cv]], true, 0.4)
  const c1 = polar(45, 90 * FT - 0.5 * FT)
  base(c1[0], c1[1]); base(-c1[0], c1[1]); base(0, Math.hypot(90 * FT, 90 * FT) - 0.35 * FT)
  const second = [0, Math.hypot(90 * FT, 90 * FT) - 0.35 * FT]
  line('marks', [c1, second, [-c1[0], c1[1]]], false, 2) // first to second to third
  // pitcher's mound (9 foot radius, centre 59 feet out), rubber (24 by 6 inches, front edge 60.5 feet out), infield arc (95 feet from the mound)
  const mv = 59 * FT
  // the mound's edge only (28 Oct: the inner rings that climbed to the rubber merged into a blob of circles at broadcast distance, Andrew: "weird circles on the mound")
  lift0 = 0.05; circle('marks', 0, mv, 9 * FT, 64)
  lift0 = 0.05 + 10 * IN
  line('marks', [[-12 * IN, 60 * FT + 0.5 * FT - 6 * IN], [12 * IN, 60 * FT + 0.5 * FT - 6 * IN], [12 * IN, 60.5 * FT], [-12 * IN, 60.5 * FT]], true, 0.4)
  lift0 = 0.05
  let phi = 1.2
  for (let i = 0; i < 40; i++) { // where the 95 foot arc meets the foul line: 95 sin(phi) = 59 + 95 cos(phi)
    const f = 95 * Math.sin(phi) - 59 - 95 * Math.cos(phi), df = 95 * Math.cos(phi) + 95 * Math.sin(phi)
    phi -= f / df
  }
  circle('track', 0, mv, 95 * FT, 90, -Math.abs(phi), Math.abs(phi)) // from the third-base foul line, behind second base, to the first-base foul line (angle 0 = straight out)
  // warning track (15 feet inside the wall) and the wall itself at its measured height, with ticks every five degrees
  const trk = [], top = [], bot = []
  // the sampled wall distance is noisy where the rays hit the stands and the arcade behind the wall (right field especially): a running median over 3 degrees removes the spikes; heights keep their real steps
  const samples = []
  for (let b = -46; b <= 46.001; b += 0.5) { const w = wallAtB(b); if (w) samples.push({ b, d: w[0], h: w[1] }) }
  const med = (arr) => { const t = [...arr].sort((x, y) => x - y); return t[t.length >> 1] }
  const smoothD = samples.map((_, i) => med(samples.slice(Math.max(0, i - 3), i + 4).map((q) => q.d)))
  for (let k = 0; k < samples.length; k++) {
    const b = samples[k].b, w = [smoothD[k], samples[k].h]
    const d = w[0] * FT, [u, v] = polar(b, d), [tu, tv] = polar(b, d - 15 * FT)
    trk.push([tu, tv])
    const base0 = W(u, v, 0.05), tp = [base0[0], base0[1] + w[1] * FT, base0[2]]
    top.push(tp); bot.push(base0)
  }
  if (trk.length > 1) line('track', trk, false, 1.5)
  // the accent line is the top of the wall only; where the real wall changes height by more than 3 ft between samples (the right-field arcade steps from 8 to 26 ft) it runs level and then steps straight up,
  // instead of a diagonal across the gap. The base line is thin and white (with the warning track and ticks), not accent coloured.
  for (let i = 0; i + 1 < top.length; i++) {
    const a = top[i], b = top[i + 1]
    if (Math.abs(b[1] - a[1]) > 3 * FT) { const mid = [b[0], a[1], b[2]]; layers.wall.push(...a, ...mid); layers.wall.push(...mid, ...b) }
    else layers.wall.push(...a, ...b)
  }
  return layers
}
