// Character-art engine: turns a picture (a baked face tone map, or a vector drawing made on a canvas) into text in any of sixteen styles, so styles can be compared and chosen live.
// A "source" is {w, h, v (tone 0..1, bright = ink), a (alpha 0..1)}. The text is meant for a <pre> in DejaVu Sans Mono with line-height 1.2 (a character cell is then twice as tall as wide,
// and braille dots, half blocks and 2x2 blocks come out square). Braille packs 2 by 4 dots into a cell, half blocks 1 by 2, quadrant blocks 2 by 2, so they carry far more detail per character
// than a brightness ramp. Nothing here depends on the page, so it also runs under Node for a text preview.
export const ART_CSS = `
@font-face{font-family:DJV;src:url(/fonts/DejaVuSansMono.ttf)}
.art{font-family:DJV,'Segoe UI Symbol','Consolas',monospace;line-height:1.164;white-space:pre;letter-spacing:0;text-transform:none;margin:0;font-variant-ligatures:none}
.art.br{line-height:1.507}
`
const B64 = (s) => { const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a }
// rec.tone and rec.mask: a byte per pixel each; or rec.p (29 Oct): both packed in one byte, the tone in the high 4 bits and the mask in the low 4
export function faceSource(rec) {
  const n = rec.w * rec.h, v = new Float32Array(n), a = new Float32Array(n)
  if (rec.p) { const p = B64(rec.p); for (let i = 0; i < n; i++) { v[i] = ((p[i] >> 4) * 17) / 255; a[i] = ((p[i] & 15) * 17) / 255 } return { w: rec.w, h: rec.h, v, a } }
  const t = B64(rec.tone), m = B64(rec.mask)
  for (let i = 0; i < n; i++) { v[i] = t[i] / 255; a[i] = m[i] / 255 }
  return { w: rec.w, h: rec.h, v, a }
}
export function canvasSource(cv) { // a white-on-black drawing
  const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, n = cv.width * cv.height, v = new Float32Array(n)
  for (let i = 0; i < n; i++) v[i] = d[i * 4] / 255
  return { w: cv.width, h: cv.height, v, a: new Float32Array(n).fill(1) }
}
function resample(src, tw, th, maxPool = false) {
  const { w, h, v, a } = src, V = new Float32Array(tw * th), A = new Float32Array(tw * th)
  for (let y = 0; y < th; y++) {
    const y0 = (y * h) / th, y1 = ((y + 1) * h) / th
    for (let x = 0; x < tw; x++) {
      const x0 = (x * w) / tw, x1 = ((x + 1) * w) / tw
      let sv = 0, sa = 0, sw = 0
      for (let yy = Math.floor(y0); yy < Math.min(h, Math.ceil(y1)); yy++) {
        const wy = Math.min(yy + 1, y1) - Math.max(yy, y0)
        for (let xx = Math.floor(x0); xx < Math.min(w, Math.ceil(x1)); xx++) {
          const ww = (Math.min(xx + 1, x1) - Math.max(xx, x0)) * wy, i = yy * w + xx
          sv = maxPool ? Math.max(sv, v[i] * a[i]) : sv + v[i] * a[i] * ww; sa += a[i] * ww; sw += ww
        }
      }
      V[y * tw + x] = maxPool ? sv : sa > 1e-4 ? sv / sa : 0
      A[y * tw + x] = sw ? sa / sw : 0
    }
  }
  return { V, A }
}
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)
function enhanceCells(V, A, w, h, o) { // bring the features back after averaging down: stretch tone inside the mask, then sharpen at the cell scale
  if (!o) return V
  if (o.stretch) { const vals = []; for (let i = 0; i < V.length; i++) if (A[i] > 0.5) vals.push(V[i]); vals.sort((a, b) => a - b); if (vals.length > 20) { const lo = vals[Math.floor(vals.length * (o.lo ?? 0.04))], hi = vals[Math.floor(vals.length * (o.hi ?? 0.97))]; V = V.map((x, i) => (A[i] > 0.5 ? clamp01((x - lo) / Math.max(hi - lo, 1e-3)) : 0)) } }
  if (o.k) { const B = boxBlur(V, w, h, Math.max(1, Math.round(w / (o.sigma ?? 22)))); V = V.map((x, i) => (A[i] > 0.5 ? clamp01(x + o.k * (x - B[i])) : 0)) }
  return V
}
function tone(V, o) { const g = o.gamma ?? 1, c = o.contrast ?? 1, b = o.bright ?? 0; return V.map((x) => Math.pow(clamp01((x - 0.5) * c + 0.5 + b), g)) }
// ---- binary methods on a pixel grid --------------------------------------------------------------------------------------------------------------------------
function floyd(V, A, w, h, levels = 2) { // returns an integer level per pixel (0 .. levels-1); pixels with alpha under 0.5 stay 0 and take no error
  const e = Float32Array.from(V), out = new Uint8Array(w * h), L = levels - 1
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x
    if (A[i] < 0.5) continue
    const old = clamp01(e[i]), q = Math.round(old * L) / L, err = old - q
    out[i] = Math.round(q * L)
    const push = (dx, dy, k) => { const xx = x + dx, yy = y + dy; if (xx >= 0 && xx < w && yy < h && A[yy * w + xx] >= 0.5) e[yy * w + xx] += err * k }
    push(1, 0, 7 / 16); push(-1, 1, 3 / 16); push(0, 1, 5 / 16); push(1, 1, 1 / 16)
  }
  return out
}
const BAYER = (() => { let m = [[0, 2], [3, 1]]; for (let k = 0; k < 2; k++) { const n = m.length, r = Array.from({ length: n * 2 }, () => Array(n * 2)); for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const v = m[y][x] * 4; r[y][x] = v; r[y][x + n] = v + 2; r[y + n][x] = v + 3; r[y + n][x + n] = v + 1 } m = r } return m })()
function bayer(V, A, w, h, levels = 2) { const out = new Uint8Array(w * h), L = levels - 1; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (A[i] < 0.5) continue; const t = (BAYER[y % 8][x % 8] + 0.5) / 64; out[i] = Math.min(L, Math.floor(V[i] * L + t)) } return out }
function boxBlur(V, w, h, r) { const out = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, n = 0; for (let yy = Math.max(0, y - r); yy <= Math.min(h - 1, y + r); yy++) for (let xx = Math.max(0, x - r); xx <= Math.min(w - 1, x + r); xx++) { s += V[yy * w + xx]; n++ } out[y * w + x] = s / n } return out }
function sobel(E, w, h) { const gx = new Float32Array(w * h), gy = new Float32Array(w * h), m = new Float32Array(w * h), at = (x, y) => E[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))]; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const a = at(x - 1, y - 1), b = at(x, y - 1), c = at(x + 1, y - 1), d = at(x - 1, y), f = at(x + 1, y), g = at(x - 1, y + 1), hh = at(x, y + 1), i2 = at(x + 1, y + 1); const sx = c + 2 * f + i2 - a - 2 * d - g, sy = g + 2 * hh + i2 - a - 2 * b - c; gx[y * w + x] = sx; gy[y * w + x] = sy; m[y * w + x] = Math.hypot(sx, sy) } return { gx, gy, m } }
function thresh(V, A, w, h, o) { const mean = boxBlur(V, w, h, o.r ?? 3), out = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) out[i] = A[i] >= 0.5 && V[i] > mean[i] * (o.bias ?? 1.04) + (o.c ?? 0.02) ? 1 : 0; return out }
function edges(V, A, w, h, o) { // silhouette plus interior edges, with a light tone fill so dark areas read as dark
  const E = V.map((x, i) => 0.7 * x + 0.5 * A[i]), { m } = sobel(boxBlur(E, w, h, 0), w, h), sorted = Float32Array.from(m).sort(), t = sorted[Math.floor(sorted.length * (o.pct ?? 0.84))] * (o.k ?? 1)
  const fill = o.fill ? floyd(V.map((x) => x * o.fill), A, w, h) : null, out = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) out[i] = m[i] > t || (fill && fill[i]) ? 1 : 0
  return out
}
// ---- glyph packers ---------------------------------------------------------------------------------------------------------------------------------------------
const BR = [[1, 8], [2, 16], [4, 32], [64, 128]] // [dy][dx]
function pack(bits, w, h, cw, ch, map) { const lines = []; for (let cy = 0; cy < h / ch; cy++) { let s = ''; for (let cx = 0; cx < w / cw; cx++) s += map((dx, dy) => (bits[(cy * ch + dy) * w + cx * cw + dx] ? 1 : 0)); lines.push(s) } return lines }
const braille = (bits, w, h) => pack(bits, w, h, 2, 4, (p) => { let c = 0; for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 2; dx++) if (p(dx, dy)) c |= BR[dy][dx]; return String.fromCharCode(0x2800 + c) })
const half = (bits, w, h) => pack(bits, w, h, 1, 2, (p) => (p(0, 0) ? (p(0, 1) ? '█' : '▀') : p(0, 1) ? '▄' : ' '))
const QUAD = ' ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█'
const quad = (bits, w, h) => pack(bits, w, h, 2, 2, (p) => QUAD[(p(0, 0) ? 1 : 0) | (p(1, 0) ? 2 : 0) | (p(0, 1) ? 4 : 0) | (p(1, 1) ? 8 : 0)])
function chars(levels, w, h, set) { const lines = []; for (let y = 0; y < h; y++) { let s = ''; for (let x = 0; x < w; x++) s += set[levels[y * w + x]]; lines.push(s) } return lines }
// ---- the styles ------------------------------------------------------------------------------------------------------------------------------------------------
// cw, ch: pixels per character cell. Pixel aspect (height over width) is 2 * cw / ch with a cell twice as tall as wide.
export const STYLES = [
  { id: 'ramp', name: 'RAMP', note: 'brightness ramp, no dither (the old look)', cw: 1, ch: 1, run: ({ V, A, w, h }) => chars(V.map((x, i) => (A[i] < 0.5 ? 0 : Math.min(9, Math.floor(x * 9.99)))), w, h, ' .:-=+*#%@') },
  { id: 'ramp-fs', name: 'RAMP DITHER', note: 'six-glyph ramp with error diffusion', cw: 1, ch: 1, run: ({ V, A, w, h }) => chars(floyd(V, A, w, h, 6), w, h, ' .:+*#') },
  { id: 'shade', name: 'SHADE BLOCKS', note: 'four shade blocks, dithered', cw: 1, ch: 1, run: ({ V, A, w, h }) => chars(floyd(V, A, w, h, 4), w, h, ' ░▒█') },
  { id: 'stipple', name: 'STIPPLE', note: 'sparse dots and colons, airy', cw: 1, ch: 1, gamma: 1.15, run: ({ V, A, w, h }) => chars(floyd(V, A, w, h, 3), w, h, " .:") },
  { id: 'dotmatrix', name: 'DOT MATRIX', note: 'o on a grid, like the concept sheets', cw: 0.5, ch: 1, aspect: 1, dm: true, run: ({ V, A, w, h }) => { const b = floyd(V, A, w, h, 2), out = []; for (let y = 0; y < h; y++) { let s = ''; for (let x = 0; x < w; x++) s += b[y * w + x] ? 'o ' : '  '; out.push(s.replace(/\s+$/, '')) } return out } },
  { id: 'lineart', name: 'LINE ART', note: 'edge glyphs / \\ | - over a dotted tone', cw: 2, ch: 2, run: ({ V, A, w, h }) => { const E = V.map((x, i) => 0.7 * x + 0.5 * A[i]), { gx, gy, m } = sobel(E, w, h), s = Float32Array.from(m).sort(), t = s[Math.floor(s.length * 0.8)], lines = []; for (let cy = 0; cy < h / 2; cy++) { let row = ''; for (let cx = 0; cx < w / 2; cx++) { let sx = 0, sy = 0, mm = 0, tn = 0, al = 0; for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const i = (cy * 2 + dy) * w + cx * 2 + dx; sx += gx[i]; sy += gy[i]; mm += m[i]; tn += V[i]; al += A[i] } mm /= 4; tn /= 4; if (al < 2) { row += ' '; continue } if (mm > t) { const ang = ((Math.atan2(sy, sx) * 180) / Math.PI + 180 + 90) % 180; row += ang < 22.5 || ang >= 157.5 ? '-' : ang < 67.5 ? '/' : ang < 112.5 ? '|' : '\\' } else row += tn > 0.62 ? ':' : tn > 0.4 ? '.' : ' ' } lines.push(row) } return lines } },
  { id: 'half-fs', name: 'HALF BLOCKS', note: 'half blocks, error diffusion', cw: 1, ch: 2, run: ({ V, A, w, h }) => half(floyd(V, A, w, h), w, h) },
  { id: 'half-bayer', name: 'HALF ORDERED', note: 'half blocks, ordered dither (a screen-print look)', cw: 1, ch: 2, run: ({ V, A, w, h }) => half(bayer(V, A, w, h), w, h) },
  { id: 'quad-fs', name: 'QUAD BLOCKS', note: '2 by 2 blocks, error diffusion', cw: 2, ch: 2, run: ({ V, A, w, h }) => quad(floyd(V, A, w, h), w, h) },
  { id: 'quad-edge', name: 'QUAD EDGES', note: '2 by 2 blocks on edges plus faint fill', cw: 2, ch: 2, run: ({ V, A, w, h }) => quad(edges(V, A, w, h, { fill: 0.35, pct: 0.85 }), w, h) },
  { id: 'braille-fs', name: 'BRAILLE DITHER', note: 'braille dots, error diffusion (finest tone)', cw: 2, ch: 4, run: ({ V, A, w, h }) => braille(floyd(V, A, w, h), w, h) },
  { id: 'braille-bayer', name: 'BRAILLE ORDERED', note: 'braille dots, ordered dither', cw: 2, ch: 4, run: ({ V, A, w, h }) => braille(bayer(V, A, w, h), w, h) },
  { id: 'braille-thresh', name: 'BRAILLE WOODCUT', note: 'adaptive threshold, high contrast', cw: 2, ch: 4, run: ({ V, A, w, h }) => braille(thresh(V, A, w, h, { r: 3, bias: 1.06, c: 0.03 }), w, h) },
  { id: 'braille-edge', name: 'BRAILLE EDGES', note: 'outline plus a light tone fill', cw: 2, ch: 4, run: ({ V, A, w, h }) => braille(edges(V, A, w, h, { fill: 0.4, pct: 0.86 }), w, h) },
  { id: 'braille-line', name: 'BRAILLE LINES', note: 'outline only, like a pen drawing', cw: 2, ch: 4, run: ({ V, A, w, h }) => braille(edges(V, A, w, h, { pct: 0.8 }), w, h) },
  { id: 'braille-poster', name: 'BRAILLE POSTER', note: 'dither after a hard contrast stretch', cw: 2, ch: 4, contrast: 1.7, gamma: 0.85, run: ({ V, A, w, h }) => braille(floyd(V, A, w, h), w, h) },
  { id: 'dots-braille', name: 'DOT SNAP BRAILLE', note: 'every source dot becomes a braille dot (for dotted drawings)', cw: 2, ch: 4, max: true, dots: true, run: ({ V, A, w, h }) => braille(V.map((x) => (x > 0.32 ? 1 : 0)), w, h) },
  { id: 'dots-quad', name: 'DOT SNAP QUAD', note: 'every source dot becomes a 2 by 2 block', cw: 2, ch: 2, max: true, dots: true, run: ({ V, A, w, h }) => quad(V.map((x) => (x > 0.32 ? 1 : 0)), w, h) },
  { id: 'dots-half', name: 'DOT SNAP HALF', note: 'half blocks from the dots', cw: 1, ch: 2, max: true, dots: true, run: ({ V, A, w, h }) => half(V.map((x) => (x > 0.32 ? 1 : 0)), w, h) },
  { id: 'dots-o', name: 'DOT SNAP o', note: 'a lowercase o per dot, like the concept sheets', cw: 0.5, ch: 1, aspect: 1, max: true, dots: true, run: ({ V, A, w, h }) => { const out = []; for (let y = 0; y < h; y++) { let r = ''; for (let x = 0; x < w; x++) r += V[y * w + x] > 0.32 ? 'o ' : '  '; out.push(r.replace(/\s+$/, '')) } return out } },
  { id: 'dots-dot', name: 'DOT SNAP .', note: 'a period per dot, airy', cw: 0.5, ch: 1, aspect: 1, max: true, dots: true, run: ({ V, A, w, h }) => { const out = []; for (let y = 0; y < h; y++) { let r = ''; for (let x = 0; x < w; x++) r += V[y * w + x] > 0.32 ? '\u2022 ' : '  '; out.push(r.replace(/\s+$/, '')) } return out } },
]
// Renders a source at a width in characters. Returns {lines, cols, rows}.
export function renderArt(src, style, cols, o = {}) {
  const st = typeof style === 'string' ? STYLES.find((x) => x.id === style) : style
  const cw = st.cw, ch = st.ch, aspect = st.aspect ?? (2 * cw) / ch
  const PW = Math.max(2, Math.round(cols * cw)), rows = Math.max(1, Math.round((PW * (src.h / src.w)) / aspect / ch)), PH = rows * ch
  let { V, A } = resample(src, PW, PH, !!st.max)
  V = enhanceCells(V, A, PW, PH, o.enh)
  V = tone(V, { gamma: o.gamma ?? st.gamma, contrast: o.contrast ?? st.contrast, bright: o.bright })
  const lines = st.run({ V, A, w: PW, h: PH })
  return { lines, cols, rows: lines.length }
}

// ---- the batter, drawn as a vector figure on a canvas, then converted like any other picture --------------------------------------------------------------------
// Side view, the pitcher to the right. Joints are in a 300 by 330 canvas (ground at y 312). Poses: stance, load, contact (bat along the attack angle through the ball), follow-through.
const J = {
  stance: { head: [98, 80], neck: [100, 104], hip: [96, 180], kB: [82, 240], aB: [70, 304], kF: [112, 240], aF: [128, 304], shB: [98, 110], shF: [104, 112], elB: [88, 140], elF: [94, 142], hand: [84, 104], bat: 105 },
  load: { head: [94, 80], neck: [96, 104], hip: [90, 180], kB: [74, 238], aB: [64, 304], kF: [112, 226], aF: [120, 282], shB: [94, 110], shF: [100, 112], elB: [82, 138], elF: [88, 140], hand: [70, 100], bat: 115 },
  contact: { head: [118, 82], neck: [116, 104], hip: [104, 182], kB: [96, 248], aB: [72, 296], kF: [128, 244], aF: [142, 304], shB: [114, 112], shF: [120, 114], elB: [142, 140], elF: [150, 130], hand: [182, 150], bat: null },
  follow: { head: [112, 84], neck: [110, 106], hip: [106, 184], kB: [98, 252], aB: [78, 298], kF: [124, 246], aF: [138, 304], shB: [108, 112], shF: [114, 114], elB: [128, 116], elF: [124, 108], hand: [98, 92], bat: 150 },
}
const SEQ = ['stance', 'load', 'contact', 'follow']
const lerp = (a, b, t) => a + (b - a) * t
function pose(t, aa) {
  const n = SEQ.length - 1, k = Math.min(n - 1, Math.floor(t * n)), u = t * n - k, A = J[SEQ[k]], B = J[SEQ[k + 1]], P = {}
  for (const key of Object.keys(A)) { if (key === 'bat') continue; P[key] = [lerp(A[key][0], B[key][0], u), lerp(A[key][1], B[key][1], u)] }
  const ang = (s) => (J[s].bat == null ? aa : J[s].bat)
  P.batAng = lerp(ang(SEQ[k]), ang(SEQ[k + 1]), u)
  return P
}
export const BAT_LEN = 108
export function contactPoint(aa) { const P = pose(2 / 3, aa), r = (aa * Math.PI) / 180; return [P.hand[0] + (BAT_LEN - 6) * Math.cos(r), P.hand[1] - (BAT_LEN - 6) * Math.sin(r)] }
function limb(ctx, a, b, ra, rb) { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L; ctx.beginPath(); ctx.moveTo(a[0] + nx * ra, a[1] + ny * ra); ctx.lineTo(b[0] + nx * rb, b[1] + ny * rb); ctx.lineTo(b[0] - nx * rb, b[1] - ny * rb); ctx.lineTo(a[0] - nx * ra, a[1] - ny * ra); ctx.closePath(); ctx.fill(); ctx.stroke(); for (const [p, r] of [[a, ra], [b, rb]]) { ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 7); ctx.fill() } }
// opts: t (0 stance .. 1 follow-through), aa (attack angle, degrees), hand 'R' or 'L', rays {la, vaa} to draw the pitch and the ball path from the contact point, w, h, lw (line weight scale)
export function drawBatter(opts = {}) {
  const w = opts.w ?? 300, h = opts.h ?? 330, cv = typeof document !== 'undefined' ? document.createElement('canvas') : null
  if (!cv) return null
  cv.width = w; cv.height = h
  const ctx = cv.getContext('2d'), P = pose(opts.t ?? 2 / 3, opts.aa ?? 12), left = opts.hand === 'L'
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h)
  ctx.save()
  if (left) { ctx.translate(opts.mirrorW ?? 300, 0); ctx.scale(-1, 1) }
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'
  limb(ctx, P.hip, P.kB, 19, 13); limb(ctx, P.kB, P.aB, 13, 8.5); ctx.beginPath(); ctx.ellipse(P.aB[0] + 8, P.aB[1] + 4, 21, 8.5, 0, 0, 7); ctx.fill(); ctx.stroke()
  limb(ctx, P.shB, P.elB, 10.5, 8); limb(ctx, P.elB, P.hand, 8, 6)
  limb(ctx, P.hip, P.neck, 19, 22) // torso
  limb(ctx, P.hip, P.kF, 20, 14); limb(ctx, P.kF, P.aF, 14, 9); ctx.beginPath(); ctx.ellipse(P.aF[0] + 9, P.aF[1] + 4, 22, 9, 0, 0, 7); ctx.fill(); ctx.stroke()
  limb(ctx, P.neck, [P.head[0] - 1, P.head[1] + 12], 9, 8)
  ctx.beginPath(); ctx.arc(P.head[0], P.head[1], 19, 0, 7); ctx.fill(); ctx.stroke() // head
  ctx.beginPath(); ctx.arc(P.head[0] - 1, P.head[1] - 3, 22, Math.PI * 0.92, Math.PI * 2.06); ctx.lineTo(P.head[0] + 31, P.head[1] - 3); ctx.lineTo(P.head[0] + 19, P.head[1] + 4); ctx.closePath(); ctx.fill(); ctx.stroke() // helmet and brim
  ctx.beginPath(); ctx.arc(P.head[0] - 7, P.head[1] + 5, 11, 0, 7); ctx.fill(); ctx.stroke() // ear flap
  limb(ctx, P.shF, P.elF, 11.5, 9); limb(ctx, P.elF, P.hand, 9, 7)
  const r = (P.batAng * Math.PI) / 180, tip = [P.hand[0] + BAT_LEN * Math.cos(r), P.hand[1] - BAT_LEN * Math.sin(r)], knob = [P.hand[0] - 10 * Math.cos(r), P.hand[1] + 10 * Math.sin(r)]
  limb(ctx, knob, tip, 4, 9) // the bat: thin handle, fat barrel
  ctx.restore()
  if (opts.rays) {
    const O = contactPoint(opts.aa ?? 12), px = left ? (opts.mirrorW ?? 300) - O[0] : O[0], py = O[1], dir = left ? -1 : 1
    ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'
    const ray = (deg, len, dash, wd) => { ctx.setLineDash(dash); ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + dir * len * Math.cos((deg * Math.PI) / 180), py - len * Math.sin((deg * Math.PI) / 180)); ctx.stroke(); ctx.setLineDash([]) }
    { const a0 = opts.aa ?? 12, a1 = opts.rays.la, R0 = (opts.rays.len ?? 130) * 0.82; ctx.fillStyle = 'rgba(255,255,255,0.32)'; ctx.beginPath(); ctx.moveTo(px, py); for (let k = 0; k <= 24; k++) { const a = ((a0 + ((a1 - a0) * k) / 24) * Math.PI) / 180; ctx.lineTo(px + dir * R0 * Math.cos(a), py - R0 * Math.sin(a)) } ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff' } // the gap
    ray(-(opts.rays.vaa ?? -6), (opts.rays.len ?? 130) * 1.1, [7, 6], 2.4) // the incoming pitch, dashed (derived)
    ray(opts.rays.la, opts.rays.len ?? 130, [], 5) // the ball leaving
    ctx.beginPath(); ctx.arc(px, py, 6, 0, 7); ctx.fill()
  }
  return canvasSource(cv)
}

// A generic head and shoulders for any player without a baked portrait, drawn like the batter and converted like any other picture.
// (31 Oct: drawn once per size and kept; reading its pixels back cost 100 ms and more on every beat of the dojo)
const bustMemo = new Map()
export function drawBust(size = 160) {
  if (bustMemo.has(size)) return bustMemo.get(size)
  const cv = typeof document !== 'undefined' ? document.createElement('canvas') : null
  if (!cv) return null
  cv.width = size; cv.height = size
  const ctx = cv.getContext('2d'), k = size / 160
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2.4 * k; ctx.lineJoin = 'round'
  const shape = (f) => { ctx.beginPath(); f(); ctx.fill(); ctx.stroke() }
  shape(() => { ctx.moveTo(8 * k, 160 * k); ctx.quadraticCurveTo(14 * k, 112 * k, 58 * k, 104 * k); ctx.lineTo(102 * k, 104 * k); ctx.quadraticCurveTo(146 * k, 112 * k, 152 * k, 160 * k); ctx.closePath() }) // shoulders
  shape(() => ctx.rect(66 * k, 84 * k, 28 * k, 28 * k)) // neck
  shape(() => ctx.ellipse(80 * k, 66 * k, 31 * k, 38 * k, 0, 0, 7)) // head
  shape(() => { ctx.arc(80 * k, 52 * k, 36 * k, Math.PI * 1.02, Math.PI * 1.98); ctx.lineTo(128 * k, 52 * k); ctx.lineTo(48 * k, 52 * k); ctx.closePath() }) // cap crown
  shape(() => { ctx.moveTo(78 * k, 50 * k); ctx.lineTo(134 * k, 54 * k); ctx.lineTo(128 * k, 61 * k); ctx.lineTo(78 * k, 58 * k); ctx.closePath() }) // brim
  ctx.fillStyle = '#000'; for (const dx of [-12, 12]) { ctx.beginPath(); ctx.ellipse((80 + dx) * k, 70 * k, 4 * k, 2.6 * k, 0, 0, 7); ctx.fill() } // eyes
  ctx.fillRect(70 * k, 88 * k, 20 * k, 1.8 * k) // mouth line
  const src = canvasSource(cv); bustMemo.set(size, src)
  return src
}

export function loadPng(dataUrl) {
  return new Promise((resolve) => {
    const im = new Image()
    im.onload = () => { const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; const ctx = cv.getContext('2d'); ctx.drawImage(im, 0, 0); resolve(canvasSource(cv)) }
    im.onerror = () => resolve(null)
    im.src = dataUrl
  })
}

// Braille glyphs are wider than letters in DejaVu Sans Mono, so braille styles need their own line height to keep dots square (see .art.br). cellH is the line height in em, cellW the advance in em.
export const isBraille = (st) => /braille/.test(typeof st === 'string' ? st : st.id)
export const artMetrics = (st) => (isBraille(st) ? { cls: 'art br', w: 0.753, h: 1.507 } : { cls: 'art', w: 0.602, h: 1.164 })
