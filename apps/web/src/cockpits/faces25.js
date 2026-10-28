// Study 25 faces drawn on a canvas at the screen's own resolution (28 Oct, Andrew: "make it poster with this higher res ... is there any middle ground where it still
// looks hand drawn but keeps the fidelity?"). The text styles (braille and the rest, art.js) are capped by the smallest legible character, about 2.5 screen pixels a
// dot; these draw a dot, a hatch line or a wash every 1.5 pixels or so. The ceiling is now the baked tone map (160 by 160, from 426 by 640 headshots).
// A source is art.js's {w, h, v (tone, bright = ink), a (alpha)}; ink is drawn in the text color on the panel's dark ground, washes in the accent.
//   poster: dots after a hard contrast stretch and error diffusion (A2's look, finer)   hedcut: stipple dots sized by tone, with fine contour lines
//   hatch: pen hatching in three directions, denser where darker   wash: a contour line over two flat washes of the accent   pen: contour lines with a single hatch in the darks
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)
function sampler(src) {
  const { w, h, v, a } = src
  const at = (arr, x, y) => { x = Math.max(0, Math.min(w - 1.001, x)); y = Math.max(0, Math.min(h - 1.001, y)); const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, i = y0 * w + x0; return arr[i] * (1 - fx) * (1 - fy) + arr[i + 1] * fx * (1 - fy) + arr[i + w] * (1 - fx) * fy + arr[i + w + 1] * fx * fy }
  return { V: (x, y) => at(v, x, y), A: (x, y) => at(a, x, y) }
}
// tone stretched inside the mask (2nd to 97th percentile), like the text styles' "stretch"
function stretch(src) {
  const vals = []
  for (let i = 0; i < src.v.length; i++) if (src.a[i] > 0.5) vals.push(src.v[i])
  vals.sort((x, y) => x - y)
  if (vals.length < 20) return src
  const lo = vals[Math.floor(vals.length * 0.03)], hi = vals[Math.floor(vals.length * 0.97)]
  return { ...src, v: src.v.map((x, i) => (src.a[i] > 0.5 ? clamp01((x - lo) / Math.max(1e-3, hi - lo)) : 0)) }
}
function sobelMag(src) {
  const { w, h, v, a } = src, m = new Float32Array(w * h), E = (x, y) => { x = Math.max(0, Math.min(w - 1, x)); y = Math.max(0, Math.min(h - 1, y)); const i = y * w + x; return 0.7 * v[i] + 0.5 * a[i] }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const sx = E(x + 1, y - 1) + 2 * E(x + 1, y) + E(x + 1, y + 1) - E(x - 1, y - 1) - 2 * E(x - 1, y) - E(x - 1, y + 1), sy = E(x - 1, y + 1) + 2 * E(x, y + 1) + E(x + 1, y + 1) - E(x - 1, y - 1) - 2 * E(x, y - 1) - E(x + 1, y - 1); m[y * w + x] = Math.hypot(sx, sy) }
  const s = Float32Array.from(m).sort()
  return { m, t: (p) => s[Math.floor(s.length * p)] }
}
export const FACE_STYLES = {
  poster: { name: 'POSTER', note: 'the A2 poster, drawn a dot every 1.5 pixels instead of a braille character every 2.5' },
  hedcut: { name: 'HEDCUT', note: 'stipple dots sized by tone, with fine contour lines, like a newspaper portrait drawing' },
  hatch: { name: 'CROSS-HATCH', note: 'pen hatching in three directions, denser where darker, a little wobble in the line' },
  wash: { name: 'INK AND WASH', note: 'a contour line over two flat washes of the team color' },
  pen: { name: 'PEN AND INK', note: 'contour lines with a single hatch in the darks, your pick from the first ten, finer' },
}
// draws src into canvas cv, filling a W by H css-pixel box (square source, centered); col = { ink, acc }; ratio: device pixels per css pixel (the screen's by default)
export function drawFace(cv, src0, style, W, H, col, ratio = null) {
  const dpr = ratio ?? Math.min(2, window.devicePixelRatio || 1), S = Math.max(40, Math.floor(Math.min(W, H)))
  cv.width = Math.round(S * dpr); cv.height = Math.round(S * dpr); cv.style.width = S + 'px'; cv.style.height = S + 'px'
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, S, S)
  const src = stretch(src0), { V, A } = sampler(src), k = src.w / S // source pixels per css pixel
  const tv = (x, y) => V(x * k, y * k), ta = (x, y) => A(x * k, y * k)
  let ink = 0
  const dot = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); ink++ }
  const edgeDots = (pct, r, c, step = 1) => { const { m, t } = sobelMag(src), th = t(pct); for (let y = 0; y < S; y += step) for (let x = 0; x < S; x += step) { const i = Math.floor(y * k) * src.w + Math.floor(x * k); if (ta(x, y) > 0.5 && m[i] > th) dot(x, y, r, c) } }
  if (style === 'poster') {
    const P = 1.5, n = Math.floor(S / P), e = new Float32Array(n * n)
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) e[j * n + i] = Math.pow(clamp01((tv(i * P, j * P) - 0.5) * 1.7 + 0.5), 0.85)
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const q = j * n + i
      if (ta(i * P, j * P) < 0.5) continue
      const on = e[q] >= 0.5, err = e[q] - (on ? 1 : 0)
      if (on) dot(i * P + P / 2, j * P + P / 2, P * 0.42, col.ink)
      if (i + 1 < n) e[q + 1] += (err * 7) / 16
      if (j + 1 < n) { if (i > 0) e[q + n - 1] += (err * 3) / 16; e[q + n] += (err * 5) / 16; if (i + 1 < n) e[q + n + 1] += err / 16 }
    }
  } else if (style === 'hedcut') {
    const P = 2.6
    for (let j = 0, y = 0; y < S; j++, y += P * 0.866) for (let x = (j % 2) * P * 0.5; x < S; x += P) { if (ta(x, y) < 0.5) continue; const v = tv(x, y), r = P * 0.55 * Math.sqrt(clamp01((v - 0.12) / 0.88)); if (r > 0.25) dot(x, y, r, col.ink) }
    edgeDots(0.9, 0.45, col.ink)
  } else if (style === 'hatch' || style === 'pen') {
    // each pass: parallel lines at an angle, stroked only where the tone is past that pass's level
    const passes = style === 'hatch' ? [[Math.PI / 4, 0.28, 3.2], [-Math.PI / 4, 0.52, 3.2], [0, 0.74, 2.6]] : [[Math.PI / 4, 0.62, 2.8]]
    g.strokeStyle = col.ink; g.lineWidth = style === 'hatch' ? 0.75 : 0.7; g.lineCap = 'round'
    for (const [ang, lvl, gap] of passes) {
      const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux, D = S * 1.5
      for (let o = -D; o < D; o += gap) {
        let run = false
        g.beginPath()
        for (let s = -D; s < D; s += 1) {
          const wob = Math.sin((s + o * 3.1) * 0.21) * 0.35, x = S / 2 + ux * s + nx * (o + wob), y = S / 2 + uy * s + ny * (o + wob)
          const inside = x >= 0 && y >= 0 && x < S && y < S && ta(x, y) > 0.5 && tv(x, y) > lvl
          if (inside && !run) { g.moveTo(x, y); run = true } else if (inside) { g.lineTo(x, y); ink++ } else run = false
        }
        g.stroke()
      }
    }
    edgeDots(style === 'pen' ? 0.8 : 0.9, style === 'pen' ? 0.55 : 0.4, col.ink)
  } else if (style === 'wash') {
    const P = 1.5
    for (let y = 0; y < S; y += P) for (let x = 0; x < S; x += P) { if (ta(x, y) < 0.5) continue; const v = tv(x, y); if (v > 0.4) { g.globalAlpha = v > 0.72 ? 0.75 : 0.3; g.fillStyle = col.acc; g.fillRect(x, y, P, P); ink++ } }
    g.globalAlpha = 1
    edgeDots(0.82, 0.55, col.ink)
  }
  return { size: S, ink }
}
