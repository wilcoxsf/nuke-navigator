// Text look at the shaded mannequin batter (public/batter_tone.json from science/mannequin.py) in the character-art styles of src/cockpits/art.js: ten options.
// Usage: node tools/batter_options.mjs <pose|all> <rows> <out.txt> [only,option,ids]
// Every frame is cropped to the batter (the same vertical range for every pose, so the feet line up), and the width in characters is chosen so the picture is `rows` lines tall.
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import { renderArt, STYLES } from '../src/cockpits/art.js'

const MAIN = import.meta.url === pathToFileURL(process.argv[1]).href
const poseArg = MAIN ? process.argv[2] ?? 'stance' : 'stance', ROWS = MAIN ? Number(process.argv[3] ?? 36) : 36, outFile = MAIN ? process.argv[4] : null, only = MAIN ? process.argv[5]?.split(',') : null
const data = JSON.parse(fs.readFileSync(new URL('../public/batter_tone.json', import.meta.url)))
const B64 = (s) => Uint8Array.from(Buffer.from(s, 'base64'))
let y0 = 1e9, y1 = -1
const box = {}
for (const [k, r] of Object.entries(data.poses)) {
  const m = B64(r.mask)
  let a = 1e9, b = -1
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (m[y * r.w + x] > 127) { a = Math.min(a, x); b = Math.max(b, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
  box[k] = [a, b]
}
y0 = Math.max(0, y0 - 4); y1 += 4
// the ten options: [id, label, art.js style, channel (tone: shaded, ink: outlines only, mix: outlines over a light shaded fill), enhance]
export const OPTIONS = [
  ['pen', 'PEN AND INK', 'braille-edge', 'mix', { stretch: true, k: 0.4 }],
  ['contour', 'CONTOUR', 'braille-line', 'ink', null],
  ['woodcut', 'WOODCUT', 'braille-thresh', 'tone', { stretch: true, k: 0.8 }],
  ['dither', 'DITHER', 'braille-fs', 'tone', { stretch: true, k: 0.5 }],
  ['screen', 'SCREEN PRINT', 'braille-bayer', 'tone', { stretch: true, k: 0.5 }],
  ['block', 'BLOCK PRINT', 'quad-edge', 'mix', { stretch: true, k: 0.4 }],
  ['halftone', 'HALFTONE', 'half-bayer', 'mix', { stretch: true, k: 0.4 }],
  ['inkdither', 'INK AND DITHER', 'braille-fs', 'mix', { stretch: true, k: 0.4 }],
  ['poster', 'POSTER', 'braille-poster', 'tone', { stretch: true, k: 0.6 }],
  ['classic', 'CLASSIC', 'ramp', 'mix', { stretch: true, k: 0.5 }],
]
function source(pose, channel, pad = 6) {
  const r = data.poses[pose], [a, b] = box[pose], x0 = Math.max(0, a - pad), x1 = Math.min(r.w - 1, b + pad), W = x1 - x0 + 1, H = y1 - y0 + 1
  const t = B64(r.tone), m = B64(r.mask), ik = B64(r.ink), src = { w: W, h: H, v: new Float32Array(W * H), a: new Float32Array(W * H) }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = Math.min(r.h - 1, y0 + y) * r.w + x0 + x
    const tone = t[i] / 255, ink = ik[i] / 255
    src.v[y * W + x] = channel === 'ink' ? ink : channel === 'mix' ? Math.min(1, 0.5 * tone + ink) : tone
    src.a[y * W + x] = channel === 'ink' ? (ink > 0.02 || m[i] > 127 ? 1 : 0) : m[i] / 255
  }
  return src
}
export function render(pose, opt, rows = ROWS, mirror = false) {
  const [, , sid, ch, enh] = opt, st = STYLES.find((s) => s.id === sid), src = source(pose, ch)
  if (mirror) for (const arr of [src.v, src.a]) for (let y = 0; y < src.h; y++) arr.subarray(y * src.w, (y + 1) * src.w).reverse()
  let best = null
  for (let cols = 8; cols <= 150; cols++) {
    const res = renderArt(src, st, cols, enh ? { enh } : {})
    const d = Math.abs(res.rows - rows)
    if (!best || d < best.d) best = { d, res }
    if (res.rows > rows + 3) break
  }
  return best.res
}
export const POSE_NAMES = Object.keys(data.poses)
const poses = poseArg === 'all' ? Object.keys(data.poses) : [poseArg]
let text = ''
if (MAIN) for (const o of OPTIONS) {
  if (only && !only.includes(o[0])) continue
  for (const p of poses) {
    const res = render(p, o)
    text += `\n=== ${o[0]} ${o[1]} ${p} ${res.cols} x ${res.rows}\n` + res.lines.join('\n') + '\n'
  }
}
if (MAIN) { if (outFile) fs.writeFileSync(outFile, text, 'utf8'); else console.log(text) }
