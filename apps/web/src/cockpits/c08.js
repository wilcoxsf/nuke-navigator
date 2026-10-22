// Cockpit 8, CINEMASCOPE: the swing as a film. A 2.39:1 frame with the park, black bars above and below. The top bar holds the inputs as one line of big numbers
// (drag them); the bottom bar is the subtitle track: the verdict arrives line by line like dialogue, then the numbers as credits, and a film strip with a playhead
// shows where the ball is in its flight (click or drag the strip to scrub it).
import { tiles, TILE_CSS } from './draw.js'

export async function build(root, api, U) {
  const { SPEC, css, windowSync, loadParks, evalParks, scrubNum, clamp } = U
  css('cp8', `
#cp .c8{position:absolute;inset:0;background:transparent}
#cp .c8 .bar{position:absolute;left:0;right:0;background:#000}
#cp .c8 .bar.t{top:0;display:grid;grid-template-columns:200px 1fr 260px;align-items:center;padding:0 30px;border-bottom:1px solid #151b1f}
#cp .c8 .ttl{font:400 12px BC,"Barlow Condensed",sans-serif;letter-spacing:.7em;color:var(--dim);text-transform:uppercase}
#cp .c8 .ttl b{display:block;font:600 20px BC,sans-serif;letter-spacing:.5em;color:var(--tx);font-weight:400;margin-top:3px}
#cp .c8 .ins{display:flex;justify-content:center;gap:34px;align-items:flex-end}
#cp .c8 .ins div{display:flex;flex-direction:column;align-items:center;gap:1px}
#cp .c8 .ins small{font-size:9px;letter-spacing:.35em;color:var(--dim)}
#cp .c8 .ins .num{font:600 46px/1 BC,"Barlow Condensed",sans-serif;letter-spacing:.02em;outline:0;min-width:60px;text-align:center}
#cp .c8 .ins .num:focus{color:var(--acc)}
#cp .c8 .rt{display:flex;gap:12px;justify-content:flex-end;flex-wrap:wrap;font-size:10.5px;letter-spacing:.18em;text-transform:uppercase}
#cp .c8 .rt button{border:0;padding:0;color:var(--dim)}
#cp .c8 .rt button:hover{color:var(--tx)}
#cp .c8 .bar.b{bottom:0;display:flex;flex-direction:column;align-items:center;border-top:1px solid #151b1f}
#cp .c8 .film{position:relative;height:16px;width:100%;cursor:ew-resize;touch-action:none;background:repeating-linear-gradient(90deg,#2a373e 0 9px,#000 9px 14px);border-bottom:1px solid #151b1f}
#cp .c8 .film i{position:absolute;top:-2px;bottom:-2px;width:3px;background:var(--acc)}
#cp .c8 .film em{position:absolute;top:0;bottom:0;width:1px;background:#4a5d65}
#cp .c8 .sub{margin:auto;text-align:center;font-family:SG,"Space Grotesk",Arial,sans-serif;display:grid;gap:6px;padding:6px 30px}
#cp .c8 .sub b{font-size:clamp(22px,2.7vw,36px);font-weight:500;letter-spacing:.1em;text-transform:uppercase;line-height:1.1}
#cp .c8 .sub u{text-decoration:none;font-size:15px;letter-spacing:.14em;color:var(--dim);text-transform:uppercase;min-height:20px}
#cp .c8 .cr{font-size:10px;letter-spacing:.3em;color:var(--dim);margin-bottom:8px;display:flex;gap:26px;flex-wrap:wrap;justify-content:center}
#cp .c8 .cr b{color:var(--tx);font-weight:400}
#cp .c8 .cr .gt{display:flex;gap:2px}
#cp .c8 .cr .gt .t{width:22px;height:14px;font-size:0}
${TILE_CSS('#cp .c8')}
`)
  const pre = Object.keys(api.PRESETS).slice(0, 7)
  root.innerHTML = `<div class="c8"><div class="win" id="c8w" style="position:absolute;left:0;right:0"></div>
  <div class="bar t p" id="c8t"><div class="ttl">Dinger Dojo<b>A SWING IN ONE SHOT</b></div>
    <div class="ins">${[['ev', 'EXIT SPEED'], ['la', 'LAUNCH'], ['dir', 'DIRECTION'], ['temp', 'AIR'], ['wind', 'WIND']].map(([k, l]) => `<div><small>${l}</small><span class="num" data-k="${k}"></span></div>`).join('')}</div>
    <div class="rt">${pre.slice(0, 4).map((n) => `<button data-p="${n}">${n}</button>`).join('')}<button id="c8h"></button><button data-swing style="color:var(--tx)">again</button></div></div>
  <div class="bar b p" id="c8b"><div class="film" id="c8f"><i id="c8pl"></i></div><div class="sub"><b id="c8hd">. . .</b><u id="c8sb"></u></div><div class="cr" id="c8cr"></div></div></div>`
  const E = (id) => root.querySelector(id)
  const parks = await loadParks()
  function layout() {
    const W = innerWidth, H = innerHeight
    const ph = Math.min(H - 220, W / 2.39), bars = (H - ph) / 2
    E('#c8t').style.height = `${bars}px`
    E('#c8b').style.height = `${bars}px`
    Object.assign(E('#c8w').style, { top: `${bars}px`, height: `${ph}px` })
  }
  layout()
  addEventListener('resize', layout)
  windowSync(api, E('#c8w'), { zoom: 1.2 })
  for (const n of root.querySelectorAll('.num')) scrubNum(n, api, n.dataset.k, { px: n.dataset.k === 'ev' ? 3 : 4 })
  for (const b of root.querySelectorAll('[data-p]')) b.addEventListener('click', () => { Object.assign(api.state, api.PRESETS[b.dataset.p]); api.update() })
  E('[data-swing]').addEventListener('click', () => { const k = Object.keys(api.PRESETS); Object.assign(api.state, api.PRESETS[k[Math.floor(Math.random() * k.length)]]); api.update() })
  E('#c8h').addEventListener('click', () => { api.state.hand *= -1; api.update() })
  const film = E('#c8f')
  const frac = (e) => { const r = film.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width, 0, 1) }
  let down = false
  film.addEventListener('pointerdown', (e) => { down = true; film.setPointerCapture(e.pointerId); api.scrub(frac(e)) })
  film.addEventListener('pointermove', (e) => { if (down) api.scrub(frac(e)) })
  film.addEventListener('pointerup', () => { down = false; api.scrub(null) })
  ;(function loop() { E('#c8pl').style.left = `calc(${api.progress() * 100}% - ${api.progress() * 3}px)`; requestAnimationFrame(loop) })()
  let beat = null
  function render(res) {
    const s = api.state, v = res.verdict
    for (const n of root.querySelectorAll('.num')) n.textContent = n.dataset.k === 'ev' ? `${s.ev}` : n.dataset.k === 'la' ? `${s.la}°` : n.dataset.k === 'temp' ? `${s.temp}°F` : SPEC[n.dataset.k].fmt(s[n.dataset.k])
    E('#c8h').textContent = s.hand > 0 ? 'right-handed' : 'left-handed'
    const pr = parks.parks.length ? evalParks(parks, api) : []
    E('#c8cr').innerHTML = `<span>DISTANCE <b>${Math.round(res.landFt)} FT</b></span><span>APEX <b>${Math.round(res.peakFt)} FT</b></span><span>HANG <b>${res.hang.toFixed(1)} S</b></span>${v.wallFt ? `<span>WALL <b>${Math.round(v.wallFt)} / ${v.wallH.toFixed(0)} FT</b></span>` : ''}${pr.length ? `<span>GONE IN <b>${pr.filter((r) => r.k === 'GONE').length} OF ${pr.length}</b></span><span class="gt">${tiles(pr, { val: false })}</span>` : ''}`
    paint()
  }
  function paint() {
    E('#c8hd').textContent = beat ? beat.text : '. . .'
    E('#c8sb').textContent = beat?.sub ?? ''
  }
  return { render, beat: (b) => { beat = b; paint() } }
}
