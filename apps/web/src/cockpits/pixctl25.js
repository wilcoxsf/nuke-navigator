// Study 25 dojo controls on the left as pixel instruments (31 Oct, Andrew: "We need pixel controls for the wind, temp, on the LHS - let's make it a sock and
// thermometer. Give me 5 options ... for launch angle and direction can we also get like a semi-diagetic pixel control of an angle / arc twice on the left? Give
// me a ton of options for all of the LHS dojo controls"). Each control gets a little pixel drawing you drag (J3 to J9 in the mixer; J1 and J2 keep the sliders):
//   SPEED   a half dial, the needle and the lit arc up to the speed           ANGLE   a launch ray off a quarter arc, ground level marked, the ball at its tip
//   AIM     the field from above, foul lines and the wall, the aim line out   AIR     a thermometer, red up the tube to the temperature
//   WIND    a windsock from above, blowing the way the air goes (up is out to center), as long as it is strong: drag its end; out, in and across at once
// Five looks (the same drawings): PIXEL (square pixels in the page's colors), LED (round bulbs on a dark board like the scoreboard, the unlit ones showing),
// GAME BOY (four greens), CHALK (a dugout chalkboard, dusty strokes), BLUEPRINT (white lines on blue); and BIG ARCS (the angle and the aim side by side and big,
// the sock and the thermometer side by side under them, the speed under those) in PIXEL and in LED. Desktop only: phones keep the sliders.
// The number, the + and - and typing a number stay; a drag sets the same numbers through o.set.
export const PIXCTL = {
  3: { skin: 'pix' }, 5: { skin: 'gb' }, 6: { skin: 'chalk' }, 7: { skin: 'bp' }, 8: { skin: 'pix', big: true }, // (31 Oct: no LED, his call)
}
export const PIXCTL_CSS = `
#cp .c25 .strip .bt .pxw{display:none}
@media (min-width:900px){
#cp .c25 .strip.px .bt .pxw{display:block;position:relative;min-width:0;min-height:0}
#cp .c25 .strip.px .bt .pxc{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab;image-rendering:pixelated}
#cp .c25 .strip.px .bt .pxc.grab{cursor:grabbing}
#cp .c25 .strip.px .bt .sld{display:none}
#cp .c25.dj>.strip.px .bt .ps{order:0;width:3.4em}
#cp .c25.dj>.strip.px .bt .pxw{order:1;flex:1 1 0;align-self:stretch;margin:3px 0}
#cp .c25.dj>.strip.px .bt b.num{order:2;flex:none;min-width:3.4em}
#cp .c25.dj>.strip.px .bt{padding:3px 34px 3px 10px}
#cp .c25:not(.dj)>.strip.px .bt .pxw{position:absolute;right:30px;top:4px;bottom:4px;width:50%}
#cp .c25.dj>.strip.px.big{grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-rows:minmax(0,1.7fr) minmax(0,1.35fr) minmax(0,.8fr) minmax(0,.9fr);grid-template-areas:"la dir" "temp wind" "ev ev" "hot hot"}
#cp .c25.dj>.strip.px.big .bt[data-k="ev"]{grid-area:ev}#cp .c25.dj>.strip.px.big .bt[data-k="la"]{grid-area:la}#cp .c25.dj>.strip.px.big .bt[data-k="dir"]{grid-area:dir}
#cp .c25.dj>.strip.px.big .bt[data-k="temp"]{grid-area:temp}#cp .c25.dj>.strip.px.big .bt[data-k="wind"]{grid-area:wind}#cp .c25.dj>.strip.px.big .bt.hot{grid-area:hot}
#cp .c25.dj>.strip.px.big .bt:not(.hot):not([data-k="ev"]){flex-direction:column;align-items:stretch;gap:2px;padding:4px 30px 4px 8px}
#cp .c25.dj>.strip.px.big .bt:not(.hot):not([data-k="ev"]) .ps{width:auto}
#cp .c25.dj>.strip.px.big .bt:not(.hot):not([data-k="ev"]) b.num{text-align:right;font-size:18px;position:absolute;right:30px;top:5px;min-width:0}
#cp .c25.dj>.strip.px.big .bt:not(.hot):not([data-k="ev"]) .pxw{margin:0}
}`
const SKINS = {
  pix: { P: 3 },
  led: { P: 4, round: true, bg: '#0b0b0b', off: '#242424', fg: '#ffb347', dim: '#5c4a2c', acc: '#ff7a1a', red: '#ff4a2a', white: '#ffe2b0' },
  gb: { P: 3, bg: '#9bbc0f', fg: '#306230', dim: '#8bac0f', acc: '#0f380f', red: '#0f380f', white: '#306230', frame: '#0f380f' },
  chalk: { P: 2, bg: '#1d2b25', fg: '#e9e6dc', dim: '#6f7d75', acc: '#f6c453', red: '#f08a8a', white: '#e9e6dc', dust: true },
  bp: { P: 2, bg: '#163a6b', grid: '#22497f', fg: '#d8e8ff', dim: '#6f93c4', acc: '#ffffff', red: '#ffb0a8', white: '#d8e8ff' },
}
const RAD = Math.PI / 180, clamp = (x, a, b) => Math.max(a, Math.min(b, x))
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }
// slots: [{ el, k }]; o: { get() (the state), set(k, v) (v an object for the wind), arm(i), colors() ({ tx, dim, acc }), sound(k) }
export function initPixCtl(slots, o) {
  let style = 0
  const W = slots.map(({ el, k }, i) => {
    const wrap = document.createElement('span'), cv = document.createElement('canvas'); wrap.className = 'pxw'; cv.className = 'pxc'; cv.setAttribute('aria-hidden', 'true'); wrap.appendChild(cv); el.appendChild(wrap) // (the canvas sits inside, out of the layout, so its own size never pushes the row)
    const w = { el, k, i, cv, geo: null, key: '' }
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
  const pOf = (h) => { const P = skin().P; return h < 60 ? Math.max(2, P - 1) : P } // (a row of the strip is short: one size finer)
  // a drag point (in pixel cells) to a value, by the geometry of the last drawing
  function move(w, [x, y]) {
    const g = w.geo; if (!g) return
    if (w.k === 'ev') { const a = Math.atan2((g.cy - y) / g.ry, (x - g.cx) / g.rx); o.set('ev', Math.round(60 + clamp(1 - (a < -Math.PI / 2 ? Math.PI : Math.max(0, a)) / Math.PI, 0, 1) * 65)) }
    else if (w.k === 'la') o.set('la', Math.round(clamp(Math.atan2(g.cy - y, x - g.cx) / RAD, -10, 60)))
    else if (w.k === 'dir') o.set('dir', Math.round(clamp(Math.atan2(x - g.cx, g.cy - y) / RAD, -50, 50)))
    else if (w.k === 'temp') { const f = g.vert ? (g.y0 - y) / (g.y0 - g.y1) : (x - g.x0) / (g.x1 - g.x0); o.set('temp', Math.round(40 + clamp(f, 0, 1) * 60)) }
    else if (w.k === 'wind') {
      const dx = x - g.cx, dy = g.cy - y, len = Math.hypot(dx, dy), mph = clamp(Math.round(((len / g.R - 0.2) / 0.8) * 25), 0, 25)
      o.set('wind', mph ? { wind: clamp(Math.round((mph * dy) / len), -20, 20), xwind: clamp(Math.round((mph * dx) / len), -20, 20) } : { wind: 0, xwind: 0 })
    }
  }
  // ---- drawing: a grid of cells, shapes set cells to a color, then the cells are painted (squares, bulbs or chalk) ----
  function paintOne(w, s, C, big) {
    const cv = w.cv, cw = cv.clientWidth, ch = cv.clientHeight; if (!cw || !ch) return
    const sk = skin(), P = pOf(ch), dpr = Math.min(2, devicePixelRatio || 1), gw = Math.floor(cw / P), gh = Math.floor(ch / P)
    if (gw < 8 || gh < 6) return
    const ink = getComputedStyle(w.el).color, key = [style, cw, ch, w.k, s.ev, s.la, s.dir, s.temp, s.wind, s.xwind ?? 0, C.acc, ink].join() // (the armed row is light: the ink follows the row's own text color)
    if (key === w.key) return
    w.key = key
    if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr) }
    const cells = new Array(gw * gh).fill(null), set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < gw && y < gh) cells[y * gw + x] = c }
    const each = (f) => { for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) f(x + 0.5, y + 0.5, x, y) }
    const col = { fg: sk.fg ?? ink, dim: sk.dim ?? C.dim, acc: sk.acc ?? C.acc, red: sk.red ?? '#e0403a', white: sk.white ?? ink }
    // math angles (degrees, counterclockwise from +x, y up); a ring between a0 and a1
    const ring = (cx, cy, r, wd, a0, a1, c) => each((px, py, x, y) => { const d = Math.hypot(px - cx, py - cy), a = Math.atan2(cy - py, px - cx) / RAD; if (Math.abs(d - r) <= wd / 2 && a >= a0 - 0.01 && a <= a1 + 0.01) set(x, y, c) })
    const seg = (x0, y0, x1, y1, wd, c) => { const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(L * 2)); for (let i = 0; i <= n; i++) { const t = i / n, px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t; if (wd <= 1.2) set(px - 0.5, py - 0.5, c); else for (let a = -wd / 2; a <= wd / 2; a += 0.5) for (let b = -wd / 2; b <= wd / 2; b += 0.5) set(px - 0.5 + a, py - 0.5 + b, c) } }
    const disc = (cx, cy, r, c) => each((px, py, x, y) => { if (Math.hypot(px - cx, py - cy) <= r) set(x, y, c) })
    const pol = (cx, cy, r, deg) => [cx + Math.cos(deg * RAD) * r, cy - Math.sin(deg * RAD) * r]
    const geo = {}
    if (w.k === 'ev') {
      // a half dial: the dim rim, a tick every 10 mph, the lit arc to the speed and the needle
      const ry = Math.min(gw / 2 - 1.5, gh - 3), rx = Math.min(gw / 2 - 1.5, ry * 2.6), cx = gw / 2, cy = Math.min(gh - 1.5, ry + 2), f = (s.ev - 60) / 65
      const el = (a, k) => [cx + Math.cos(a * RAD) * rx * k, cy - Math.sin(a * RAD) * ry * k] // a point on the dial (k: 1 the rim)
      for (let a = 0; a <= 180; a += 1.5) { const [x, y] = el(a, 1); set(x - 0.5, y - 0.5, col.dim); if (a >= 180 - f * 180) { const [x2, y2] = el(a, 0.82); set(x2 - 0.5, y2 - 0.5, col.acc); const [x3, y3] = el(a, 0.9); set(x3 - 0.5, y3 - 0.5, col.acc) } }
      for (let v = 60; v <= 120; v += 10) { const a = 180 - ((v - 60) / 65) * 180, [x0, y0] = el(a, 1.08), [x1, y1] = el(a, 0.72); seg(x0, y0, x1, y1, 1, col.fg) }
      const [nx, ny] = el(180 - f * 180, 0.9); seg(cx, cy, nx, ny, ry > 9 ? 1.5 : 1, col.white); disc(cx, cy, 1.2, col.fg)
      Object.assign(geo, { cx, cy, rx, ry })
    } else if (w.k === 'la') {
      // a launch ray off a quarter arc (-10 to 60), the ground marked, ticks at 0, 15, 30, 45 and 60, the ball at the tip
      const r = Math.min(gw - 5, (gh - 3) / (Math.sin(60 * RAD) + Math.sin(10 * RAD))), cx = 2, cy = 1.5 + r * Math.sin(60 * RAD)
      seg(0, cy, gw, cy, 1, col.dim)
      ring(cx, cy, r, 1, -10, 60, col.dim)
      for (const a of [0, 15, 30, 45, 60]) { const [x0, y0] = pol(cx, cy, r + 0.5, a), [x1, y1] = pol(cx, cy, r - 1.8, a); seg(x0, y0, x1, y1, 1, col.fg) }
      if (s.la > 0) ring(cx, cy, r * 0.42, 1, 0, s.la, col.acc); else if (s.la < 0) ring(cx, cy, r * 0.42, 1, s.la, 0, col.red)
      const [bx, by] = pol(cx, cy, r - 1, s.la); seg(cx, cy, bx, by, r > 12 ? 1.5 : 1, col.white); disc(bx, by, r > 12 ? 1.8 : 1.3, col.acc)
      Object.assign(geo, { cx, cy })
    } else if (w.k === 'dir') {
      // the field from above: foul lines, the wall, the dirt, the aim line and the ball
      const R = Math.min(gh - 3, (gw / 2 - 1) / Math.sin(52 * RAD)), cx = gw / 2, cy = gh - 1.5, up = (deg, rr) => [cx + Math.sin(deg * RAD) * rr, cy - Math.cos(deg * RAD) * rr]
      ring(cx, cy, R * 0.92, 1, 45, 135, col.dim) // the wall
      ring(cx, cy, R * 0.38, 1, 45, 135, col.dim) // the edge of the dirt
      for (const s2 of [-45, 45]) { const [x, y] = up(s2, R * 0.98); seg(cx, cy, x, y, 1, col.fg) }
      const [ax, ay] = up(s.dir, R * 0.88); seg(cx, cy, ax, ay, R > 12 ? 1.5 : 1, col.acc); disc(ax, ay, R > 12 ? 1.8 : 1.3, col.white)
      disc(cx, cy, 1, col.fg)
      Object.assign(geo, { cx, cy })
    } else if (w.k === 'temp') {
      // a thermometer: a bulb and a tube, red up to the temperature, a tick every 10 degrees (longer at 40, 70, 100); upright when the box is tall
      const f = (s.temp - 40) / 60, vert = gh > gw * 0.9
      if (!vert) {
        const yc = gh / 2, br = Math.min(3, gh / 2 - 0.5), x0 = 1 + br * 2, x1 = gw - 2
        seg(x0, yc - 1.6, x1, yc - 1.6, 1, col.fg); seg(x0, yc + 1.6, x1, yc + 1.6, 1, col.fg); seg(x1, yc - 1.6, x1, yc + 1.6, 1, col.fg)
        disc(1 + br, yc, br, col.fg); disc(1 + br, yc, br - 1, col.red)
        seg(x0 - 1, yc, x0 + f * (x1 - x0 - 1), yc, 2, col.red)
        for (let n = 0; n <= 6; n++) { const x = x0 + (n / 6) * (x1 - x0 - 1); if (yc + 3.4 < gh) seg(x, yc + 2.6, x, yc + (n % 3 ? 3 : 3.8), 1, col.dim) }
        Object.assign(geo, { vert, x0, x1 })
      } else {
        const xc = gw / 2, br = Math.min(3.2, gw / 2 - 1), y0 = gh - 1 - br * 2, y1 = 1.5
        seg(xc - 1.6, y0, xc - 1.6, y1, 1, col.fg); seg(xc + 1.6, y0, xc + 1.6, y1, 1, col.fg); seg(xc - 1.6, y1, xc + 1.6, y1, 1, col.fg)
        disc(xc, gh - 1 - br, br, col.fg); disc(xc, gh - 1 - br, br - 1, col.red)
        seg(xc, y0 + 1, xc, y0 - f * (y0 - y1 - 1), 2, col.red)
        for (let n = 0; n <= 6; n++) { const y = y0 - (n / 6) * (y0 - y1 - 1); seg(xc + 2.8, y, xc + (n % 3 ? 3.6 : 4.6), y, 1, col.dim) }
        Object.assign(geo, { vert, y0, y1 })
      }
    } else if (w.k === 'wind') {
      // a windsock from above: out (to center field) is up; a faint ring at full strength, the pole, the sock in orange and white bands, narrowing
      const R = Math.min(gw, gh) / 2 - 1, cx = gw / 2, cy = gh / 2, m = Math.hypot(s.wind, s.xwind ?? 0)
      each((px, py, x, y) => { const d = Math.hypot(px - cx, py - cy); if (Math.abs(d - R) <= 0.5 && (x + y) % 3 === 0) set(x, y, col.dim) })
      set(cx - 0.5, cy - R - 0.5 + 1, col.dim)
      if (!m) { disc(cx, cy + 1, 1, col.acc) }
      else {
        const L = (0.2 + (Math.min(25, m) / 25) * 0.8) * R, ux = (s.xwind ?? 0) / m, uy = -s.wind / m
        for (let t = 0; t <= 1.001; t += 0.5 / L) { const wd = (R > 10 ? 3 : 2.2) * (1 - t * 0.55), px = cx + ux * L * t, py = cy + uy * L * t; for (let a = -wd / 2; a <= wd / 2; a += 0.5) set(px - 0.5 - uy * a, py - 0.5 + ux * a, Math.floor(t * 5) % 2 ? col.white : col.acc) }
      }
      disc(cx, cy, 1.2, col.fg)
      Object.assign(geo, { cx, cy, R })
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
      if (!c && sk.off) c = sk.off
      if (!c) continue
      cx2.fillStyle = c
      cx2.globalAlpha = sk.dust ? 0.55 + hash(x * 31 + y * 7 + w.i) * 0.45 : 1
      if (sk.round) { cx2.beginPath(); cx2.arc((x + 0.5) * Q, (y + 0.5) * Q, Q * 0.38, 0, Math.PI * 2); cx2.fill() }
      else cx2.fillRect(x * Q, y * Q, Q - (Q > 4 ? 1 : 0), Q - (Q > 4 ? 1 : 0))
    }
    cx2.globalAlpha = 1
  }
  function paint(force) {
    if (!style) return
    const s = o.get(), C = o.colors(), big = !!PIXCTL[style]?.big
    if (force) for (const w of W) w.key = ''
    for (const w of W) paintOne(w, s, C, big)
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => paint(true)) : null
  for (const w of W) ro?.observe(w.cv)
  return {
    setStyle(n) { style = PIXCTL[n] ? n : 0; paint(true) },
    paint,
    // for the tests: each widget's box on screen, and where a value sits in it (k, a value or { wind, xwind }) as client coordinates
    boxes: () => Object.fromEntries(W.map((w) => { const r = w.cv.getBoundingClientRect(); return [w.k, [r.left, r.top, r.width, r.height]] })),
    pointFor(k, v) {
      const w = W.find((x) => x.k === k), g = w?.geo; if (!g) return null
      const r = w.cv.getBoundingClientRect(), P = pOf(r.height), cl = (x, y) => [r.left + x * P, r.top + y * P]
      if (k === 'la') return cl(g.cx + Math.cos(v * RAD) * 6, g.cy - Math.sin(v * RAD) * 6)
      if (k === 'dir') return cl(g.cx + Math.sin(v * RAD) * 6, g.cy - Math.cos(v * RAD) * 6)
      if (k === 'ev') { const a = Math.PI * (1 - (v - 60) / 65); return cl(g.cx + Math.cos(a) * g.rx * 0.8, g.cy - Math.sin(a) * g.ry * 0.8) }
      if (k === 'temp') { const f = (v - 40) / 60; return g.vert ? cl(r.width / P / 2, g.y0 - f * (g.y0 - g.y1)) : cl(g.x0 + f * (g.x1 - g.x0), r.height / P / 2) }
      if (k === 'wind') { const m = Math.hypot(v.wind, v.xwind), L = (0.2 + (m / 25) * 0.8) * g.R; return cl(g.cx + (v.xwind / m) * L, g.cy - (v.wind / m) * L) }
      return null
    },
  }
}
