// Cockpit 4, SCHEMATIC: one drawing sheet. Fig 1 the park, Fig 2 the plan view with all 30 fences drawn over each other (click it to aim the swing), Fig 3 the side
// elevation, Fig 4 the rear elevation (the flight seen from behind the plate against the fence skyline). Tables hold the inputs (drag a number or step it) and the result,
// and the title block carries the verdict.
import { elevation, plan } from './draw.js'

export async function build(root, api, U) {
  const { SPEC, css, h, setP, windowSync, loadParks, fencePoly, wallFnOf, scrubNum, clamp } = U
  css('cp4', `
#cp .c4{position:absolute;inset:12px;display:grid;gap:10px;grid-template-columns:1.2fr 1fr;grid-template-rows:minmax(0,1fr) 222px 178px}
#cp .c4 .fig{position:relative;border:1px solid var(--ln);background:var(--k);min-height:0}
#cp .c4 .fig.clear{background:transparent}
#cp .c4 .fig .cap{position:absolute;top:0;left:0;right:0;display:flex;justify-content:space-between;font:400 11px BC,"Barlow Condensed",sans-serif;letter-spacing:.28em;padding:3px 8px;border-bottom:1px solid var(--ln);color:var(--dim);z-index:2;background:var(--k)}
#cp .c4 .fig.clear .cap{background:transparent;border-bottom:0}
#cp .c4 .fig .in{position:absolute;inset:24px 6px 4px}
#cp .c4 .bot{grid-column:1/3;display:grid;grid-template-columns:1fr 1fr 1.3fr;gap:10px}
#cp .c4 table{border-collapse:collapse;width:100%;font-size:12px}
#cp .c4 td{border-top:1px solid var(--ln);padding:1px 8px;height:20px}
#cp .c4 td:first-child{color:var(--dim);letter-spacing:.1em;width:46%}
#cp .c4 td b{font-weight:400}
#cp .c4 .num{display:inline-block;min-width:80px;padding:0 6px;border:1px solid var(--ln);cursor:ns-resize;text-align:right}
#cp .c4 .num:focus{outline:1px solid var(--tx)}
#cp .c4 .st button{padding:0 7px;font-size:12px;margin-left:2px}
#cp .c4 .tb{position:relative;display:grid;grid-template-columns:1fr 150px;border:1px solid var(--tx);background:var(--k)}
#cp .c4 .tb .a{padding:10px 14px;display:flex;flex-direction:column;justify-content:center;gap:4px}
#cp .c4 .tb .a em{font-style:normal;font-size:10px;letter-spacing:.3em;color:var(--dim)}
#cp .c4 .tb .a b{font:600 34px/1 BC,"Barlow Condensed",sans-serif;text-transform:uppercase;letter-spacing:.03em}
#cp .c4 .tb .a u{text-decoration:none;color:var(--dim);font-size:12px}
#cp .c4 .tb .b{border-left:1px solid var(--tx);display:grid;grid-template-rows:1fr 1fr 1fr;font-size:10px;color:var(--dim);letter-spacing:.14em}
#cp .c4 .tb .b div{padding:4px 8px;border-top:1px solid var(--ln)}
#cp .c4 .tb .b div:first-child{border-top:0}
#cp .c4 .tb .b b{display:block;color:var(--tx);font-weight:400;font-size:13px;letter-spacing:.06em}
#cp .c4 .tools{display:flex;gap:4px;flex-wrap:wrap;padding:4px 8px}
#cp .c4 .tools button{font-size:10.5px;padding:2px 7px;letter-spacing:.08em;text-transform:uppercase}
#cp .c4 .tools .go{background:var(--tx);color:var(--k)}
`)
  const KEYS = ['ev', 'la', 'dir', 'temp', 'wind']
  const pre = Object.keys(api.PRESETS).slice(0, 7)
  root.innerHTML = `<div class="c4">
  <div class="fig clear" id="c4w"><div class="cap"><span>FIG. 1 &nbsp; ORACLE PARK</span><span>PERSPECTIVE</span></div></div>
  <div class="fig p"><div class="cap"><span>FIG. 2 &nbsp; PLAN, ALL 30 FENCES</span><span>CLICK TO AIM</span></div><div class="in" id="c4p" style="cursor:crosshair"></div></div>
  <div class="fig p"><div class="cap"><span>FIG. 3 &nbsp; SIDE ELEVATION</span><span>FEET</span></div><div class="in" id="c4s"></div></div>
  <div class="fig p"><div class="cap"><span>FIG. 4 &nbsp; REAR ELEVATION</span><span>FLIGHT AGAINST THE FENCE LINE</span></div><div class="in" id="c4r"></div></div>
  <div class="bot">
    <div class="fig p"><div class="cap"><span>TABLE 1 &nbsp; INPUTS</span><span>DRAG A NUMBER</span></div><div class="in" style="inset:22px 0 0"><table id="c4i"></table></div></div>
    <div class="fig p"><div class="cap"><span>TABLE 2 &nbsp; RESULT</span><span></span></div><div class="in" style="inset:22px 0 0"><table id="c4t"></table></div></div>
    <div class="tb p"><div class="a"><em>DINGER DOJO &nbsp;/&nbsp; ORACLE PARK</em><b id="c4h">. . .</b><u id="c4u"></u><div class="tools">${pre.map((n) => `<button data-p="${n}">${n}</button>`).join('')}<button id="c4hand"></button><button class="go" data-swing>SWING AGAIN</button></div></div>
      <div class="b"><div>DRAWING<b>CALL SHEET 04</b></div><div>OUTCOME<b id="c4o">TRACKING</b></div><div>SCALE<b>1 : FIELD</b></div></div></div>
  </div></div>`
  windowSync(api, root.querySelector('#c4w'), { zoom: 1.0 })
  const parks = await loadParks()
  const sf = parks.parks.find((p) => p.abbr === 'SF')
  const fences = parks.parks.map((p) => ({ pts: fencePoly(parks, p), hot: p.abbr === 'SF' }))
  // inputs table with drag numbers and steppers
  const ti = root.querySelector('#c4i')
  ti.innerHTML = KEYS.map((k) => `<tr><td>${SPEC[k].label}</td><td class="st"><span class="num" data-k="${k}"></span><button data-k="${k}" data-d="-1">−</button><button data-k="${k}" data-d="1">+</button></td></tr>`).join('')
  for (const n of ti.querySelectorAll('.num')) scrubNum(n, api, n.dataset.k, { px: n.dataset.k === 'ev' ? 3 : 4 })
  for (const b of ti.querySelectorAll('button')) b.addEventListener('click', () => setP(api, b.dataset.k, api.state[b.dataset.k] + Number(b.dataset.d)))
  for (const b of root.querySelectorAll('[data-p]')) b.addEventListener('click', () => { Object.assign(api.state, api.PRESETS[b.dataset.p]); api.update() })
  root.querySelector('[data-swing]').addEventListener('click', () => { const k = Object.keys(api.PRESETS); Object.assign(api.state, api.PRESETS[k[Math.floor(Math.random() * k.length)]]); api.update() })
  root.querySelector('#c4hand').addEventListener('click', () => { api.state.hand *= -1; api.update() })
  // click or drag on the plan view to aim
  const pbox = root.querySelector('#c4p')
  const aim = (e) => {
    const sv = pbox.querySelector('svg'); if (!sv) return
    const pt = sv.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY
    const m = sv.getScreenCTM(); if (!m) return
    const q = pt.matrixTransform(m.inverse()), W = 520, H = 380
    setP(api, 'dir', Math.round((Math.atan2(q.x - W / 2, H - 16 - q.y) * 180) / Math.PI))
  }
  let down = false
  pbox.addEventListener('pointerdown', (e) => { down = true; aim(e) })
  addEventListener('pointerup', () => { down = false })
  pbox.addEventListener('pointermove', (e) => { if (down) aim(e) })
  function rear(res) {
    const W = 520, H = 210, X = (x) => W / 2 + x * (W / 700), base = H - 24
    const v = res.verdict, ymax = Math.max(res.peakFt * 1.1, (v.wallH ?? 0) + 20, 80), Y = (hh) => base - (Math.max(hh, -2) / ymax) * (base - 14)
    let g = ''
    for (let x = -300; x <= 300; x += 100) g += `<line x1="${X(x)}" x2="${X(x)}" y1="14" y2="${base}" stroke="#6f8892" stroke-opacity=".3" stroke-dasharray="2 4"/><text x="${X(x)}" y="${H - 8}" fill="#6f8892" font-size="9" text-anchor="middle">${x === 0 ? '0' : Math.abs(x) + (x < 0 ? ' L' : ' R')}</text>`
    for (let hh = 20; hh < ymax; hh += 20) g += `<line x1="26" x2="${W - 8}" y1="${Y(hh)}" y2="${Y(hh)}" stroke="#6f8892" stroke-opacity=".2" stroke-dasharray="2 4"/><text x="22" y="${Y(hh) + 3}" fill="#6f8892" font-size="9" text-anchor="end">${hh}</text>`
    g += `<line x1="26" x2="${W - 8}" y1="${base}" y2="${base}" stroke="#dfe9ec" stroke-width="1.3"/>`
    if (sf) {
      const f = wallFnOf(parks, sf), pts = []
      for (let b = -45; b <= 45; b += 3) { const [d, hh] = f(b); pts.push(`${X(d * Math.sin((b * Math.PI) / 180)).toFixed(1)},${Y(hh).toFixed(1)}`) }
      g += `<polyline points="${pts.join(' ')}" fill="none" stroke="#e0a24a" stroke-width="2"/>`
    }
    const pts = res.path.filter((_, i) => i % 5 === 0).map((q) => `${X(q.p[0] / api.FT).toFixed(1)},${Y(q.p[2] / api.FT).toFixed(1)}`).join(' ')
    g += `<polyline points="${pts}" fill="none" stroke="#dfe9ec" stroke-width="1.7"/>`
    const L = res.path[res.path.length - 1].p
    g += `<path d="M${X(L[0] / api.FT) - 4} ${Y(0) - 4}L${X(L[0] / api.FT) + 4} ${Y(0) + 4}M${X(L[0] / api.FT) + 4} ${Y(0) - 4}L${X(L[0] / api.FT) - 4} ${Y(0) + 4}" stroke="#e0a24a" stroke-width="2"/>`
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" font-family="STM,Consolas,monospace">${g}</svg>`
  }
  let beat = null
  const q = (id) => root.querySelector(id)
  function render(res) {
    const s = api.state, v = res.verdict
    for (const n of ti.querySelectorAll('.num')) n.textContent = `${SPEC[n.dataset.k].fmt(s[n.dataset.k])}${SPEC[n.dataset.k].unit && n.dataset.k !== 'dir' && n.dataset.k !== 'wind' ? ' ' + SPEC[n.dataset.k].unit : ''}`
    q('#c4p').innerHTML = plan(res, api.FT, { w: 520, h: 380, fences, reach: 450, fs: 9 })
    q('#c4s').innerHTML = elevation(res, api.FT, { w: 520, h: 200, ml: 30, fs: 9 })
    q('#c4r').innerHTML = rear(res)
    const rows = [['A', 'LAUNCH', `${s.ev} MPH AT ${s.la} DEG`], ['B', 'APEX', `${Math.round(res.peakFt)} FT`], ['D', 'DISTANCE', `${Math.round(res.landFt)} FT`], ['', 'HANG TIME', `${res.hang.toFixed(1)} S`], ['', 'SPIN', `${Math.round(res.wb)} / ${Math.round(res.ws)} RPM`]]
    if (v.wallFt) rows.push(['C', 'WALL', `${Math.round(v.wallFt)} FT, ${v.wallH.toFixed(0)} FT TALL`], ['', v.kind === 'GONE' ? 'CLEARED BY' : 'SHORT BY', `${(v.kind === 'GONE' ? v.clearBy : v.short ?? 0).toFixed(0)} FT`])
    q('#c4t').innerHTML = rows.slice(0, 7).map(([a, b, c]) => `<tr><td>${a ? `<b style="display:inline-block;width:14px;height:14px;border:1px solid var(--dim);border-radius:50%;text-align:center;line-height:12px;font-size:9px;margin-right:6px">${a}</b>` : ''}${b}</td><td><b>${c}</b></td></tr>`).join('')
    q('#c4hand').textContent = s.hand > 0 ? 'RIGHT' : 'LEFT'
    paint()
  }
  function paint() {
    q('#c4h').textContent = beat ? beat.text : '. . .'
    q('#c4u').textContent = beat?.sub ?? ''
    q('#c4o').textContent = beat ? beat.state : 'TRACKING'
  }
  return { render, beat: (b) => { beat = b; paint() } }
}
