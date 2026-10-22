// Study 16, WIRE PARK (green phosphor by default): the real Oracle Park mesh drawn as a wireframe (hard edges plus height contours, faces black so only the near lines show) is the hero,
// with the ball's flight in the accent color through it. Readouts and the verdict float over the park; a row of big press-down buttons sets the swing; along the bottom are the field plan,
// the arc, the five league histograms and the thirty-park grid. The WIRE button switches back to the stippled skeleton shader of study 13. Panels pop and tilt a little on hover.
import { SKEL_CSS, restamp, tileHTML, isHR } from './skel.js'
import { finishUI, oracleFence, oracleFences, THEME_CSS, JUICE_CSS, themePicker, popPanels, pressEl, makeControls, makeSession, loadDists, METRICS, histSVG, pctWord, bigPlan, arcSVG } from './skel2.js'

export async function build(root, api, U) {
  const { css, loadParks, evalParks, fencePoly, windowSync } = U
  css('cp16', SKEL_CSS + THEME_CSS + JUICE_CSS + `
#cp .c16{position:absolute;inset:10px;display:grid;gap:12px;grid-template-columns:repeat(7,1fr);grid-template-rows:20px minmax(0,1fr) 78px 206px}
#cp .c16 .hdr{grid-column:1/8;display:flex;justify-content:space-between;align-items:center}
#cp .c16 .hdr .rt{display:flex;gap:14px;align-items:center}
#cp .c16 .hdr .bt{font:8px/1 PS2P,monospace;padding:5px 8px;box-shadow:0 3px 0 var(--e)}
#cp .c16 .hero{grid-column:1/8;position:relative}
#cp .c16 .ov{position:absolute;left:14px;top:14px;display:grid;gap:4px;font-size:24px;pointer-events:none}
#cp .c16 .ov div span{color:var(--dim);margin-right:8px}
#cp .c16 .ov .hot{color:var(--acc)}
#cp .c16 .vd{position:absolute;right:14px;top:14px;width:310px;padding:14px;background:var(--k);border:1px solid var(--tx)}
#cp .c16 .vd .hd{font-size:44px;line-height:.92}
#cp .c16 .vd.hr .hd,#cp .c16 .vd.hr .st{color:var(--acc)}
#cp .c16 .vd.pv .hd{color:var(--dim);font-size:30px}
#cp .c16 .vd .sb{font-size:18px;color:var(--dim);min-height:18px;margin-top:4px}
#cp .c16 .tly{position:absolute;left:14px;bottom:12px;font-size:18px;display:grid;gap:1px;pointer-events:none}
#cp .c16 .tly div{color:var(--dim)}
#cp .c16 .tly div.n{color:var(--acc)}
#cp .c16 .tly div.h{color:var(--tx)}
#cp .c16 .tly .c{color:var(--tx);margin-bottom:3px}
#cp .c16 .tly .c span{color:var(--dim)}
#cp .c16 .strip{grid-column:1/8;display:grid;grid-template-columns:repeat(6,1fr) 1.4fr;gap:10px;padding-bottom:6px}
#cp .c16 .strip .bt{padding:8px 10px 4px;display:flex;flex-direction:column;justify-content:space-between}
#cp .c16 .strip .bt .ps{color:var(--dim)}
#cp .c16 .strip .bt.arm .ps{color:var(--k)}
#cp .c16 .strip .bt b{font-weight:400;font-size:32px;line-height:.9}
#cp .c16 .strip .bt .ud{position:absolute;right:6px;top:6px;display:grid;gap:3px}
#cp .c16 .strip .bt .ud i{display:block;width:16px;height:12px;border:1px solid currentColor;font-style:normal;font-size:12px;line-height:10px;text-align:center}
#cp .c16 .strip .bt .ud i:active{background:var(--acc);border-color:var(--acc);color:var(--k)}
#cp .c16 .strip .bt.hot b{font:18px/1.3 PS2P,monospace;align-self:center;margin:auto}
#cp .c16 .fig{position:absolute;inset:14px 6px 4px}
#cp .c16 .b1{grid-column:1/2}
#cp .c16 .b2{grid-column:2/4}
#cp .c16 .b3{grid-column:4/7}
#cp .c16 .b4{grid-column:7/8}
#cp .c16 .lg{padding:16px 10px 6px;display:grid;grid-template-rows:repeat(5,minmax(0,1fr));gap:2px}
#cp .c16 .lg .m{display:grid;grid-template-columns:92px 1fr;gap:8px;min-height:0;align-items:center}
#cp .c16 .lg .m span{color:var(--dim);font-size:13px;display:block;line-height:1}
#cp .c16 .lg .m b{font-weight:400;font-size:20px;line-height:1}
#cp .c16 .lg .m i{font-style:normal;color:var(--acc);font-size:13px}
#cp .c16 .lg .m .hg{height:100%;min-height:0}
#cp .c16 .gt{display:grid;grid-template-columns:repeat(5,1fr);gap:3px;grid-auto-rows:minmax(0,1fr);padding:16px 8px 22px;height:100%}
#cp .c16 .gn{position:absolute;left:8px;bottom:4px;color:var(--acc);font-size:15px}
`)
  root.classList.add('skel')
  window.__cpRibbon = 2.4
  api.NN.setFpsCap(30) // stepped, low-frame-rate look and half the GPU load
  const ctl = makeControls(api, U), ses = makeSession(api)
  root.innerHTML = `<div class="c16"><div class="hdr"><span class="ps">DINGER DOJO // STUDY 16 // WIRE PARK</span><span class="rt"><span class="bt" id="c16w">WIRE ON</span><span id="c16a"></span></span></div>
  <div class="pnl clear win hero" id="c16h"><span class="t">/ O R A C L E &nbsp; P A R K /</span><div class="ov" id="c16o"></div>
    <div class="vd p" id="c16v"><div class="ps st">PREVIEW</div><div class="hd">. . .</div><div class="sb"></div></div><div class="tly" id="c16t"></div></div>
  <div class="strip p" id="c16s">${ctl.SLOTS.map((s, i) => `<div class="bt" data-i="${i}"><span class="ps">${i + 1} ${s.label}</span><b></b><span class="ud"><i data-d="1">+</i><i data-d="-1">-</i></span></div>`).join('')}<div class="bt hot" data-i="6"><span class="ps">ENTER</span><b>SWING</b></div></div>
  <div class="pnl p pop b1"><span class="t">/ P L A N /</span><div class="fig" id="c16p"></div></div>
  <div class="pnl p pop b2"><span class="t">/ A R C /</span><div class="fig" id="c16r"></div></div>
  <div class="pnl p pop b3 lg" id="c16l"><span class="t">/ V S &nbsp; L E A G U E /</span></div>
  <div class="pnl p pop b4"><span class="t">/ P A R K S /</span><div class="gt" id="c16g"></div><div class="gn" id="c16n"></div></div></div>`
  const E = (id) => root.querySelector(id)
  let wired = true
  const showWire = () => {
    api.NN.setDuo(null) // no leftover duotone from the K look: the park keeps the theme's own ground color
    if (wired) { api.NN.setPix({ pix: 0, mode: 0 }); const t = THEME(); api.NN.setWire(true, { angle: 60, step: 4, hidden: true, opacity: 0.85, color: t.tx, face: t.k }) } else { api.NN.setWire(false); api.NN.setPix({ pix: 2, mode: 2, levels: 2, a: '#030403', b: '#e9e7dc' }) }
    E('#c16w').textContent = wired ? 'WIRE ON' : 'WIRE OFF'
  }
  let cur = null
  const THEME = () => ({ tx: getComputedStyle(root).getPropertyValue('--tx').trim(), k: getComputedStyle(root).getPropertyValue('--k').trim() })
  cur = themePicker(root, E('#c16a'), api, 16, 'green', { park: true, onChange: () => { if (wired) showWire() } })
  E('#c16w').addEventListener('click', () => { pressEl(E('#c16w')); wired = !wired; showWire() })
  popPanels(root)
  finishUI(root)
  windowSync(api, E('#c16h'), { zoom: 1.05 })
  const D = await loadDists(), parks = await loadParks()
  const fences = parks.parks.map((p) => ({ pts: fencePoly(parks, p), hot: p.abbr === 'SF' }))
  const sf = parks.parks.find((p) => p.abbr === 'SF')
  const slots = [...root.querySelectorAll('.strip .bt')]
  ctl.els = slots
  ctl.onArm = ctl.onChange = () => paintSlots()
  slots.forEach((el, i) => {
    el.addEventListener('click', (e) => {
      const d = e.target.closest('i[data-d]')
      if (i === 6) { fire(); return }
      ctl.arm(i); if (d) ctl.change(i, Number(d.dataset.d))
    })
    el.addEventListener('wheel', (e) => { if (i === 6) return; e.preventDefault(); ctl.arm(i); ctl.change(i, e.deltaY < 0 ? 1 : -1) }, { passive: false })
  })
  const fire = () => { pressEl(slots[6]); ses.fire() }
  ctl.bind(fire, 'h')
  api.setPreview(true)
  function paintSlots() {
    slots.forEach((el, i) => {
      el.classList.toggle('arm', i === ctl.armed && i < 6)
      if (i < 6) el.querySelector('b').textContent = ctl.text(ctl.SLOTS[i].k)
    })
  }
  let last = null
  function render(res) {
    last = res
    const s = api.state, v = res.verdict, pv = !!ses.beat?.preview
    E('#c16p').innerHTML = bigPlan(res, api.FT, { w: 250, h: 190, fences: oracleFences(api, fences), preview: pv, ghost: pv ? ses.committed?.path : null, reach: 440 })
    E('#c16r').innerHTML = arcSVG(res, api.FT, { w: 420, h: 190, preview: pv, ghost: pv ? ses.committed?.path : null })
    E('#c16o').innerHTML = [['EV', `${s.ev} MPH`], ['LA', `${s.la} DEG`], ['DIR', U.SPEC.dir.fmt(s.dir)], ['DIST', `${Math.round(res.landFt)} FT`], ['APEX', `${Math.round(res.peakFt)} FT`], ['WALL', v.wallFt ? `${Math.round(v.wallFt)}/${v.wallH.toFixed(0)}` : '--']].map(([a, b], i) => `<div><span>${a.padEnd(4, ' ')}</span><b class="${i >= 3 ? 'hot' : ''}" style="font-weight:400">${b}</b></div>`).join('')
    E('#c16l').querySelectorAll('.m').forEach((m) => m.remove())
    E('#c16l').insertAdjacentHTML('beforeend', METRICS.map((m) => { const h = histSVG(D, m, res, s, { w: 300, h: 30 }); return `<div class="m"><div><span>${m.label}</span><b>${m.fmt(m.get(res, s))}</b> <i>${pctWord(h.pct)}</i></div><div class="hg">${h.svg}</div></div>` }).join(''))
    if (parks.parks.length) { const pr = evalParks(parks, api); E('#c16g').innerHTML = tileHTML(pr); E('#c16n').textContent = `GONE IN ${pr.filter((r) => r.k === 'GONE').length} OF ${pr.length}` }
    paintSlots(); paintTally(); paintVerdict(false)
  }
  function paintTally() {
    E('#c16t').innerHTML = `<div class="c"><span>SWINGS </span>${String(ses.swings).padStart(2, '0')} <span> HR </span>${String(ses.hrs).padStart(2, '0')} <span> BEST </span>${ses.best || '---'}</div>` + ses.log.slice(-3).map((l, i, a) => `<div class="${i === a.length - 1 ? 'n' : l.hr ? 'h' : ''}">${ses.line(l)}</div>`).join('')
  }
  function paintVerdict(stampIt) {
    const vd = E('#c16v'), b = ses.beat
    vd.classList.toggle('hr', isHR(b)); vd.classList.toggle('pv', !!b?.preview)
    vd.querySelector('.st').textContent = b ? b.state : 'PREVIEW'
    vd.querySelector('.hd').textContent = b?.preview ? 'PRESS SWING' : b ? b.text : '. . .'
    vd.querySelector('.sb').textContent = b?.sub ?? ''
    if (stampIt) restamp(vd)
  }
  showWire()
  return { render, beat: (b) => { ses.onBeat(b); paintVerdict(!!b.last); paintTally(); if (last) render(last) } }
}
