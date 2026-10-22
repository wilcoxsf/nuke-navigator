// Study 3, SKELETON DECK: Neuromancer. The park is drawn as lines of light on a void (edges plus a sparse stipple for the ground), and you drive it from a terminal prompt:
// ev 104, la 27, dir l25, temp 62, wind out 5, hand l, preset homer, swing. Changes only move the ghost (dashed in the plan and arc); `swing` (or Enter on an empty line) commits,
// the result types itself out line by line. `parks` prints the thirty-park table, `tally` your history, `acc red` changes the accent. Plan and arc sit beside the terminal.
import { skelPlan, skelArc, SKEL_CSS, accentPicker, tileHTML, isHR, ACCENTS } from './skel.js'

export async function build(root, api, U) {
  const { SPEC, css, setP, windowSync, loadParks, evalParks, fencePoly, clamp } = U
  css('cp13', SKEL_CSS + `
#cp .c13{position:absolute;inset:10px;display:grid;gap:12px;grid-template-columns:500px 280px 280px 1fr;grid-template-rows:20px minmax(0,1fr) 258px}
#cp .c13 .hdr{grid-column:1/5;display:flex;justify-content:space-between;align-items:center}
#cp .c13 .win{grid-column:1/5;grid-row:2;border-color:var(--dim)}
#cp .c13 .ov{position:absolute;left:14px;top:16px;font-size:20px;line-height:1.15;color:var(--tx)}
#cp .c13 .ov span{color:var(--dim)}
#cp .c13 .ov .hot{color:var(--acc)}
#cp .c13 .term{grid-column:1;grid-row:3;padding:16px 12px 8px;display:flex;flex-direction:column;justify-content:flex-end;font-size:20px;line-height:1.1}
#cp .c13 .lines{flex:1;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;gap:1px}
#cp .c13 .lines div{white-space:pre-wrap;color:var(--dim)}
#cp .c13 .lines div.c{color:var(--tx)}
#cp .c13 .lines div.r{color:var(--acc)}
#cp .c13 .lines div.h{color:var(--tx)}
#cp .c13 .chips{display:flex;gap:4px;flex-wrap:wrap;margin:6px 0 4px}
#cp .c13 .chips button{font-size:16px;padding:0 6px}
#cp .c13 .prompt{border-top:1px solid var(--dim);padding-top:6px;color:var(--tx);min-height:26px}
#cp .c13 .fig{position:absolute;inset:12px 4px 2px}
#cp .c13 .gt{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;grid-auto-rows:32px;padding:16px 12px 8px}
#cp .c13 .gn{padding:0 12px;color:var(--acc);font-size:20px;position:absolute;bottom:8px;left:0}
`)
  root.classList.add('skel')
  window.__cpRibbon = 2.2
  api.NN.setPix({ pix: 2, mode: 2, levels: 2, a: '#030403', b: '#e9e7dc' })
  const pre = Object.keys(api.PRESETS).slice(0, 7)
  root.innerHTML = `<div class="c13"><div class="hdr"><span class="ps">DINGER DOJO // STUDY 3 // SKELETON DECK</span><span id="c13a"></span></div>
  <div class="pnl clear win" id="c13w"><span class="t">/ O R A C L E &nbsp; P A R K /</span><div class="ov" id="c13o"></div></div>
  <div class="pnl p term"><span class="t">/ T E R M I N A L /</span><div class="lines" id="c13l"></div>
    <div class="chips">${pre.map((n) => `<button data-c="preset ${n}">${n}</button>`).join('')}<button data-c="parks">parks</button><button data-c="wire">wire</button><button data-c="swing" style="border-color:var(--acc);color:var(--acc)">swing</button></div>
    <div class="prompt" id="c13p"></div></div>
  <div class="pnl p"><span class="t">/ P L A N /</span><div class="fig" id="c13pl"></div></div>
  <div class="pnl p"><span class="t">/ A R C /</span><div class="fig" id="c13ar"></div></div>
  <div class="pnl p"><span class="t">/ P A R K S /</span><div class="gt" id="c13g"></div><div class="gn" id="c13n"></div></div></div>`
  accentPicker(root, root.querySelector('#c13a'))
  windowSync(api, root.querySelector('#c13w'), { zoom: 1.05 })
  const E = (id) => root.querySelector(id)
  const parks = await loadParks()
  const fences = parks.parks.map((p) => ({ pts: fencePoly(parks, p), hot: p.abbr === 'SF' }))
  const instant = window.__fixedTime !== undefined
  // terminal engine: lines, a typing queue (about 140 characters a second), a prompt buffer with history
  const lines = [], queue = []
  let buf = '', hist = [], hi = -1, last = null, beat = null, committed = null, swings = 0, hrs = 0, fireWanted = false, typing = false
  const draw = () => {
    E('#c13l').innerHTML = lines.slice(-14).map((l) => `<div class="${l.c}">${l.t.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</div>`).join('')
    E('#c13p').innerHTML = `&gt; ${buf.replace(/&/g, '&amp;').replace(/</g, '&lt;')}<span class="cur"></span>`
  }
  const say = (t, c = '') => { if (instant) { lines.push({ t, c }); draw() } else { queue.push({ t, c }); pump() } }
  function pump() {
    if (typing) return
    typing = true
    const next = () => {
      const q = queue.shift()
      if (!q) { typing = false; return }
      const l = { t: '', c: q.c }; lines.push(l)
      let i = 0
      const iv = setInterval(() => { i = Math.min(q.t.length, i + 2); l.t = q.t.slice(0, i); draw(); if (i >= q.t.length) { clearInterval(iv); setTimeout(next, 30) } }, 14)
    }
    next()
  }
  const fmtDir = (v) => (v < -2 ? `L${-v}` : v > 2 ? `R${v}` : 'CF')
  function set(k, v) { setP(api, k, v); const s = api.state; say(`${k} = ${SPEC[k].fmt(s[k])}${SPEC[k].unit && k !== 'dir' && k !== 'wind' ? ' ' + SPEC[k].unit.toLowerCase() : ''}`, 'c') }
  function run(cmd) {
    const t = cmd.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (!t.length) { say('> swing', 'c'); fire(); return }
    const [c, ...a] = t
    const n = (x) => Number(x)
    if (c === 'help' || c === '?') { say('ev N | la N | dir l25 r10 cf | temp N | wind out 5 in 5 calm', 'h'); say('hand l|r | preset NAME | swing | parks | tally | acc COLOR | wire [acc|off] | clear', 'h'); say('presets: ' + Object.keys(api.PRESETS).join(' '), 'h') }
    else if (c === 'clear') { lines.length = 0; draw() }
    else if (c === 'wire') { wire(a[0] === 'off' ? false : a[0] === 'on' || a[0] === 'acc' ? true : !wired, a[0] === 'acc'); say(wired ? 'wireframe park on (wire off to leave)' : 'wireframe park off', 'c') }
    else if (c === 'swing' || c === 'fire') fire()
    else if (c === 'preset') { const p = api.PRESETS[a[0]]; if (p) { Object.assign(api.state, p); api.update(); say(`preset ${a[0]}: ${p.ev} mph ${p.la} deg ${fmtDir(p.dir)}`, 'c') } else say('no such preset', 'r') }
    else if (c === 'parks') { if (!parks.parks.length) return say('no park data', 'r'); const pr = evalParks(parks, api); say(`GONE IN ${pr.filter((r) => r.k === 'GONE').length} OF ${pr.length}`, 'r'); for (let i = 0; i < pr.length; i += 3) say(pr.slice(i, i + 3).map((r) => `${r.p.abbr} ${r.k === 'GONE' ? '+' + Math.round(r.margin) : r.k === 'WALL' ? Math.round(r.margin) : r.k === 'PLAY' ? 'IN' : 'FL'}`.padEnd(10)).join(''), 'h') }
    else if (c === 'tally') say(`swings ${swings}  home runs ${hrs}`, 'h')
    else if (c === 'acc') { const k = a[0]; if (ACCENTS[k]) { root.style.setProperty('--acc', ACCENTS[k]); say(`accent ${k}`, 'c') } else say('amber red green bone', 'r') }
    else if (c === 'hand') set2hand(a[0])
    else if (['ev', 'la', 'temp'].includes(c) && !isNaN(n(a[0]))) set(c, n(a[0]))
    else if (c === 'dir' && a[0]) { const m = /^([lr])(\d+)$/.exec(a[0]); set('dir', a[0] === 'cf' ? 0 : m ? (m[1] === 'l' ? -n(m[2]) : n(m[2])) : n(a[0])) }
    else if (c === 'wind') { const w = a[0] === 'calm' ? 0 : a[0] === 'out' ? n(a[1]) : a[0] === 'in' ? -n(a[1]) : n(a[0]); if (!isNaN(w)) set('wind', w); else say('wind out 5 | in 5 | calm', 'r') }
    else say(`unknown: ${c} (try help)`, 'r')
  }
  let wired = false // the park drawn as its own hard edges and height contours, faces black, instead of the stippled skeleton shader
  function wire(on, acc) {
    wired = on
    if (on) {
      api.NN.setPix({ pix: 0, mode: 0 })
      api.NN.setWire(true, { angle: 60, step: 4, hidden: true, opacity: 0.85, color: acc ? getComputedStyle(root).getPropertyValue('--acc').trim() : '#e9e7dc' })
    } else {
      api.NN.setWire(false)
      api.NN.setPix({ pix: 2, mode: 2, levels: 2, a: '#030403', b: '#e9e7dc' })
    }
  }
  if (new URLSearchParams(location.search).get('wire')) wire(true, false)
  function set2hand(x) { api.state.hand = x && x[0] === 'l' ? -1 : 1; api.update(); say(`hand = ${api.state.hand > 0 ? 'right' : 'left'}`, 'c') }
  function fire() { fireWanted = true; api.fire() }
  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (e.key === 'Enter') { e.preventDefault(); const cmd = buf; if (cmd.trim()) { hist.push(cmd); say('> ' + cmd, 'c') } hi = -1; buf = ''; draw(); run(cmd) } else if (e.key === 'Backspace') { e.preventDefault(); buf = buf.slice(0, -1); draw() } else if (e.key === 'Escape') { buf = ''; draw() } else if (e.key === 'ArrowUp') { e.preventDefault(); if (hist.length) { hi = hi < 0 ? hist.length - 1 : Math.max(0, hi - 1); buf = hist[hi]; draw() } } else if (e.key === 'ArrowDown') { e.preventDefault(); if (hi >= 0) { hi++; buf = hi >= hist.length ? '' : hist[hi]; if (hi >= hist.length) hi = -1; draw() } } else if (e.key.length === 1 && buf.length < 60) { e.preventDefault(); buf += e.key; draw() }
  })
  for (const b of root.querySelectorAll('[data-c]')) b.addEventListener('click', () => { say('> ' + b.dataset.c, 'c'); run(b.dataset.c) })
  api.setPreview(true)
  say('NUKE NAVIGATOR DECK 0.1', 'h'); say('type help. enter on an empty line swings.', '')
  draw()
  function render(res) {
    last = res
    const s = api.state, v = res.verdict, pv = !!beat?.preview
    E('#c13pl').innerHTML = skelPlan(res, api.FT, { w: 270, h: 200, fences, preview: pv, ghost: pv ? committed?.path : null })
    E('#c13ar').innerHTML = skelArc(res, api.FT, { w: 270, h: 200, preview: pv, ghost: pv ? committed?.path : null })
    E('#c13o').innerHTML = [['EV', `${s.ev} MPH`], ['LA', `${s.la} DEG`], ['DIR', SPEC.dir.fmt(s.dir)], ['DIST', `${Math.round(res.landFt)} FT`], ['APEX', `${Math.round(res.peakFt)} FT`], ['WALL', v.wallFt ? `${Math.round(v.wallFt)}/${v.wallH.toFixed(0)}` : '--']].map(([a, b], i) => `<div><span>${a.padEnd(5, ' ')}</span><b class="${i >= 3 ? 'hot' : ''}" style="font-weight:400">${b}</b></div>`).join('')
    if (parks.parks.length) { const pr = evalParks(parks, api); E('#c13g').innerHTML = tileHTML(pr); E('#c13n').textContent = `GONE IN ${pr.filter((r) => r.k === 'GONE').length} OF ${pr.length}` }
  }
  return {
    render,
    beat: (b) => {
      beat = b
      if (b.last && (fireWanted || instant)) {
        fireWanted = false
        const res = window.__dojo
        swings++; if (isHR(b)) hrs++
        say(`>> ${b.state}: ${b.text}`, 'r')
        say(`   ${Math.round(res.landFt)} ft, apex ${Math.round(res.peakFt)}, hang ${res.hang.toFixed(1)} s${res.verdict.wallFt ? `, wall ${Math.round(res.verdict.wallFt)}/${res.verdict.wallH.toFixed(0)}` : ''}`, 'h')
        committed = { path: res.path }
      }
      if (last) render(last)
    },
  }
}
