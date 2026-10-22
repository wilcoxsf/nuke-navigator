// Cockpit 2, HAL RING: the park seen through one round porthole. Every input is an arc of tick marks around it that you drag: direction across the top,
// exit speed up the left, launch angle up the right, temperature and wind along the bottom. Below it, one red eye and the verdict in a single line.
// Left column: the flight numbers. Right column: the 30-park tiles.
import { tiles, TILE_CSS } from './draw.js'

export async function build(root, api, U) {
  const { SPEC, h, css, svgNS, setP, norm, denorm, windowSync, loadParks, evalParks, drag, clamp } = U
  css('cp2', `
#cp .c2{position:absolute;inset:0;--acc:#c9332a}
#cp .c2 .mask{position:absolute;inset:0;pointer-events:none}
#cp .c2 svg.ring{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
#cp .c2 svg .hit{pointer-events:stroke;cursor:grab}
#cp .c2 .col{position:absolute;top:104px;font-size:12.5px;display:grid;gap:3px;align-content:start}
#cp .c2 .col.l{left:28px;width:210px}
#cp .c2 .col.r{right:28px;width:236px}
#cp .c2 .r1{display:flex;gap:6px;align-items:baseline}
#cp .c2 .r1 span{color:var(--dim);letter-spacing:.1em;font-size:11px}
#cp .c2 .r1 i{flex:1;border-bottom:1px dotted var(--ln);transform:translateY(-3px)}
#cp .c2 .col h4{margin:0 0 6px;font:600 13px BC,"Barlow Condensed",sans-serif;letter-spacing:.3em;color:var(--dim);font-weight:400}
#cp .c2 .gt{display:grid;grid-template-columns:repeat(6,1fr);gap:3px}
#cp .c2 .gt .t{height:34px}
#cp .c2 .gn{color:var(--tx);font-size:12px;margin-bottom:6px;letter-spacing:.06em}
#cp .c2 .pre{position:absolute;left:24px;bottom:18px;display:flex;gap:4px;flex-wrap:wrap;width:360px}
#cp .c2 .pre button{font-size:10.5px;padding:3px 8px;letter-spacing:.1em;text-transform:uppercase}
#cp .c2 .pre .go{background:var(--tx);color:var(--k)}
${TILE_CSS('#cp .c2', '#c9332a')}
`)
  const pre = Object.keys(api.PRESETS).slice(0, 7)
  root.innerHTML = `<div class="c2"><div class="mask"></div><div class="win" id="c2w" style="position:absolute"></div><svg class="ring"></svg>
  <div class="col l p" id="c2l"></div><div class="col r p" id="c2r"></div>
  <div class="pre p">${pre.map((n) => `<button data-p="${n}">${n}</button>`).join('')}<button id="c2h"></button><button class="go" data-swing>SWING AGAIN</button></div></div>`
  const svg = root.querySelector('svg.ring'), mask = root.querySelector('.mask'), win = root.querySelector('#c2w')
  const parks = await loadParks()
  let G = null, beat = null, last = null
  // sector definitions: centre angle (SVG degrees, clockwise from +x), half span, direction (+1 raises the value clockwise), ring offset
  const ARCS = [
    { k: 'dir', c: -90, s: 42, d: 1, off: 22, major: 10, step: 5, every: 10, lab: (v) => (v === 0 ? 'CF' : v < 0 ? `${-v}` : `${v}`) },
    { k: 'ev', c: 180, s: 36, d: 1, off: 22, major: 10, step: 5, every: 20, lab: (v) => `${v}` },
    { k: 'la', c: 0, s: 36, d: -1, off: 22, major: 10, step: 5, every: 10, lab: (v) => `${v}` },
    { k: 'temp', c: 118, s: 22, d: -1, off: 22, major: 10, step: 5, every: 20, lab: (v) => `${v}` },
    { k: 'wind', c: 62, s: 22, d: -1, off: 22, major: 10, step: 2, every: 10, lab: (v) => `${v}` },
  ]
  const ang = (a, f) => a.c + a.d * (f - 0.5) * 2 * a.s
  const pol = (cx, cy, r, deg) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)]
  const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180
  function layout() {
    const W = innerWidth, H = innerHeight, R = Math.min(H * 0.285, W * 0.26), cx = W / 2, cy = H * 0.49
    G = { W, H, R, cx, cy }
    win.style.cssText = `position:absolute;left:${cx - R}px;top:${cy - R}px;width:${2 * R}px;height:${2 * R}px`
    mask.style.background = `radial-gradient(circle at ${cx}px ${cy}px, transparent ${R - 0.5}px, #050608 ${R + 0.5}px)`
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
    svg.innerHTML = ''
    const add = (tag, a) => { const e = svgNS(tag, a); svg.appendChild(e); return e }
    add('circle', { cx, cy, r: R, fill: 'none', stroke: '#dfe9ec', 'stroke-width': 1.5 })
    for (const a of ARCS) {
      const r = R + a.off, S = SPEC[a.k]
      const [x0, y0] = pol(cx, cy, r, ang(a, 0)), [x1, y1] = pol(cx, cy, r, ang(a, 1))
      const sweep = a.d > 0 ? 1 : 0
      add('path', { d: `M${x0} ${y0}A${r} ${r} 0 0 ${sweep} ${x1} ${y1}`, fill: 'none', stroke: '#2a3b43', 'stroke-width': 1.2 })
      for (let v = S.lo; v <= S.hi; v += a.step) {
        const f = (v - S.lo) / (S.hi - S.lo), major = (v - S.lo) % a.major === 0
        const [ax, ay] = pol(cx, cy, r, ang(a, f)), [bx, by] = pol(cx, cy, r + (major ? 9 : 4), ang(a, f))
        add('line', { x1: ax, y1: ay, x2: bx, y2: by, stroke: major ? '#8aa3ad' : '#44585f', 'stroke-width': 1 })
        if ((v - S.lo) % a.every === 0) {
          const [lx, ly] = pol(cx, cy, r + 21, ang(a, f))
          const t = add('text', { x: lx, y: ly + 3, fill: '#6f8892', 'font-size': 9, 'text-anchor': 'middle', 'font-family': 'STM,Consolas,monospace' })
          t.textContent = a.lab(v)
        }
      }
      a.geo = { r }
      a.prog = add('path', { fill: 'none', stroke: a.k === 'dir' ? '#c9332a' : '#dfe9ec', 'stroke-width': 3 })
      a.dot = add('circle', { r: 6, fill: '#050608', stroke: a.k === 'dir' ? '#c9332a' : '#dfe9ec', 'stroke-width': 2 })
      const hit = add('path', { d: `M${x0} ${y0}A${r} ${r} 0 0 ${sweep} ${x1} ${y1}`, fill: 'none', stroke: 'rgba(0,0,0,0)', 'stroke-width': 34, class: 'hit' })
      drag(hit, (e) => {
        const d = wrap((Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI - a.c)
        const f = clamp(0.5 + d / (a.d * 2 * a.s), 0, 1)
        setP(api, a.k, denorm(a.k, f))
      })
    }
    // labels for the sectors
    const L = (id, x, y, anchor, size) => { const t = add('text', { id, x, y, fill: '#dfe9ec', 'font-size': size, 'text-anchor': anchor, 'font-family': 'BC,"Barlow Condensed",sans-serif', 'letter-spacing': '0.08em' }); return t }
    const T = (txt, x, y, anchor) => { const t = add('text', { x, y, fill: '#6f8892', 'font-size': 11, 'text-anchor': anchor, 'letter-spacing': '0.22em', 'font-family': 'STM,Consolas,monospace' }); t.textContent = txt }
    T('DIRECTION', cx, cy - R - 88, 'middle'); L('c2-dir', cx, cy - R - 62, 'middle', 30)
    T('EXIT SPEED', cx - R - 84, cy - 14, 'end'); L('c2-ev', cx - R - 84, cy + 20, 'end', 36)
    T('LAUNCH ANGLE', cx + R + 84, cy - 14, 'start'); L('c2-la', cx + R + 84, cy + 20, 'start', 36)
    T('AIR TEMP', cx - R * 1.2, cy + R + 34, 'end'); L('c2-temp', cx - R * 1.2, cy + R + 62, 'end', 28)
    T('WIND', cx + R * 1.2, cy + R + 34, 'start'); L('c2-wind', cx + R * 1.2, cy + R + 62, 'start', 28)
    // the eye
    const ey = Math.min(H - 118, cy + R + 56)
    add('circle', { cx, cy: ey, r: 20, fill: 'none', stroke: '#dfe9ec', 'stroke-width': 1.5 })
    add('circle', { cx, cy: ey, r: 14, fill: '#050608', stroke: '#2a3b43', 'stroke-width': 1 })
    G.eye = add('circle', { cx, cy: ey, r: 9, fill: '#3a1210' })
    add('circle', { cx: cx - 3, cy: ey - 3, r: 1.8, fill: '#e8c9c5' })
    G.head = add('text', { x: cx, y: ey + 56, fill: '#dfe9ec', 'font-size': 40, 'text-anchor': 'middle', 'font-family': 'BC,"Barlow Condensed",sans-serif', 'letter-spacing': '0.06em' })
    G.sub = add('text', { x: cx, y: ey + 78, fill: '#6f8892', 'font-size': 13, 'text-anchor': 'middle', 'font-family': 'STM,Consolas,monospace' })
    G.state = add('text', { x: cx - 36, y: ey + 4, fill: '#6f8892', 'font-size': 11, 'text-anchor': 'end', 'letter-spacing': '0.3em', 'font-family': 'STM,Consolas,monospace' })
    windowSync(api, win, { zoom: 1.55 })
    if (last) render(last)
    if (beat) setBeat(beat)
  }
  function render(res) {
    last = res
    if (!G) return
    const s = api.state, v = res.verdict
    for (const a of ARCS) {
      const f = norm(a.k, s[a.k]), [px, py] = pol(G.cx, G.cy, a.geo.r, ang(a, f)), [sx, sy] = pol(G.cx, G.cy, a.geo.r, ang(a, 0))
      a.dot.setAttribute('cx', px); a.dot.setAttribute('cy', py)
      const large = Math.abs(ang(a, f) - ang(a, 0)) > 180 ? 1 : 0
      a.prog.setAttribute('d', `M${sx} ${sy}A${a.geo.r} ${a.geo.r} 0 ${large} ${a.d > 0 ? 1 : 0} ${px} ${py}`)
    }
    const set = (id, t) => { const e = svg.querySelector('#' + id); if (e) e.textContent = t }
    set('c2-dir', SPEC.dir.fmt(s.dir)); set('c2-ev', `${s.ev} MPH`); set('c2-la', `${s.la}°`); set('c2-temp', `${s.temp}°F`); set('c2-wind', SPEC.wind.fmt(s.wind))
    const rows = [['DISTANCE', `${Math.round(res.landFt)} FT`], ['APEX', `${Math.round(res.peakFt)} FT`], ['HANG TIME', `${res.hang.toFixed(1)} S`], ['BACKSPIN', `${Math.round(res.wb)} RPM`], ['SIDESPIN', `${Math.round(res.ws)} RPM`], ['AIR', `${res.rho.toFixed(3)}`]]
    if (v.wallFt) rows.push(['WALL', `${Math.round(v.wallFt)} / ${v.wallH.toFixed(0)} FT`], ['AT WALL', `${v.cross.toFixed(0)} FT`], [v.kind === 'GONE' ? 'CLEARED BY' : 'SHORT BY', `${(v.kind === 'GONE' ? v.clearBy : v.short ?? 0).toFixed(0)} FT`])
    root.querySelector('#c2l').innerHTML = `<h4>FLIGHT</h4>` + rows.map(([a, b]) => `<div class="r1"><span>${a}</span><i></i><b style="font-weight:400">${b}</b></div>`).join('')
    if (parks.parks.length) {
      const pr = evalParks(parks, api)
      root.querySelector('#c2r').innerHTML = `<h4>30 PARKS</h4><div class="gn">GONE IN ${pr.filter((r) => r.k === 'GONE').length} OF ${pr.length}</div><div class="gt">${tiles(pr)}</div>`
    }
    root.querySelector('#c2h').textContent = s.hand > 0 ? 'RIGHT-HANDED' : 'LEFT-HANDED'
  }
  function setBeat(b) {
    if (!G) return
    G.head.textContent = b.text
    G.sub.textContent = b.sub || ''
    G.state.textContent = b.state
    const hr = b.tone === 'gone' || b.tone === 'nuke' || b.tone === 'splash' || b.tone === 'scraper'
    G.eye.setAttribute('fill', b.last ? (hr ? '#c9332a' : '#3a1210') : '#3a1210')
  }
  for (const b of root.querySelectorAll('[data-p]')) b.addEventListener('click', () => { Object.assign(api.state, api.PRESETS[b.dataset.p]); api.update() })
  root.querySelector('[data-swing]').addEventListener('click', () => { const k = Object.keys(api.PRESETS); Object.assign(api.state, api.PRESETS[k[Math.floor(Math.random() * k.length)]]); api.update() })
  root.querySelector('#c2h').addEventListener('click', () => { api.state.hand *= -1; api.update() })
  addEventListener('resize', layout)
  layout()
  return { render, beat: (b) => { beat = b; setBeat(b) } }
}
