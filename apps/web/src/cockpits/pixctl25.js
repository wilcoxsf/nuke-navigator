// Study 25 dojo controls on the left as pixel drawings you drag (31 Oct; J in the mixer: BIG ARCS first, then the same drawings in rows, and in GAME BOY, CHALK and
// BLUEPRINT looks; J2 and J1 keep the plain sliders). Second pass the same day (Andrew: "the speed thing let's just go back to making that a slider again and put like a
// little roadrunner icon on it. They look a little wonky all of it right now - give me 5 options for each actual thing. A little simpler, needs to read easy in the
// pixel style"): thick two-cell strokes, few marks, and five drawings for each control, picked in THE LAB (OPTIONS):
//   SPEED (CS)  a rail with a roadrunner for the handle: 1 RUNNER ON A RAIL  2 DUST TRAIL (dust behind him as it changes)  3 FOOTPRINTS (the rail behind him in prints)
//               4 RUNNING (his legs run while it changes)  5 BASE PATH (bases at 80, 100 and 120 mph along the rail)
//   ANGLE (CA)  1 GROUND RAY (a ground line and one launch ray, ticks at 0, 30 and 60)  2 QUARTER GAUGE (one thick quarter arc and a needle)  3 CANNON (a barrel that
//               tips up, the ball at its mouth)  4 LOW MID HIGH (three faint flights, the nearest lit, the ray over them)  5 LADDER (marks 0 to 60, an arrow climbing)
//   AIM (CD)    1 FIVE-SLICE FAN (left, left-center, center, right-center, right; the slice you aim at lit)  2 DIAMOND (the infield from above, the ray to the wall)
//               3 LEFT CENTER RIGHT (three arrows, the nearest lit, a tick for the exact aim)  4 HALF COMPASS (L C R on a half circle, a needle)  5 BALL ON THE WALL
//   AIR (CT)    1 THERMOMETER (bulb and tube, red to the temperature)  2 HEAT BAR (five cells, more lit the warmer)  3 ICE TO SUN (an ice cube, a sun, a dot between)
//               4 UPRIGHT (a standing thermometer, big bulb)  5 SKYLINE (three buildings going from fog grey to sunset orange)
//   WIND (CW)   1 WIND PAD (IN, OUT, L and R round a cross, an arrow from the middle)  2 MINI SOCK (a three-band sock and an arrow)  3 FOUR ARROWS (lit by how it blows)
//               4 CHEVRONS (more of them the stronger, pointing the way)  5 FLAG (a flag that turns with the wind, its tail longer the stronger)
// Desktop only: phones keep the sliders. The number, the + and - and typing a number stay; a drag sets the same numbers through o.set. Each drawing is redrawn only when
// its own number changes (GPT red team: changing the wind redrew all five).
export const PIXCTL = { 8: { skin: 'pix', big: true }, 3: { skin: 'pix' }, 5: { skin: 'gb' }, 6: { skin: 'chalk' }, 7: { skin: 'bp' } }
export const DESIGNS = {
  ev: ['RUNNER ON A RAIL', 'DUST TRAIL', 'FOOTPRINTS', 'RUNNING', 'BASE PATH'],
  la: ['GROUND RAY', 'QUARTER GAUGE', 'CANNON', 'LOW MID HIGH', 'LADDER'],
  dir: ['FIVE-SLICE FAN', 'DIAMOND', 'LEFT CENTER RIGHT', 'HALF COMPASS', 'BALL ON THE WALL'],
  temp: ['THERMOMETER', 'HEAT BAR', 'ICE TO SUN', 'UPRIGHT', 'SKYLINE'],
  wind: ['WIND PAD', 'MINI SOCK', 'FOUR ARROWS', 'CHEVRONS', 'FLAG'],
}
export const PIXCTL_CSS = `
#cp .c25 .strip .bt .pxw{display:none}
@media (min-width:900px){
#cp .c25.dj>.strip.px .bt .pxw{display:block;position:relative;min-width:0;min-height:0}
#cp .c25 .strip.px .bt .pxc{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab;image-rendering:pixelated}
#cp .c25 .strip.px .bt .pxc.grab{cursor:grabbing}
#cp .c25.dj>.strip.px .bt .sld{display:none} /* (TWEAK THE TATER's strip along the bottom keeps its sliders) */
#cp .c25.dj>.strip.px .bt .ps{order:0;width:3.4em}
#cp .c25.dj>.strip.px .bt .pxw{order:1;flex:1 1 0;align-self:stretch;margin:3px 0}
#cp .c25.dj>.strip.px .bt b.num{order:2;flex:none;min-width:3.4em}
#cp .c25.dj>.strip.px .bt{padding:3px 34px 3px 10px}
#cp .c25.dj>.strip.px.big{grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-rows:minmax(0,1.6fr) minmax(0,1.3fr) minmax(0,.75fr);grid-template-areas:"la dir" "temp wind" "ev ev"}
#cp .c25.dj>.strip.px.big .bt[data-k="ev"]{grid-area:ev}#cp .c25.dj>.strip.px.big .bt[data-k="la"]{grid-area:la}#cp .c25.dj>.strip.px.big .bt[data-k="dir"]{grid-area:dir}
#cp .c25.dj>.strip.px.big .bt[data-k="temp"]{grid-area:temp}#cp .c25.dj>.strip.px.big .bt[data-k="wind"]{grid-area:wind}
/* 31 Oct, later (Andrew: "make the text of all of this not overlap and have them visually sort of the same size - they aren't centered"): each box has one header line, the
   word, the number, then - and +, all in the same type at the same size; the drawing fills the rest of the box, centred */
#cp .c25.dj>.strip.px.big .bt:not(.hot){display:grid;grid-template-columns:auto minmax(0,1fr) auto;grid-template-rows:auto auto minmax(0,1fr);gap:2px 8px;padding:6px 8px;align-items:center}
#cp .c25.dj>.strip.px.big .bt:not(.hot) .ps{grid-row:1;grid-column:1;width:auto;min-height:0;color:var(--dim)}
#cp .c25.dj>.strip.px.big .bt:not(.hot) .ps em,#cp .c25.dj>.strip.px.big .bt:not(.hot) b.num{font-family:var(--lf),monospace;font-size:var(--lsz);line-height:1.2;letter-spacing:.04em}
#cp .c25.dj>.strip.px.big .bt:not(.hot) b.num{grid-row:2;grid-column:1/-1;text-align:left;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:inherit} /* (the number on its own line, so a long aim or wind never cuts off) */
#cp .c25.dj>.strip.px.big .bt:not(.hot) .ud{position:static;transform:none;grid-row:1;grid-column:3;display:flex;gap:3px}
#cp .c25.dj>.strip.px.big .bt:not(.hot) .pxw{grid-row:3;grid-column:1/-1;align-self:stretch;margin:0}
#cp .c25.dj>.strip.px.big .bt[data-k="ev"]{grid-template-columns:auto minmax(0,1fr) auto auto;grid-template-rows:minmax(0,1fr)}
#cp .c25.dj>.strip.px.big .bt[data-k="ev"] b.num{grid-row:1;text-align:right}
#cp .c25.dj>.strip.px.big .bt[data-k="ev"] b.num{grid-column:3}#cp .c25.dj>.strip.px.big .bt[data-k="ev"] .ud{grid-row:1;grid-column:4}
#cp .c25.dj>.strip.px.big .bt[data-k="ev"] .pxw{grid-row:1;grid-column:2}
}`
const SKINS = {
  pix: { P: 3 },
  gb: { P: 3, bg: '#9bbc0f', fg: '#306230', dim: '#8bac0f', acc: '#0f380f', red: '#0f380f', white: '#306230', frame: '#0f380f' },
  chalk: { P: 3, bg: '#1d2b25', fg: '#e9e6dc', dim: '#6f7d75', acc: '#f6c453', red: '#f08a8a', white: '#e9e6dc', dust: true },
  bp: { P: 3, bg: '#163a6b', grid: '#22497f', fg: '#d8e8ff', dim: '#6f93c4', acc: '#ffffff', red: '#ffb0a8', white: '#d8e8ff' },
}
const RANGE = { ev: [60, 125], la: [-10, 60], dir: [-50, 50], temp: [40, 100] }
const RAD = Math.PI / 180, clamp = (x, a, b) => Math.max(a, Math.min(b, x))
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }
// a 3 by 5 font for the few words the drawings carry
const F3 = { I: ['###', '.#.', '.#.', '.#.', '###'], N: ['#.#', '###', '###', '###', '#.#'], O: ['###', '#.#', '#.#', '#.#', '###'], U: ['#.#', '#.#', '#.#', '#.#', '###'], T: ['###', '.#.', '.#.', '.#.', '.#.'], L: ['#..', '#..', '#..', '#..', '###'], R: ['##.', '#.#', '##.', '#.#', '#.#'], C: ['###', '#..', '#..', '#..', '###'] }
// the roadrunner, facing right, two strides ('#' ink, 'a' the accent: his crest and beak, 'w' his eye)
const RUNNER = [
  ['........a...', '##.....###..', '.##...##w#aa', '..######....', '...#####....', '....###.....', '....#.#.....', '...#...#....', '..#.....#...'],
  ['........a...', '##.....###..', '.##...##w#aa', '..######....', '...#####....', '....###.....', '....#.#.....', '.....##.....', '.....#.#....'],
]
// slots: [{ el, k }]; o: { get() (the state), set(k, v) (v an object for the wind), arm(i), colors() ({ tx, dim, acc }), sound(k) }
export function initPixCtl(slots, o) {
  let style = 0, design = { ev: 1, la: 1, dir: 1, temp: 1, wind: 1 }
  const W = slots.map(({ el, k }, i) => {
    const wrap = document.createElement('span'), cv = document.createElement('canvas'); wrap.className = 'pxw'; cv.className = 'pxc'; cv.setAttribute('aria-hidden', 'true'); wrap.appendChild(cv); el.appendChild(wrap) // (the canvas sits inside, out of the layout, so its own size never pushes the row)
    const w = { el, k, i, cv, geo: null, key: '', moved: 0, last: null }
    let drag = false
    const at = (e) => { const r = cv.getBoundingClientRect(), P = pOf(r.height); return [(e.clientX - r.left) / P, (e.clientY - r.top) / P] }
    cv.addEventListener('pointerdown', (e) => { if (!style || e.button !== 0) return; e.preventDefault(); e.stopPropagation(); drag = true; cv.classList.add('grab'); try { cv.setPointerCapture(e.pointerId) } catch {} o.arm?.(i); o.sound?.('pick'); move(w, at(e)) })
    cv.addEventListener('pointermove', (e) => { if (drag) { e.stopPropagation(); move(w, at(e)) } })
    const end = () => { if (!drag) return; drag = false; cv.classList.remove('grab') }
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end)
    cv.addEventListener('click', (e) => e.stopPropagation())
    return w
  })
  const skin = () => SKINS[PIXCTL[style]?.skin] ?? SKINS.pix
  const pOf = (h) => (h < 60 ? 2 : skin().P) // (a row of the strip is short: finer cells)
  // a drag point (in cells) to a value, by the kind of drawing last made: an angle from a pivot (from +x, or from up), along x, along y, or a vector
  const val = (k, f) => Math.round(RANGE[k][0] + clamp(f, 0, 1) * (RANGE[k][1] - RANGE[k][0]))
  function move(w, [x, y]) {
    const g = w.geo; if (!g) return
    if (g.type === 'ang') o.set(w.k, Math.round(clamp(Math.atan2(g.cy - y, x - g.cx) / RAD, RANGE[w.k][0], RANGE[w.k][1])))
    else if (g.type === 'up') o.set(w.k, Math.round(clamp(Math.atan2(x - g.cx, g.cy - y) / RAD, RANGE[w.k][0], RANGE[w.k][1])))
    else if (g.type === 'h') o.set(w.k, val(w.k, (x - g.x0) / (g.x1 - g.x0)))
    else if (g.type === 'v') o.set(w.k, val(w.k, (g.y0 - y) / (g.y0 - g.y1)))
    else if (g.type === 'vec') {
      const dx = x - g.cx, dy = g.cy - y, len = Math.hypot(dx, dy), mph = clamp(Math.round(((len / g.R - 0.15) / 0.85) * 25), 0, 25)
      o.set('wind', mph ? { wind: clamp(Math.round((mph * dy) / len), -20, 20), xwind: clamp(Math.round((mph * dx) / len), -20, 20) } : { wind: 0, xwind: 0 })
    }
  }
  // ---- drawing: a grid of cells; shapes set cells to a color; then the cells are painted (squares, or dusty chalk) ----
  function paintOne(w, s, C) {
    const cv = w.cv, cw = cv.clientWidth, ch = cv.clientHeight; if (!cw || !ch) return
    const sk = skin(), P = pOf(ch), dpr = Math.min(2, devicePixelRatio || 1), gw = Math.floor(cw / P), gh = Math.floor(ch / P)
    if (gw < 8 || gh < 6) return
    const k = w.k, d = design[k] ?? 1, v = k === 'wind' ? [s.wind, s.xwind ?? 0] : [s[k]]
    // only this control's own number (and the look, the size, the row's ink) redraws it; the speed's runner keeps striding a moment after it changes
    // the row's ink (the armed row is light): read once per state, not on every paint (each read forced a whole style pass, 31 Oct)
    const ik = (w.el.classList.contains('arm') ? 'a' : 'n') + style + C.tx; if (w.inkKey !== ik) { w.inkKey = ik; w.ink = getComputedStyle(w.el).color }
    const ink = w.ink, now = performance.now()
    if (w.last != null && String(w.last) !== String(v)) w.moved = now
    w.last = v
    const stride = k === 'ev' && now - w.moved < 450 ? Math.floor(now / 110) % 2 : 0
    const key = [style, d, cw, ch, k, ...v, C.acc, ink, stride, k === 'ev' && now - w.moved < 450].join()
    if (key === w.key) return
    w.key = key
    if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr) }
    const cells = new Array(gw * gh).fill(null), set = (x, y, c) => { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < gw && y < gh) cells[y * gw + x] = c }
    const col = { fg: sk.fg ?? ink, dim: sk.dim ?? C.dim, acc: sk.acc ?? C.acc, red: sk.red ?? '#e0403a', white: sk.white ?? ink, cold: '#8fb8d8', sun: '#f2bc40' }
    const T = 2 // the stroke: two cells
    const dot = (x, y, r, c) => { for (let yy = Math.floor(y - r); yy <= y + r; yy++) for (let xx = Math.floor(x - r); xx <= x + r; xx++) if (Math.hypot(xx + 0.5 - x, yy + 0.5 - y) <= r) set(xx, yy, c) }
    const seg = (x0, y0, x1, y1, c, wd = T) => { const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(L * 2)); for (let i = 0; i <= n; i++) { const t = i / n; dot(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, wd / 2, c) } }
    const rect = (x, y, ww, hh, c) => { for (let yy = Math.floor(y); yy < y + hh; yy++) for (let xx = Math.floor(x); xx < x + ww; xx++) set(xx, yy, c) }
    const arc = (cx, cy, r, a0, a1, c, wd = T) => { const n = Math.max(8, Math.ceil(r * Math.abs(a1 - a0) * RAD * 2)); for (let i = 0; i <= n; i++) { const a = (a0 + ((a1 - a0) * i) / n) * RAD; dot(cx + Math.cos(a) * r, cy - Math.sin(a) * r, wd / 2, c) } }
    const pol = (cx, cy, r, deg) => [cx + Math.cos(deg * RAD) * r, cy - Math.sin(deg * RAD) * r]
    const up = (cx, cy, r, deg) => [cx + Math.sin(deg * RAD) * r, cy - Math.cos(deg * RAD) * r]
    const word = (txt, x, y, c) => { let xx = Math.round(x); for (const chr of txt) { (F3[chr] ?? F3.O).forEach((row, j) => [...row].forEach((q, i) => { if (q === '#') set(xx + i, Math.round(y) + j, c) })); xx += 4 } }
    const sprite = (rows, x, y, cmap) => rows.forEach((row, j) => [...row].forEach((q, i) => { if (cmap[q]) set(Math.round(x) + i, Math.round(y) + j, cmap[q]) }))
    const f = k === 'wind' ? 0 : (s[k] - RANGE[k][0]) / (RANGE[k][1] - RANGE[k][0])
    let geo = null
    if (k === 'ev') {
      // the rail, and the roadrunner as the handle
      const y = Math.round(gh / 2) + 2, x0 = 3, x1 = gw - 15, rx = x0 + f * (x1 - x0)
      if (d === 3) { for (let x = x0; x < x1; x += 3) set(x, y + ((x / 3) % 2 ? 0 : 1), x < rx ? col.acc : col.dim) } // footprints behind him, the rest of the track dim
      else { rect(x0, y, x1 - x0 + 12, 2, col.dim); rect(x0, y, rx - x0, 2, col.acc) }
      if (d === 5) for (const mph of [80, 100, 120]) { const bx = x0 + ((mph - 60) / 65) * (x1 - x0); rect(bx - 1, y - 2, 3, 3, mph <= s.ev ? col.white : col.dim) } // the bases
      if (d === 2 && now - w.moved < 450) for (let i = 1; i <= 3; i++) set(rx - 2 - i * 2, y - 1 - (i % 2), col.dim) // the dust
      sprite(RUNNER[d === 4 ? stride : 0], rx - 4, y - 9, { '#': col.fg, a: col.acc, w: sk.bg ?? '#0b0b0b' })
      geo = { type: 'h', x0, x1 }
    } else if (k === 'la') {
      const a = s.la
      if (d === 5) { // LADDER: marks 0 to 60, an arrow climbing beside them
        const x = gw / 2, y0 = gh - 3, y1 = 2, yAt = (deg) => y0 - ((deg + 10) / 70) * (y0 - y1)
        for (const m of [0, 15, 30, 45, 60]) seg(x - 3, yAt(m), x + 3, yAt(m), m % 30 ? col.dim : col.fg, 1)
        seg(x, y0, x, y1, col.dim, 1)
        const ya = yAt(a); seg(x + 5, ya, x + 10, ya, col.acc); set(x + 4, ya - 1, col.acc); set(x + 4, ya + 1, col.acc); set(x + 3, ya, col.acc)
        geo = { type: 'v', y0, y1 }
      } else {
        const r = Math.min(gw - 6, (gh - 4) / (Math.sin(60 * RAD) + Math.sin(10 * RAD))), cx = 3, cy = 2 + r * Math.sin(60 * RAD)
        if (d === 1) { seg(cx, cy, cx + r, cy, col.dim, 1); arc(cx, cy, r - 1, -10, 60, col.dim, 1); if (a > 0) arc(cx, cy, r * 0.5, 0, a, col.acc, 2); else if (a < 0) arc(cx, cy, r * 0.5, a, 0, col.red, 2); const [bx, by] = pol(cx, cy, r - 1, a); seg(cx, cy, bx, by, col.fg); dot(bx, by, 2, col.acc) }
        if (d === 2) { arc(cx, cy, r - 1, -10, 60, col.dim, 3); arc(cx, cy, r - 1, Math.min(0, a), Math.max(0, a), col.acc, 3); const [nx, ny] = pol(cx, cy, r - 3, a); seg(cx, cy, nx, ny, col.fg); dot(cx, cy, 2, col.fg) }
        if (d === 3) { seg(0, cy + 3, gw * 0.5, cy + 3, col.dim, 1); dot(cx + 1, cy + 1, 3, col.dim); const L = Math.min(r * 0.55, 16), [ex, ey] = pol(cx, cy, L, a); seg(cx, cy, ex, ey, col.fg, 4); dot(...pol(cx, cy, L + 3, a), 2, col.acc); for (let i = 1; i <= 3; i++) dot(...pol(cx, cy, L + 3 + i * 4, a), 0.7, col.dim) }
        if (d === 4) { for (const [m, c] of [[15, 0], [30, 1], [45, 2]]) { const near = Math.abs(a - m) <= 7.5 || (c === 0 && a < 15) || (c === 2 && a > 45); const pts = []; for (let t = 0; t <= 1.001; t += 0.05) { const xx = cx + t * (gw - cx - 3), hh = Math.tan(m * RAD) * (gw - cx) * 0.5 * 4 * t * (1 - t) * 0.6; pts.push([xx, cy - Math.min(hh, cy - 1)]) } pts.forEach(([xx, yy]) => set(xx, yy, near ? col.acc : col.dim)) } const [bx, by] = pol(cx, cy, Math.min(r, 12), a); seg(cx, cy, bx, by, col.fg); seg(0, cy, gw, cy, col.dim, 1) }
        geo = { type: 'ang', cx, cy }
      }
    } else if (k === 'dir') {
      const a = s.dir
      if (d === 3) { // three arrows, the nearest lit, a tick under for the exact aim
        const y = gh / 2, xs = [gw * 0.2, gw * 0.5, gw * 0.8], near = a < -15 ? 0 : a > 15 ? 2 : 1
        xs.forEach((x, i) => { const c = i === near ? col.acc : col.dim, dx = i === 0 ? -1 : i === 2 ? 1 : 0; if (dx) { seg(x - 4 * dx, y, x + 3 * dx, y, c); seg(x + 3 * dx, y, x, y - 3, c); seg(x + 3 * dx, y, x, y + 3, c) } else { seg(x, y + 4, x, y - 3, c); seg(x, y - 3, x - 3, y, c); seg(x, y - 3, x + 3, y, c) } })
        const tx = gw * 0.1 + ((a + 50) / 100) * gw * 0.8; seg(gw * 0.1, gh - 2, gw * 0.9, gh - 2, col.dim, 1); rect(tx - 1, gh - 4, 2, 4, col.fg)
        geo = { type: 'h', x0: gw * 0.1, x1: gw * 0.9 }
      } else {
        const R = Math.min(gh - 3, (gw / 2 - 2) / Math.sin(50 * RAD)), cx = gw / 2, cy = gh - 2
        if (d === 1) { const sl = [-45, -27, -9, 9, 27, 45], i = clamp(Math.floor((a + 45) / 18), 0, 4); for (let j = 0; j < 5; j++) { const lit = j === i; for (let t = sl[j] + 2; t <= sl[j + 1] - 2; t += 1.5) { const [x, y] = up(cx, cy, R * 0.92, t); dot(x, y, 1.2, lit ? col.acc : col.dim) } } for (const e of [-45, 45]) { const [x, y] = up(cx, cy, R, e); seg(cx, cy, x, y, col.fg, 1) } const [ax, ay] = up(cx, cy, R * 0.75, a); seg(cx, cy, ax, ay, col.white) }
        if (d === 2) { const b = R * 0.32; seg(cx, cy, cx - b, cy - b, col.dim, 1); seg(cx, cy, cx + b, cy - b, col.dim, 1); seg(cx - b, cy - b, cx, cy - 2 * b, col.dim, 1); seg(cx + b, cy - b, cx, cy - 2 * b, col.dim, 1); for (const [x, y] of [[cx + b, cy - b], [cx, cy - 2 * b], [cx - b, cy - b]]) rect(x - 1, y - 1, 2, 2, col.fg); arc(cx, cy, R * 0.95, 45, 135, col.dim, 1); const [ax, ay] = up(cx, cy, R * 0.95, a); seg(cx, cy, ax, ay, col.acc); dot(ax, ay, 2, col.white) }
        if (d === 4) { arc(cx, cy, R * 0.8, 30, 150, col.dim); word('L', ...up(cx - 1, cy - 2, R * 0.98, -45), col.fg); word('C', cx - 1, cy - R * 0.98 - 2, col.fg); word('R', ...up(cx - 1, cy - 2, R * 0.98, 45), col.fg); const [ax, ay] = up(cx, cy, R * 0.7, a); seg(cx, cy, ax, ay, col.acc); dot(cx, cy, 2, col.fg) }
        if (d === 5) { arc(cx, cy, R * 0.9, 40, 140, col.fg); const [ax, ay] = up(cx, cy, R * 0.9, a); dot(ax, ay, 2.6, col.acc); for (const e of [-45, 45]) { const [x, y] = up(cx, cy, R * 0.95, e); seg(cx, cy, x, y, col.dim, 1) } }
        geo = { type: 'up', cx, cy }
      }
    } else if (k === 'temp') {
      if (d === 4) { // upright: a standing tube on a big bulb
        const x = gw / 2, br = Math.min(4, gw / 4), y0 = gh - 2 - br * 2, y1 = 2
        rect(x - 2, y1, 4, y0 - y1 + 1, col.fg); rect(x - 1, y1 + 1, 2, y0 - y1, sk.bg ?? '#0b0b0b'); dot(x, gh - 2 - br, br, col.fg); dot(x, gh - 2 - br, br - 1.5, col.red)
        rect(x - 1, y0 - f * (y0 - y1 - 2), 2, f * (y0 - y1 - 2) + 2, col.red)
        geo = { type: 'v', y0, y1 }
      } else {
        const y = gh / 2, x0 = 8, x1 = gw - 3
        if (d === 1) { dot(5, y, 4, col.fg); dot(5, y, 2.5, col.red); rect(x0, y - 2, x1 - x0, 4, col.fg); rect(x0, y - 1, x1 - x0 - 1, 2, sk.bg ?? '#0b0b0b'); rect(x0 - 1, y - 1, f * (x1 - x0 - 1) + 1, 2, col.red); for (const m of [0, 0.5, 1]) rect(x0 + m * (x1 - x0 - 2), y + 3, 1, 2, col.dim) }
        if (d === 2) { const n = 5, cw2 = (x1 - x0 + 5) / n, lit = Math.max(1, Math.ceil(f * n - 0.001)); for (let i = 0; i < n; i++) rect(x0 - 5 + i * cw2, y - 3, cw2 - 2, 6, i < lit ? (i < 2 ? col.cold : i < 4 ? col.sun : col.red) : col.dim) }
        if (d === 3) { rect(2, y - 3, 6, 6, col.cold); rect(3, y - 2, 2, 2, col.white); dot(gw - 6, y, 3, col.sun); for (const t of [0, 45, 90, 135, 180, 225, 270, 315]) { const [sx, sy] = pol(gw - 6, y, 5, t); set(sx, sy, col.sun) } seg(x0 + 2, y, x1 - 8, y, col.dim, 1); dot(x0 + 2 + f * (x1 - x0 - 10), y, 2.4, col.acc) }
        if (d === 5) { const cols = ['#8a8f99', '#c7a46a', '#f0802a'], c3 = (i) => { const t = clamp(f * 2.2 - i * 0.6, 0, 1); return t < 0.33 ? cols[0] : t < 0.75 ? cols[1] : cols[2] }; [[x0 - 4, 7], [x0 + 6, 10], [x0 + 17, 5]].forEach(([bx, bh], i) => rect(bx, y + 4 - bh, 7, bh, c3(i))); seg(x0 - 4, y + 6, x1, y + 6, col.dim, 1); rect(x0 - 4 + f * (x1 - x0 + 2), y + 5, 2, 3, col.fg) }
        geo = { type: 'h', x0: d === 3 ? x0 + 2 : d === 2 || d === 5 ? x0 - 4 : x0, x1: d === 3 ? x1 - 8 : x1 }
      }
    } else if (k === 'wind') {
      const R = Math.min(gw, gh) / 2 - 1.5, cx = gw / 2, cy = gh / 2, [wo, wx] = v, m = Math.hypot(wo, wx), ux = m ? wx / m : 0, uy = m ? -wo / m : 0, L = (0.15 + (Math.min(25, m) / 25) * 0.85) * R
      if (d === 1) { seg(cx - R + 5, cy, cx + R - 5, cy, col.dim, 1); seg(cx, cy - R + 7, cx, cy + R - 7, col.dim, 1); word('OUT', cx - 5, 0, col.dim); word('IN', cx - 3, gh - 5, col.dim); word('L', 0, cy - 2, col.dim); word('R', gw - 3, cy - 2, col.dim); if (m) { seg(cx, cy, cx + ux * L, cy + uy * L, col.acc); dot(cx + ux * L, cy + uy * L, 2, col.acc) } else dot(cx, cy, 2, col.fg) }
      if (d === 2) { dot(cx, cy, 1.5, col.fg); if (m) { for (let t = 0; t <= 1; t += 0.05) { const ww = 3 * (1 - t * 0.5); dot(cx + ux * L * t, cy + uy * L * t, ww / 2, Math.floor(t * 3) % 2 ? col.white : col.acc) } } else seg(cx, cy, cx + 1, cy + 4, col.acc) }
      if (d === 3) { const parts = [[0, -1, Math.max(0, wo)], [0, 1, Math.max(0, -wo)], [1, 0, Math.max(0, wx)], [-1, 0, Math.max(0, -wx)]]; for (const [dx, dy, amt] of parts) { const c = amt > 0 ? col.acc : col.dim, bx = cx + dx * R * 0.6, by = cy + dy * R * 0.6, l = 2 + Math.min(1, amt / 15) * 3; seg(bx - dx * l, by - dy * l, bx + dx * l, by + dy * l, c); seg(bx + dx * l, by + dy * l, bx + dx * l - dx * 3 + dy * 3, by + dy * l - dy * 3 + dx * 3, c); seg(bx + dx * l, by + dy * l, bx + dx * l - dx * 3 - dy * 3, by + dy * l - dy * 3 - dx * 3, c) } dot(cx, cy, 1.5, col.fg) }
      if (d === 4) { const n = m ? Math.min(4, Math.ceil(m / 6)) : 0; if (!n) word('O', cx - 1, cy - 2, col.dim); for (let i = 0; i < n; i++) { const bx = cx + ux * (i - (n - 1) / 2) * 4, by = cy + uy * (i - (n - 1) / 2) * 4, px = -uy, py = ux; seg(bx - ux * 2 + px * 3, by - uy * 2 + py * 3, bx + ux * 1, by + uy * 1, col.acc); seg(bx - ux * 2 - px * 3, by - uy * 2 - py * 3, bx + ux * 1, by + uy * 1, col.acc) } }
      if (d === 5) { rect(cx - 1, cy - R, 2, 2 * R, col.fg); if (m) { const tl = 3 + (Math.min(25, m) / 25) * (R - 2); for (let t = 0; t <= 1; t += 0.06) { const wv = Math.sin(t * 6 + performance.now() / 300) * 0.6; dot(cx + ux * tl * t + -uy * wv, cy - R + 3 + uy * tl * t * 0.6 + ux * wv, (4 - t * 2) / 2, col.acc) } } else rect(cx + 1, cy - R + 1, 2, 6, col.acc) }
      geo = { type: 'vec', cx, cy, R }
    }
    if (k !== 'ev') { // centre the drawing in its box
      let x0 = gw, x1 = -1, y0 = gh, y1 = -1
      for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) if (cells[y * gw + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
      const ox = x1 < 0 ? 0 : Math.round((gw - 1 - x1 - x0) / 2), oy = y1 < 0 ? 0 : Math.round((gh - 1 - y1 - y0) / 2)
      if (ox || oy) {
        const moved = new Array(gw * gh).fill(null)
        for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { const c = cells[y * gw + x]; if (c && x + ox >= 0 && x + ox < gw && y + oy >= 0 && y + oy < gh) moved[(y + oy) * gw + x + ox] = c }
        cells.splice(0, cells.length, ...moved)
        for (const key of ['cx', 'x0', 'x1']) if (geo[key] != null) geo[key] += ox
        for (const key of ['cy', 'y0', 'y1']) if (geo[key] != null) geo[key] += oy
      }
    }
    w.geo = geo
    // paint the cells
    const cx2 = cv.getContext('2d'), Q = P * dpr
    cx2.clearRect(0, 0, cv.width, cv.height)
    if (sk.bg) { cx2.fillStyle = sk.bg; cx2.fillRect(0, 0, cv.width, cv.height) }
    if (sk.frame) { cx2.strokeStyle = sk.frame; cx2.lineWidth = dpr * 2; cx2.strokeRect(dpr, dpr, cv.width - 2 * dpr, cv.height - 2 * dpr) }
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      let c = cells[y * gw + x]
      if (!c && sk.grid && x % 6 === 0 && y % 6 === 0) c = sk.grid
      if (!c) continue
      cx2.fillStyle = c
      cx2.globalAlpha = sk.dust ? 0.6 + hash(x * 31 + y * 7 + w.i) * 0.4 : 1
      cx2.fillRect(x * Q, y * Q, Q, Q)
    }
    cx2.globalAlpha = 1
  }
  let raf = 0
  function paint(force) {
    if (!style) return
    const s = o.get(), C = o.colors()
    if (force) for (const w of W) w.key = ''
    for (const w of W) paintOne(w, s, C)
    // the runner strides (and the dust settles) for a moment after the speed changes; the flag waves
    if (!raf && W.some((w) => (w.k === 'ev' && performance.now() - w.moved < 500) || (w.k === 'wind' && design.wind === 5))) raf = requestAnimationFrame(() => { raf = 0; paint() })
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => paint(true)) : null
  for (const w of W) ro?.observe(w.cv)
  return {
    setStyle(n) { style = PIXCTL[n] ? n : 0; paint(true) },
    setDesigns(dz) { design = { ...design, ...dz }; paint(true) },
    paint,
    // for the tests: each widget's box on screen, and where a value sits in it (k, a value or { wind, xwind }) as client coordinates
    boxes: () => Object.fromEntries(W.map((w) => { const r = w.cv.getBoundingClientRect(); return [w.k, [r.left, r.top, r.width, r.height]] })),
    pointFor(k, v) {
      const w = W.find((x) => x.k === k), g = w?.geo; if (!g) return null
      const r = w.cv.getBoundingClientRect(), P = pOf(r.height), cl = (x, y) => [r.left + x * P, r.top + y * P], f = k === 'wind' ? 0 : (v - RANGE[k][0]) / (RANGE[k][1] - RANGE[k][0])
      if (g.type === 'ang') return cl(g.cx + Math.cos(v * RAD) * 14, g.cy - Math.sin(v * RAD) * 14) // (far enough out that a pixel of rounding is under a degree or two)
      if (g.type === 'up') return cl(g.cx + Math.sin(v * RAD) * 14, g.cy - Math.cos(v * RAD) * 14)
      if (g.type === 'h') return cl(g.x0 + f * (g.x1 - g.x0), r.height / P / 2)
      if (g.type === 'v') return cl(r.width / P / 2, g.y0 - f * (g.y0 - g.y1))
      if (g.type === 'vec') { const m = Math.hypot(v.wind, v.xwind), L = (0.15 + (m / 25) * 0.85) * g.R; return cl(g.cx + (v.xwind / m) * L, g.cy - (v.wind / m) * L) }
      return null
    },
  }
}
