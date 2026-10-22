// Cockpit 7, MONOLITH: almost nothing. The park fills the screen and one black slab (the 4 by 9 face of the monolith) carries every result, revealed after the ball lands:
// the verdict, one huge distance, a few lines, the 30 parks. The five inputs are big bare numbers in the corners that you drag up and down; no boxes, no buttons but a few quiet words.
import { tiles, TILE_CSS } from './draw.js'

export async function build(root, api, U) {
  const { SPEC, css, windowSync, loadParks, evalParks, scrubNum } = U
  css('cp7', `
#cp .c7{position:absolute;inset:0}
#cp .c7 .mono{position:absolute;border:1px solid rgba(223,233,236,.55);background:#030405;padding:20px 22px 16px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px}
#cp .c7 .st{font:400 12px BC,"Barlow Condensed",sans-serif;letter-spacing:.45em;color:var(--dim);min-height:16px;text-transform:uppercase}
#cp .c7 .hd{font:600 34px/1 BC,"Barlow Condensed",sans-serif;text-transform:uppercase;letter-spacing:.03em;min-height:70px;display:flex;align-items:center;justify-content:center}
#cp .c7 .fade{transition:opacity .5s;opacity:1;width:100%}
#cp .c7 .fade.hide{opacity:0}
#cp .c7 .big{display:flex;align-items:baseline;justify-content:center;gap:8px;margin-top:6px}
#cp .c7 .big b{font:600 124px/.9 BC,"Barlow Condensed",sans-serif;letter-spacing:.01em}
#cp .c7 .big span{font:400 18px BC,sans-serif;letter-spacing:.3em;color:var(--dim)}
#cp .c7 .sb{color:var(--acc);font-size:13px}
#cp .c7 hr{width:60%;border:0;border-top:1px solid var(--ln);margin:6px auto}
#cp .c7 .ln{display:grid;gap:3px;font-size:12px}
#cp .c7 .ln div{display:flex;justify-content:space-between;gap:10px}
#cp .c7 .ln span{color:var(--dim);letter-spacing:.14em}
#cp .c7 .gr{margin-top:auto}
#cp .c7 .gt{display:grid;grid-template-columns:repeat(6,1fr);gap:3px}
#cp .c7 .gt .t{height:25px}
#cp .c7 .gn{font-size:11px;letter-spacing:.2em;color:var(--dim);margin-bottom:5px}
#cp .c7 .gn b{color:var(--acc);font-weight:400}
#cp .c7 .cn{position:absolute;display:flex;flex-direction:column;gap:2px;user-select:none}
#cp .c7 .cn small{font-size:10px;letter-spacing:.3em;color:var(--dim)}
#cp .c7 .cn .num{font:600 84px/.9 BC,"Barlow Condensed",sans-serif;letter-spacing:.01em;outline:0}
#cp .c7 .cn .num.s{font-size:44px}
#cp .c7 .cn .num:focus{color:var(--acc)}
#cp .c7 .q{position:absolute;display:flex;gap:16px;font-size:11px;letter-spacing:.18em;text-transform:uppercase}
#cp .c7 .q button{border:0;padding:0;color:var(--dim)}
#cp .c7 .q button:hover{color:var(--tx)}
${TILE_CSS('#cp .c7')}
`)
  const pre = Object.keys(api.PRESETS).slice(0, 7)
  root.innerHTML = `<div class="c7"><div class="win" id="c7w" style="position:absolute"></div>
    <div class="mono p" id="c7m"><div class="st" id="c7s">TRACKING</div><div class="hd" id="c7h">. . .</div>
      <div class="fade hide" id="c7f1"><div class="big"><b id="c7b"></b><span>FT</span></div><div class="sb" id="c7u"></div></div>
      <hr><div class="fade hide ln" id="c7l"></div>
      <div class="fade hide gr" id="c7g"></div></div>
    <div class="cn p" id="c7ev"><small>EXIT SPEED</small><span class="num" data-k="ev"></span></div>
    <div class="cn p" id="c7la"><small>LAUNCH ANGLE</small><span class="num" data-k="la"></span></div>
    <div class="cn p" id="c7dir"><small>DIRECTION</small><span class="num" data-k="dir"></span></div>
    <div class="cn p" id="c7tw"><small>AIR AND WIND</small><span class="num s" data-k="temp"></span><span class="num s" data-k="wind"></span></div>
    <div class="q p" id="c7q">${pre.map((n) => `<button data-p="${n}">${n}</button>`).join('')}<button id="c7h2"></button><button data-swing style="color:var(--tx)">swing again</button></div></div>`
  const parks = await loadParks()
  for (const n of root.querySelectorAll('.num')) scrubNum(n, api, n.dataset.k, { px: n.dataset.k === 'ev' ? 3 : 4 })
  for (const b of root.querySelectorAll('[data-p]')) b.addEventListener('click', () => { Object.assign(api.state, api.PRESETS[b.dataset.p]); api.update() })
  root.querySelector('[data-swing]').addEventListener('click', () => { const k = Object.keys(api.PRESETS); Object.assign(api.state, api.PRESETS[k[Math.floor(Math.random() * k.length)]]); api.update() })
  root.querySelector('#c7h2').addEventListener('click', () => { api.state.hand *= -1; api.update() })
  const E = (id) => root.querySelector(id)
  function layout() {
    const W = innerWidth, H = innerHeight, mh = Math.min(H * 0.84, 760), mw = (mh * 4) / 9, left = W - mw - Math.max(24, W * 0.04), top = (H - mh) / 2
    Object.assign(E('#c7m').style, { left: `${left}px`, top: `${top}px`, width: `${mw}px`, height: `${mh}px` })
    Object.assign(E('#c7w').style, { left: '0', top: '0', width: `${left - 12}px`, height: `${H}px` })
    Object.assign(E('#c7ev').style, { left: '30px', top: '24px' })
    Object.assign(E('#c7la').style, { left: '30px', top: `${H - 142}px` })
    Object.assign(E('#c7dir').style, { left: `${Math.max(300, (left - 12) / 2 - 80)}px`, top: `${H - 142}px` })
    Object.assign(E('#c7tw').style, { left: `${Math.max(300, (left - 12) / 2 - 80)}px`, top: '24px' })
    Object.assign(E('#c7q').style, { left: '30px', top: `${H - 26}px` })
  }
  layout()
  addEventListener('resize', layout)
  windowSync(api, E('#c7w'), { zoom: 0.8 })
  let beat = null
  function render(res) {
    const s = api.state, v = res.verdict
    for (const n of root.querySelectorAll('.num')) n.textContent = n.dataset.k === 'ev' ? `${s.ev}` : n.dataset.k === 'la' ? `${s.la}°` : n.dataset.k === 'temp' ? `${s.temp}°F` : SPEC[n.dataset.k].fmt(s[n.dataset.k])
    E('#c7h2').textContent = s.hand > 0 ? 'right-handed' : 'left-handed'
    E('#c7b').textContent = `${Math.round(res.landFt)}`
    const rows = [['APEX', `${Math.round(res.peakFt)} FT`], ['HANG', `${res.hang.toFixed(1)} S`], ['SPIN', `${Math.round(res.wb)} / ${Math.round(res.ws)}`], ['AIR', res.rho.toFixed(3)]]
    if (v.wallFt) rows.unshift(['WALL', `${Math.round(v.wallFt)} / ${v.wallH.toFixed(0)} FT`], ['AT WALL', `${v.cross.toFixed(0)} FT`])
    E('#c7l').innerHTML = rows.map(([a, b]) => `<div><span>${a}</span><b style="font-weight:400">${b}</b></div>`).join('')
    if (parks.parks.length) { const pr = evalParks(parks, api); E('#c7g').innerHTML = `<div class="gn">GONE IN <b>${pr.filter((r) => r.k === 'GONE').length}</b> OF ${pr.length} PARKS</div><div class="gt">${tiles(pr, { val: false })}</div>` }
    paint()
  }
  function paint() {
    E('#c7s').textContent = beat ? beat.state : 'TRACKING'
    E('#c7h').textContent = beat ? beat.text : '. . .'
    E('#c7u').textContent = beat?.sub ?? ''
    const on = !!(beat && beat.last)
    for (const id of ['#c7f1', '#c7l', '#c7g']) E(id).classList.toggle('hide', !on)
  }
  return { render, beat: (b) => { beat = b; paint() } }
}
