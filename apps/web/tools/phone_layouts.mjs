// Phone layout options for Dinger Dojo (cockpit 22 is laptop-only today: it shows "THIS VIEW NEEDS ROOM" under 1200 x 700). Three options, three screens each, drawn as static mockups at 390 x 844 in the cockpit's own look
// (black ground, cream ink, orange accent, Press Start 2P labels, VT323 numbers), with the real Oracle Park wall from public/oracle_crest.json, the pen-and-ink batter and a composite face. Numbers are the sample ball from the laptop screenshot.
// Usage: node tools/phone_layouts.mjs  ->  Documents/NukeNavigator/ui-options/phone-layouts/index.html
import fs from 'node:fs'
import { faceSource, renderArt } from '../src/cockpits/art.js'
import { OPTIONS, render } from './batter_options.mjs'

const OUT = 'C:/Users/andrewwi/Documents/NukeNavigator/ui-options/phone-layouts/'
fs.mkdirSync(OUT, { recursive: true })
for (const f of ['PressStart2P-Regular.ttf', 'VT323-Regular.ttf', 'ShareTechMono-Regular.ttf', 'DejaVuSansMono.ttf']) fs.copyFileSync(new URL('../public/fonts/' + f, import.meta.url), OUT + f)
const crest = JSON.parse(fs.readFileSync(new URL('../public/oracle_crest.json', import.meta.url)))
const gen = JSON.parse(fs.readFileSync(new URL('../public/generic_faces.json', import.meta.url))).faces
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

// ---- plan view: the real wall, the foul lines, the infield, the ball
function plan({ w = 358, h = 300, ball = true, stroke = 1.6 } = {}) {
  const S = Math.min(w / 2 / 1.02, (h - 24) / 1.0) / 118, ox = w / 2, oy = h - 14 // metres to pixels; home plate at the bottom centre
  const P = (b, r) => [ox + r * Math.sin((b * Math.PI) / 180) * S, oy - r * Math.cos((b * Math.PI) / 180) * S]
  const wall = crest.bearing.map((b, i) => P(b, crest.radius[i]).map((v) => v.toFixed(1)).join(',')).join(' ')
  const stands = crest.bearing.map((b, i) => P(b, crest.radius[i] + 22).map((v) => v.toFixed(1)).join(',')).join(' ')
  const l = P(-45, crest.radius[crest.bearing.findIndex((b) => b >= -45)]), r = P(45, crest.radius[crest.bearing.findIndex((b) => b >= 45)])
  const base = (n) => P(45 * (n === 1 ? 1 : n === 3 ? -1 : 0), n === 2 ? 38.8 : 27.4)
  const dia = [P(0, 0), base(1), base(2), base(3)].map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')
  const land = P(43.6, 114.6), apex = P(21.8, 70)
  const arc = ball ? `<path d="M${P(0, 0)} Q ${apex[0] + 18},${apex[1] - 34} ${land}" fill="none" stroke="var(--acc)" stroke-width="2" stroke-dasharray="1 5" stroke-linecap="round"/><circle cx="${land[0]}" cy="${land[1]}" r="7" fill="var(--acc)"/><circle cx="${land[0]}" cy="${land[1]}" r="13" fill="none" stroke="var(--acc)" stroke-width="1.5"/>` : ''
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Oracle Park from above with the ball landing in right field"><polyline points="${stands}" fill="none" stroke="var(--dim)" stroke-width="1" stroke-dasharray="2 3"/><polyline points="${wall}" fill="none" stroke="var(--acc)" stroke-width="${stroke + 1.2}" stroke-linejoin="round"/><line x1="${P(0, 0)[0]}" y1="${P(0, 0)[1]}" x2="${l[0]}" y2="${l[1]}" stroke="var(--tx)" stroke-width="${stroke}"/><line x1="${P(0, 0)[0]}" y1="${P(0, 0)[1]}" x2="${r[0]}" y2="${r[1]}" stroke="var(--tx)" stroke-width="${stroke}"/><polygon points="${dia}" fill="none" stroke="var(--tx)" stroke-width="${stroke}"/>${arc}</svg>`
}
function sideArc(w = 358, h = 84) {
  const x1 = w - 24, y0 = h - 10, ap = 62
  return `<svg viewBox="0 0 ${w} ${h}" width="100%"><line x1="8" y1="${y0}" x2="${w - 8}" y2="${y0}" stroke="var(--dim)"/><path d="M12,${y0} Q ${(12 + x1) / 2},${y0 - ap * 2} ${x1},${y0}" fill="none" stroke="var(--acc)" stroke-width="2"/><line x1="${x1 - 40}" y1="${y0}" x2="${x1 - 40}" y2="${y0 - 44}" stroke="var(--tx)" stroke-width="2"/><text x="${(12 + x1) / 2}" y="14" fill="var(--dim)" font-size="10" text-anchor="middle" font-family="PS2P">APEX 63 FT</text></svg>`
}
const bat = render('contact', OPTIONS.find((o) => o[0] === 'pen'), 18, true).lines.join('\n') // a left-hander, as in the sample
const face = renderArt(faceSource(gen.find((f) => f.id === 'P3')), 'braille-poster', 26, { enh: { stretch: true, k: 1.5, sigma: 18 } }).lines.join('\n')
const hist = (label, val, pct, sh) => `<div class="hist"><div class="hh"><span>${label}</span><b>${val}</b><span>HIGHER THAN ${pct}%</span></div><svg viewBox="0 0 330 34" width="100%" preserveAspectRatio="none">${Array.from({ length: 44 }, (_, i) => { const x = i / 43, v = Math.exp(-((x - sh) ** 2) / 0.05) * 0.9 + 0.08; return `<rect x="${i * 7.5}" y="${(34 - v * 32).toFixed(1)}" width="6" height="${(v * 32).toFixed(1)}" fill="${Math.abs(x - 0.78) < 0.012 ? 'var(--acc)' : 'var(--dim)'}"/>` }).join('')}</svg></div>`

// ---- pieces shared by the options
const top = (right = '<span class="chip">REPLAY</span><span class="chip off">WHAT-IF</span>') => `<div class="top"><span class="lab">DINGER DOJO</span><span class="sp"></span>${right}</div>`
const hero = (size = 'big') => `<div class="hero ${size}"><div class="num">376<small> FT</small></div><div class="hr"><b>HOME RUN</b><span>THE REAL BALL</span></div></div><div class="sub">APEX 63 FT &nbsp; HANG 4.6 S &nbsp; WALL 336 FT, 26 HIGH<br><em>GONE IN 30 OF 30 PARKS</em></div>`
const balls = `<div class="balls"><span class="bt sq">&lt;</span><span class="bt sq">&gt;</span><span class="cnt">BALL 1 OF 554</span><span class="bt on">GIANTS HR</span><span class="bt">ORACLE HR</span><span class="bt">ALL</span></div>`
const dial = (n, k, v, sel) => `<div class="dial${sel ? ' sel' : ''}"><div class="dk"><span>${n}</span> ${k}</div><div class="dv">${v}</div><div class="dpm"><span class="bt sq">+</span><span class="bt sq">&minus;</span></div></div>`
const dials = `<div class="dials">${dial(1, 'SPEED', '104.3', 1)}${dial(2, 'ANGLE', '22', 0)}${dial(3, 'DIRECTION', '43.6° RF', 0)}${dial(4, 'AIR', '60', 0)}${dial(5, 'WIND', 'CALM', 0)}${dial(6, 'BATTER', 'LEFT', 0)}</div><div class="swingbtn">SWING</div>`
const pitch = `<div class="card pitchc"><div class="ct">THE PITCH</div><div class="pn">CUTTER</div><div class="kv"><span>SPEED</span><b>91.7 MPH</b><span>SPIN RATE</span><b>2577 RPM</b><span>SPIN TILT</span><b>12:26</b><span>APPROACH</span><b>-5.2°</b><span>EXTENSION</span><b>6.3 FT</b><span>ZONE</span><b>5 (IN THE ZONE)</b></div></div>`
const batter = `<div class="card"><div class="ct">BATTER</div><div class="who"><pre class="art br face">${esc(face)}</pre><div><b class="nm">DREW GILBERT</b><span>BATS LEFT</span><div class="two"><span class="bt">STATS</span><span class="bt">PARKS</span></div></div></div></div><div class="card"><div class="ct">SWING, SIDE VIEW</div><pre class="art br batter">${esc(bat)}</pre><div class="cap"><b>ATTACK +24°</b> &nbsp; <b>LAUNCH 22°</b> &nbsp; GAP -2°<br>BAT 69 MPH &nbsp; EXIT 104 MPH</div></div>`
const hists = `<div class="card"><div class="ct">THIS BALL VS ALL BALLS</div>${hist('EXIT SPEED', '104 MPH', 90, 0.62)}${hist('LAUNCH ANGLE', '22°', 61, 0.5)}${hist('DISTANCE', '376 FT', 86, 0.66)}</div>`
const tabs = (on) => `<div class="tabs">${['PARK', 'PITCH', 'BATTER', 'DIALS'].map((t) => `<span class="${t === on ? 'on' : ''}">${t}</span>`).join('')}</div>`

const frame = (title, body, cls = '') => `<figure class="fr"><div class="ph ${cls}">${body}</div><figcaption>${title}</figcaption></figure>`
const A = [
  frame('A1  PARK TAB', `${top()}<div class="body">${hero()}<div class="plan">${plan()}</div><div class="side">${sideArc()}</div>${balls}</div>${tabs('PARK')}`),
  frame('A2  BATTER TAB', `${top()}<div class="body scroll">${batter}${pitch}</div>${tabs('BATTER')}`),
  frame('A3  DIALS TAB', `${top()}<div class="body"><div class="mini"><b>376 FT</b><span class="chip hrc">HOME RUN</span></div><div class="plan sm">${plan({ h: 190 })}</div>${dials}</div>${tabs('DIALS')}`),
]
const B = [
  frame('B1  TOP OF THE PAGE', `${top()}<div class="body scroll">${hero()}<div class="plan">${plan()}</div>${balls}${pitch}</div><div class="sticky"><span class="bt big">SET YOUR SWING</span></div>`),
  frame('B2  SCROLLED: BATTER AND HISTOGRAMS', `${top()}<div class="body scroll">${batter}${hists}</div><div class="sticky"><span class="bt big">SET YOUR SWING</span></div>`),
  frame('B3  SWING SHEET OPEN', `${top()}<div class="body dim">${hero('mid')}<div class="plan sm">${plan({ h: 170 })}</div></div><div class="sheet full"><div class="grab"></div><div class="ct">YOUR SWING</div>${dials}</div>`),
]
const C = [
  frame('C1  SHEET PEEKING', `<div class="full-plan">${plan({ w: 390, h: 640, stroke: 2 })}</div>${top()}<div class="floatnum"><div class="num">376<small> FT</small></div><span class="chip hrc">HOME RUN</span></div><div class="sheet peek"><div class="grab"></div><div class="ct">BALL 1 OF 554 &nbsp; DREW GILBERT, CUTTER 91.7 MPH</div><div class="peekrow"><span class="bt sq">&lt;</span><span class="bt sq">&gt;</span><span class="bt on">GIANTS HR</span><span class="bt big">SWING</span></div></div>`, 'cover'),
  frame('C2  SHEET HALF OPEN: PITCH AND BATTER', `<div class="full-plan dimmed">${plan({ w: 390, h: 640, stroke: 2 })}</div>${top()}<div class="sheet half"><div class="grab"></div><div class="seg"><span>PITCH</span><span class="on">BATTER</span><span>HISTOGRAMS</span></div><div class="scroll">${batter}</div></div>`, 'cover'),
  frame('C3  SHEET FULL: DIALS', `<div class="full-plan dimmed">${plan({ w: 390, h: 640, stroke: 2 })}</div>${top()}<div class="sheet full"><div class="grab"></div><div class="seg"><span>PITCH</span><span>BATTER</span><span class="on">SWING</span></div>${dials}</div>`, 'cover'),
]
const OPT = [
  ['A. FOUR TABS', 'Park, pitch and batter, histograms, dials. One thing on screen at a time, a thumb-reach tab bar, the park always the first screen. The simplest to build: each tab is a section of the laptop page. Cost: you cannot see the ball land while you turn the dials, unless the small park view on the dials tab is good enough.', A],
  ['B. ONE LONG PAGE', 'Everything in one scroll: the number and the park, then the pitch, the batter and swing picture, the histograms. A fixed SET YOUR SWING button opens a sheet with the six dials. Cost: long, and the park scrolls away.', B],
  ['C. THE PARK IS THE SCREEN', 'The park fills the phone, the number floats on it, and a bottom sheet (peek, half, full) holds everything else, with a segmented switch inside. The most game-like and the closest to the laptop feel (the park is the hero). Cost: the most work, and a sheet over a 3D view needs care for touch.', C],
]
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dinger Dojo phone layouts</title>
<style>
@font-face{font-family:PS2P;src:url(PressStart2P-Regular.ttf)}@font-face{font-family:VT;src:url(VT323-Regular.ttf)}@font-face{font-family:STM;src:url(ShareTechMono-Regular.ttf)}@font-face{font-family:DJV;src:url(DejaVuSansMono.ttf)}
:root{--page:#141414;--pt:#ece6d6;--pd:#8d887b;--pa:#ff9f2e}
body{margin:0;background:var(--page);color:var(--pt);font:14px/1.5 Arial,sans-serif}
main{max-width:1500px;margin:0 auto;padding:24px 16px 80px}
h1{font-size:24px;margin:0 0 4px}.lead{color:var(--pd);max-width:880px;margin:0 0 8px}
h2{font-size:17px;color:var(--pa);margin:40px 0 4px;letter-spacing:.04em}.note{color:var(--pd);max-width:880px;margin:0 0 14px}
.row{display:flex;gap:28px;overflow-x:auto;padding-bottom:12px}
.fr{margin:0}.fr figcaption{font:11px STM,monospace;color:var(--pd);letter-spacing:.08em;margin-top:8px}
.ph{--k:#000;--tx:#ece6d6;--dim:#8d887b;--acc:#ff9f2e;--ln:#3a362e;position:relative;width:390px;height:844px;border:1px solid #3a362e;border-radius:26px;overflow:hidden;background:var(--k);color:var(--tx);font:13px/1.35 STM,monospace;display:flex;flex-direction:column}
.top{display:flex;align-items:center;gap:6px;padding:14px 12px 8px;z-index:3}.top .lab{font:10px PS2P,monospace}.sp{flex:1}
.chip{font:10px PS2P,monospace;border:1px solid var(--tx);padding:6px 7px;background:var(--tx);color:var(--k)}.chip.off{background:none;color:var(--tx)}.chip.hrc{background:var(--k);color:var(--acc);border-color:var(--acc)}
.body{flex:1;padding:0 16px;overflow:hidden}.body.scroll{overflow-y:auto}.body.dim{position:relative}.body.dim::after{content:"";position:absolute;inset:0;background:rgba(0,0,0,.66)}
.hero{display:flex;align-items:flex-end;justify-content:space-between;gap:8px;margin-top:6px}.num{font:68px/0.9 VT,monospace}.num small{font-size:26px;color:var(--dim)}
.hero.mid .num{font-size:46px}.hr{border:1px solid var(--acc);padding:7px 9px;text-align:right}.hr b{display:block;font:10px PS2P,monospace;color:var(--acc);font-weight:400}.hr span{font-size:11px;color:var(--dim)}
.sub{font-size:11px;color:var(--dim);margin:8px 0}.sub em{font-style:normal;color:var(--acc)}
.plan{margin:2px -4px 0}.plan.sm{margin:0}.side{margin:2px 0 0}
.balls{display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin:8px 0}.cnt{font-size:11px;margin:0 4px}
.bt{display:inline-block;font:10px PS2P,monospace;border:1px solid var(--tx);padding:9px 10px;box-shadow:0 2px 0 var(--dim);min-height:14px}.bt.on{background:var(--tx);color:var(--k)}.bt.sq{padding:9px 11px}.bt.big{font-size:11px;padding:14px 18px;background:var(--acc);color:var(--k);border-color:var(--acc);box-shadow:0 2px 0 #7a4a10}
.tabs{display:flex;border-top:1px solid var(--tx);background:var(--k)}.tabs span{flex:1;text-align:center;font:10px PS2P,monospace;padding:18px 0 24px;color:var(--dim)}.tabs span.on{color:var(--k);background:var(--tx)}
.mini{display:flex;align-items:center;gap:10px}.mini b{font:44px VT,monospace;font-weight:400}
.dials{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.dial{border:1px solid var(--tx);padding:8px 10px;position:relative;min-height:74px}.dial.sel{background:var(--tx);color:var(--k)}.dk{font:10px PS2P,monospace;color:var(--dim)}.dial.sel .dk{color:#555}.dk span{margin-right:4px}.dv{font:34px VT,monospace;margin-top:6px}.dpm{position:absolute;right:6px;top:8px;display:flex;flex-direction:column;gap:3px}.dpm .bt{padding:5px 8px;box-shadow:none}
.swingbtn{margin:10px 0;border:1px solid var(--acc);color:var(--acc);text-align:center;font:12px PS2P,monospace;padding:22px 0}
.card{border:1px solid var(--tx);padding:12px;margin:0 0 10px}.ct{font:10px PS2P,monospace;color:var(--dim);margin-bottom:8px}.pn{font:20px VT,monospace;margin-bottom:6px}
.kv{display:grid;grid-template-columns:1fr auto;gap:4px 10px;font-size:12px}.kv span{color:var(--dim)}.kv b{font-weight:400;text-align:right}
.who{display:flex;gap:12px;align-items:center}.who span{color:var(--dim);display:block;font-size:11px;margin:4px 0 8px}.nm{font:12px PS2P,monospace;font-weight:400}.two{display:flex;gap:6px}
.art{font-family:DJV,'Segoe UI Symbol',monospace;line-height:1.164;white-space:pre;margin:0;font-size:6.5px;color:var(--tx)}.art.br{line-height:1.507}.art.face{font-size:7px}.art.batter{font-size:8px;margin:0 auto;width:max-content}
.cap{font-size:11px;margin-top:8px;color:var(--dim)}.cap b{color:var(--tx);font-weight:400}
.hist{margin-bottom:8px}.hh{display:flex;justify-content:space-between;font-size:11px;color:var(--dim)}.hh b{color:var(--tx);font-weight:400}
.sticky{padding:10px 16px 28px;border-top:1px solid var(--ln);display:flex;justify-content:center;background:var(--k)}
.sheet{position:absolute;left:0;right:0;bottom:0;background:var(--k);border-top:1px solid var(--tx);border-radius:18px 18px 0 0;padding:8px 16px 20px;z-index:4;box-shadow:0 -10px 24px #000}.sheet.peek{height:170px}.sheet.half{height:520px;overflow:hidden}.sheet.full{height:640px;overflow:hidden}
.grab{width:44px;height:4px;background:var(--dim);border-radius:2px;margin:2px auto 10px}.peekrow{display:flex;gap:6px;align-items:center;margin-top:10px}.peekrow .big{margin-left:auto}
.seg{display:flex;border:1px solid var(--tx);margin:0 0 10px}.seg span{flex:1;text-align:center;font:10px PS2P,monospace;padding:12px 0;color:var(--dim)}.seg span.on{background:var(--tx);color:var(--k)}
.scroll{overflow-y:auto}.sheet .scroll{max-height:400px}
.full-plan{position:absolute;inset:0;padding-top:52px}.full-plan.dimmed{opacity:.28}.cover .top{position:absolute;left:0;right:0;top:0}
.floatnum{position:absolute;left:16px;top:56px;z-index:3;display:flex;flex-direction:column;gap:6px;align-items:flex-start}
</style></head><body><main>
<h1>Dinger Dojo on a phone: three layouts</h1>
<p class="lead">The laptop cockpit refuses to open under 1200 by 700 pixels. These are three ways to give a phone the same ball, park, pitch, batter, histograms and six dials. Mockups only: the park is the real Oracle Park wall from above (the orange line is the home-run line), the sample ball is the Drew Gilbert home run from the laptop screenshot, and the histogram bars are a sketch, not data. The faces and batter are the new pen-and-ink pieces.</p>
${OPT.map(([t, n, fs_]) => `<h2>${t}</h2><p class="note">${n}</p><div class="row">${fs_.join('')}</div>`).join('')}
</main></body></html>`
fs.writeFileSync(OUT + 'index.html', html, 'utf8')
console.log('wrote', OUT + 'index.html', (html.length / 1024).toFixed(0) + ' KB')
