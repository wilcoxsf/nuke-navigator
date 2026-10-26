// Writes the generic-headshot options page: faces for batters with no photo.
//   FAMILY 1  composites of the real headshots (science/generic_faces.py): six class averages plus the overall average, logos blurred out
//   FAMILY 2  invented 3D busts (science/bust_mannequin.py): twelve different faces
// each in a few character-art styles. Usage: node tools/face_lab.mjs   ->  Documents/NukeNavigator/ui-options/ascii-lab/faces.html
import fs from 'node:fs'
import { faceSource, isBraille, renderArt, STYLES } from '../src/cockpits/art.js'

const OUT = 'C:/Users/andrewwi/Documents/NukeNavigator/ui-options/ascii-lab/'
fs.mkdirSync(OUT, { recursive: true })
fs.copyFileSync(new URL('../public/fonts/DejaVuSansMono.ttf', import.meta.url), OUT + 'DejaVuSansMono.ttf')
const B64 = (s) => Uint8Array.from(Buffer.from(s, 'base64'))
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const gen = JSON.parse(fs.readFileSync(new URL('../public/generic_faces.json', import.meta.url))).faces
const bust = JSON.parse(fs.readFileSync(new URL('../public/batter_bust.json', import.meta.url))).variants
function bustSource(v, channel) {
  const t = B64(v.tone), m = B64(v.mask), ik = B64(v.ink), n = v.w * v.h, src = { w: v.w, h: v.h, v: new Float32Array(n), a: new Float32Array(n) }
  for (let i = 0; i < n; i++) { src.v[i] = channel === 'mix' ? Math.min(1, 0.5 * t[i] / 255 + ik[i] / 255) : t[i] / 255; src.a[i] = m[i] / 255 }
  return src
}
// [style id, label]
const FACE_STYLES = [['braille-poster', 'POSTER (what the app uses for faces now)'], ['braille-edge', 'PEN AND INK'], ['braille-fs', 'DITHER'], ['braille-thresh', 'WOODCUT'], ['quad-edge', 'BLOCK PRINT']]
const BUST_STYLES = [['braille-edge', 'PEN AND INK', 'mix'], ['braille-fs', 'DITHER', 'tone'], ['braille-thresh', 'WOODCUT', 'tone']]
const cell = (st, lines, label) => `<figure><pre class="${isBraille(STYLES.find((s) => s.id === st)) ? 'art br' : 'art'}">${esc(lines.join('\n'))}</pre><figcaption>${label}</figcaption></figure>`
let g1 = ''
for (const f of gen) {
  const src = faceSource(f)
  g1 += `<section><header><h3>${f.id}. ${esc(f.note ?? f.kind)}</h3></header><div class="row">` + FACE_STYLES.map(([st, label]) => cell(st, renderArt(src, st, 34, { enh: { stretch: true, k: 1.5, sigma: 18 } }).lines, label)).join('') + '</div></section>'
}
let g2 = ''
for (const v of bust) {
  g2 += `<section><header><h3>${v.id}. ${esc(v.name)}</h3></header><div class="row">` + BUST_STYLES.map(([st, label, ch]) => cell(st, renderArt(bustSource(v, ch), st, 34, { enh: { stretch: true, k: 0.4 } }).lines, label)).join('') + '</div></section>'
}
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Generic headshot options</title>
<style>
@font-face{font-family:DJV;src:url(DejaVuSansMono.ttf)}
:root{--bg:#0a0a0a;--ink:#ece6d6;--dim:#8d887b;--acc:#ff9f2e;--rule:#26241f}
:root[data-theme=light]{--bg:#f4efe3;--ink:#1c1a16;--dim:#6d675a;--acc:#c4620a;--rule:#d8d1bf}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 Arial,sans-serif}
main{max-width:1500px;margin:0 auto;padding:24px 16px 80px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:17px;color:var(--acc);margin:36px 0 2px;letter-spacing:.04em}h3{font-size:13px;margin:0 0 8px;color:var(--ink)}
.lead{color:var(--dim);margin:0 0 12px;max-width:900px}
button{background:none;color:var(--ink);border:1px solid var(--dim);padding:6px 12px;font:inherit;cursor:pointer;margin-bottom:16px}
section{border-top:1px solid var(--rule);padding:14px 0 18px}
.row{display:flex;gap:26px;overflow-x:auto;align-items:flex-start}
figure{margin:0}figcaption{color:var(--dim);font-size:11px;letter-spacing:.08em;margin-top:6px}
.art{font-family:DJV,'Segoe UI Symbol','Consolas',monospace;line-height:1.164;white-space:pre;letter-spacing:0;margin:0;font-variant-ligatures:none;font-size:12px}
.art.br{line-height:1.507}
</style></head><body><main>
<h1>Generic headshots, two families</h1>
<p class="lead">For a batter we have no photo of. Neither family is anyone's likeness. Family 1 averages the real headshots we hold (six classes by skin tone and facial hair, cap logos blurred away), so it reads as a real face but a blended one. Family 2 is an invented 3D bust, twelve different faces, stylized rather than photographic. A player would get the same face every time, chosen from the player id.</p>
<button id="t" aria-pressed="false">LIGHT PAGE</button>
<h2>FAMILY 1: COMPOSITES OF REAL HEADSHOTS</h2>
${g1}
<h2>FAMILY 2: INVENTED 3D BUSTS</h2>
${g2}
</main><script>
document.getElementById('t').onclick=()=>{const on=document.documentElement.dataset.theme==='light';if(on)delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme='light';document.getElementById('t').setAttribute('aria-pressed',!on)};
</script></body></html>`
fs.writeFileSync(OUT + 'faces.html', html, 'utf8')
console.log('wrote', OUT + 'faces.html', (html.length / 1024).toFixed(0) + ' KB')
