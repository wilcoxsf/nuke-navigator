// Study 18, FIELD BOOK (paper and ink by default; the same colors switcher still works): a light interface, Papers Please energy. The swing is a clearance form with typed fields you click,
// scroll or arrow through; SWING is a big stamp pad that presses down; the verdict is a rubber stamp (rotated, double-ruled) that thumps onto the page in stepped frames. The field map and
// arc are ink drawings, the league comparison is five small ink histograms, the tally is a ledger, and a silent line-art crab witnesses. Panels pop and tilt a little on hover.
import { SKEL_CSS, restamp, tileHTML, isHR } from './skel.js'
import { finishUI, oracleFence, oracleFences, THEME_CSS, JUICE_CSS, themePicker, popPanels, pressEl, makeControls, makeSession, loadDists, METRICS, histSVG, pctWord, bigPlan, arcSVG } from './skel2.js'

const CRAB = `<svg viewBox="0 0 120 80" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><ellipse cx="60" cy="50" rx="27" ry="16"/><path d="M34 46Q16 42 12 24Q22 18 29 28Q31 35 35 40M86 46Q104 42 108 24Q98 18 91 28Q89 35 85 40"/><path d="M50 36v-9M70 36v-9"/><circle cx="50" cy="24" r="3"/><circle cx="70" cy="24" r="3"/><path d="M40 61L24 70M45 65L35 77M80 61L96 70M75 65L85 77M52 54h16"/></svg>`

export async function build(root, api, U) {
  const { css, loadParks, evalParks, fencePoly } = U
  css('cp18', SKEL_CSS + THEME_CSS + JUICE_CSS + `
#cp.skel.solid{background:var(--k)}
#cp.light.solid{background-image:radial-gradient(var(--ln) 1px,transparent 1px);background-size:7px 7px}
#cp.light .pnl{box-shadow:3px 3px 0 var(--ln)}
#cp .c18{position:absolute;inset:10px;display:grid;gap:12px;grid-template-columns:330px 1fr 410px;grid-template-rows:20px minmax(0,1fr) 150px}
#cp .c18 .hdr{grid-column:1/4;display:flex;justify-content:space-between;align-items:center}
#cp .c18 .fig{position:absolute;inset:14px 6px 4px}
#cp .c18 .frm{grid-row:2;padding:20px 16px 12px;display:flex;flex-direction:column;gap:6px}
#cp .c18 .frm .tt{font:12px/1.4 PS2P,monospace;text-align:center;border-bottom:2px solid var(--tx);padding-bottom:8px;margin-bottom:4px}
#cp .c18 .frm .ln{display:grid;grid-template-columns:96px 1fr 22px 22px;gap:6px;align-items:end;border-bottom:1px dotted var(--dim);padding:5px 0 2px;cursor:pointer}
#cp .c18 .frm .ln span{color:var(--dim);font-size:17px}
#cp .c18 .frm .ln b{font-weight:400;font-size:25px;line-height:1}
#cp .c18 .frm .ln.arm span{color:var(--acc)}
#cp .c18 .frm .ln.arm b::after{content:'_';color:var(--acc)}
#cp .c18 .frm .ln .bt{padding:0;height:19px;text-align:center;font-size:16px;line-height:15px;box-shadow:0 3px 0 var(--e)}
#cp .c18 .frm .ln .bt:active{transform:translateY(3px);box-shadow:0 0 0 var(--e)}
#cp .c18 .frm .chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
#cp .c18 .frm .chips .bt{padding:2px 6px;font-size:15px;box-shadow:0 3px 0 var(--e)}
#cp .c18 .frm .go{margin-top:auto;font:15px/1.4 PS2P,monospace;padding:16px 8px;text-align:center}
#cp .c18 .frm .crab{height:78px;color:var(--dim);margin-top:8px;align-self:center;width:120px}
#cp .c18 .mid{grid-row:2;display:grid;grid-template-rows:minmax(0,1fr) 190px;gap:12px;min-height:0}
#cp .c18 .rt{grid-row:2;display:grid;grid-template-rows:auto minmax(0,1fr);gap:12px;min-height:0}
#cp .c18 .vd{padding:20px 16px 12px;display:grid;gap:6px;justify-items:center;text-align:center}
#cp .c18 .vd .rot{transform:rotate(-5deg);border:3px double var(--acc);color:var(--acc);padding:10px 16px;margin:6px 0}
#cp .c18 .vd .hd{font:24px/1.25 PS2P,monospace}
#cp .c18 .vd.pv .rot{border-color:var(--dim);color:var(--dim)}
#cp .c18 .vd.pv .hd{font-size:14px}
#cp .c18 .vd .st{color:var(--dim)}
#cp .c18 .vd .sb{font-size:19px;color:var(--tx);min-height:19px}
#cp .c18 .vd .tl{display:flex;gap:16px;font-size:18px;color:var(--tx)}
#cp .c18 .vd .tl span{color:var(--dim)}
#cp .c18 .led{padding:18px 12px 8px;display:grid;grid-template-rows:repeat(5,minmax(0,1fr));gap:3px}
#cp .c18 .led .m{display:grid;grid-template-rows:auto minmax(0,1fr);min-height:0}
#cp .c18 .led .m .lb{display:flex;justify-content:space-between;font-size:16px;color:var(--dim)}
#cp .c18 .led .m .lb b{font-weight:400;color:var(--tx);font-size:19px}
#cp .c18 .led .m .lb i{font-style:normal;color:var(--acc)}
#cp .c18 .led .m .hg{min-height:0}
#cp .c18 .tal{grid-row:3;padding:18px 14px 8px;display:grid;grid-template-rows:auto 1fr;gap:4px}
#cp .c18 .cnt{display:flex;gap:16px;font-size:18px;border-bottom:2px solid var(--tx);padding-bottom:2px}
#cp .c18 .cnt span{color:var(--dim)}
#cp .c18 .log{display:grid;align-content:start;font-size:18px;overflow:hidden}
#cp .c18 .log div{white-space:nowrap;color:var(--dim);border-bottom:1px dotted var(--dim)}
#cp .c18 .log div.n{color:var(--acc)}
#cp .c18 .log div.h{color:var(--tx)}
#cp .c18 .gg{grid-row:3;grid-column:2/4;padding:0}
#cp .c18 .gt{display:grid;grid-template-columns:repeat(15,1fr);gap:4px;grid-auto-rows:30px;padding:18px 12px 6px}
#cp .c18 .gn{position:absolute;right:12px;top:-6px;background:var(--k);padding:0 6px;color:var(--acc);font-size:17px}
`)
  root.classList.add('skel', 'solid')
  window.__cpRibbon = 1.8
  api.NN.setPaused(true) // this study covers the park, so do not spend the GPU drawing it
  const ctl = makeControls(api, U), ses = makeSession(api)
  root.innerHTML = `<div class="c18"><div class="hdr"><span class="ps">DINGER DOJO // STUDY 18 // FIELD BOOK</span><span id="c18a"></span></div>
  <div class="pnl p pop frm"><span class="t">/ S W I N G &nbsp; C L E A R A N C E /</span><div class="tt">ORACLE PARK<br>FORM NN-<span id="c18no">00001</span></div>
    ${ctl.SLOTS.map((s, i) => `<div class="ln" data-i="${i}"><span>${s.label}</span><b></b><span class="bt" data-d="-1">-</span><span class="bt" data-d="1">+</span></div>`).join('')}
    <div class="chips">${Object.keys(api.PRESETS).slice(0, 5).map((n) => `<span class="bt" data-p="${n}">${n}</span>`).join('')}</div>
    <div class="crab">${CRAB}</div><div class="bt hot go" id="c18go">STAMP: SWING</div></div>
  <div class="mid"><div class="pnl p pop"><span class="t">/ F I E L D &nbsp; S K E T C H /</span><div class="fig" id="c18m"></div></div><div class="pnl p pop"><span class="t">/ F L I G H T &nbsp; A R C /</span><div class="fig" id="c18r"></div></div></div>
  <div class="rt"><div class="pnl p pop vd" id="c18v"><span class="t">/ R U L I N G /</span><div class="ps st">PREVIEW</div><div class="rot"><div class="hd">PENDING</div></div><div class="sb"></div><div class="tl" id="c18tl"></div></div>
    <div class="pnl p pop led" id="c18l"><span class="t">/ V S &nbsp; L E A G U E /</span></div></div>
  <div class="pnl p pop tal"><span class="t">/ L E D G E R /</span><div class="cnt" id="c18c"></div><div class="log" id="c18g2"></div></div>
  <div class="pnl p pop gg"><span class="t">/ G O N E R &nbsp; G R I D /</span><div class="gt" id="c18g"></div><div class="gn" id="c18n"></div></div></div>`
  themePicker(root, root.querySelector('#c18a'), api, 18, 'paper')
  popPanels(root)
  finishUI(root)
  const E = (id) => root.querySelector(id), D = await loadDists(), parks = await loadParks()
  const fences = parks.parks.map((p) => ({ pts: fencePoly(parks, p), hot: p.abbr === 'SF' }))
  const sf = parks.parks.find((p) => p.abbr === 'SF')
  const lns = [...root.querySelectorAll('.frm .ln')]
  ctl.els = lns.map((l) => l.querySelector('.bt'))
  ctl.onArm = ctl.onChange = () => paintInputs()
  lns.forEach((l, i) => {
    l.addEventListener('click', (e) => { const d = e.target.closest('[data-d]'); ctl.arm(i); if (d) { pressEl(d); ctl.change(i, Number(d.dataset.d)) } })
    l.addEventListener('wheel', (e) => { e.preventDefault(); ctl.arm(i); ctl.change(i, e.deltaY < 0 ? 1 : -1) }, { passive: false })
  })
  for (const b of root.querySelectorAll('[data-p]')) b.addEventListener('click', () => { pressEl(b); Object.assign(api.state, api.PRESETS[b.dataset.p]); api.update() })
  const go = E('#c18go'), fire = () => { pressEl(go); ses.fire() }
  go.addEventListener('click', fire)
  ctl.bind(fire, 'v')
  api.setPreview(true)
  function paintInputs() {
    lns.forEach((l, i) => { const k = ctl.SLOTS[i].k; l.classList.toggle('arm', i === ctl.armed); l.querySelector('b').textContent = ctl.text(k) + (ctl.SLOTS[i].unit && k !== 'dir' ? ' ' + ctl.SLOTS[i].unit : '') })
  }
  let last = null
  function render(res) {
    last = res
    const s = api.state, v = res.verdict, pv = !!ses.beat?.preview
    E('#c18no').textContent = String(ses.swings + (pv ? 1 : 0)).padStart(5, '0')
    E('#c18m').innerHTML = bigPlan(res, api.FT, { w: 740, h: 470, fences: oracleFences(api, fences), park: oracleFence(api, parks), bearings: [-45, -22.5, 0, 22.5, 45], preview: pv, ghost: pv ? ses.committed?.path : null })
    E('#c18r').innerHTML = arcSVG(res, api.FT, { w: 740, h: 170, preview: pv, ghost: pv ? ses.committed?.path : null })
    E('#c18tl').innerHTML = `<div><span>DIST </span>${Math.round(res.landFt)}</div><div><span>APEX </span>${Math.round(res.peakFt)}</div><div><span>HANG </span>${res.hang.toFixed(1)}</div>${v.wallFt ? `<div><span>WALL </span>${Math.round(v.wallFt)}/${v.wallH.toFixed(0)}</div>` : ''}`
    E('#c18l').querySelectorAll('.m').forEach((m) => m.remove())
    E('#c18l').insertAdjacentHTML('beforeend', METRICS.map((m) => { const h = histSVG(D, m, res, s, { w: 360, h: 44 }); return `<div class="m"><div class="lb"><span>${m.label} <b>${m.fmt(m.get(res, s))} ${m.unit}</b></span><i>${pctWord(h.pct)}</i></div><div class="hg">${h.svg}</div></div>` }).join(''))
    if (parks.parks.length) { const pr = evalParks(parks, api); E('#c18g').innerHTML = tileHTML(pr); E('#c18n').textContent = `GONE IN ${pr.filter((r) => r.k === 'GONE').length} OF ${pr.length}` }
    paintInputs(); paintTally(); paintVerdict(false)
  }
  function paintTally() {
    E('#c18c').innerHTML = `<div><span>SWINGS </span>${String(ses.swings).padStart(2, '0')}</div><div><span>HR </span>${String(ses.hrs).padStart(2, '0')}</div><div><span>STREAK </span>${String(ses.streak).padStart(2, '0')}</div><div><span>BEST </span>${ses.best || '---'}</div>`
    E('#c18g2').innerHTML = ses.log.slice(-4).map((l, i, a) => `<div class="${i === a.length - 1 ? 'n' : l.hr ? 'h' : ''}">${ses.line(l)}</div>`).join('') || '<div>NO ENTRIES YET_</div>'
  }
  function paintVerdict(stampIt) {
    const vd = E('#c18v'), b = ses.beat
    vd.classList.toggle('hr', isHR(b)); vd.classList.toggle('pv', !!b?.preview || !b)
    vd.querySelector('.st').textContent = b ? b.state : 'PREVIEW'
    vd.querySelector('.hd').textContent = b?.preview || !b ? 'PENDING' : b.text
    vd.querySelector('.sb').textContent = b?.sub ?? ''
    if (stampIt) restamp(vd.querySelector('.hd'))
  }
  return { render, beat: (b) => { ses.onBeat(b); paintVerdict(!!b.last); paintTally(); if (last) render(last) } }
}
