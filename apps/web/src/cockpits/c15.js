// Study 15, MISSION CONTROL (red on black by default): a multi-panel cockpit on one screen. A row of five league histograms across the top (where this ball lands for exit speed,
// launch angle, direction, distance and hang time); below it a column of big press-down buttons (PREVIEW, SWING, RESET, plus the inputs as stepper rows), the field map in the middle,
// and the verdict stamp with the flight arc on the right; the thirty-park strip and the tally run along the bottom. Hover pops and tilts panels a little.
import { SKEL_CSS, restamp, tileHTML, isHR } from './skel.js'
import { finishUI, oracleFence, oracleFences, THEME_CSS, JUICE_CSS, themePicker, popPanels, pressEl, makeControls, makeSession, loadDists, METRICS, histSVG, pctWord, bigPlan, arcSVG } from './skel2.js'

export async function build(root, api, U) {
  const { css, loadParks, evalParks, fencePoly } = U
  css('cp15', SKEL_CSS + THEME_CSS + JUICE_CSS + `
#cp.skel.solid{background:var(--k)}
#cp .c15{position:absolute;inset:10px;display:grid;gap:12px;grid-template-columns:250px 1fr 360px;grid-template-rows:20px 150px minmax(0,1fr) 112px}
#cp .c15 .hdr{grid-column:1/4;display:flex;justify-content:space-between;align-items:center}
#cp .c15 .lg{grid-column:1/4;display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
#cp .c15 .lg .pnl{padding:16px 10px 6px;display:grid;grid-template-rows:auto minmax(0,1fr);gap:2px}
#cp .c15 .lg .hh{display:flex;justify-content:space-between;align-items:baseline}
#cp .c15 .lg .hh b{font-weight:400;font-size:24px}
#cp .c15 .lg .hh i{font-style:normal;color:var(--acc);font-size:15px}
#cp .c15 .fig{position:absolute;inset:14px 6px 4px}
#cp .c15 .ctl{padding:16px 10px 10px;display:flex;flex-direction:column;gap:7px}
#cp .c15 .big{display:grid;gap:8px}
#cp .c15 .big .bt{font:11px/1.3 PS2P,monospace;padding:11px 6px;text-align:center}
#cp .c15 .rw{display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px;border-top:1px solid var(--ln);padding-top:6px}
#cp .c15 .rw span{color:var(--dim);font-size:16px;display:block;line-height:1}
#cp .c15 .rw b{font-weight:400;font-size:22px;line-height:1}
#cp .c15 .rw.arm span{color:var(--acc)}
#cp .c15 .rw .st{display:flex;gap:4px}
#cp .c15 .rw .bt{padding:0;width:24px;height:22px;text-align:center;font-size:16px;line-height:18px;box-shadow:0 3px 0 var(--e)}
#cp .c15 .rt{display:grid;grid-template-rows:auto minmax(0,1fr);gap:12px;min-height:0}
#cp .c15 .vd{padding:16px 14px 10px;display:flex;flex-direction:column;gap:4px}
#cp .c15 .vd .hd{font-size:62px;line-height:.9}
#cp .c15 .vd.hr .hd,#cp .c15 .vd.hr .st{color:var(--acc)}
#cp .c15 .vd.pv .hd{color:var(--dim);font-size:34px}
#cp .c15 .vd .sb{font-size:19px;color:var(--dim);min-height:19px}
#cp .c15 .vd .tl{display:grid;grid-template-columns:repeat(3,1fr);gap:2px 10px;margin-top:6px;font-size:18px}
#cp .c15 .vd .tl span{color:var(--dim);display:block;font-size:14px}
#cp .c15 .gg{grid-column:1/3;padding:0}
#cp .c15 .gt{display:grid;grid-template-columns:repeat(15,1fr);gap:4px;grid-auto-rows:30px;padding:16px 12px 6px}
#cp .c15 .gn{position:absolute;right:12px;top:-6px;background:var(--k);padding:0 6px;color:var(--acc);font-size:17px}
#cp .c15 .tal{padding:16px 12px 8px;display:grid;grid-template-rows:auto 1fr;gap:3px}
#cp .c15 .cnt{display:flex;gap:12px;font-size:17px}
#cp .c15 .cnt span{color:var(--dim)}
#cp .c15 .log{display:grid;align-content:start;font-size:17px;overflow:hidden}
#cp .c15 .log div{white-space:nowrap;color:var(--dim)}
#cp .c15 .log div.n{color:var(--acc)}
#cp .c15 .log div.h{color:var(--tx)}
`)
  root.classList.add('skel', 'solid')
  window.__cpRibbon = 1.8
  api.NN.setPaused(true) // this study covers the park, so do not spend the GPU drawing it
  const ctl = makeControls(api, U), ses = makeSession(api)
  root.innerHTML = `<div class="c15"><div class="hdr"><span class="ps">DINGER DOJO // STUDY 15 // MISSION CONTROL</span><span id="c15a"></span></div>
  <div class="lg" id="c15h">${METRICS.map((m, i) => `<div class="pnl p pop" data-m="${i}"><span class="t">/ ${m.label.replace(/ /g, '&nbsp;')} /</span><div class="hh"><b></b><i></i></div><div class="hg"></div></div>`).join('')}</div>
  <div class="pnl p pop ctl"><span class="t">/ C O N T R O L S /</span>
    <div class="big"><span class="bt hot" id="c15go">SWING</span><span class="bt" id="c15pv">PREVIEW</span><span class="bt" id="c15rs">RESET</span></div>
    ${ctl.SLOTS.map((s, i) => `<div class="rw" data-i="${i}"><div><span>${i + 1} ${s.label}</span><b></b></div><div class="st"><span class="bt" data-d="-1">-</span><span class="bt" data-d="1">+</span></div></div>`).join('')}</div>
  <div class="pnl p pop"><span class="t">/ F I E L D &nbsp; M A P /</span><div class="fig" id="c15m"></div></div>
  <div class="rt"><div class="pnl p pop vd" id="c15v"><span class="t">/ S H O T &nbsp; C A L L E R /</span><div class="ps st">PREVIEW</div><div class="hd">. . .</div><div class="sb"></div><div class="tl" id="c15tl"></div></div>
    <div class="pnl p pop"><span class="t">/ F L I G H T &nbsp; A R C /</span><div class="fig" id="c15r"></div></div></div>
  <div class="pnl p pop gg"><span class="t">/ G O N E R &nbsp; G R I D /</span><div class="gt" id="c15g"></div><div class="gn" id="c15n"></div></div>
  <div class="pnl p pop tal"><span class="t">/ T A L L Y /</span><div class="cnt" id="c15c"></div><div class="log" id="c15l"></div></div></div>`
  themePicker(root, root.querySelector('#c15a'), api, 15, 'red')
  popPanels(root)
  finishUI(root)
  const E = (id) => root.querySelector(id), D = await loadDists(), parks = await loadParks()
  const fences = parks.parks.map((p) => ({ pts: fencePoly(parks, p), hot: p.abbr === 'SF' }))
  const sf = parks.parks.find((p) => p.abbr === 'SF')
  const rws = [...root.querySelectorAll('.rw')]
  ctl.els = rws.map((r) => r.querySelector('.bt'))
  ctl.onArm = ctl.onChange = () => paintInputs()
  rws.forEach((r, i) => {
    r.addEventListener('click', (e) => { const d = e.target.closest('[data-d]'); ctl.arm(i); if (d) ctl.change(i, Number(d.dataset.d)) })
    r.addEventListener('wheel', (e) => { e.preventDefault(); ctl.arm(i); ctl.change(i, e.deltaY < 0 ? 1 : -1) }, { passive: false })
  })
  const go = E('#c15go'), fire = () => { pressEl(go); ses.fire() }
  go.addEventListener('click', fire)
  E('#c15pv').addEventListener('click', () => { pressEl(E('#c15pv')); api.setPreview(true); api.update() })
  E('#c15rs').addEventListener('click', () => { pressEl(E('#c15rs')); Object.assign(api.state, api.PRESETS[Object.keys(api.PRESETS)[0]]); api.update() })
  ctl.bind(fire, 'v')
  api.setPreview(true)
  function paintInputs() {
    rws.forEach((r, i) => { const k = ctl.SLOTS[i].k; r.classList.toggle('arm', i === ctl.armed); r.querySelector('b').textContent = ctl.text(k) + (ctl.SLOTS[i].unit && k !== 'dir' ? ' ' + ctl.SLOTS[i].unit : '') })
  }
  let last = null
  function render(res) {
    last = res
    const s = api.state, v = res.verdict, pv = !!ses.beat?.preview
    E('#c15m').innerHTML = bigPlan(res, api.FT, { w: 760, h: 520, fences: oracleFences(api, fences), park: oracleFence(api, parks), bearings: [-45, -22.5, 0, 22.5, 45], preview: pv, ghost: pv ? ses.committed?.path : null })
    E('#c15r').innerHTML = arcSVG(res, api.FT, { w: 340, h: 200, preview: pv, ghost: pv ? ses.committed?.path : null })
    root.querySelectorAll('#c15h .pnl').forEach((p) => {
      const m = METRICS[Number(p.dataset.m)], h = histSVG(D, m, res, s, { w: 240, h: 92 })
      p.querySelector('.hh b').innerHTML = `${m.fmt(m.get(res, s))}<span style="font-size:14px;color:var(--dim)"> ${m.unit}</span>`
      p.querySelector('.hh i').textContent = pctWord(h.pct)
      p.querySelector('.hg').innerHTML = h.svg
    })
    E('#c15tl').innerHTML = [['DIST', `${Math.round(res.landFt)} FT`], ['APEX', `${Math.round(res.peakFt)} FT`], ['HANG', `${res.hang.toFixed(1)} S`], ['WALL', v.wallFt ? `${Math.round(v.wallFt)}/${v.wallH.toFixed(0)}` : '--'], [v.kind === 'GONE' ? 'OVER' : 'SHORT', v.wallFt ? `${(v.kind === 'GONE' ? v.clearBy : v.short ?? 0).toFixed(0)} FT` : '--'], ['AIR', res.rho.toFixed(3)]].map(([a, b]) => `<div><span>${a}</span>${b}</div>`).join('')
    if (parks.parks.length) { const pr = evalParks(parks, api); E('#c15g').innerHTML = tileHTML(pr); E('#c15n').textContent = `GONE IN ${pr.filter((r) => r.k === 'GONE').length} OF ${pr.length}` }
    paintInputs(); paintTally(); paintVerdict(false)
  }
  function paintTally() {
    E('#c15c').innerHTML = `<div><span>SWINGS </span>${String(ses.swings).padStart(2, '0')}</div><div><span>HR </span>${String(ses.hrs).padStart(2, '0')}</div><div><span>STREAK </span>${String(ses.streak).padStart(2, '0')}</div><div><span>BEST </span>${ses.best || '---'}</div>`
    E('#c15l').innerHTML = ses.log.slice(-3).map((l, i, a) => `<div class="${i === a.length - 1 ? 'n' : l.hr ? 'h' : ''}">${ses.line(l)}</div>`).join('') || '<div>NO SWINGS YET_</div>'
  }
  function paintVerdict(stampIt) {
    const vd = E('#c15v'), b = ses.beat
    vd.classList.toggle('hr', isHR(b)); vd.classList.toggle('pv', !!b?.preview)
    vd.querySelector('.st').textContent = b ? b.state : 'PREVIEW'
    vd.querySelector('.hd').textContent = b?.preview ? 'PRESS SWING' : b ? b.text : '. . .'
    vd.querySelector('.sb').textContent = b?.sub ?? ''
    if (stampIt) restamp(vd.querySelector('.hd'))
  }
  return { render, beat: (b) => { ses.onBeat(b); paintVerdict(!!b.last); paintTally(); if (last) render(last) } }
}
