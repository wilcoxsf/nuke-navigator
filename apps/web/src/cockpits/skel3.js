// Toolkit for study 19 (and later): real-ball Replay data, the strike-zone plot with spin, the swing diagram, procedural ASCII batters and busts, the barrel map and honest league
// histograms, the "real balls like this" lookup, and the selective hover rule. Everything draws with the CSS variables from skel2.js (--k --tx --dim --ln --acc).

// ---- data -----------------------------------------------------------------------------------------------------------------------------------------------------------
let replay = null, pool = null, faces = null
export async function loadReplay() {
  if (replay) return replay
  try { const r = await fetch('/replay.json'); replay = r.ok ? await r.json() : { balls: [], players: {}, meta: {} } } catch { replay = { balls: [], players: {}, meta: {} } }
  return replay
}
export async function loadPool() {
  if (pool) return pool
  try { const r = await fetch('/pool.json'); pool = r.ok ? await r.json() : { rows: [] } } catch { pool = { rows: [] } }
  return pool
}
export async function loadFaces() {
  if (faces) return faces
  try { const r = await fetch('/giants_faces.json'); faces = r.ok ? await r.json() : {} } catch { faces = {} }
  return faces
}
// real balls like this one: within 3 mph, 3 degrees and 8 degrees of direction
export function ballsLike(pool, ev, la, dir) {
  const rows = (pool.rows ?? []).filter((r) => Math.abs(r[0] - ev) <= 3 && Math.abs(r[1] - la) <= 3 && Math.abs(r[2] - dir) <= 8)
  if (!rows.length) return { n: 0 }
  const fts = rows.map((r) => r[3]).sort((a, b) => a - b), q = (p) => fts[Math.min(fts.length - 1, Math.floor(p * fts.length))]
  return { n: rows.length, hr: rows.filter((r) => r[4]).length / rows.length, lo: q(0.1), med: q(0.5), hi: q(0.9) }
}

// ---- strike zone and spin ---------------------------------------------------------------------------------------------------------------------------------
// Catcher's view (plate_x positive is the catcher's right, so a right-handed batter stands on the LEFT). Zone is 17 inches wide, from this batter's own sz_bot to sz_top. The ball is
// drawn at the pitch's position at the front of the plate. Spin: rpm, tilt as a clock face (tilt hours = ((axis + 180) / 30) mod 12), and induced break as an arrow (pfx, inches).
export function zoneSVG(b, o = {}) {
  const W = o.w ?? 220, H = o.h ?? 190
  if (!b || b.px == null) return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%"><text x="${W / 2}" y="${H / 2}" fill="var(--dim)" font-size="16" text-anchor="middle">NO PITCH</text></svg>`
  const zl = 0.708, st = b.st ?? 3.4, sb = b.sb ?? 1.6
  const x0 = 6, zw = W * 0.56, S = Math.min(zw / 2.4, (H - 30) / 3.4), cx = x0 + zw / 2, base = H - 24
  const X = (x) => Math.round(cx + x * S), Y = (z) => Math.round(base - (z - 0.4) * S)
  let g = ''
  g += `<rect x="${X(-zl)}" y="${Y(st)}" width="${X(zl) - X(-zl)}" height="${Y(sb) - Y(st)}" fill="none" stroke="var(--tx)" stroke-width="2"/>`
  for (const f of [1 / 3, 2 / 3]) {
    g += `<line x1="${X(-zl + 2 * zl * f)}" x2="${X(-zl + 2 * zl * f)}" y1="${Y(st)}" y2="${Y(sb)}" stroke="var(--dim)" stroke-dasharray="2 3"/>`
    g += `<line x1="${X(-zl)}" x2="${X(zl)}" y1="${Y(sb + (st - sb) * f)}" y2="${Y(sb + (st - sb) * f)}" stroke="var(--dim)" stroke-dasharray="2 3"/>`
  }
  g += `<path d="M${X(-zl)} ${Y(0.55)}h${X(zl) - X(-zl)}l-${(X(zl) - X(-zl)) * 0.25} 5h-${(X(zl) - X(-zl)) * 0.5}z" fill="none" stroke="var(--dim)"/>` // home plate hint
  const bx = X(b.px), by = Y(b.pz), br = Math.max(4, 0.12 * S)
  if (b.hx != null && b.hz != null) { // induced break arrow, inches, from the ball
    const k = 0.55 // pixels per inch
    g += `<line x1="${bx}" y1="${by}" x2="${Math.round(bx + b.hx * k)}" y2="${Math.round(by - b.hz * k)}" stroke="var(--dim)" stroke-width="1.5" stroke-dasharray="3 2"/>`
  }
  g += `<circle cx="${bx}" cy="${by}" r="${br}" fill="var(--acc)" stroke="var(--k)" stroke-width="1"/>`
  g += `<text x="${x0}" y="13" fill="var(--dim)" font-size="12">CATCHER VIEW</text><text x="${x0}" y="${H - 6}" fill="var(--dim)" font-size="12">${b.s === 'R' ? 'RIGHT' : 'LEFT'} BATTER STANDS ${b.s === 'R' ? 'LEFT' : 'RIGHT'}</text>`
  // spin clock
  const R = Math.min(34, W * 0.14), kx = x0 + zw + (W - x0 - zw) / 2 + 2, ky = 56
  g += `<circle cx="${kx}" cy="${ky}" r="${R}" fill="none" stroke="var(--tx)"/>`
  for (let h = 0; h < 12; h++) { const a = (h * 30 * Math.PI) / 180, r1 = h % 3 === 0 ? R - 7 : R - 4; g += `<line x1="${(kx + Math.sin(a) * r1).toFixed(1)}" y1="${(ky - Math.cos(a) * r1).toFixed(1)}" x2="${(kx + Math.sin(a) * R).toFixed(1)}" y2="${(ky - Math.cos(a) * R).toFixed(1)}" stroke="var(--tx)"/>` }
  if (b.ax != null) {
    const hrs = (((b.ax + 180) / 30) % 12 + 12) % 12, a = (hrs * 30 * Math.PI) / 180
    g += `<line x1="${kx}" y1="${ky}" x2="${(kx + Math.sin(a) * (R - 3)).toFixed(1)}" y2="${(ky - Math.cos(a) * (R - 3)).toFixed(1)}" stroke="var(--acc)" stroke-width="3"/><circle cx="${kx}" cy="${ky}" r="2.5" fill="var(--acc)"/>`
    const hh = Math.floor(hrs) || 12, mm = Math.round((hrs % 1) * 60)
    g += `<text x="${kx}" y="${ky + R + 16}" fill="var(--tx)" font-size="15" text-anchor="middle">${hh}:${String(mm === 60 ? 59 : mm).padStart(2, '0')}</text>`
  }
  g += `<text x="${kx}" y="${ky + R + 31}" fill="var(--dim)" font-size="13" text-anchor="middle">${b.rpm ?? '--'} RPM</text>`
  g += `<text x="${kx}" y="${ky + R + 45}" fill="var(--dim)" font-size="13" text-anchor="middle">${b.pt ?? ''} ${b.pv ?? ''}</text>`
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${g}</svg>`
}

// ---- swing diagram --------------------------------------------------------------------------------------------------------------------------------------
// Side view, pitcher to the right. Three rays from one schematic contact point: the incoming pitch at its approach angle (derived, dashed), the barrel path at the attack angle
// (measured, a short stroke), and the ball leaving at the launch angle (measured). The gap between bat path and ball is derived. No bat shape, no full arc: Statcast does not measure them.
// With no real swing (what-if) it draws the typical band: attack angle about 1.7 + 0.078 x LA + 0.063 x EV, plus or minus 9 degrees (correlational only).
export function swingSVG(b, st, o = {}) {
  const W = o.w ?? 220, H = o.h ?? 190, ox = 62, oy = H - 74
  const real = b && b.aa != null
  const la = b?.la ?? st.la, ev = b?.ev ?? st.ev
  const aa = real ? b.aa : 1.73 + 0.078 * st.la + 0.063 * st.ev
  const vaa = b?.vaa ?? -6.4
  const ray = (deg, len) => [ox + Math.cos((deg * Math.PI) / 180) * len, oy - Math.sin((deg * Math.PI) / 180) * len]
  let g = `<line x1="${ox - 30}" x2="${W - 6}" y1="${oy}" y2="${oy}" stroke="var(--dim)" stroke-dasharray="2 4"/>`
  const [px, py] = ray(-vaa, W - ox - 22)
  g += `<line x1="${ox}" y1="${oy}" x2="${px.toFixed(1)}" y2="${py.toFixed(1)}" stroke="var(--dim)" stroke-width="2" stroke-dasharray="6 4"/><text x="${W - 8}" y="${(py - 5).toFixed(1)}" fill="var(--dim)" font-size="12" text-anchor="end">PITCH ${vaa.toFixed(0)}°</text>`
  const bandAA = real ? [aa] : [aa - 9, aa, aa + 9]
  bandAA.forEach((a, i) => {
    const [x1, y1] = ray(a, 52), [x0, y0] = ray(a + 180, 30)
    g += `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="var(--tx)" stroke-width="${real || i === 1 ? 5 : 2}" ${real ? '' : 'stroke-dasharray="4 3"'} stroke-linecap="butt"/>`
  })
  const [lx, ly] = ray(la, 108)
  g += `<line x1="${ox}" y1="${oy}" x2="${lx.toFixed(1)}" y2="${ly.toFixed(1)}" stroke="var(--acc)" stroke-width="3"/>`
  g += `<path d="M${ox + 34} ${oy}A34 34 0 0 0 ${(ox + 34 * Math.cos((la * Math.PI) / 180)).toFixed(1)} ${(oy - 34 * Math.sin((la * Math.PI) / 180)).toFixed(1)}" fill="none" stroke="var(--acc)"/>`
  g += `<circle cx="${ox}" cy="${oy}" r="4" fill="var(--tx)"/>`
  const [tx, ty] = ray(aa + 180, 38)
  g += `<text x="${Math.max(4, tx - 4).toFixed(1)}" y="${(ty + 15).toFixed(1)}" fill="var(--tx)" font-size="13">BAT ${aa >= 0 ? '+' : ''}${aa.toFixed(0)}\u00b0</text>`
  g += `<text x="${(lx + 4).toFixed(1)}" y="${(ly + 4).toFixed(1)}" fill="var(--acc)" font-size="13" text-anchor="${lx > W - 60 ? 'end' : 'start'}">BALL ${la.toFixed(0)}\u00b0</text>`
  g += `<text x="6" y="${H - 20}" fill="var(--dim)" font-size="12">${real ? `GAP ${(la - aa).toFixed(0)}\u00b0 (DERIVED)` : 'TYPICAL, NOT MEASURED'}</text>`
  g += `<text x="6" y="${H - 6}" fill="var(--dim)" font-size="12">${real ? `BAT ${b.bs ?? '--'} MPH  EV ${Math.round(ev)}` : 'CORRELATION ONLY'}</text>`
  g += `<text x="6" y="14" fill="var(--dim)" font-size="12">SIDE VIEW</text><text x="${W - 6}" y="14" fill="var(--dim)" font-size="12" text-anchor="end">PITCHER &gt;</text>`
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${g}</svg>`
}

// ---- procedural ASCII batter ----------------------------------------------------------------------------------------------------------------------------
// Capsules (thick line segments) for head, torso, arms, legs and bat are rasterized onto a character grid (a cell is 2.25 times taller than wide) and shaded: edges '#', inside ':'.
// Poses are keyframes (stance, contact, follow-through) blended by t; bat angle at contact follows the attack angle. Left-handers mirror the picture.
const CELL = 2.25
function capsule(grid, a, b, r, ch = '#') {
  const [x0, y0] = a, [x1, y1] = b, dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1
  const minC = Math.floor(Math.min(x0, x1) - r - 1), maxC = Math.ceil(Math.max(x0, x1) + r + 1)
  const minR = Math.floor((Math.min(y0, y1) - r - 1) / CELL), maxR = Math.ceil((Math.max(y0, y1) + r + 1) / CELL)
  for (let rr = Math.max(0, minR); rr <= Math.min(grid.length - 1, maxR); rr++) for (let cc = Math.max(0, minC); cc <= Math.min(grid[0].length - 1, maxC); cc++) {
    const px = cc + 0.5, py = (rr + 0.5) * CELL
    let t = ((px - x0) * dx + (py - y0) * dy) / L2
    t = Math.max(0, Math.min(1, t))
    if (Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy)) <= r) grid[rr][cc] = ch
  }
}
const lerp = (a, b, t) => a + (b - a) * t
const lerp2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]
// joints in cell-wide units; the figure faces right (the pitcher is to the right); x 0..30, y 0..54
const POSES = {
  stance: { head: [13, 9], neck: [14, 14], hip: [13, 32], knB: [9, 43], ftB: [7, 52], knF: [18, 43], ftF: [20, 52], elb: [9, 22], hand: [8, 14], bat: [4, -8] },
  contact: { head: [17, 10], neck: [16, 15], hip: [14, 32], knB: [11, 43], ftB: [8, 52], knF: [20, 42], ftF: [24, 52], elb: [22, 22], hand: [26, 24], bat: null },
  follow: { head: [16, 10], neck: [15, 15], hip: [14, 32], knB: [14, 43], ftB: [12, 52], knF: [22, 42], ftF: [26, 52], elb: [11, 14], hand: [10, 10], bat: [-2, 20] },
}
function poseAt(t, aa) {
  const A = POSES.stance, B = POSES.contact, C = POSES.follow
  const [p, q, u] = t < 0.5 ? [A, B, t / 0.5] : [B, C, (t - 0.5) / 0.5]
  const out = {}
  for (const k of Object.keys(A)) if (k !== 'bat') out[k] = lerp2(p[k], q[k], u)
  const ang = (deg) => [Math.cos((deg * Math.PI) / 180) * 22, -Math.sin((deg * Math.PI) / 180) * 22]
  const tipOf = (pose, hand) => (pose.bat ? pose.bat : [hand[0] + ang(aa)[0], hand[1] + ang(aa)[1]])
  const tA = tipOf(A, A.hand), tB = tipOf(B, B.hand), tC = tipOf(C, C.hand)
  const tip = t < 0.5 ? lerp2(tA, tB, t / 0.5) : lerp2(tB, tC, (t - 0.5) / 0.5)
  out.tip = tip
  return out
}
export function asciiBatter(o = {}) {
  const C = o.cols ?? 28, R = o.rows ?? 16, t = o.t ?? 0.5, aa = o.aa ?? 10, left = o.hand === 'L'
  const grid = Array.from({ length: R }, () => Array(C).fill(' '))
  const P = poseAt(t, aa)
  // the figure's natural bounds are x -8..50 and y -12..58 (cell-width units, 2.25 units per row); fit them into the grid
  const s = Math.min((C - 2) / 58, (R * CELL - 2) / 70), ox = 8 * s + (C - 58 * s) / 2, oy = 12 * s + (R * CELL - 70 * s) / 2
  const m = (p) => [p[0] * s + ox, p[1] * s + oy]
  const cap = (a, b, r, ch) => capsule(grid, m(a), m(b), Math.max(0.9, r * s), ch)
  cap(P.hip, P.knB, 4.4); cap(P.knB, P.ftB, 3.8); cap(P.ftB, [P.ftB[0] + 6, P.ftB[1]], 2.6)
  cap(P.hip, P.knF, 4.4); cap(P.knF, P.ftF, 3.8); cap(P.ftF, [P.ftF[0] + 6, P.ftF[1]], 2.6)
  cap(P.hip, P.neck, 6.4)
  cap(P.neck, P.elb, 3.2); cap(P.elb, P.hand, 3.0)
  cap(P.hand, P.tip, 1.5, '=')
  const h = m(P.head)
  capsule(grid, [h[0], h[1]], [h[0], h[1]], Math.max(1.8, 5 * s)) // head
  capsule(grid, [h[0] - 1.2, h[1] - 3.2 * s], [h[0] + 1.6, h[1] - 3.2 * s], Math.max(1.2, 3.2 * s), 'H') // helmet
  const dots = (o.style ?? 'solid') === 'dots'
  const out = grid.map((row, r) => row.map((ch, c) => {
    if (ch === ' ' || ch === '=' || ch === 'H') return dots && ch === 'H' ? ':' : ch
    const edge = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dr, dc]) => !grid[r + dr]?.[c + dc] || grid[r + dr][c + dc] === ' ')
    if (!dots) return edge ? '#' : ':'
    return edge ? (!grid[r - 1]?.[c] || grid[r - 1][c] === ' ' ? "'" : !grid[r + 1]?.[c] || grid[r + 1][c] === ' ' ? '.' : ':') : (r + c) % 5 === 0 ? '.' : ' '
  }))
  const lines = out.map((r) => r.join(''))
  if (o.ground !== false) lines[lines.length - 1] = lines[lines.length - 1].replace(/ /g, (m, i) => (i % 2 ? ' ' : '.')) // a dotted ground line under the feet
  if (!left) return lines
  const flip = { '/': '\\', '\\': '/', '(': ')', ')': '(', '<': '>', '>': '<' }
  return lines.map((l) => [...l].reverse().map((c) => flip[c] ?? c).join(''))
}
// A generic head and shoulders, in the same shading, for any player without a portrait
export function asciiBust(o = {}) {
  const C = o.cols ?? 28, R = o.rows ?? 14
  const grid = Array.from({ length: R }, () => Array(C).fill(' '))
  const cx = C / 2, u = (R * CELL) / 31.5 // scale from the 14-row design
  capsule(grid, [cx, 10 * u], [cx, 11 * u], 6.4 * u) // head
  capsule(grid, [cx - 4.5 * u, 5.2 * u], [cx + 4.5 * u, 5.2 * u], 2.4 * u, 'H') // cap crown
  capsule(grid, [cx + 3 * u, 8 * u], [cx + 11 * u, 8.4 * u], 0.9 * u, 'H') // brim
  capsule(grid, [cx, 17 * u], [cx, 20 * u], 3 * u) // neck
  capsule(grid, [cx - 10 * u, 27 * u], [cx + 10 * u, 27 * u], 4.6 * u) // shoulders
  const lines = grid.map((row, r) => row.map((ch, c) => {
    if (ch === ' ' || ch === 'H') return ch
    const edge = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dr, dc]) => !grid[r + dr]?.[c + dc] || grid[r + dr][c + dc] === ' ')
    return edge ? '#' : ':'
  }))
  const eyeRow = Math.round((10 * u) / CELL)
  for (const dx of [-2.6, 2.6]) { const c = Math.round(cx + dx); if (lines[eyeRow]?.[c] === ':') lines[eyeRow][c] = 'o' }
  return lines.map((l) => l.join(''))
}

// ---- barrel map and honest histograms --------------------------------------------------------------------------------------------------------------------------
// Exit speed (across) by launch angle (up): each cell shows the home-run rate of every ball in play since 2023 in that cell as a character, and the cell this ball falls in is marked.
const RAMP = ' .:-=+*#%@'
export function barrelMap(D, ev, la) {
  const M = D.evla
  if (!M) return ''
  const nE = M.all.length, nL = M.all[0].length
  const ei = Math.min(nE - 1, Math.max(0, Math.floor((ev - M.ev0) / M.evstep))), li = Math.min(nL - 1, Math.max(0, Math.floor((la - M.la0) / M.lastep)))
  const rows = []
  for (let l = nL - 1; l >= 0; l--) {
    let row = ''
    for (let e = 0; e < nE; e++) {
      const n = M.all[e][l]
      let ch = n < 6 ? ' ' : RAMP[Math.min(9, Math.round(Math.sqrt(M.hr[e][l] / n) * 9))]
      if (ch === ' ' && n >= 6) ch = '.'
      row += e === ei && l === li ? '\u0001' : ch
    }
    rows.push(row)
  }
  return rows.map((r, i) => `<span class="ax">${String(M.la0 + (nL - 1 - i) * M.lastep + M.lastep).padStart(3)}</span> ${r.replace('\u0001', '<b class="me">@</b>')}`).join('\n')
}
// league histogram drawn at the container's real pixel size (no stretched text): bars are every ball in play, the line is the home-run rate in each bin, the dashed line the league
// average, the accent bar this ball. Returns {svg, pct, mean, maxRate}.
export function histHonest(D, key, v, o = {}) {
  const M = D.metrics?.[key]
  if (!M) return { svg: '', pct: null }
  const W = Math.max(120, Math.round(o.w || 260)), H = Math.max(34, Math.round(o.h || 56)), n = M.all.length, bw = (W - 2) / n, base = H - 14, top = 3
  const idx = Math.min(n - 1, Math.max(0, Math.floor((v - M.lo) / M.step))), mx = Math.max(...M.all)
  let tot = 0, cum = 0, mean = 0
  M.all.forEach((c, i) => { tot += c; mean += c * (M.lo + (i + 0.5) * M.step); if (i < idx) cum += c })
  cum += M.all[idx] / 2
  mean /= tot
  const X = (x) => 1 + ((Math.min(M.hi, Math.max(M.lo, x)) - M.lo) / (M.hi - M.lo)) * (W - 2)
  const rate = M.all.map((c, i) => (c >= 40 ? M.hr[i] / c : null)), maxRate = Math.max(...rate.filter((r) => r != null), 0.001)
  let g = ''
  M.all.forEach((c, i) => { const h = Math.max(c ? 1 : 0, Math.round((c / mx) * (base - top))); if (h) g += `<rect x="${(1 + i * bw).toFixed(1)}" y="${base - h}" width="${Math.max(1, bw - 1).toFixed(1)}" height="${h}" fill="${i === idx ? 'var(--acc)' : 'var(--dim)'}"/>` })
  const pts = rate.map((r, i) => (r == null ? null : `${(1 + (i + 0.5) * bw).toFixed(1)},${(base - (r / maxRate) * (base - top)).toFixed(1)}`)).filter(Boolean)
  if (pts.length > 1) g += `<polyline points="${pts.join(' ')}" fill="none" stroke="var(--tx)" stroke-width="1.5"/>`
  g += `<line x1="${X(mean).toFixed(1)}" x2="${X(mean).toFixed(1)}" y1="${top}" y2="${base}" stroke="var(--tx)" stroke-dasharray="2 3"/>`
  g += `<line x1="${X(v).toFixed(1)}" x2="${X(v).toFixed(1)}" y1="${top}" y2="${base + 3}" stroke="var(--acc)" stroke-width="2"/>`
  g += `<line x1="1" x2="${W - 1}" y1="${base + 0.5}" y2="${base + 0.5}" stroke="var(--tx)"/>`
  for (const q of [0, 0.5, 1]) { const val = M.lo + q * (M.hi - M.lo); g += `<text x="${(1 + q * (W - 2)).toFixed(1)}" y="${H - 2}" fill="var(--dim)" font-size="12" text-anchor="${q === 0 ? 'start' : q === 1 ? 'end' : 'middle'}">${Number.isInteger(val) ? val : val.toFixed(1)}</text>` }
  return { svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${g}</svg>`, pct: Math.round((100 * cum) / tot), mean, maxRate }
}

// ---- hover rule ----------------------------------------------------------------------------------------------------------------------------------------------
// Pictures lean, numbers lift, buttons sink. A .cell.tilt holds a .pnl that leans toward the cursor in whole degrees (at most 3, a 3 by 3 set of poses, applied after the pointer dwells
// on a spot, never while it is crossing), with the listener on the static wrapper so the edge cannot flutter; a .cell.lift only rises a few pixels; everything else stays put.
export const HOVER_CSS = `
#cp .cell{position:relative;min-width:0;min-height:0}
#cp .cell>.pnl{position:absolute;inset:0;transition:transform .12s steps(3,end),box-shadow .12s steps(3,end)}
#cp .cell.lift:hover>.pnl,#cp .cell.tilt:hover>.pnl{transform:perspective(900px) translateY(-3px) translateZ(8px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));box-shadow:var(--sx,0px) 4px 0 color-mix(in srgb,var(--dim) 45%,var(--k));z-index:5}
@media (prefers-reduced-motion:reduce){#cp .cell>.pnl{transition:none}#cp .cell.lift:hover>.pnl,#cp .cell.tilt:hover>.pnl{transform:none}}
`
export function hoverRule(root) {
  for (const w of root.querySelectorAll('.cell.tilt')) {
    const p = w.firstElementChild
    let pose = '', timer = 0
    const set = (rx, ry, sx) => { p.style.setProperty('--rx', rx + 'deg'); p.style.setProperty('--ry', ry + 'deg'); p.style.setProperty('--sx', sx + 'px') }
    w.addEventListener('mousemove', (e) => {
      const r = w.getBoundingClientRect(), cx = Math.min(2, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * 3))), cy = Math.min(2, Math.max(0, Math.floor(((e.clientY - r.top) / r.height) * 3)))
      const key = cx + ',' + cy
      if (key === pose) return
      clearTimeout(timer)
      timer = setTimeout(() => { pose = key; set(-(cy - 1) * 3, (cx - 1) * 3, -(cx - 1) * 4) }, 90) // 3 degrees at most; the far side gets the shadow
    })
    w.addEventListener('mouseleave', () => { clearTimeout(timer); pose = ''; set(0, 0, 0) })
  }
}
// numbers that roll to their new value in a few stepped frames (swings only)
export function rollTo(el, to, o = {}) {
  const from = Number(el.dataset.v ?? to), steps = o.steps ?? 8
  el.dataset.v = to
  if (!isFinite(from) || from === to || window.__fixedTime !== undefined || matchMedia('(prefers-reduced-motion:reduce)').matches) { el.textContent = o.fmt ? o.fmt(to) : to; return }
  let i = 0
  const iv = setInterval(() => { i++; const v = i >= steps ? to : from + ((to - from) * i) / steps; el.textContent = o.fmt ? o.fmt(Math.round(v)) : Math.round(v); if (i >= steps) clearInterval(iv) }, 55)
}

// ---- dot-matrix jersey number ----------------------------------------------------------------------------------------------------------------------------------
const DIG = {
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'], 1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'], 3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'], 5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'], 7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'], 9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
}
export function dotDigits(str) {
  const rows = Array(7).fill('')
  for (const ch of String(str)) { const g = DIG[ch]; if (!g) continue; g.forEach((r, i) => { rows[i] += [...r].map((x) => (x === '1' ? 'o ' : '  ')).join('') + ' ' }) }
  return rows.map((r) => r.replace(/\s+$/, ''))
}

// ---- only buttons tilt ------------------------------------------------------------------------------------------------------------------------------------------
// A button leans toward the cursor in 2 degree steps (at most 8) and lifts; pressing it sinks it flat. Nothing else on the screen tilts.
export const BTN_TILT_CSS = `
#cp .bt{transition:transform .09s steps(3,end),box-shadow .09s steps(3,end)}
#cp .bt:hover{transform:perspective(260px) translateY(-2px) rotateX(var(--brx,0deg)) rotateY(var(--bry,0deg))}
#cp .bt:active,#cp .bt.pr{transform:translateY(5px)}
@media (prefers-reduced-motion:reduce){#cp .bt:hover{transform:translateY(-2px)}}
`
export function tiltButtons(root) {
  root.addEventListener('mousemove', (e) => {
    const b = e.target.closest?.('.bt')
    if (!b) return
    const r = b.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5
    b.style.setProperty('--bry', `${Math.round(nx * 8) * 2}deg`)
    b.style.setProperty('--brx', `${-Math.round(ny * 8) * 2}deg`)
  })
  root.addEventListener('mouseout', (e) => { const b = e.target.closest?.('.bt'); if (b && !b.contains(e.relatedTarget)) { b.style.setProperty('--bry', '0deg'); b.style.setProperty('--brx', '0deg') } })
}
