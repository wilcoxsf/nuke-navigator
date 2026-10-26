// The shaded mannequin batter for the swing diagram (science/mannequin_swing.py): one PNG per attack angle (red tone, green ink lines, blue mask) in /batter_swing/, turned into a picture source for art.js
// like any other drawing. Same arguments and the same pitch and ball rays as drawBatter() in art.js, so the page can switch between them. Frames between two attack angles are blended.
import { canvasSource } from './art.js'

let IDX = null
const FR = {} // attack angle -> {tone, ink, mask Float32Array copies, w, h}
const loadImg = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src })

export async function loadBatter3d() {
  if (IDX) return true
  try {
    const r = await fetch('/batter_swing/index.json')
    if (!r.ok) return false
    const idx = await r.json()
    for (const [aa, f] of Object.entries(idx.frames)) {
      const im = await loadImg('/batter_swing/' + f.file)
      if (!im) return false
      const cv = document.createElement('canvas')
      cv.width = im.width; cv.height = im.height
      const ctx = cv.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(im, 0, 0)
      const d = ctx.getImageData(0, 0, im.width, im.height).data, n = im.width * im.height, tone = new Float32Array(n), ink = new Float32Array(n)
      for (let i = 0; i < n; i++) { tone[i] = d[i * 4] / 255; ink[i] = d[i * 4 + 1] / 255 }
      FR[aa] = { tone, ink, w: im.width, h: im.height, contact: f.contact }
    }
    IDX = idx
    return true
  } catch { return false }
}

// opts: aa (attack angle, degrees), hand 'R' or 'L', w, h, mirrorW (as drawBatter), rays {la, vaa, len}
export function batter3dSource(opts = {}) {
  if (!IDX || typeof document === 'undefined') return null
  const keys = Object.keys(FR).map(Number).sort((a, b) => a - b), aa = Math.max(keys[0], Math.min(keys[keys.length - 1], opts.aa ?? 12))
  let lo = keys[0], hi = keys[keys.length - 1]
  for (const k of keys) { if (k <= aa) lo = k; if (k >= aa) { hi = k; break } }
  const u = hi === lo ? 0 : (aa - lo) / (hi - lo), A = FR[lo], B = FR[hi], w = opts.w ?? 520, h = opts.h ?? 330, left = opts.hand === 'L'
  // the blended picture on an offscreen canvas at its own size: grey = half the tone plus the ink lines
  const off = document.createElement('canvas')
  off.width = A.w; off.height = A.h
  const octx = off.getContext('2d'), img = octx.createImageData(A.w, A.h)
  for (let i = 0; i < A.w * A.h; i++) {
    const t = A.tone[i] * (1 - u) + B.tone[i] * u, k = A.ink[i] * (1 - u) + B.ink[i] * u, g = Math.round(255 * Math.min(1, 0.5 * t + k))
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = g; img.data[i * 4 + 3] = 255
  }
  octx.putImageData(img, 0, 0)
  const cv = document.createElement('canvas')
  cv.width = w; cv.height = h
  const ctx = cv.getContext('2d')
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h)
  const s = h / A.h, ox = 4
  ctx.save()
  if (left) { ctx.translate(opts.mirrorW ?? w, 0); ctx.scale(-1, 1) }
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(off, ox, 0, A.w * s, h)
  ctx.restore()
  if (opts.rays) {
    const cx0 = A.contact[0] * (1 - u) + B.contact[0] * u, cy0 = A.contact[1] * (1 - u) + B.contact[1] * u
    const X = ox + cx0 * s, px = left ? (opts.mirrorW ?? w) - X : X, py = cy0 * s, dir = left ? -1 : 1
    const a0 = aa, a1 = opts.rays.la, len = opts.rays.len ?? 130
    ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'
    const ray = (deg, l, dash, wd) => { ctx.setLineDash(dash); ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + dir * l * Math.cos((deg * Math.PI) / 180), py - l * Math.sin((deg * Math.PI) / 180)); ctx.stroke(); ctx.setLineDash([]) }
    ctx.fillStyle = 'rgba(255,255,255,0.32)'; ctx.beginPath(); ctx.moveTo(px, py)
    for (let k = 0; k <= 24; k++) { const a = ((a0 + ((a1 - a0) * k) / 24) * Math.PI) / 180; ctx.lineTo(px + dir * len * 0.82 * Math.cos(a), py - len * 0.82 * Math.sin(a)) }
    ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff' // the gap between attack angle and launch angle
    ray(-(opts.rays.vaa ?? -6), len * 1.1, [7, 6], 2.4) // the incoming pitch, dashed (derived)
    ray(opts.rays.la, len, [], 5) // the ball leaving
    ctx.beginPath(); ctx.arc(px, py, 6, 0, 7); ctx.fill()
  }
  return canvasSource(cv)
}

// ---- generic faces for batters with no photo: ?generic=composite (averages of the real headshots) or ?generic=bust (invented 3D busts); the same player id always gets the same face ----
const GEN = {}
const B64 = (s) => { const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a }
export async function loadGenericFaces(kind) {
  try {
    const r = await fetch(kind === 'bust' ? '/batter_bust.json' : '/generic_faces.json')
    if (!r.ok) return false
    const j = await r.json()
    GEN[kind] = kind === 'bust' ? j.variants : j.faces.filter((f) => f.id !== 'P0')
    return GEN[kind].length > 0
  } catch { return false }
}
// returns {src, style, enh} for the art.js renderer, or null when that kind is not loaded
export function genericFace(kind, id) {
  const list = GEN[kind]
  if (!list?.length) return null
  let h = 2166136261
  for (const ch of String(id)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) }
  const rec = list[(h >>> 0) % list.length], n = rec.w * rec.h, t = B64(rec.tone), m = B64(rec.mask), v = new Float32Array(n), a = new Float32Array(n)
  if (kind === 'bust') { const k = B64(rec.ink); for (let i = 0; i < n; i++) { v[i] = Math.min(1, (0.5 * t[i]) / 255 + k[i] / 255); a[i] = m[i] / 255 } return { src: { w: rec.w, h: rec.h, v, a }, style: 'braille-edge', enh: { stretch: true, k: 0.4 } } }
  for (let i = 0; i < n; i++) { v[i] = t[i] / 255; a[i] = m[i] / 255 }
  return { src: { w: rec.w, h: rec.h, v, a }, style: null, enh: { stretch: true, k: 1.5, sigma: 18 } }
}
