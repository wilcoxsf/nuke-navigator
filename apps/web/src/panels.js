// Skin B, the hand-inked machine-panel look: wobbly pen outlines, pastel flats with tick and plus-sign pattern fills, rivets, tilted label plates,
// dial-style sliders and speech balloons for the verdict (a plain rounded balloon for quiet outcomes, a lumpy cloud for loud ones).
// Only the interface wears this: the callout copy and the blast are separate. Reference: the line habits in ui-options/marc-bell-ref/STYLE-NOTES.md
// (one thin even line, flat fills under it, pattern fills instead of shading, balloons with a short spike tail, small tilted label plates).
export const PANEL_CSS = `
@font-face{font-family:'DJHand';src:url(/fonts/PatrickHandSC-Regular.ttf)}
@font-face{font-family:'DJFat';src:url(/fonts/LondrinaSolid-Black.ttf)}
#dj-state,#dj-sub,#dj-fig{font-family:'DJHand',Consolas,monospace}
#dojo.ui-B{--ink:#1d2a6d;--hot:#ff5a3c;--sun:#ffd23f;--mint:#cfe8d8;--sky:#c8dfee;--peach:#f6cdb0}
#dojo.ui-B #dj-ctl,#dojo.ui-B #dj-out{background:none;border:0;box-shadow:none;color:var(--ink);padding:26px 20px 24px;isolation:isolate}
#dojo.ui-B #dj-ctl{transform:rotate(-.9deg);width:352px}
#dojo.ui-B #dj-out{transform:rotate(.7deg);width:352px;top:50px;padding-top:22px;padding-bottom:18px}
#dojo.ui-B .frame{position:absolute;left:-6px;top:-6px;width:calc(100% + 12px);height:calc(100% + 12px);z-index:-1;overflow:visible;pointer-events:none}
#dojo.ui-B .tape{display:block;position:absolute;top:-14px;left:14px;margin:0;padding:0;background:none;border:0;transform:rotate(-3deg)}
#dojo.ui-B .tape i{display:inline-block;padding:2px 10px 1px;background:#fff;border:2px solid var(--ink);border-radius:3px;font:400 15px/1.1 'DJHand',Consolas,monospace;letter-spacing:.08em;color:var(--ink);font-style:normal;box-shadow:2px 2px 0 var(--sun)}
#dojo.ui-B #dj-title{position:absolute;top:12px;left:16px;padding:0;background:none;border:0;box-shadow:none;transform:rotate(-2.5deg);font:400 34px/1 'DJFat','Arial Black',Arial;letter-spacing:.03em;color:#fff;-webkit-text-stroke:3px var(--ink);paint-order:stroke fill;text-shadow:3px 3px 0 var(--hot)}
#dojo.ui-B #dj-ctl{margin-top:30px}
#dojo.ui-B #dj-out{margin-top:6px}
#dojo.ui-B #dj-ctl .row{margin:7px 0}
#dojo.ui-B #dj-ctl label{min-width:140px;white-space:nowrap;font:400 15px/1 'DJHand',Consolas,monospace;letter-spacing:.03em;text-transform:uppercase;transform:rotate(-1deg);display:inline-block}
#dojo.ui-B #dj-ctl label::before{content:counter(rw);display:inline-block;width:18px;height:18px;line-height:15px;margin-right:6px;text-align:center;border:2px solid var(--ink);border-radius:50%;background:#fff;font:400 13px/15px 'DJHand',Consolas,monospace;letter-spacing:0}
#dojo.ui-B #dj-ctl{counter-reset:rw}#dojo.ui-B #dj-ctl .row{counter-increment:rw}
#dojo.ui-B .val{background:#fff;color:var(--ink);padding:2px 6px 1px;font:400 17px/1 'DJHand',Consolas,monospace;min-width:70px;border:2px dashed var(--ink);border-radius:5px;letter-spacing:.04em;text-align:center}
#dojo.ui-B input[type=range]{-webkit-appearance:none;appearance:none;height:22px;background:linear-gradient(var(--ink),var(--ink)) 0 50%/100% 2px no-repeat,repeating-linear-gradient(90deg,var(--ink) 0 1.5px,transparent 1.5px 11px) 0 100%/100% 5px no-repeat,repeating-linear-gradient(90deg,var(--ink) 0 1.5px,transparent 1.5px 22px) 0 0/100% 7px no-repeat;outline:none}
#dojo.ui-B input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:radial-gradient(circle,var(--ink) 0 2px,transparent 2.5px),linear-gradient(var(--ink),var(--ink)) 50% 50%/12px 2px no-repeat,linear-gradient(var(--ink),var(--ink)) 50% 50%/2px 12px no-repeat,#fff;border:2px solid var(--ink);box-shadow:2px 2px 0 var(--hot)}
#dojo.ui-B button#hand{background:#fff;border:2px solid var(--ink);border-radius:5px;font:400 16px 'DJHand',Consolas,monospace;color:var(--ink);padding:3px 12px;box-shadow:2px 2px 0 var(--sun)}
#dojo.ui-B #dj-skins button{background:#fff;color:var(--ink);border:2px solid var(--ink);border-radius:4px;font:400 15px 'DJHand',Consolas,monospace}
#dojo.ui-B #dj-skins button.on{background:var(--ink);color:#fff}
#dojo.ui-B #dj-state{font:400 15px/1 'DJHand',Consolas,monospace;letter-spacing:.14em;margin:2px 0 6px 6px;transform:rotate(-1.5deg);display:inline-block;background:#fff;border:2px solid var(--ink);border-radius:3px;padding:2px 8px 1px}
#dojo.ui-B #dj-verdict{position:relative;font:400 34px/1 'DJFat','Arial Black',Arial;color:var(--ink);background:none;padding:14px 26px 26px;margin:4px 0 20px;min-height:78px;display:flex;align-items:center;justify-content:center;text-align:center;text-shadow:none;clip-path:none;overflow:visible}
#dojo.ui-B #dj-verdict .bal{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;z-index:-1}
#dojo.ui-B #dj-verdict .beat{position:relative;z-index:1}
#dojo.ui-B #dj-verdict.loud .beat{color:#fff;-webkit-text-stroke:3px var(--ink);paint-order:stroke fill;text-shadow:3px 3px 0 var(--ink)}
#dojo.ui-B #dj-sub{font:400 15px/1.1 'DJHand',Consolas,monospace;letter-spacing:.03em;margin:2px 4px 6px;min-height:18px}
#dojo.ui-B #dj-fig{display:block;margin:4px 0 4px;border:0;background:none;transform:rotate(-.6deg)}
#dojo.ui-B #dj-fig figcaption{font:400 14px 'DJHand',Consolas,monospace;letter-spacing:.1em;padding:0 8px;background:#fff;color:var(--ink);border:2px solid var(--ink);border-radius:3px;display:inline-block;transform:rotate(-1.4deg);margin:0 0 -8px 6px;position:relative;z-index:2}
#dojo.ui-B #dj-fig svg{display:block;width:100%;height:auto;background:#fff;border:2px solid var(--ink);border-radius:6px}
#dojo.ui-B #dj-nums{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}
#dojo.ui-B #dj-nums div{font:400 14px/1.1 'DJHand',Consolas,monospace;border-bottom:2px dotted rgba(29,42,109,.45);padding:2px 0 1px;letter-spacing:.02em;gap:4px;align-items:baseline}
#dojo.ui-B #dj-nums b{font-weight:400;font-size:15px;white-space:nowrap}
#dojo.ui-B #dj-nums i{display:inline-block;width:15px;height:15px;line-height:11px;margin-right:4px;text-align:center;font:400 12px/11px 'DJHand',Consolas,monospace;font-style:normal;border:2px solid var(--ink);border-radius:50%;background:#fff}
#dojo.ui-B #dj-note{font:400 11px/1.1 'DJHand',Consolas,monospace;letter-spacing:.06em;text-transform:uppercase;opacity:.9;border:0;padding:6px 8px 4px;margin-top:8px;background:#fff;border:2px dashed var(--ink);border-radius:4px;transform:rotate(.6deg)}
#dj-verdict .beat{display:inline-block;animation:beatPop .38s cubic-bezier(.2,1.6,.4,1) both}
#dojo.ui-B #dj-verdict.st-nuke .beat{animation:nuke .14s linear infinite}
#dojo.ui-B #dj-verdict.st-splash .beat{animation:wave 1.3s ease-in-out infinite}
#dojo.ui-B #dj-verdict.st-scraper .beat{animation:scrape .09s linear 6}
#dojo.ui-B #dj-verdict.st-wall .beat{animation:thud .5s cubic-bezier(.3,1.4,.5,1) both}
#dojo.ui-B #dj-verdict.st-close .beat{animation:shiver .12s linear 8}
#dojo.ui-B #dj-verdict.st-foul .beat{transform:skewX(-8deg);display:inline-block}
body:has(#dojo.ui-B) #cmp{background:#fff;border:2.5px solid #1d2a6d;border-radius:12px;box-shadow:5px 5px 0 #ffd23f;transform:rotate(-.25deg);padding:6px 12px}
body:has(#dojo.ui-B) #cmp .line{font:400 17px/1.2 'DJHand',Consolas,monospace;letter-spacing:.02em}
body:has(#dojo.ui-B) #cmp b{font:400 13px/1.1 'DJHand',Consolas,monospace;background:#fff;color:#1d2a6d;border:2px solid #1d2a6d;border-radius:3px;padding:0 6px;transform:rotate(-2deg);letter-spacing:.1em}
body:has(#dojo.ui-B) #spec{background:#ffd23f;border-top:2.5px solid #1d2a6d}
body:has(#dojo.ui-B) #spec span{font-family:'DJHand',Consolas,monospace;font-size:15px;letter-spacing:.04em}
body:has(#dojo.ui-B) #spec span b{background:#1d2a6d;color:#fff;border-radius:3px;font-weight:400}
#dojo.ui-B #dj-seance{background:#fff;color:var(--ink);border:2.5px solid var(--ink);border-radius:12px;box-shadow:4px 4px 0 var(--sun);font-family:'DJHand',Consolas,monospace;font-size:15px;transform:rotate(-.6deg)}
#dojo.ui-B #dj-seance button{font:400 16px 'DJHand',Consolas,monospace;border:2px solid var(--ink);border-radius:5px;background:#fff;color:var(--ink);letter-spacing:.06em;box-shadow:2px 2px 0 var(--hot)}
#dojo.ui-B #dj-seance.on button{background:var(--sun);color:var(--ink)}
#dojo.ui-B #dj-seance .bar{border:2px solid var(--ink);border-radius:4px;height:12px}
@keyframes beatPop{0%{transform:scale(.3) rotate(-7deg);opacity:0}60%{transform:scale(1.2) rotate(2deg);opacity:1}100%{transform:scale(1) rotate(0)}}
@keyframes nuke{0%{transform:translate(2px,-2px) scale(1.04)}25%{transform:translate(-3px,1px) scale(1)}50%{transform:translate(2px,2px) scale(1.05)}75%{transform:translate(-2px,-1px) scale(1)}100%{transform:translate(2px,-2px) scale(1.04)}}
@keyframes wave{0%,100%{transform:skewX(-6deg) translateY(0)}50%{transform:skewX(6deg) translateY(-4px)}}
@keyframes scrape{0%{transform:translateX(-2px)}50%{transform:translateX(2px)}100%{transform:translateX(-2px)}}
@keyframes thud{0%{transform:translateY(-22px) scale(1.2)}35%{transform:translateY(7px) scale(.97)}65%{transform:translateY(-3px)}100%{transform:none}}
@keyframes shiver{0%{transform:rotate(-1.4deg)}50%{transform:rotate(1.4deg)}100%{transform:rotate(-1.4deg)}}
`

const INK = '#1d2a6d'
function rngOf(seed) {
  let a = seed | 0
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const f = (n) => n.toFixed(1)

// a rounded rectangle drawn like a pen would: points every ~16 px with a small wobble, and the line overshoots its start a little
function wobblyRect(x, y, w, h, r, j, rng, tail) {
  const pts = []
  const edge = (x0, y0, x1, y1, nx, ny) => {
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(len / 16))
    for (let i = 0; i < n; i++) { const t = i / n, o = (rng() - 0.5) * 2 * j; pts.push([x0 + (x1 - x0) * t + nx * o, y0 + (y1 - y0) * t + ny * o]) }
  }
  const arc = (cx, cy, a0, a1) => { for (let k = 0; k <= 3; k++) { const a = a0 + ((a1 - a0) * k) / 3, o = (rng() - 0.5) * j; pts.push([cx + Math.cos(a) * (r + o), cy + Math.sin(a) * (r + o)]) } }
  edge(x + r, y, x + w - r, y, 0, 1); arc(x + w - r, y + r, -Math.PI / 2, 0)
  edge(x + w, y + r, x + w, y + h - r, 1, 0); arc(x + w - r, y + h - r, 0, Math.PI / 2)
  if (tail) { // bottom edge runs right to left; the tail spike drops in at the left
    edge(x + w - r, y + h, tail.x + 34, y + h, 0, 1)
    pts.push([tail.x + 30, y + h], [tail.x, tail.y], [tail.x + 6, y + h])
    edge(tail.x + 6, y + h, x + r, y + h, 0, 1)
  } else edge(x + w - r, y + h, x + r, y + h, 0, 1)
  arc(x + r, y + h - r, Math.PI / 2, Math.PI)
  edge(x, y + h - r, x, y + r, 1, 0); arc(x + r, y + r, Math.PI, Math.PI * 1.5)
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${f(p[0])} ${f(p[1])}`).join(' ')
  return d + ` L${f(pts[0][0] + 6)} ${f(pts[0][1] - 1)}`
}
function cloud(w, h, rng, tail) {
  const cx = w / 2, cy = h / 2, rx = w / 2 + 6, ry = h / 2 + 4, ph = rng() * 6
  const pts = []
  for (let a = 0; a < 360; a += 9) {
    const t = (a * Math.PI) / 180
    const lump = 1 + 0.09 * Math.sin(7 * t + ph) + 0.05 * Math.sin(13 * t + ph * 2) + (rng() - 0.5) * 0.02
    pts.push([cx + Math.cos(t) * rx * lump, cy + Math.sin(t) * ry * lump])
  }
  if (tail) { // spike toward the lower left, replacing the points near 150 degrees
    const i0 = Math.round(135 / 9), i1 = Math.round(165 / 9)
    pts.splice(i0, i1 - i0 + 1, [tail.x + 26, h - 4], [tail.x, tail.y], [tail.x + 4, h - 10])
  }
  return pts.map((p, i) => `${i ? 'L' : 'M'}${f(p[0])} ${f(p[1])}`).join(' ') + ' Z'
}

const defs = (id) => `<defs>
  <pattern id="plus-${id}" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M9 5v8M5 9h8" stroke="${INK}" stroke-opacity=".16" stroke-width="1.5" fill="none"/></pattern>
  <pattern id="tick-${id}" width="14" height="12" patternUnits="userSpaceOnUse"><path d="M2 3l4 1M8 8l4 1M3 10l3-1M9 2l3 1" stroke="${INK}" stroke-opacity=".2" stroke-width="1.4" fill="none"/></pattern>
</defs>`
const rivet = (x, y) => `<g transform="translate(${f(x)} ${f(y)})"><circle r="6" fill="#fff" stroke="${INK}" stroke-width="1.8"/><path d="M-3 0h6M0 -3v6" stroke="${INK}" stroke-width="1.5"/></g>`

const frames = new Map()
export function frame(el, { fill, shadow, pattern, seed }) {
  const draw = () => {
    const w = el.offsetWidth + 12, h = el.offsetHeight + 12
    if (w < 40 || h < 40) return
    const rng = rngOf(seed)
    const body = wobblyRect(0, 0, w, h, 14, 2.2, rng)
    const inner = wobblyRect(8, 8, w - 16, h - 16, 10, 1.4, rng)
    const shade = wobblyRect(7, 7, w, h, 14, 2.2, rngOf(seed + 9))
    const id = `${el.id}`
    const svg = `<svg class="frame" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">${defs(id)}
      <path d="${shade}" fill="${shadow}" stroke="${INK}" stroke-width="2"/>
      <path d="${body}" fill="${fill}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="${body}" fill="url(#${pattern}-${id})" stroke="none"/>
      <path d="${inner}" fill="none" stroke="#fff" stroke-width="1.8" stroke-dasharray="7 5"/>
      ${rivet(16, 16)}${rivet(w - 16, 16)}${rivet(16, h - 16)}${rivet(w - 16, h - 16)}</svg>`
    let old = el.querySelector(':scope > svg.frame')
    if (old) old.remove()
    el.insertAdjacentHTML('afterbegin', svg)
  }
  if (!frames.has(el)) { frames.set(el, new ResizeObserver(draw)); frames.get(el).observe(el) }
  draw()
}

const BALLOON = { // fill by outcome; loud outcomes get the lumpy cloud, the rest a plain balloon
  wait: ['#fff', false], gone: ['#ffd2c2', true], nuke: ['#ff9a7a', true], splash: ['#aad8f2', true], scraper: ['#ffe28a', false], wall: ['#ecc9b6', false],
  close: ['#dcdfe8', false], play: ['#d3efe7', false], foul: ['#ececec', false],
}
export function balloon(el, tone) {
  const [fill, loud] = BALLOON[tone] ?? BALLOON.wait
  const w = el.offsetWidth, h = el.offsetHeight
  const rng = rngOf(7 + tone.length * 13)
  const tail = { x: Math.max(18, w * 0.12), y: h + 16 }
  const bodyH = h - 14
  const d = loud ? cloud(w, bodyH, rng, { x: tail.x, y: h + 6 }) : wobblyRect(2, 2, w - 4, bodyH, 18, 1.8, rng, { x: tail.x, y: h + 8 })
  el.classList.toggle('loud', loud)
  el.querySelector(':scope > svg.bal')?.remove()
  el.insertAdjacentHTML('afterbegin', `<svg class="bal" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <path d="${d}" transform="translate(4 4)" fill="${INK}" opacity=".9"/>
    <path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
    ${loud ? `<path d="${d}" transform="translate(0 0) scale(.94) translate(${f(w * 0.032)} ${f(bodyH * 0.032)})" fill="none" stroke="#fff" stroke-width="1.8" stroke-dasharray="7 5"/>` : ''}
    </svg>`)
}
