// Cockpit 6, FLIGHT RECORDER: time is the interface. A wide view of the park over three traces on one clock (height, range, speed) with contact, apex, wall and landing marked.
// Drag across the traces and the ball moves along its flight in the park (the cursor follows the live flight when you let go). The inputs sit in a thin bar on top.
import { series } from './core.js'

export async function build(root, api, U) {
  const { SPEC, css, setP, windowSync, scrubNum, clamp } = U
  css('cp6', `
#cp .c6{position:absolute;inset:10px;display:grid;grid-template-rows:42px minmax(0,1fr) auto;gap:8px}
#cp .c6 .bar{display:flex;align-items:center;gap:20px;border:1px solid var(--ln);background:var(--k);padding:0 12px;font-size:12px}
#cp .c6 .bar .in{display:flex;gap:7px;align-items:baseline;white-space:nowrap}
#cp .c6 .bar label{color:var(--dim);letter-spacing:.14em;font-size:10px}
#cp .c6 .bar .num{border-bottom:1px solid var(--tx);padding:0 3px;min-width:44px;display:inline-block;text-align:right;font-size:14px}
#cp .c6 .bar .num:focus{outline:0;background:var(--tx);color:var(--k)}
#cp .c6 .bar button{font-size:10.5px;padding:3px 8px;letter-spacing:.1em;text-transform:uppercase}
#cp .c6 .bar .go{background:var(--tx);color:var(--k)}
#cp .c6 .bar .sp{flex:1}
#cp .c6 .view{position:relative}
#cp .c6 .slab{position:absolute;right:0;top:0;width:330px;background:var(--acc);color:#0b0a08;padding:12px 16px;display:grid;gap:3px;pointer-events:none}
#cp .c6 .slab.n{background:#3f6270;color:#f4f8f9}
#cp .c6 .slab em{font:400 10px STM,monospace;font-style:normal;letter-spacing:.3em}
#cp .c6 .slab b{font:600 32px/1 BC,"Barlow Condensed",sans-serif;text-transform:uppercase;letter-spacing:.03em}
#cp .c6 .slab u{text-decoration:none;font-size:12px}
#cp .c6 .rec{border:1px solid var(--ln);background:var(--k);display:grid;grid-template-columns:150px 1fr;position:relative}
#cp .c6 .lab{border-right:1px solid var(--ln)}
#cp .c6 .lab div{height:92px;border-bottom:1px solid var(--ln);padding:6px 10px;display:flex;flex-direction:column;justify-content:space-between}
#cp .c6 .lab div:last-child{border-bottom:0}
#cp .c6 .lab em{font-style:normal;font-size:10px;letter-spacing:.25em;color:var(--dim)}
#cp .c6 .lab b{font:600 28px/1 BC,"Barlow Condensed",sans-serif;letter-spacing:.04em}
#cp .c6 .strips{position:relative;cursor:crosshair;touch-action:none}
#cp .c6 canvas{display:block;width:100%;height:92px;border-bottom:1px solid var(--ln)}
#cp .c6 .ax{height:24px;position:relative;font-size:10px;color:var(--dim)}
#cp .c6 .ax span{position:absolute;top:5px;transform:translateX(-50%)}
#cp .c6 .cur{position:absolute;top:0;bottom:24px;width:0;border-left:1px solid var(--tx);pointer-events:none}
#cp .c6 .ev{position:absolute;top:2px;font-size:9px;letter-spacing:.2em;color:var(--acc);pointer-events:none;white-space:nowrap}
`)
  const KEYS = ['ev', 'la', 'dir', 'temp', 'wind']
  const pre = Object.keys(api.PRESETS).slice(0, 7)
  root.innerHTML = `<div class="c6">
  <div class="bar p">${KEYS.map((k) => `<div class="in"><label>${SPEC[k].label}</label><span class="num" data-k="${k}"></span></div>`).join('')}<span class="sp"></span>${pre.map((n) => `<button data-p="${n}">${n}</button>`).join('')}<button id="c6h"></button><button class="go" data-swing>SWING AGAIN</button></div>
  <div class="view"><div class="win" id="c6w" style="position:absolute;inset:0"></div><div class="slab n" id="c6s"><em>TRACKING</em><b>. . .</b><u></u></div></div>
  <div class="rec p"><div class="lab"><div><em>HEIGHT</em><b id="c6a"></b></div><div><em>RANGE</em><b id="c6b"></b></div><div><em>SPEED</em><b id="c6c"></b></div><div style="height:24px;padding:2px 10px"><em id="c6t"></em></div></div>
    <div class="strips" id="c6st"><canvas></canvas><canvas></canvas><canvas></canvas><div class="ax" id="c6x"></div><div class="cur" id="c6cur"></div></div></div></div>`
  windowSync(api, root.querySelector('#c6w'), { zoom: 1.35 })
  for (const n of root.querySelectorAll('.num')) scrubNum(n, api, n.dataset.k, { px: n.dataset.k === 'ev' ? 3 : 4 })
  for (const b of root.querySelectorAll('[data-p]')) b.addEventListener('click', () => { Object.assign(api.state, api.PRESETS[b.dataset.p]); api.update() })
  root.querySelector('[data-swing]').addEventListener('click', () => { const k = Object.keys(api.PRESETS); Object.assign(api.state, api.PRESETS[k[Math.floor(Math.random() * k.length)]]); api.update() })
  root.querySelector('#c6h').addEventListener('click', () => { api.state.hand *= -1; api.update() })
  let S = null, T = 1, beat = null, cvs = [...root.querySelectorAll('canvas')]
  const strips = root.querySelector('#c6st'), cur = root.querySelector('#c6cur')
  const defs = [{ key: 'h', unit: 'FT' }, { key: 'range', unit: 'FT' }, { key: 'speed', unit: 'MPH' }]
  function draw(res) {
    S = series({ path: res.visPath ?? res.path, verdict: res.verdict }, api.FT)
    T = S.pts[S.end].t
    const v = res.verdict
    cvs.forEach((c, i) => {
      const r = c.getBoundingClientRect(), dpr = devicePixelRatio || 1
      c.width = Math.max(10, r.width * dpr); c.height = r.height * dpr
      const g = c.getContext('2d'); g.scale(dpr, dpr)
      const W = r.width, H = r.height, k = defs[i].key
      let hi = Math.max(...S.pts.map((p) => p[k])) * 1.12
      if (i === 0 && v.wallH) hi = Math.max(hi, v.wallH * 1.4)
      if (i === 1 && v.wallFt) hi = Math.max(hi, v.wallFt * 1.08)
      const X = (t) => (t / T) * W, Y = (val) => H - 6 - (val / hi) * (H - 12)
      g.strokeStyle = '#1f2a30'; g.lineWidth = 1
      for (let q = 1; q < 4; q++) { g.beginPath(); g.moveTo(0, (H * q) / 4); g.lineTo(W, (H * q) / 4); g.stroke() }
      g.setLineDash([3, 4]); g.strokeStyle = '#3a4b52'
      const evs = [S.apex, S.wall, S.end].filter((e) => e >= 0)
      for (const e of evs) { g.beginPath(); g.moveTo(X(S.pts[e].t), 0); g.lineTo(X(S.pts[e].t), H); g.stroke() }
      g.setLineDash([])
      const ref = i === 0 ? v.wallH : i === 1 ? v.wallFt : null
      if (ref) { g.strokeStyle = '#e0a24a'; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(0, Y(ref)); g.lineTo(W, Y(ref)); g.stroke(); g.setLineDash([]); g.fillStyle = '#e0a24a'; g.font = '10px STM,monospace'; g.fillText(`WALL ${Math.round(ref)}`, 6, Y(ref) - 4) }
      g.strokeStyle = '#dfe9ec'; g.lineWidth = 2; g.beginPath()
      S.pts.forEach((p, j) => { const x = X(p.t), y = Y(p[k]); j ? g.lineTo(x, y) : g.moveTo(x, y) })
      g.stroke()
      if (i === 0) { g.fillStyle = '#dfe9ec'; const a = S.pts[S.apex]; g.fillRect(X(a.t) - 3, Y(a.h) - 3, 6, 6) }
      if (i === 1 && S.wall >= 0) { g.fillStyle = '#e0a24a'; g.fillRect(X(S.pts[S.wall].t) - 4, Y(S.pts[S.wall].range) - 4, 8, 8) }
    })
    const ax = root.querySelector('#c6x')
    const stepT = T > 6 ? 1 : 0.5
    let h = ''
    for (let t = 0; t <= T + 1e-6; t += stepT) h += `<span style="left:${(t / T) * 100}%">${t.toFixed(1)}s</span>`
    ax.innerHTML = h
    root.querySelectorAll('.ev').forEach((e) => e.remove())
    const lab = [[0, 'CONTACT'], [S.apex, 'APEX'], [S.wall, 'WALL'], [S.end, 'LANDING']].filter(([e]) => e >= 0)
    for (const [e, name] of lab) { const d = document.createElement('div'); d.className = 'ev'; d.textContent = `${name} T+${S.pts[e].t.toFixed(1)}`; const pc = (S.pts[e].t / T) * 100; if (pc > 60) d.style.right = `calc(${100 - pc}% + 4px)`; else d.style.left = `calc(${pc}% + 4px)`; strips.appendChild(d) }
  }
  const at = (t) => {
    const P = S.pts; let i = 0
    while (i < P.length - 2 && P[i + 1].t < t) i++
    const a = P[i], b = P[i + 1] ?? a, f = b.t > a.t ? clamp((t - a.t) / (b.t - a.t), 0, 1) : 0
    return { t, h: a.h + (b.h - a.h) * f, range: a.range + (b.range - a.range) * f, speed: a.speed + (b.speed - a.speed) * f }
  }
  // cursor follows live progress; dragging scrubs the ball
  let scrubbing = false
  const frac = (e) => { const r = strips.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width, 0, 1) }
  strips.addEventListener('pointerdown', (e) => { scrubbing = true; strips.setPointerCapture(e.pointerId); api.scrub(frac(e)) })
  strips.addEventListener('pointermove', (e) => { if (scrubbing || e.buttons === 0) api.scrub(frac(e)) })
  strips.addEventListener('pointerup', () => { scrubbing = false })
  strips.addEventListener('pointerleave', () => { if (!scrubbing) api.scrub(null) })
  function loop() {
    if (S) {
      const f = api.progress(), p = at(f * T)
      cur.style.left = `${f * 100}%`
      root.querySelector('#c6a').textContent = `${Math.round(p.h)} FT`
      root.querySelector('#c6b').textContent = `${Math.round(p.range)} FT`
      root.querySelector('#c6c').textContent = `${Math.round(p.speed)} MPH`
      root.querySelector('#c6t').textContent = `T + ${p.t.toFixed(2)} S`
    }
    requestAnimationFrame(loop)
  }
  loop()
  let lastRes = null
  addEventListener('resize', () => { if (lastRes) draw(lastRes) })
  function render(res) {
    lastRes = res
    const s = api.state
    for (const n of root.querySelectorAll('.num')) n.textContent = `${SPEC[n.dataset.k].fmt(s[n.dataset.k])}${SPEC[n.dataset.k].unit && n.dataset.k !== 'dir' && n.dataset.k !== 'wind' ? ' ' + SPEC[n.dataset.k].unit : ''}`
    root.querySelector('#c6h').textContent = s.hand > 0 ? 'RIGHT' : 'LEFT'
    draw(res)
  }
  function paint() {
    const el = root.querySelector('#c6s')
    el.className = 'slab' + (beat && beat.last && ['gone', 'nuke', 'splash', 'scraper'].includes(beat.tone) ? '' : ' n')
    el.querySelector('em').textContent = beat ? beat.state : 'TRACKING'
    el.querySelector('b').textContent = beat ? beat.text : '. . .'
    el.querySelector('u').textContent = beat?.sub ?? ''
  }
  return { render, beat: (b) => { beat = b; paint() } }
}
