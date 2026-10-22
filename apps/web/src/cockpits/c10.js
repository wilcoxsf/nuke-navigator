// Cockpit 10, POD HUD: the park fills the windshield and the instruments are drawn on the glass. A heading tape across the top (direction), a speed tape on the left (exit speed),
// a pitch tape on the right (launch angle): each scrolls under a fixed marker and can be dragged. A joystick pad sets direction and launch angle together; two trim bars set
// the air and the wind. A gunsight sits in the middle; the verdict and a row of flight numbers run along the bottom.
export async function build(root, api, U) {
  const { SPEC, css, svgNS, setP, windowSync, drag, clamp, denorm, norm } = U
  css('cp10', `
#cp .c10{position:absolute;inset:0}
#cp .c10 svg{position:absolute;overflow:visible}
#cp .c10 .hit{pointer-events:auto;cursor:grab;touch-action:none}
#cp .c10 .res{position:absolute;left:50%;bottom:62px;transform:translateX(-50%);text-align:center;width:min(820px,62vw);padding:22px 20px 40px;background:linear-gradient(rgba(3,4,5,0),rgba(3,4,5,.78) 38%,rgba(3,4,5,.78))}
#cp .c10 .res em{font-style:normal;font-size:11px;letter-spacing:.4em;color:var(--dim)}
#cp .c10 .res b{display:block;font:600 clamp(34px,4.4vw,58px)/1 BC,"Barlow Condensed",sans-serif;text-transform:uppercase;letter-spacing:.04em;margin:2px 0 3px}
#cp .c10 .res u{text-decoration:none;color:var(--acc);font-size:14px}
#cp .c10 .nums{position:absolute;left:50%;bottom:24px;z-index:2;transform:translateX(-50%);display:flex;gap:28px;font-size:11px;letter-spacing:.2em;color:var(--dim);white-space:nowrap;background:rgba(3,4,5,.78);padding:8px 18px}
#cp .c10 .nums b{color:var(--tx);font-weight:400;margin-left:6px;letter-spacing:.06em;font-size:13px}
#cp .c10 .pad{position:absolute;left:28px;bottom:28px;width:176px;height:176px;border:1px solid rgba(223,233,236,.6);background:rgba(3,4,5,.6);cursor:crosshair;touch-action:none}
#cp .c10 .pad i{position:absolute;width:14px;height:14px;margin:-7px 0 0 -7px;border:2px solid var(--acc);border-radius:50%}
#cp .c10 .pad .ax{position:absolute;background:rgba(223,233,236,.25)}
#cp .c10 .pad small,#cp .c10 .trim small{position:absolute;font-size:9px;letter-spacing:.25em;color:var(--dim)}
#cp .c10 .trim{position:absolute;right:28px;bottom:28px;width:200px;display:grid;gap:18px}
#cp .c10 .trim div{position:relative;height:30px;cursor:ew-resize;touch-action:none;border-bottom:1px solid rgba(223,233,236,.6)}
#cp .c10 .trim div i{position:absolute;bottom:-1px;width:3px;height:14px;background:var(--acc)}
#cp .c10 .trim div b{position:absolute;right:0;top:0;font:600 20px BC,"Barlow Condensed",sans-serif;letter-spacing:.03em}
#cp .c10 .trim div small{left:0;top:2px}
#cp .c10 .tl{position:absolute;left:28px;top:20px;font-size:10px;letter-spacing:.35em;color:var(--dim);line-height:1.8}
#cp .c10 .tl button{display:block;border:0;padding:0;color:var(--dim);font-size:10px;letter-spacing:.2em;text-transform:uppercase;margin:0 0 4px}
#cp .c10 .tl button:hover{color:var(--tx)}
`)
  const pre = Object.keys(api.PRESETS).slice(0, 7)
  root.innerHTML = `<div class="c10"><div class="win" id="c10w" style="position:absolute;inset:0"></div>
    <svg id="c10s" style="left:0;top:0;width:100%;height:100%;pointer-events:none"></svg>
    <div class="tl p">DINGER DOJO<br>${pre.map((n) => `<button data-p="${n}">${n}</button>`).join('')}<button id="c10h"></button><button data-swing style="color:var(--tx)">swing again</button></div>
    <div class="res"><em id="c10e">TRACKING</em><b id="c10b">. . .</b><u id="c10u"></u></div><div class="nums" id="c10n"></div>
    <div class="pad p" id="c10p"><div class="ax" style="left:50%;top:0;bottom:0;width:1px"></div><div class="ax" style="top:50%;left:0;right:0;height:1px"></div><i></i><small style="left:6px;top:4px">LAUNCH</small><small style="right:6px;bottom:4px">DIRECTION</small></div>
    <div class="trim p"><div data-k="temp"><small>AIR</small><i></i><b></b></div><div data-k="wind"><small>WIND</small><i></i><b></b></div></div></div>`
  const svg = root.querySelector('#c10s'), E = (id) => root.querySelector(id)
  windowSync(api, E('#c10w'), { zoom: 1.0 })
  for (const b of root.querySelectorAll('[data-p]')) b.addEventListener('click', () => { Object.assign(api.state, api.PRESETS[b.dataset.p]); api.update() })
  E('[data-swing]').addEventListener('click', () => { const k = Object.keys(api.PRESETS); Object.assign(api.state, api.PRESETS[k[Math.floor(Math.random() * k.length)]]); api.update() })
  E('#c10h').addEventListener('click', () => { api.state.hand *= -1; api.update() })
  // joystick pad: x = direction, y = launch angle (up is higher)
  const pad = E('#c10p')
  const padSet = (e) => {
    const r = pad.getBoundingClientRect()
    setP(api, 'dir', denorm('dir', clamp((e.clientX - r.left) / r.width, 0, 1)))
    setP(api, 'la', denorm('la', 1 - clamp((e.clientY - r.top) / r.height, 0, 1)))
  }
  drag(pad, (e) => padSet(e))
  for (const t of root.querySelectorAll('.trim div')) drag(t, (e) => { const r = t.getBoundingClientRect(); setP(api, t.dataset.k, denorm(t.dataset.k, clamp((e.clientX - r.left) / r.width, 0, 1))) })
  // geometry and tapes
  let G = null, last = null
  const add = (tag, a) => { const e = svgNS(tag, a); svg.appendChild(e); return e }
  const BONE = '#dfe9ec', DIM = '#6f8892', ACC = '#e0a24a'
  function tapeV(x, cy, len, key, side, unit, lo, hi, minor, major) { // vertical tape, increasing upward, markers on the inner edge
    const g = add('g', {}), s = api.state[key]
    const inner = side === 'l' ? x + 62 : x
    g.appendChild(svgNS('rect', { x, y: cy - len / 2, width: 62, height: len, fill: 'rgba(3,4,5,.45)' }))
    const clip = svgNS('clipPath', { id: `cl-${key}` }); clip.appendChild(svgNS('rect', { x: x - 40, y: cy - len / 2, width: 150, height: len })); g.appendChild(clip)
    const inn = svgNS('g', { 'clip-path': `url(#cl-${key})` }); g.appendChild(inn)
    for (let v = lo; v <= hi; v += minor) {
      const y = cy - (v - s) * unit
      if (Math.abs(y - cy) > len / 2) continue
      const isMajor = (v - lo) % major === 0, L = isMajor ? 16 : 8
      inn.appendChild(svgNS('line', { x1: inner, x2: side === 'l' ? inner - L : inner + L, y1: y, y2: y, stroke: BONE, 'stroke-width': 1.2, 'stroke-opacity': isMajor ? 1 : 0.55 }))
      if (isMajor) { const t = svgNS('text', { x: side === 'l' ? inner - 22 : inner + 22, y: y + 4, fill: BONE, 'font-size': 12, 'text-anchor': side === 'l' ? 'end' : 'start', 'font-family': 'STM,monospace' }); t.textContent = String(v); inn.appendChild(t) }
    }
    const bx = side === 'l' ? inner + 2 : inner - 74
    g.appendChild(svgNS('rect', { x: bx, y: cy - 17, width: 72, height: 34, fill: '#030405', stroke: ACC, 'stroke-width': 1.5 }))
    const t = svgNS('text', { x: bx + 36, y: cy + 8, fill: BONE, 'font-size': 24, 'text-anchor': 'middle', 'font-family': 'BC,"Barlow Condensed",sans-serif' }); t.textContent = key === 'ev' ? `${s}` : `${s}°`; g.appendChild(t)
    const hit = svgNS('rect', { x: x - 10, y: cy - len / 2, width: 82, height: len, fill: 'rgba(0,0,0,0)', class: 'hit' }); g.appendChild(hit)
    let v0 = 0, p0 = 0
    drag(hit, (e, ph) => { if (ph === 'down') { v0 = api.state[key]; p0 = e.clientY } else if (ph === 'move') setP(api, key, v0 + Math.round((e.clientY - p0) / unit)) })
    return g
  }
  function compass(cx, y, len) {
    const s = api.state.dir, unit = 11
    const g = add('g', {}), clip = svgNS('clipPath', { id: 'cl-dir' }); clip.appendChild(svgNS('rect', { x: cx - len / 2, y: y - 10, width: len, height: 70 })); g.appendChild(clip)
    g.appendChild(svgNS('rect', { x: cx - len / 2, y, width: len, height: 40, fill: 'rgba(3,4,5,.45)' }))
    const inn = svgNS('g', { 'clip-path': 'url(#cl-dir)' }); g.appendChild(inn)
    for (let v = -50; v <= 50; v++) {
      const x = cx + (v - s) * unit
      if (Math.abs(x - cx) > len / 2) continue
      const isMajor = v % 10 === 0, L = isMajor ? 14 : v % 5 === 0 ? 9 : 5
      inn.appendChild(svgNS('line', { x1: x, x2: x, y1: y + 40, y2: y + 40 - L, stroke: BONE, 'stroke-width': 1.2, 'stroke-opacity': isMajor ? 1 : 0.55 }))
      if (isMajor) { const t = svgNS('text', { x, y: y + 15, fill: BONE, 'font-size': 12, 'text-anchor': 'middle', 'font-family': 'STM,monospace' }); t.textContent = v === 0 ? 'CF' : v < 0 ? `L${-v}` : `R${v}`; inn.appendChild(t) }
    }
    g.appendChild(svgNS('path', { d: `M${cx} ${y + 44}l-8 12h16z`, fill: ACC }))
    const t = svgNS('text', { x: cx, y: y + 80, fill: BONE, 'font-size': 26, 'text-anchor': 'middle', 'font-family': 'BC,"Barlow Condensed",sans-serif' }); t.textContent = SPEC.dir.fmt(s); g.appendChild(t)
    const hit = svgNS('rect', { x: cx - len / 2, y, width: len, height: 44, fill: 'rgba(0,0,0,0)', class: 'hit' }); g.appendChild(hit)
    let v0 = 0, p0 = 0
    drag(hit, (e, ph) => { if (ph === 'down') { v0 = api.state.dir; p0 = e.clientX } else if (ph === 'move') setP(api, 'dir', v0 - Math.round((e.clientX - p0) / unit)) })
  }
  function sights(cx, cy) {
    const r = 54
    add('circle', { cx, cy, r, fill: 'none', stroke: BONE, 'stroke-width': 1.2, 'stroke-opacity': 0.8 })
    add('circle', { cx, cy, r: 3, fill: ACC })
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) add('line', { x1: cx + dx * (r + 4), y1: cy + dy * (r + 4), x2: cx + dx * (r + 22), y2: cy + dy * (r + 22), stroke: BONE, 'stroke-width': 1.2 })
    const b = 120
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add('path', { d: `M${cx + sx * b} ${cy + sy * (b - 22)}V${cy + sy * b}H${cx + sx * (b - 22)}`, fill: 'none', stroke: BONE, 'stroke-width': 1.2, 'stroke-opacity': 0.8 })
  }
  function draw() {
    const W = innerWidth, H = innerHeight
    svg.innerHTML = ''
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
    const cy = H * 0.46
    compass(W / 2, 22, Math.min(640, W * 0.46))
    tapeV(28, cy, Math.min(460, H * 0.56), 'ev', 'l', 4.6, 60, 125, 1, 5)
    tapeV(W - 90, cy, Math.min(460, H * 0.56), 'la', 'r', 6.5, -10, 60, 1, 5)
    sights(W / 2, cy)
    G = { W, H }
    const s = api.state
    const pi = pad.querySelector('i')
    pi.style.left = `${norm('dir', s.dir) * 100}%`; pi.style.top = `${(1 - norm('la', s.la)) * 100}%`
    for (const t of root.querySelectorAll('.trim div')) { t.querySelector('i').style.left = `calc(${norm(t.dataset.k, s[t.dataset.k]) * 100}% - 1px)`; t.querySelector('b').textContent = `${SPEC[t.dataset.k].fmt(s[t.dataset.k])}${t.dataset.k === 'temp' ? '°F' : ''}` }
    E('#c10h').textContent = s.hand > 0 ? 'right-handed' : 'left-handed'
  }
  let beat = null
  function render(res) {
    last = res
    draw()
    const v = res.verdict
    E('#c10n').innerHTML = `<span>DIST<b>${Math.round(res.landFt)} FT</b></span><span>APEX<b>${Math.round(res.peakFt)} FT</b></span><span>HANG<b>${res.hang.toFixed(1)} S</b></span>${v.wallFt ? `<span>WALL<b>${Math.round(v.wallFt)} / ${v.wallH.toFixed(0)} FT</b></span><span>${v.kind === 'GONE' ? 'OVER' : 'SHORT'}<b>${(v.kind === 'GONE' ? v.clearBy : v.short ?? 0).toFixed(0)} FT</b></span>` : ''}<span>AIR<b>${res.rho.toFixed(3)}</b></span>`
    paint()
  }
  function paint() {
    E('#c10e').textContent = beat ? beat.state : 'TRACKING'
    E('#c10b').textContent = beat ? beat.text : '. . .'
    E('#c10u').textContent = beat?.sub ?? ''
  }
  addEventListener('resize', () => { if (last) render(last) })
  return { render, beat: (b) => { beat = b; paint() } }
}
