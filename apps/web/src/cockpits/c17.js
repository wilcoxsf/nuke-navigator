// Study 17, ASCII DOSSIER (amber on black by default): everything is characters. The field is a character grid (rings, foul lines, infield, the fence as #, the ball path in o's, X where it lands),
// the swing is a numbered list with block-character bars, the league histograms are block characters with ^ marking this ball and : the average, the crab is line art, and the keys run along the
// bottom like an old terminal's F-key bar. Up and down pick a line, left and right change it, Enter swings. Buttons press down; panels pop and tilt a little on hover.
import { SKEL_CSS, restamp, isHR } from './skel.js'
import { finishUI, oracleFence, oracleFences, THEME_CSS, JUICE_CSS, themePicker, popPanels, pressEl, makeControls, makeSession, loadDists, METRICS, asciiHist, pctWord, asciiField } from './skel2.js'

const CRAB = [
  '    \\\\_ _//    ',
  '   _(o) (o)_   ',
  '  / \\  ~  / \\  ',
  ' ( ( )===( ) ) ',
  '  \\_/ /|\\ \\_/  ',
  '     /_|_\\     ',
]
const bar = (f, n = 24) => '█'.repeat(Math.round(f * n)) + '·'.repeat(n - Math.round(f * n))

export async function build(root, api, U) {
  const { css, loadParks, evalParks, fencePoly } = U
  css('cp17', SKEL_CSS + THEME_CSS + JUICE_CSS + `
#cp.skel.solid{background:var(--k)}
#cp .c17{position:absolute;inset:10px;display:grid;gap:12px;grid-template-columns:minmax(0,1fr) 560px;grid-template-rows:20px minmax(0,1fr) 46px}
#cp .c17 .hdr{grid-column:1/3;display:flex;justify-content:space-between;align-items:center}
#cp .c17 pre{margin:0;font:inherit;white-space:pre;letter-spacing:0;text-transform:none}
#cp .c17 .fld{padding:20px 14px 8px;display:flex;flex-direction:column;gap:6px}
#cp .c17 .fld pre.f{font-size:23px;line-height:21px;color:var(--tx)}
#cp .c17 .fld .pk{font-size:19px;line-height:19px;color:var(--dim)}
#cp .c17 .fld .pk b{font-weight:400;color:var(--acc)}
#cp .c17 .fld .gn{color:var(--acc);font-size:19px}
#cp .c17 .dos{padding:20px 14px 8px;display:flex;flex-direction:column;gap:3px;font-size:19px;line-height:20px}
#cp .c17 .dos .hd{display:flex;justify-content:space-between;color:var(--acc);font-size:21px}
#cp .c17 .dos .rule{border-top:1px dashed var(--dim);height:0;margin:3px 0}
#cp .c17 .dos .ln{display:grid;grid-template-columns:22px 108px 1fr 22px 22px;gap:6px;align-items:center;cursor:pointer;padding:0 2px}
#cp .c17 .dos .ln.arm{background:var(--tx);color:var(--k)}
#cp .c17 .dos .ln.arm .bt{border-color:var(--k)}
#cp .c17 .dos .ln span.n{color:var(--dim)}
#cp .c17 .dos .ln.arm span.n{color:var(--k)}
#cp .c17 .dos .ln .v{white-space:pre;font:15px/17px Consolas,'Cascadia Mono',monospace}
#cp .c17 .dos .ln .bt{padding:0;height:17px;line-height:13px;font-size:15px;text-align:center;box-shadow:0 2px 0 var(--e)}
#cp .c17 .dos .ln .bt:active{transform:translateY(2px);box-shadow:0 0 0 var(--e)}
#cp .c17 .dos .verd{margin-top:2px;font-size:26px;line-height:26px;color:var(--tx)}
#cp .c17 .dos .verd.hr{color:var(--acc)}
#cp .c17 .dos .verd.pv{color:var(--dim)}
#cp .c17 .dos .sub{color:var(--dim);min-height:20px}
#cp .c17 .dos .lg .l{display:flex;justify-content:space-between;color:var(--dim);margin-top:2px}
#cp .c17 .dos .lg .l b{font-weight:400;color:var(--tx)}
#cp .c17 .dos .lg .l i{font-style:normal;color:var(--acc)}
#cp .c17 .dos .lg pre{font:14px/13px Consolas,'Cascadia Mono',monospace;color:var(--tx)}
#cp .c17 .dos .lg pre.mk{color:var(--acc);line-height:11px}
#cp .c17 .dos .low{display:flex;justify-content:space-between;align-items:flex-end;margin-top:auto}
#cp .c17 .dos .crab{color:var(--dim);font-size:19px;line-height:17px}
#cp .c17 .dos .tly{font-size:18px;line-height:18px;color:var(--dim)}
#cp .c17 .dos .tly div.n{color:var(--acc)}
#cp .c17 .dos .tly div.h{color:var(--tx)}
#cp .c17 .fk{grid-column:1/3;display:flex;gap:10px;align-items:stretch;padding-bottom:6px}
#cp .c17 .fk .bt{font-size:19px;padding:2px 14px;display:flex;align-items:center;gap:8px;box-shadow:0 4px 0 var(--e)}
#cp .c17 .fk .bt:hover{box-shadow:0 6px 0 var(--e)}
#cp .c17 .fk .bt:active,#cp .c17 .fk .bt.pr{box-shadow:0 0 0 var(--e)}
#cp .c17 .fk .bt i{font-style:normal;color:var(--dim)}
#cp .c17 .fk .bt.hot{font-size:19px}
`)
  root.classList.add('skel', 'solid')
  window.__cpRibbon = 1.8
  api.NN.setPaused(true) // this study covers the park, so do not spend the GPU drawing it
  const ctl = makeControls(api, U), ses = makeSession(api)
  root.innerHTML = `<div class="c17"><div class="hdr"><span class="ps">DINGER DOJO // STUDY 17 // ASCII DOSSIER</span><span id="c17a"></span></div>
  <div class="pnl p pop fld"><span class="t">/ F I E L D &nbsp; // &nbsp; O R A C L E &nbsp; P A R K /</span><pre class="f" id="c17f"></pre><div class="pk" id="c17k"></div><div class="gn" id="c17n"></div></div>
  <div class="pnl p pop dos"><span class="t">/ S W I N G &nbsp; D O S S I E R /</span>
    <div class="hd"><span id="c17id">#00000</span><span>ORACLE PARK</span></div><div class="rule"></div>
    <div id="c17lines">${ctl.SLOTS.map((s, i) => `<div class="ln" data-i="${i}"><span class="n">${i + 1}</span><span>${s.label}</span><span class="v"></span><span class="bt" data-d="-1">-</span><span class="bt" data-d="1">+</span></div>`).join('')}</div>
    <div class="rule"></div>
    <div class="verd pv" id="c17v">PRESS SWING</div><div class="sub" id="c17s"></div>
    <div class="rule"></div>
    <div class="lg" id="c17l"></div>
    <div class="low"><pre class="crab" id="c17c">${CRAB.join('\n')}</pre><div class="tly" id="c17t"></div></div></div>
  <div class="fk p" id="c17fk"><span class="bt hot" data-k="swing"><i>[ENTER]</i>SWING</span><span class="bt" data-k="prev"><i>[F2]</i>PREVIEW</span><span class="bt" data-k="hand"><i>[H]</i>BATTER</span><span class="bt" data-k="preset"><i>[F4]</i>PRESET</span><span class="bt" data-k="clear"><i>[F5]</i>CLEAR LOG</span><span style="margin-left:auto;color:var(--dim);align-self:center;font-size:18px">UP DOWN PICK  LEFT RIGHT CHANGE  SHIFT x5  1-6 JUMP</span></div></div>`
  themePicker(root, root.querySelector('#c17a'), api, 17, 'amber')
  popPanels(root)
  finishUI(root)
  const E = (id) => root.querySelector(id), D = await loadDists(), parks = await loadParks()
  const fences = parks.parks.map((p) => ({ pts: fencePoly(parks, p), hot: p.abbr === 'SF' }))
  const lines = [...root.querySelectorAll('#c17lines .ln')]
  ctl.els = lines.map((l) => l.querySelector('.bt'))
  ctl.onArm = ctl.onChange = () => paintInputs()
  lines.forEach((l, i) => {
    l.addEventListener('click', (e) => { const d = e.target.closest('[data-d]'); ctl.arm(i); if (d) { pressEl(d); ctl.change(i, Number(d.dataset.d)) } })
    l.addEventListener('wheel', (e) => { e.preventDefault(); ctl.arm(i); ctl.change(i, e.deltaY < 0 ? 1 : -1) }, { passive: false })
  })
  const names = Object.keys(api.PRESETS)
  let pi = 0
  const fkb = (k) => root.querySelector(`#c17fk [data-k="${k}"]`)
  const fire = () => { pressEl(fkb('swing')); ses.fire() }
  const act = {
    swing: fire,
    prev: () => { api.setPreview(true); api.update() },
    hand: () => ctl.change(5, 1),
    preset: () => { Object.assign(api.state, api.PRESETS[names[pi++ % names.length]]); api.update() },
    clear: () => { ses.log.length = 0; ses.swings = ses.hrs = ses.streak = ses.best = 0; paintTally() },
  }
  for (const b of root.querySelectorAll('#c17fk [data-k]')) b.addEventListener('click', () => { pressEl(b); act[b.dataset.k]() })
  addEventListener('keydown', (e) => { const m = { F2: 'prev', F4: 'preset', F5: 'clear' }[e.key]; if (m) { e.preventDefault(); pressEl(fkb(m)); act[m]() } })
  ctl.bind(fire, 'v')
  api.setPreview(true)
  function paintInputs() {
    lines.forEach((l, i) => {
      const k = ctl.SLOTS[i].k
      l.classList.toggle('arm', i === ctl.armed)
      l.querySelector('.v').textContent = `${ctl.text(k).padEnd(7)} ${bar(ctl.frac(k), 18)}`
    })
  }
  let last = null
  function render(res) {
    last = res
    const s = api.state, v = res.verdict, pv = !!ses.beat?.preview
    E('#c17f').textContent = asciiField(res, api.FT, { cols: 92, rows: 30, fences: oracleFences(api, fences), preview: pv, ghost: pv ? ses.committed?.path : null })
    E('#c17id').textContent = '#' + String(ses.swings + (pv ? 1 : 0)).padStart(5, '0')
    E('#c17l').innerHTML = METRICS.map((m) => {
      const h = asciiHist(D, m, res, s, 64)
      return `<div class="l"><span>${m.label} <b>${m.fmt(m.get(res, s))} ${m.unit}</b></span><i>${pctWord(h.pct)}</i></div><pre>${h.rows[0]}\n${h.rows[1]}</pre><pre class="mk">${h.rows[2]}</pre>`
    }).join('')
    if (parks.parks.length) {
      const pr = evalParks(parks, api), cell = (r) => `${r.p.abbr.padEnd(3)}${(r.k === 'GONE' ? '+' + Math.round(r.margin) : r.k === 'WALL' ? String(Math.round(r.margin)) : r.k === 'PLAY' ? 'IN' : 'FL').padStart(4)}`
      let t = ''
      for (let i = 0; i < pr.length; i += 10) t += pr.slice(i, i + 10).map((r) => (r.k === 'GONE' ? `<b>${cell(r)}</b>` : cell(r))).join('  ') + '\n'
      E('#c17k').innerHTML = `<pre>${t}</pre>`
      E('#c17n').textContent = `GONE IN ${pr.filter((r) => r.k === 'GONE').length} OF ${pr.length} PARKS`
    }
    E('#c17s').textContent = ses.beat?.sub ?? `${Math.round(res.landFt)} FT  APEX ${Math.round(res.peakFt)}  HANG ${res.hang.toFixed(1)} S${v.wallFt ? `  WALL ${Math.round(v.wallFt)}/${v.wallH.toFixed(0)}` : ''}`
    paintInputs(); paintTally(); paintVerdict(false)
  }
  function paintTally() {
    E('#c17t').innerHTML = `<div>SWINGS ${String(ses.swings).padStart(2, '0')}  HR ${String(ses.hrs).padStart(2, '0')}  BEST ${ses.best || '---'}</div>` + ses.log.slice(-4).map((l, i, a) => `<div class="${i === a.length - 1 ? 'n' : l.hr ? 'h' : ''}">${ses.line(l)}</div>`).join('')
  }
  function paintVerdict(stampIt) {
    const vd = E('#c17v'), b = ses.beat
    vd.classList.toggle('hr', isHR(b)); vd.classList.toggle('pv', !!b?.preview)
    vd.textContent = b?.preview ? 'PRESS SWING' : b ? `${b.state}: ${b.text}` : 'PRESS SWING'
    if (stampIt) restamp(vd)
  }
  return { render, beat: (b) => { ses.onBeat(b); paintVerdict(!!b.last); if (last) render(last) } }
}
