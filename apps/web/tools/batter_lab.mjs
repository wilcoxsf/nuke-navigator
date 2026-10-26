// Writes the batter options page: ten character-art treatments of the shaded mannequin batter, four poses each, right- and left-handed.
// Usage: node tools/batter_lab.mjs [rows]   ->  Documents/NukeNavigator/ui-options/ascii-lab/batters.html (plus the font beside it)
import fs from 'node:fs'
import { isBraille, STYLES } from '../src/cockpits/art.js'
import { OPTIONS, POSE_NAMES, render } from './batter_options.mjs'

const rows = Number(process.argv[2] ?? 36)
const OUT = 'C:/Users/andrewwi/Documents/NukeNavigator/ui-options/ascii-lab/'
fs.mkdirSync(OUT, { recursive: true })
fs.copyFileSync(new URL('../public/fonts/DejaVuSansMono.ttf', import.meta.url), OUT + 'DejaVuSansMono.ttf')
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const LABEL = { stance: 'STANCE', load: 'LOAD', contact: 'CONTACT', follow: 'FOLLOW-THROUGH' }
const NOTE = {
  pen: 'braille outline over a light shaded fill; the most drawn-looking',
  contour: 'braille outline only, like a pen drawing',
  woodcut: 'braille, hard threshold, high contrast',
  dither: 'braille, error-diffused tone, the finest shading',
  screen: 'braille, ordered dither, a screen-print grain',
  block: 'two-by-two blocks, outline over fill',
  halftone: 'half blocks, ordered dither',
  inkdither: 'braille, outline plus diffused tone',
  poster: 'braille, hard contrast stretch before dithering',
  classic: 'plain characters on a brightness ramp, outline over fill',
}
let cards = ''
for (const o of OPTIONS) {
  const st = STYLES.find((s) => s.id === o[2]), cls = isBraille(st) ? 'art br' : 'art'
  const frames = (mirror) => POSE_NAMES.map((p) => `<figure><pre class="${cls}">${esc(render(p, o, rows, mirror).lines.join('\n'))}</pre><figcaption>${LABEL[p] ?? p}</figcaption></figure>`).join('')
  cards += `<section><header><h2>${o[0].toUpperCase()}. ${o[1]}</h2><p>${NOTE[o[0]] ?? ''}</p></header><div class="row r">${frames(false)}</div><div class="row l">${frames(true)}</div></section>\n`
}
// how the chosen treatments hold up at panel sizes: the contact pose from 12 to 36 lines tall
const ladder = [12, 16, 22, 28, 36]
const sizes = ['pen', 'contour'].map((id) => { const o = OPTIONS.find((x) => x[0] === id), st = STYLES.find((s) => s.id === o[2]); return `<section><header><h2>SIZE LADDER: ${o[1]}</h2><p>the contact pose at ${ladder.join(', ')} lines tall</p></header><div class="row r">${ladder.map((n) => `<figure><pre class="${isBraille(st) ? 'art br' : 'art'}">${esc(render('contact', o, n, false).lines.join('\n'))}</pre><figcaption>${n} LINES</figcaption></figure>`).join('')}</div></section>` }).join('\n')
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Batter art options</title>
<style>
@font-face{font-family:DJV;src:url(DejaVuSansMono.ttf)}
:root{--bg:#0a0a0a;--ink:#ece6d6;--dim:#8d887b;--acc:#ff9f2e;--rule:#26241f}
:root[data-theme=light]{--bg:#f4efe3;--ink:#1c1a16;--dim:#6d675a;--acc:#c4620a;--rule:#d8d1bf}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 Arial,sans-serif}
main{max-width:1500px;margin:0 auto;padding:24px 16px 80px}
h1{font-size:24px;margin:0 0 4px}
.lead{color:var(--dim);margin:0 0 16px}
.bar{display:flex;gap:8px;margin:0 0 24px}
button{background:none;color:var(--ink);border:1px solid var(--dim);padding:6px 12px;font:inherit;cursor:pointer}
button[aria-pressed=true]{border-color:var(--acc);color:var(--acc)}
section{border-top:1px solid var(--rule);padding:16px 0 24px}
section h2{font-size:15px;margin:0;color:var(--acc);letter-spacing:.04em}
section header p{margin:2px 0 12px;color:var(--dim)}
.row{display:flex;gap:28px;overflow-x:auto;align-items:flex-end}
.l{display:none}
body.left .l{display:flex}body.left .r{display:none}
figure{margin:0}figcaption{color:var(--dim);font-size:11px;letter-spacing:.08em;margin-top:6px}
.art{font-family:DJV,'Segoe UI Symbol','Consolas',monospace;line-height:1.164;white-space:pre;letter-spacing:0;margin:0;font-variant-ligatures:none;font-size:12px}
.art.br{line-height:1.507}
</style></head><body><main>
<h1>Batter art, ten options</h1>
<p class="lead">One shaded 3D mannequin (helmet, sleeves over bare forearms, gloves, cleats, a tapered bat), lit from the upper left and drawn in ten ways. Each shows stance, load, contact and follow-through, ${rows} lines tall. The picture scales to any size.</p>
<div class="bar"><button id="r" aria-pressed="true">RIGHT-HANDED</button><button id="l" aria-pressed="false">LEFT-HANDED</button><button id="t" aria-pressed="false">LIGHT PAGE</button></div>
${sizes}
${cards}</main>
<script>
const $=(i)=>document.getElementById(i);
function hand(left){document.body.classList.toggle('left',left);$('l').setAttribute('aria-pressed',left);$('r').setAttribute('aria-pressed',!left)}
$('r').onclick=()=>hand(false);$('l').onclick=()=>hand(true);
$('t').onclick=()=>{const on=document.documentElement.dataset.theme==='light';if(on)delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme='light';$('t').setAttribute('aria-pressed',!on)};
</script></body></html>`
fs.writeFileSync(OUT + 'batters.html', html, 'utf8')
console.log('wrote', OUT + 'batters.html', (html.length / 1024).toFixed(0) + ' KB')
