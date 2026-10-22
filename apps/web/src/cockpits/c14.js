// Study 14, FIELD LEDGER (orange on black by default): the top-down field map is the hero, with the fence's measured distances on it. The right column is a ledger: the verdict
// stamp, telemetry, and five histograms of where this ball lands against the league (exit speed, launch angle, direction, distance, hang time) with the home-run outline and the
// league average. Inputs are segmented bars you can click or drag; buttons press down; panels pop and tilt a little on hover. No park window: the map is the park.
import { SKEL_CSS, restamp, tileHTML, isHR } from './skel.js'
import { finishUI, oracleFence, oracleFences, THEME_CSS, JUICE_CSS, themePicker, popPanels, pressEl, makeControls, makeSession, loadDists, METRICS, histSVG, pctWord, bigPlan, arcSVG } from './skel2.js'

export async function build(root, api, U) {
  const { css, loadParks, evalParks, fencePoly } = U
  css('cp14', SKEL_CSS + THEME_CSS + JUICE_CSS + `
#cp.skel.solid{background:var(--k);pointer-events:auto}
#cp .c14{position:absolute;inset:10px;display:grid;gap:12px;grid-template-columns:290px 1fr 410px;grid-template-rows:20px minmax(0,1fr) 150px}
#cp .c14 .hdr{grid-column:1/4;display:flex;justify-content:space-between;align-items:center}
#cp .c14 .fig{position:absolute;inset:14px 6px 4px}
#cp .c14 .inp{grid-row:2;padding:18px 12px 12px;display:flex;flex-direction:column;gap:9px}
#cp .c14 .row .top{display:flex;justify-content:space-between;align-items:baseline}
#cp .c14 .row .top span{color:var(--dim);font-size:17px}
#cp .c14 .row .top b{font-weight:400;font-size:24px}
#cp .c14 .row.arm .top span{color:var(--acc)}
#cp .c14 .row .bar{display:grid;grid-template-columns:22px 1fr 22px;gap:6px;align-items:center;margin-top:3px}
#cp .c14 .row .bar .bt{padding:0;height:18px;font-size:15px;line-height:14px;text-align:center;box-shadow:0 3px 0 var(--e)}
#cp .c14 .row .bar .bt:hover{box-shadow:0 4px 0 var(--e)}
#cp .c14 .chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:2px}
#cp .c14 .chips .bt{padding:2px 6px;font-size:15px;box-shadow:0 3px 0 var(--e)}
#cp .c14 .go{margin-top:auto;font:14px/1.4 PS2P,monospace;padding:14px 8px;text-align:center}
#cp .c14 .mid{grid-row:2}
#cp .c14 .rt{grid-row:2;display:grid;grid-template-rows:auto auto 1fr;gap:12px;min-height:0}
#cp .c14 .vd{padding:16px 14px 10px;display:flex;flex-direction:column;gap:2px}
#cp .c14 .vd .hd{font-size:50px;line-height:.95}
#cp .c14 .vd.hr .hd,#cp .c14 .vd.hr .st{color:var(--acc)}
#cp .c14 .vd.pv .hd{color:var(--dim)}
#cp .c14 .vd .sb{font-size:19px;color:var(--dim);min-height:19px}
#cp .c14 .tel{padding:16px 14px 10px;display:grid;grid-template-columns:1fr 1fr;gap:3px 18px;font-size:19px}
#cp .c14 .tel div{display:flex;justify-content:space-between}
#cp .c14 .tel span{color:var(--dim)}
#cp .c14 .tel .hot{color:var(--acc)}
#cp .c14 .led{padding:16px 12px 8px;display:grid;grid-template-rows:repeat(5,minmax(0,1fr));gap:4px}
#cp .c14 .led .m{display:grid;grid-template-columns:128px 1fr;gap:10px;min-height:0}
#cp .c14 .led .m .lb{display:flex;flex-direction:column;justify-content:center}
#cp .c14 .led .m .lb span{color:var(--dim);font-size:15px}
#cp .c14 .led .m .lb b{font-weight:400;font-size:26px;line-height:1}
#cp .c14 .led .m .lb i{font-style:normal;font-size:15px;color:var(--acc)}
#cp .c14 .led .m .hg{min-height:0}
#cp .c14 .led .note{position:absolute;right:12px;top:-5px;background:var(--k);font:8px/10px PS2P,monospace;color:var(--dim);padding:0 6px}
#cp .c14 .tal{grid-row:3;padding:18px 12px 8px;display:grid;grid-template-rows:auto 1fr;gap:4px}
#cp .c14 .cnt{display:flex;gap:14px;font-size:18px}
#cp .c14 .cnt span{color:var(--dim)}
#cp .c14 .log{display:grid;align-content:start;gap:1px;font-size:17px;overflow:hidden}
#cp .c14 .log div{white-space:nowrap;color:var(--dim)}
#cp .c14 .log div.n{color:var(--acc)}
#cp .c14 .log div.h{color:var(--tx)}
#cp .c14 .gg{grid-row:3;grid-column:3;padding:0}
#cp .c14 .gt{display:grid;grid-template-columns:repeat(10,1fr);gap:4px;grid-auto-rows:26px;padding:16px 12px 24px}
#cp .c14 .gn{position:absolute;left:12px;bottom:6px;color:var(--acc);font-size:19px}
`)
  root.classList.add('skel', 'solid')
  window.__cpRibbon = 1.8
  api.NN.setPaused(true) // this study covers the park, so do not spend the GPU drawing it
  const ctl = makeControls(api, U), ses = makeSession(api)
  root.innerHTML = `<div class="c14"><div class="hdr"><span class="ps">DINGER DOJO // STUDY 14 // FIELD LEDGER</span><span id="c14a"></span></div>
  <div class="pnl p pop inp" id="c14i"><span class="t">/ S W I N G /</span>
    ${ctl.SLOTS.map((s, i) => `<div class="row" data-i="${i}"><div class="top"><span>${i + 1} ${s.label}</span><b></b></div><div class="bar"><span class="bt" data-d="-1">-</span><span class="seg">${'<i></i>'.repeat(20)}</span><span class="bt" data-d="1">+</span></div></div>`).join('')}
    <div class="chips">${Object.keys(api.PRESETS).slice(0, 6).map((n) => `<span class="bt" data-p="${n}">${n}</span>`).join('')}</div>
    <div class="bt hot go" id="c14go">SWING [ENTER]</div></div>
  <div class="pnl p pop mid"><span class="t">/ F I E L D &nbsp; M A P &nbsp; // &nbsp; O R A C L E &nbsp; P A R K /</span><div class="fig" id="c14m"></div></div>
  <div class="rt">
    <div class="pnl p pop vd" id="c14v"><span class="t">/ S H O T &nbsp; C A L L E R /</span><div class="ps st">PREVIEW</div><div class="hd">. . .</div><div class="sb"></div></div>
    <div class="pnl p pop tel" id="c14t"><span class="t">/ T E L E M E T R Y /</span></div>
    <div class="pnl p pop led" id="c14l"><span class="t">/ V S &nbsp; L E A G U E /</span><span class="note">LINE HR / DASH AVG</span></div>
  </div>
  <div class="pnl p pop tal"><span class="t">/ T A L L Y /</span><div class="cnt" id="c14c"></div><div class="log" id="c14g2"></div></div>
  <div class="pnl p pop"><span class="t">/ F L I G H T &nbsp; A R C /</span><div class="fig" id="c14r"></div></div>
  <div class="pnl p pop gg"><span class="t">/ G O N E R &nbsp; G R I D /</span><div class="gt" id="c14t30"></div><div class="gn" id="c14n"></div></div></div>`
  themePicker(root, root.querySelector('#c14a'), api, 14, 'orange')
  popPanels(root)
  finishUI(root)
  const E = (id) => root.querySelector(id), D = await loadDists(), parks = await loadParks()
  const fences = parks.parks.map((p) => ({ pts: fencePoly(parks, p), hot: p.abbr === 'SF' }))
  const sf = parks.parks.find((p) => p.abbr === 'SF')
  const rows = [...root.querySelectorAll('.row')]
  ctl.els = rows.map((r) => r.querySelector('b'))
  ctl.onArm = ctl.onChange = () => paintInputs()
  rows.forEach((r, i) => {
    const seg = r.querySelector('.seg')
    r.addEventListener('click', (e) => { const d = e.target.closest('[data-d]'); ctl.arm(i); if (d) { pressEl(d); ctl.change(i, Number(d.dataset.d)) } })
    const at = (e) => { const b = seg.getBoundingClientRect(); ctl.setFrac(i, (e.clientX - b.left) / b.width) }
    seg.addEventListener('pointerdown', (e) => { seg.setPointerCapture(e.pointerId); ctl.arm(i); if (ctl.SLOTS[i].k === 'hand') ctl.change(i, 1); else at(e); seg.onpointermove = (ev) => { if (ctl.SLOTS[i].k !== 'hand') at(ev) }; seg.onpointerup = () => { seg.onpointermove = null } })
    r.addEventListener('wheel', (e) => { e.preventDefault(); ctl.arm(i); ctl.change(i, e.deltaY < 0 ? 1 : -1) }, { passive: false })
  })
  for (const b of root.querySelectorAll('[data-p]')) b.addEventListener('click', () => { pressEl(b); Object.assign(api.state, api.PRESETS[b.dataset.p]); api.update() })
  const go = E('#c14go'), fire = () => { pressEl(go); ses.fire() }
  go.addEventListener('click', fire)
  ctl.bind(fire, 'v')
  api.setPreview(true)
  function paintInputs() {
    rows.forEach((r, i) => {
      const k = ctl.SLOTS[i].k
      r.classList.toggle('arm', i === ctl.armed)
      r.querySelector('b').textContent = ctl.text(k) + (ctl.SLOTS[i].unit && k !== 'dir' ? ' ' + ctl.SLOTS[i].unit : '')
      const kids = r.querySelector('.seg').children, on = Math.round(ctl.frac(k) * kids.length)
      for (let j = 0; j < kids.length; j++) { kids[j].classList.toggle('on', j < on); kids[j].classList.toggle('hot', i === ctl.armed && j === on - 1) }
    })
  }
  let last = null
  function render(res) {
    last = res
    const s = api.state, v = res.verdict, pv = !!ses.beat?.preview
    E('#c14m').innerHTML = bigPlan(res, api.FT, { w: 760, h: 560, fences: oracleFences(api, fences), park: oracleFence(api, parks), bearings: [-45, -22.5, 0, 22.5, 45], preview: pv, ghost: pv ? ses.committed?.path : null })
    E('#c14r').innerHTML = arcSVG(res, api.FT, { w: 560, h: 130, preview: pv, ghost: pv ? ses.committed?.path : null })
    const t = [['DISTANCE', `${Math.round(res.landFt)} FT`], ['APEX', `${Math.round(res.peakFt)} FT`], ['HANG', `${res.hang.toFixed(1)} S`], ['AIR', res.rho.toFixed(3)]]
    if (v.wallFt) t.push(['WALL', `${Math.round(v.wallFt)}/${v.wallH.toFixed(0)}`], [v.kind === 'GONE' ? 'OVER BY' : 'SHORT BY', `${(v.kind === 'GONE' ? v.clearBy : v.short ?? 0).toFixed(0)} FT`])
    E('#c14t').innerHTML = '<span class="t">/ T E L E M E T R Y /</span>' + t.map(([a, b], i) => `<div><span>${a}</span><b class="${i >= 4 ? 'hot' : ''}" style="font-weight:400">${b}</b></div>`).join('')
    E('#c14l').querySelectorAll('.m').forEach((m) => m.remove())
    E('#c14l').insertAdjacentHTML('beforeend', METRICS.map((m) => { const h = histSVG(D, m, res, s, { w: 230, h: 52 }); return `<div class="m"><div class="lb"><span>${m.label}</span><b>${m.fmt(m.get(res, s))}<span style="font-size:14px"> ${m.unit}</span></b><i>${pctWord(h.pct)}</i></div><div class="hg">${h.svg}</div></div>` }).join(''))
    if (parks.parks.length) { const pr = evalParks(parks, api); E('#c14t30').innerHTML = tileHTML(pr); E('#c14n').textContent = `GONE IN ${pr.filter((r) => r.k === 'GONE').length} OF ${pr.length}` }
    paintInputs(); paintTally(); paintVerdict(false)
  }
  function paintTally() {
    E('#c14c').innerHTML = `<div><span>SWINGS </span>${String(ses.swings).padStart(2, '0')}</div><div><span>HR </span>${String(ses.hrs).padStart(2, '0')}</div><div><span>STREAK </span>${String(ses.streak).padStart(2, '0')}</div><div><span>BEST </span>${ses.best || '---'}</div>`
    E('#c14g2').innerHTML = ses.log.slice(-4).map((l, i, a) => `<div class="${i === a.length - 1 ? 'n' : l.hr ? 'h' : ''}">${ses.line(l)}</div>`).join('') || '<div>NO SWINGS YET_</div>'
  }
  function paintVerdict(stampIt) {
    const vd = E('#c14v'), b = ses.beat
    vd.classList.toggle('hr', isHR(b)); vd.classList.toggle('pv', !!b?.preview)
    vd.querySelector('.st').textContent = b ? b.state : 'PREVIEW'
    vd.querySelector('.hd').textContent = b?.preview ? 'PRESS SWING' : b ? b.text : '. . .'
    vd.querySelector('.sb').textContent = b?.sub ?? ''
    if (stampIt) restamp(vd.querySelector('.hd'))
  }
  return {
    render,
    beat: (b) => { const committed = ses.onBeat(b); paintVerdict(!!b.last); paintTally(); if (last) render(last); void committed },
  }
}
