// Writes the swing animation page: the mannequin batter through a whole swing (data/derived/batter_anim.json from science/mannequin_anim.py) in four character-art treatments, playing side by side.
// Usage: node tools/batter_anim_lab.mjs [rows]  ->  Documents/NukeNavigator/ui-options/ascii-lab/batter_swing.html
import fs from 'node:fs'
import { isBraille, renderArt, STYLES } from '../src/cockpits/art.js'

const ROWS = Number(process.argv[2] ?? 30)
const OUT = 'C:/Users/andrewwi/Documents/NukeNavigator/ui-options/ascii-lab/'
fs.mkdirSync(OUT, { recursive: true })
fs.copyFileSync(new URL('../public/fonts/DejaVuSansMono.ttf', import.meta.url), OUT + 'DejaVuSansMono.ttf')
const data = JSON.parse(fs.readFileSync('C:/Users/andrewwi/dev/nuke-navigator-new/data/derived/batter_anim.json', 'utf8'))
const B64 = (s) => Uint8Array.from(Buffer.from(s, 'base64'))
const { w, h } = data
const fr = data.frames.map((f) => ({ tone: B64(f.tone), mask: B64(f.mask), ink: B64(f.ink) }))
let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1
for (const f of fr) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (f.mask[y * w + x] > 127) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
x0 = Math.max(0, x0 - 4); y0 = Math.max(0, y0 - 4); x1 = Math.min(w - 1, x1 + 4); y1 = Math.min(h - 1, y1 + 4)
const W = x1 - x0 + 1, H = y1 - y0 + 1
const OPT = [['pen', 'PEN AND INK', 'braille-edge', 'mix', { stretch: true, k: 0.4 }], ['contour', 'CONTOUR', 'braille-line', 'ink', null], ['dither', 'DITHER', 'braille-fs', 'tone', { stretch: true, k: 0.5 }], ['inkdither', 'INK AND DITHER', 'braille-fs', 'mix', { stretch: true, k: 0.4 }]]
function src(f, ch, mirror) {
  const s = { w: W, h: H, v: new Float32Array(W * H), a: new Float32Array(W * H) }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y0 + y) * w + x0 + x, o = y * W + (mirror ? W - 1 - x : x), t = f.tone[i] / 255, k = f.ink[i] / 255
    s.v[o] = ch === 'ink' ? k : ch === 'mix' ? Math.min(1, 0.5 * t + k) : t
    s.a[o] = ch === 'ink' ? (k > 0.02 || f.mask[i] > 127 ? 1 : 0) : f.mask[i] / 255
  }
  return s
}
// one column count for every frame of an option, from the first frame, so the lines stay aligned while it plays
const pack = {}
for (const [id, , sid, ch, enh] of OPT) {
  const st = STYLES.find((s) => s.id === sid)
  for (const mirror of [false, true]) {
    let cols = 10
    for (; cols < 160; cols++) if (renderArt(src(fr[0], ch, mirror), st, cols, enh ? { enh } : {}).rows >= ROWS) break
    pack[id + (mirror ? 'L' : 'R')] = fr.map((f) => renderArt(src(f, ch, mirror), st, cols, enh ? { enh } : {}).lines.join('\n'))
  }
}
const esc = (s) => JSON.stringify(s).replace(/</g, '\\u003c')
const cards = OPT.map(([id, label, sid]) => `<figure><pre class="${isBraille(STYLES.find((s) => s.id === sid)) ? 'art br' : 'art'}" id="p_${id}"></pre><figcaption>${label}</figcaption></figure>`).join('')
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Batter swing in motion</title>
<style>
@font-face{font-family:DJV;src:url(DejaVuSansMono.ttf)}
:root{--bg:#0a0a0a;--ink:#ece6d6;--dim:#8d887b;--acc:#ff9f2e}
:root[data-theme=light]{--bg:#f4efe3;--ink:#1c1a16;--dim:#6d675a;--acc:#c4620a}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 Arial,sans-serif}
main{max-width:1500px;margin:0 auto;padding:24px 16px 60px}
h1{font-size:24px;margin:0 0 4px}.lead{color:var(--dim);margin:0 0 16px;max-width:860px}
.bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 24px}
button{background:none;color:var(--ink);border:1px solid var(--dim);padding:6px 12px;font:inherit;cursor:pointer}
button[aria-pressed=true]{border-color:var(--acc);color:var(--acc)}
label{color:var(--dim)}input[type=range]{accent-color:var(--acc)}
.row{display:flex;gap:30px;overflow-x:auto;align-items:flex-end}
figure{margin:0}figcaption{color:var(--dim);font-size:11px;letter-spacing:.08em;margin-top:8px}
.art{font-family:DJV,'Segoe UI Symbol','Consolas',monospace;line-height:1.164;white-space:pre;letter-spacing:0;margin:0;font-variant-ligatures:none;font-size:12px}
.art.br{line-height:1.507}
</style></head><body><main>
<h1>Batter swing in motion</h1>
<p class="lead">One shaded mannequin through a whole swing, stance, load, contact, follow-through, in four treatments playing together. Frames ease in and out of each phase: the load is slow, the swing is fast, the follow-through settles.</p>
<div class="bar"><button id="play" aria-pressed="true">PAUSE</button><button id="hand" aria-pressed="false">LEFT-HANDED</button><label>SPEED <input id="spd" type="range" min="1" max="12" value="6"></label><label>FRAME <input id="fr" type="range" min="0" max="${fr.length - 1}" value="0"></label><button id="t" aria-pressed="false">LIGHT PAGE</button></div>
<div class="row">${cards}</div>
<script>
const P=${esc(pack)},IDS=${esc(OPT.map((o) => o[0]))},N=${fr.length};
let i=0,left=false,playing=true,last=0;
const $=(k)=>document.getElementById(k);
function draw(){for(const id of IDS)$('p_'+id).textContent=P[id+(left?'L':'R')][i];$('fr').value=i}
function tick(ts){if(playing){const dt=1000/(2+Number($('spd').value)*2.5);if(ts-last>dt){last=ts;i=(i+1)%N;if(i===0)last=ts+350;draw()}}requestAnimationFrame(tick)}
$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'PAUSE':'PLAY';$('play').setAttribute('aria-pressed',playing)};
$('hand').onclick=()=>{left=!left;$('hand').setAttribute('aria-pressed',left);draw()};
$('fr').oninput=()=>{i=Number($('fr').value);playing=false;$('play').textContent='PLAY';$('play').setAttribute('aria-pressed',false);draw()};
$('t').onclick=()=>{const on=document.documentElement.dataset.theme==='light';if(on)delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme='light';$('t').setAttribute('aria-pressed',!on)};
draw();requestAnimationFrame(tick);
</script></main></body></html>`
fs.writeFileSync(OUT + 'batter_swing.html', html, 'utf8')
console.log('wrote', OUT + 'batter_swing.html', (html.length / 1024).toFixed(0) + ' KB', 'crop', W, 'x', H)
