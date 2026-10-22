// Study 1, FTL PANELS: the Discovery Bank layout rebuilt as an austere arcade ship console. Outlined panels with their titles cut into the border, segmented power bars for every input
// (click or drag along a bar), bitmap type, a line-only plan view and side arc along the bottom, the verdict stamped in flat, and a dithered park. Live mode: every change flies the ball.
import { skelPlan, skelArc, SKEL_CSS, accentPicker, segs, litSegs, restamp, tileHTML, isHR } from './skel.js'

export async function build(root, api, U) {
  const { SPEC, css, setP, windowSync, loadParks, evalParks, fencePoly, drag, denorm, norm, clamp } = U
  css('cp11', SKEL_CSS + `
#cp .c11{position:absolute;inset:10px;display:grid;gap:12px;grid-template-columns:262px 1fr 292px;grid-template-rows:20px minmax(0,1fr) 220px}
#cp .c11 .hdr{grid-column:1/4;display:flex;justify-content:space-between;align-items:center}
#cp .c11 .left{grid-row:2;padding:20px 14px 14px;display:grid;align-content:start;gap:14px}
#cp .c11 .win{grid-column:2;grid-row:2}
#cp .c11 .right{grid-column:3;grid-row:2;display:grid;grid-template-rows:auto 1fr;gap:12px;background:transparent;border:0}
#cp .c11 .right .pnl{padding:18px 12px 12px}
#cp .c11 .bot{grid-column:1/4;grid-row:3;display:grid;grid-template-columns:1fr 1fr 1.35fr 176px;gap:12px}
#cp .c11 .sys .r{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}
#cp .c11 .sys .v{font-weight:400;font-size:30px}
#cp .c11 .sys .sr{display:grid;grid-template-columns:24px 1fr 24px;gap:6px;align-items:center}
#cp .c11 .sys .sr button{font-size:20px;padding:0;height:24px;line-height:1}
#cp .c11 .two{display:grid;grid-template-columns:1fr 1fr;gap:6px}
#cp .c11 .two button{padding:6px 4px;font-size:17px}
#cp .c11 .on{background:var(--tx)!important;color:var(--k)!important}
#cp .c11 .tel{display:grid;gap:5px;font-size:20px}
#cp .c11 .tel div{display:flex;justify-content:space-between}
#cp .c11 .tel span{color:var(--dim)}
#cp .c11 .tel .hot{color:var(--acc)}
#cp .c11 .gt{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;grid-auto-rows:40px}
#cp .c11 .gn{margin-bottom:8px;color:var(--acc);font-size:20px}
#cp .c11 .fig{padding:14px 6px 4px}
#cp .c11 .vd{position:absolute;inset:14px 12px 10px;display:flex;flex-direction:column;justify-content:space-between;padding:8px}
#cp .c11 .vd .hd{font-size:44px;line-height:.92}
#cp .c11 .vd .sb{font-size:19px;color:var(--dim)}
#cp .c11 .vd.hr .st,#cp .c11 .vd.hr .hd{color:var(--acc)}
#cp .c11 .go{font:16px/1.4 PS2P,monospace;display:flex;align-items:center;justify-content:center;text-align:center;height:100%;width:100%;letter-spacing:0}
`)
  root.classList.add('skel')
  window.__cpRibbon = 1.8
  api.NN.setPix({ pix: 2, mode: 1, levels: 4, a: '#030403', b: '#e9e7dc' })
  const KEYS = ['ev', 'la', 'dir', 'temp', 'wind']
  const pre = Object.keys(api.PRESETS).slice(0, 7)
  root.innerHTML = `<div class="c11"><div class="hdr"><span class="ps">DINGER DOJO // STUDY 1 // FTL PANELS</span><span id="c11a"></span></div>
  <div class="pnl left p"><span class="t">SYSTEMS</span>
    ${KEYS.map((k) => `<div class="sys" data-k="${k}"><div class="r"><span class="ps">${SPEC[k].label}</span><b class="v"></b></div><div class="sr"><button data-d="-1">-</button>${segs(22)}<button data-d="1">+</button></div></div>`).join('')}
    <div class="sys"><div class="r"><span class="ps">BATTER</span></div><div class="two"><button id="c11L">LEFT</button><button id="c11R">RIGHT</button></div></div>
    <div class="sys"><div class="r"><span class="ps">PRESETS</span></div><div class="two">${pre.map((n) => `<button data-p="${n}">${n}</button>`).join('')}</div></div></div>
  <div class="pnl clear win" id="c11w"><span class="t">ORACLE PARK</span></div>
  <div class="right"><div class="pnl p"><span class="t">TELEMETRY</span><div class="tel" id="c11t"></div></div><div class="pnl p"><span class="t">THIRTY PARKS</span><div class="gn" id="c11n"></div><div class="gt" id="c11g"></div></div></div>
  <div class="bot">
    <div class="pnl p"><span class="t">PLAN</span><div class="fig" id="c11p" style="position:absolute;inset:12px 4px 2px"></div></div>
    <div class="pnl p"><span class="t">ARC</span><div class="fig" id="c11r" style="position:absolute;inset:12px 4px 2px"></div></div>
    <div class="pnl p"><span class="t">VERDICT</span><div class="vd" id="c11v"><div class="ps st">TRACKING</div><div class="hd">. . .</div><div class="sb"></div></div></div>
    <div class="pnl p" style="padding:0"><span class="t">FIRE</span><button class="go" id="c11s">SWING</button></div>
  </div></div>`
  accentPicker(root, root.querySelector('#c11a'))
  windowSync(api, root.querySelector('#c11w'), { zoom: 1.0 })
  for (const sys of root.querySelectorAll('.sys[data-k]')) {
    const k = sys.dataset.k, seg = sys.querySelector('.seg')
    drag(seg, (e) => { const r = seg.getBoundingClientRect(); setP(api, k, denorm(k, clamp((e.clientX - r.left) / r.width, 0, 1))) })
    for (const b of sys.querySelectorAll('.sr button')) b.addEventListener('click', () => setP(api, k, api.state[k] + Number(b.dataset.d) * (k === 'ev' ? 1 : 1)))
  }
  const E = (id) => root.querySelector(id)
  E('#c11L').addEventListener('click', () => { api.state.hand = -1; api.update() })
  E('#c11R').addEventListener('click', () => { api.state.hand = 1; api.update() })
  for (const b of root.querySelectorAll('[data-p]')) b.addEventListener('click', () => { Object.assign(api.state, api.PRESETS[b.dataset.p]); api.update() })
  E('#c11s').addEventListener('click', () => api.update())
  const parks = await loadParks()
  const fences = parks.parks.map((p) => ({ pts: fencePoly(parks, p), hot: p.abbr === 'SF' }))
  let beat = null
  function render(res) {
    const s = api.state, v = res.verdict
    for (const sys of root.querySelectorAll('.sys[data-k]')) {
      const k = sys.dataset.k
      litSegs(sys.querySelector('.seg'), norm(k, s[k]), true)
      sys.querySelector('.v').textContent = `${SPEC[k].fmt(s[k])}${SPEC[k].unit && k !== 'dir' && k !== 'wind' ? ' ' + SPEC[k].unit : ''}`
    }
    E('#c11L').classList.toggle('on', s.hand < 0); E('#c11R').classList.toggle('on', s.hand > 0)
    const rows = [['DISTANCE', `${Math.round(res.landFt)} FT`], ['APEX', `${Math.round(res.peakFt)} FT`], ['HANG', `${res.hang.toFixed(1)} S`], ['BACKSPIN', `${Math.round(res.wb)}`], ['SIDESPIN', `${Math.round(res.ws)}`], ['AIR', res.rho.toFixed(3)]]
    if (v.wallFt) rows.push(['WALL', `${Math.round(v.wallFt)} / ${v.wallH.toFixed(0)}`], ['AT WALL', `${v.cross.toFixed(0)} FT`], [v.kind === 'GONE' ? 'OVER BY' : 'SHORT BY', `${(v.kind === 'GONE' ? v.clearBy : v.short ?? 0).toFixed(0)} FT`])
    E('#c11t').innerHTML = rows.map(([a, b], i) => `<div><span>${a}</span><b class="${i >= 6 ? 'hot' : ''}" style="font-weight:400">${b}</b></div>`).join('')
    E('#c11p').innerHTML = skelPlan(res, api.FT, { w: 330, h: 190, fences })
    E('#c11r').innerHTML = skelArc(res, api.FT, { w: 330, h: 190 })
    if (parks.parks.length) { const pr = evalParks(parks, api); E('#c11g').innerHTML = tileHTML(pr); E('#c11n').textContent = `GONE IN ${pr.filter((r) => r.k === 'GONE').length} OF ${pr.length}` }
    paint(false)
  }
  function paint(stampIt) {
    const vd = E('#c11v')
    vd.classList.toggle('hr', isHR(beat))
    vd.querySelector('.st').textContent = beat ? beat.state : 'TRACKING'
    vd.querySelector('.hd').textContent = beat ? beat.text : '. . .'
    vd.querySelector('.sb').textContent = beat?.sub ?? ''
    if (stampIt) restamp(vd)
  }
  return { render, beat: (b) => { beat = b; paint(!!b.last) } }
}
