// Study 2, BUTTON STRIP: the preview, commit, stamp, tally loop on a Gradius-style strip. Everything you change only moves a ghost: the flight shows as a dashed line in the plan view
// and the side arc (and a thin line over the park), with a faint solid ghost of your last committed swing to correct against. Press SWING (Enter or Space) to commit: the ball flies,
// the verdict is stamped in, and the swing goes on the tally with a timestamp, Cogmind style. Keys: left and right arm a slot, up and down change it (shift for 5), Enter fires.
import { skelPlan, skelArc, SKEL_CSS, accentPicker, restamp, tileHTML, isHR } from './skel.js'

export async function build(root, api, U) {
  const { SPEC, css, setP, windowSync, loadParks, evalParks, fencePoly, clamp } = U
  css('cp12', SKEL_CSS + `
#cp .c12{position:absolute;inset:10px;display:grid;gap:12px;grid-template-columns:340px 1fr 300px;grid-template-rows:20px minmax(0,1fr) 104px}
#cp .c12 .hdr{grid-column:1/4;display:flex;justify-content:space-between;align-items:center}
#cp .c12 .l{grid-row:2;display:grid;grid-template-rows:1fr 1fr 1.25fr;gap:12px;min-height:0}
#cp .c12 .ctr{grid-row:2;display:grid;grid-template-rows:minmax(0,1fr) 128px;gap:12px;min-height:0}
#cp .c12 .r{grid-row:2;display:grid;grid-template-rows:auto 1fr;gap:12px;min-height:0}
#cp .c12 .fig{position:absolute;inset:12px 4px 2px}
#cp .c12 .k{position:absolute;bottom:-5px;right:10px;background:var(--k);padding:0 6px;font:8px/10px PS2P,monospace;color:var(--dim)}
#cp .c12 .vd{position:absolute;inset:14px 14px 8px;display:flex;flex-direction:column;justify-content:space-between}
#cp .c12 .vd .hd{font-size:46px;line-height:.9}
#cp .c12 .vd .sb{font-size:19px;color:var(--dim)}
#cp .c12 .vd.hr .st,#cp .c12 .vd.hr .hd{color:var(--acc)}
#cp .c12 .vd.pv .hd{color:var(--dim)}
#cp .c12 .tal{padding:18px 12px 10px;display:grid;grid-template-rows:auto 1fr;gap:8px}
#cp .c12 .cnt{display:flex;gap:16px;font-size:20px}
#cp .c12 .cnt span{color:var(--dim)}
#cp .c12 .log{display:grid;align-content:start;gap:3px;font-size:18px;overflow:hidden}
#cp .c12 .log div{white-space:nowrap;overflow:hidden;color:var(--dim)}
#cp .c12 .log div.n{color:var(--acc)}
#cp .c12 .log div.h{color:var(--tx)}
#cp .c12 .tel{padding:18px 12px 10px;display:grid;gap:4px;font-size:19px}
#cp .c12 .tel div{display:flex;justify-content:space-between}
#cp .c12 .tel span{color:var(--dim)}
#cp .c12 .tel .hot{color:var(--acc)}
#cp .c12 .gt{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;grid-auto-rows:34px;padding:18px 12px 12px}
#cp .c12 .kh{position:absolute;left:14px;right:14px;bottom:22px;display:grid;gap:5px;font-size:18px;color:var(--dim)}
#cp .c12 .kh b{color:var(--tx);font-weight:400;display:inline-block;min-width:92px}
#cp .c12 .strip{grid-column:1/4;grid-row:3;display:grid;grid-template-columns:repeat(6,1fr) 1.4fr;gap:6px}
#cp .c12 .slot{border:1px solid var(--tx);position:relative;padding:10px 12px 6px;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;user-select:none}
#cp .c12 .slot .ps{color:var(--dim)}
#cp .c12 .slot b{font-weight:400;font-size:40px;line-height:.9}
#cp .c12 .slot .ud{position:absolute;right:6px;top:6px;display:grid;gap:3px}
#cp .c12 .slot .ud i{display:block;width:16px;height:12px;border:1px solid currentColor;font-style:normal;font-size:12px;line-height:10px;text-align:center}
#cp .c12 .slot.arm{background:var(--tx);color:var(--k)}
#cp .c12 .slot.arm .ps{color:var(--k)}
#cp .c12 .slot.arm::after{content:'';position:absolute;left:12px;right:12px;bottom:4px;height:3px;background:var(--k)}
#cp .c12 .slot.fire{border-color:var(--acc);color:var(--acc);align-items:center;justify-content:center;text-align:center}
#cp .c12 .slot.fire b{font:20px/1.4 PS2P,monospace}
#cp .c12 .slot.fire.arm{background:var(--acc);color:var(--k);border-color:var(--acc)}
`)
  root.classList.add('skel')
  window.__cpRibbon = 1.8
  api.NN.setPix({ pix: 2, mode: 1, levels: 4, a: '#030403', b: '#e9e7dc' })
  const SLOTS = [
    { k: 'ev', label: 'SPEED', unit: 'MPH' }, { k: 'la', label: 'ANGLE', unit: 'DEG' }, { k: 'dir', label: 'DIRECTION' },
    { k: 'temp', label: 'AIR', unit: 'F' }, { k: 'wind', label: 'WIND' }, { k: 'hand', label: 'BATTER' }, { k: 'swing', label: '' },
  ]
  root.innerHTML = `<div class="c12"><div class="hdr"><span class="ps">DINGER DOJO // STUDY 2 // BUTTON STRIP</span><span id="c12a"></span></div>
  <div class="l">
    <div class="pnl p"><span class="t">/ P L A N /</span><div class="fig" id="c12p"></div></div>
    <div class="pnl p"><span class="t">/ A R C /</span><div class="fig" id="c12r"></div></div>
    <div class="pnl p tal"><span class="t">/ T A L L Y /</span><div class="cnt" id="c12c"></div><div class="log" id="c12l"></div></div>
  </div>
  <div class="ctr"><div class="pnl clear" id="c12w"><span class="t">/ O R A C L E &nbsp; P A R K /</span></div>
    <div class="pnl p"><span class="t">/ V E R D I C T /</span><div class="vd" id="c12v"><div class="ps st">PREVIEW</div><div class="hd">. . .</div><div class="sb"></div></div><span class="k">[ENTER] SWING</span></div></div>
  <div class="r"><div class="pnl p"><span class="t">/ T E L E M E T R Y /</span><div class="tel" id="c12t"></div></div><div class="pnl p" style="padding:0"><span class="t">/ P A R K S /</span><div class="gt" id="c12g"></div><div class="kh"><div><b>LEFT RIGHT</b>ARM A SLOT</div><div><b>UP DOWN</b>CHANGE IT</div><div><b>SHIFT</b>BY FIVE</div><div><b>1 TO 7</b>JUMP TO SLOT</div><div><b>H</b>SWITCH BATTER</div><div><b>ENTER</b>SWING</div></div><span class="k">[KEYS]</span></div></div>
  <div class="strip p" id="c12s">${SLOTS.map((s, i) => `<div class="slot${s.k === 'swing' ? ' fire' : ''}" data-i="${i}"><span class="ps">${i + 1} ${s.label}</span>${s.k === 'swing' ? '<b>SWING</b>' : `<b></b><span class="ud"><i data-d="1">+</i><i data-d="-1">-</i></span>`}</div>`).join('')}</div>
  </div>`
  accentPicker(root, root.querySelector('#c12a'))
  windowSync(api, root.querySelector('#c12w'), { zoom: 1.0 })
  const E = (id) => root.querySelector(id)
  const parks = await loadParks()
  const fences = parks.parks.map((p) => ({ pts: fencePoly(parks, p), hot: p.abbr === 'SF' }))
  let armed = 6, beat = null, last = null, committed = null, fireWanted = false, swings = 0, hrs = 0, streak = 0, best = 0
  const log = []
  const pad = (n, w = 5) => String(n).padStart(w, '0')
  const slots = [...root.querySelectorAll('.slot')]
  const change = (i, d) => {
    const k = SLOTS[i].k
    if (k === 'hand') { api.state.hand *= -1; api.update() } else if (k !== 'swing') setP(api, k, api.state[k] + d)
  }
  const fire = () => { fireWanted = true; api.fire() }
  const arm = (i) => { armed = clamp(i, 0, SLOTS.length - 1); paintSlots() }
  slots.forEach((el, i) => {
    el.addEventListener('click', (e) => {
      const d = e.target.closest('i[data-d]')
      if (d) { arm(i); change(i, Number(d.dataset.d)); return }
      arm(i)
      if (SLOTS[i].k === 'swing') fire()
    })
    el.addEventListener('wheel', (e) => { e.preventDefault(); arm(i); change(i, e.deltaY < 0 ? 1 : -1) }, { passive: false })
  })
  addEventListener('keydown', (e) => {
    if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
    const step = e.shiftKey ? 5 : 1
    const k = e.key
    if (k === 'ArrowLeft') { e.preventDefault(); arm(armed - 1) } else if (k === 'ArrowRight') { e.preventDefault(); arm(armed + 1) } else if (k === 'ArrowUp' || k === '+' || k === '=') { e.preventDefault(); change(armed, step) } else if (k === 'ArrowDown' || k === '-') { e.preventDefault(); change(armed, -step) } else if (k === 'Enter' || k === ' ') { e.preventDefault(); fire() } else if (/^[1-7]$/.test(k)) { arm(Number(k) - 1) } else if (k.toLowerCase() === 'h') { api.state.hand *= -1; api.update() }
  })
  function paintSlots() {
    const s = api.state
    slots.forEach((el, i) => {
      el.classList.toggle('arm', i === armed)
      const k = SLOTS[i].k, b = el.querySelector('b')
      if (k === 'swing') return
      b.textContent = k === 'hand' ? (s.hand > 0 ? 'RIGHT' : 'LEFT') : `${SPEC[k].fmt(s[k])}${SLOTS[i].unit && k !== 'dir' ? '' : ''}`
      b.style.fontSize = k === 'hand' ? '28px' : ''
    })
  }
  api.setPreview(true)
  function render(res) {
    last = res
    const s = api.state, v = res.verdict, pv = !!beat?.preview
    E('#c12p').innerHTML = skelPlan(res, api.FT, { w: 330, h: 200, fences, preview: pv, ghost: pv ? committed?.path : null })
    E('#c12r').innerHTML = skelArc(res, api.FT, { w: 330, h: 200, preview: pv, ghost: pv ? committed?.path : null })
    const rows = [['DISTANCE', `${Math.round(res.landFt)} FT`], ['APEX', `${Math.round(res.peakFt)} FT`], ['HANG', `${res.hang.toFixed(1)} S`], ['SPIN', `${Math.round(res.wb)}/${Math.round(res.ws)}`], ['AIR', res.rho.toFixed(3)]]
    if (v.wallFt) rows.push(['WALL', `${Math.round(v.wallFt)} / ${v.wallH.toFixed(0)}`], [v.kind === 'GONE' ? 'OVER BY' : 'SHORT BY', `${(v.kind === 'GONE' ? v.clearBy : v.short ?? 0).toFixed(0)} FT`])
    E('#c12t').innerHTML = rows.map(([a, b], i) => `<div><span>${a}</span><b class="${i >= 5 ? 'hot' : ''}" style="font-weight:400">${b}</b></div>`).join('')
    if (parks.parks.length) { const pr = evalParks(parks, api); E('#c12g').innerHTML = tileHTML(pr) }
    paintSlots(); paintTally(); paintVerdict(false)
  }
  function paintTally() {
    E('#c12c').innerHTML = `<div><span>SWINGS </span>${pad(swings, 2)}</div><div><span>HR </span>${pad(hrs, 2)}</div><div><span>STREAK </span>${pad(streak, 2)}</div><div><span>BEST </span>${best || '---'}</div>`
    E('#c12l').innerHTML = log.slice(-9).map((l, i, a) => `<div class="${i === a.length - 1 ? 'n' : l.hr ? 'h' : ''}">${l.txt}</div>`).join('') || '<div>NO SWINGS YET_</div>'
  }
  function paintVerdict(stampIt) {
    const vd = E('#c12v')
    vd.classList.toggle('hr', isHR(beat)); vd.classList.toggle('pv', !!beat?.preview)
    vd.querySelector('.st').textContent = beat ? beat.state : 'PREVIEW'
    vd.querySelector('.hd').textContent = beat?.preview ? 'PRESS SWING' : beat ? beat.text : '. . .'
    vd.querySelector('.sb').textContent = beat?.sub ?? ''
    if (stampIt) restamp(vd)
  }
  return {
    render,
    beat: (b) => {
      beat = b
      if (b.last && (fireWanted || window.__fixedTime !== undefined)) {
        fireWanted = false
        const res = window.__dojo, s = api.state, hr = isHR(b)
        swings++; if (hr) { hrs++; streak++ } else streak = 0
        best = Math.max(best, Math.round(res.landFt))
        log.push({ hr, txt: `${pad(swings)}_ ${s.ev} ${s.la} ${s.dir < 0 ? -s.dir + 'L' : s.dir > 0 ? s.dir + 'R' : 'C'} > ${b.state} ${Math.round(res.landFt)}` })
        committed = { path: res.path }
      }
      paintVerdict(!!b.last); paintTally()
      if (last) render(last)
    },
  }
}
