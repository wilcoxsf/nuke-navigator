// Study 19, WIRE PARK II: study 16 rebuilt from the red team and your answers. One DOM, four layouts (?lay=a to d, or the A B C D buttons; L cycles). Two modes: REPLAY flies real balls
// (every Giants home run since bat tracking began, or every Oracle home run, with the actual pitch, spin, swing and batter) and WHAT-IF flies the swing you set. Parts: the wireframe park
// (two line weights, distance fade, a raised camera with three presets, the flight as beads with a ground track and the fence segment it crosses lit), the verdict stamp, the field plan
// (radar), the arc, league comparison (an exit-speed by launch-angle barrel map plus honest histograms), the thirty parks, the strike zone with spin, the swing diagram, the player card
// (portrait, or a procedural ASCII batter that swings at the real attack angle), the controls, and the tally. Hover rule: pictures lean (plan, pitch, swing, card), numbers lift
// (arc, league, parks), buttons sink, the park rotates by dragging, the verdict stamps.
import { SKEL_CSS, restamp, tileHTML, isHR } from './skel.js'
import { THEME_CSS, JUICE_CSS, themePicker, pressEl, makeControls, makeSession, loadDists, bigPlan, arcSVG, finishUI, oracleFence, oracleFences } from './skel2.js'
import { dotDigits, HOVER_CSS, hoverRule, rollTo, loadReplay, loadPool, loadFaces, ballsLike, zoneSVG, swingSVG, asciiBatter, asciiBust, barrelMap, histHonest } from './skel3.js'

const PITCH = { FF: 'FOUR-SEAM', SI: 'SINKER', FC: 'CUTTER', SL: 'SLIDER', ST: 'SWEEPER', CU: 'CURVE', KC: 'KNUCKLE-CURVE', CH: 'CHANGEUP', FS: 'SPLITTER', SV: 'SLURVE', KN: 'KNUCKLEBALL', EP: 'EEPHUS', CS: 'SLOW CURVE', FO: 'FORKBALL' }
const rep = (n, s) => Array(n).fill(s).join(' ')
const row = (...p) => '"' + p.map(([n, s]) => rep(n, s)).join(' ') + '"'
const HDR = row([24, 'hdr'])
const LAY = {
  a: { rows: '20px 140px 190px minmax(0,1fr) 78px 206px', areas: [HDR, row([18, 'hero'], [6, 'verd']), row([18, 'hero'], [3, 'zone'], [3, 'swing']), row([18, 'hero'], [6, 'card']), row([24, 'ctl']), row([5, 'plan'], [5, 'arc'], [10, 'lg'], [4, 'prk'])], ov: [], name: 'RIGHT RAIL' },
  b: { rows: '20px minmax(0,1fr) 78px 206px', areas: [HDR, row([24, 'hero']), row([24, 'ctl']), row([4, 'plan'], [4, 'arc'], [3, 'swing'], [3, 'zone'], [7, 'lg'], [3, 'prk'])], ov: ['verd', 'card'], name: 'FLOATING CARD' },
  c: { rows: '20px minmax(0,1fr) 78px 232px', areas: [HDR, row([24, 'hero']), row([24, 'ctl']), row([4, 'card'], [3, 'zone'], [3, 'swing'], [4, 'plan'], [4, 'arc'], [6, 'lg'])], ov: ['verd', 'prk'], name: 'BOTTOM DOCK' },
  d: { rows: '20px minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) 78px 190px', areas: [HDR, row([5, 'card'], [14, 'hero'], [5, 'verd']), row([5, 'zone'], [14, 'hero'], [5, 'lg']), row([5, 'swing'], [14, 'hero'], [5, 'prk']), row([24, 'ctl']), row([9, 'plan'], [15, 'arc'])], ov: [], name: 'THREE COLUMNS' },
}

export async function build(root, api, U) {
  const { css, loadParks, evalParks, fencePoly, windowSync, SPEC } = U
  css('cp19', SKEL_CSS + THEME_CSS + JUICE_CSS + HOVER_CSS + `
#cp .c19{position:absolute;inset:10px;display:grid;gap:12px;grid-template-columns:repeat(24,minmax(0,1fr))}
#cp .c19 .hdr{grid-area:hdr;display:flex;justify-content:space-between;align-items:center;gap:12px;white-space:nowrap}
#cp .c19 .hdr .rt{display:flex;gap:14px;align-items:center}
#cp .c19 .hdr .bt{font:8px/1 PS2P,monospace;padding:5px 8px;box-shadow:0 3px 0 var(--e)}
#cp .c19 .hdr .bt:hover{box-shadow:0 4px 0 var(--e)}
#cp .c19 .hdr .grp{display:flex;gap:6px;align-items:center;font:8px PS2P,monospace;color:var(--dim)}
#cp .c19 .hdr .bt.on{background:var(--tx);color:var(--k);transform:translateY(2px);box-shadow:0 1px 0 var(--e)}
#cp .c19 .pnl.nob{border:none;background:transparent}
#cp .c19 .fig{position:absolute;inset:14px 6px 4px}
#cp .c19 .win{pointer-events:none}
#cp .c19 .ovs{position:absolute;inset:0;pointer-events:none}
#cp .c19 .ovs .cell{pointer-events:auto}
#cp .c19 .ovl{position:absolute;z-index:4}
#cp .c19 .ovl.verd{right:14px;top:14px;width:340px;height:132px}
#cp .c19 .ovl.card{left:14px;top:178px;width:370px;height:214px}
#cp .c19 .ovl.prk{right:14px;bottom:14px;width:380px;height:140px}
#cp .c19 .ovl>.pnl{background:var(--k)}
#cp .c19 .rd{position:absolute;left:16px;top:12px;pointer-events:none}
#cp .c19 .rd b{font-weight:400;font-size:62px;line-height:.9;display:block;color:var(--tx)}
#cp .c19 .rd b i{font-style:normal;font-size:24px;color:var(--dim)}
#cp .c19 .rd>span{color:var(--dim);font-size:18px}
#cp .c19 .bsel{position:absolute;left:16px;top:96px;display:grid;gap:3px;font-size:17px;max-width:520px}
#cp .c19 .bsel .r1{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
#cp .c19 .bsel .bt{font:8px/1 PS2P,monospace;padding:4px 7px;box-shadow:0 3px 0 var(--e)}
#cp .c19 .bsel .bt.on{background:var(--tx);color:var(--k);transform:translateY(2px);box-shadow:0 1px 0 var(--e)}
#cp .c19 .bsel .r2{color:var(--dim)}
#cp .c19 .bsel .r2 b{font-weight:400;color:var(--tx)}
#cp .c19 .tly{position:absolute;left:16px;bottom:12px;font-size:17px;display:grid;gap:1px;pointer-events:none}
#cp .c19 .tly div{color:var(--dim)}
#cp .c19 .tly div.n{color:var(--acc)}
#cp .c19 .tly div.h{color:var(--tx)}
#cp .c19 .tly .c{color:var(--tx);margin-bottom:2px}
#cp .c19 .tly .c span{color:var(--dim)}
#cp .c19 .vd{position:absolute;inset:16px 14px 8px;display:flex;flex-direction:column;gap:3px}
#cp .c19 .vd .hd{font-size:30px;line-height:1}
#cp .c19 .vd.hr .hd,#cp .c19 .vd.hr .st{color:var(--acc)}
#cp .c19 .vd.pv .hd{color:var(--dim);font-size:24px}
#cp .c19 .vd .sb{font-size:18px;color:var(--dim);min-height:18px}
#cp .c19 .vd .ed{color:var(--acc);font-size:15px;margin-top:auto}
#cp .c19 .strip{position:absolute;inset:0 0 6px;display:grid;grid-template-columns:repeat(6,1fr) 1.4fr;gap:10px}
#cp .c19 .strip .bt{padding:8px 10px 4px;display:flex;flex-direction:column;justify-content:space-between}
#cp .c19 .strip .bt .ps{color:var(--dim)}
#cp .c19 .strip .bt.arm .ps{color:var(--k)}
#cp .c19 .strip .bt b{font-weight:400;font-size:30px;line-height:.9}
#cp .c19 .strip .bt .ud{position:absolute;right:6px;top:6px;display:grid;gap:3px}
#cp .c19 .strip .bt .ud i{display:block;width:16px;height:12px;border:1px solid currentColor;font-style:normal;font-size:12px;line-height:10px;text-align:center}
#cp .c19 .strip .bt .ud i:active{background:var(--acc);border-color:var(--acc);color:var(--k)}
#cp .c19 .strip .bt.hot b{font:17px/1.3 PS2P,monospace;align-self:center;margin:auto}
#cp .c19 .cd{position:absolute;inset:16px 10px 26px;display:flex;gap:12px;align-items:flex-start;overflow:hidden}
#cp .c19 .cd pre{margin:0;font:11px/9.5px Consolas,'Cascadia Mono',monospace;color:var(--tx);white-space:pre;text-transform:none}
#cp .c19 .cd pre .me{background:var(--acc);color:var(--k)}
#cp .c19 .cd .info{min-width:0;display:grid;gap:2px;align-content:start}
#cp .c19 .cd .info b{font-weight:400;font-size:24px;line-height:1}
#cp .c19 .cd .info span{color:var(--dim);font-size:17px;line-height:1.1}
#cp .c19 .cd .info .dn{color:var(--acc);font:8px/6.5px Consolas,monospace;margin:2px 0 4px}
#cp .c19 .cdt{position:absolute;left:10px;bottom:5px;display:flex;gap:6px}
#cp .c19 .cdt .bt{font:8px/1 PS2P,monospace;padding:3px 6px;box-shadow:0 2px 0 var(--e)}
#cp .c19 .cdt .bt.on{background:var(--tx);color:var(--k);transform:translateY(1px);box-shadow:0 1px 0 var(--e)}
#cp .c19 .lgw{position:absolute;inset:16px 10px 6px;display:grid;grid-template-columns:minmax(0,52%) minmax(0,1fr);gap:12px;grid-template-rows:minmax(0,1fr) auto}
#cp .c19 .lgw>div:first-child{min-width:0;overflow:hidden}
#cp .c19 .lgw pre{margin:0;font-family:Consolas,'Cascadia Mono',monospace;color:var(--tx);white-space:pre;text-transform:none}
#cp .c19 .lgw pre .ax{color:var(--dim)}
#cp .c19 .lgw pre .me{background:var(--acc);color:var(--k)}
#cp .c19 .lgw .bmh{color:var(--dim);font-size:15px;line-height:1.05;margin-bottom:3px}
#cp .c19 .lgw .bmh b{font-weight:400;color:var(--tx)}
#cp .c19 .lgw .hs{display:grid;grid-template-rows:repeat(3,minmax(0,1fr));gap:2px;min-height:0}
#cp .c19 .lgw .hr{display:grid;grid-template-rows:auto minmax(0,1fr);min-height:0}
#cp .c19 .lgw .hr .lb{display:flex;justify-content:space-between;gap:8px;font-size:14px;color:var(--dim);white-space:nowrap;overflow:hidden}
#cp .c19 .lgw .hr .lb i{overflow:hidden;text-overflow:ellipsis}
#cp .c19 .lgw .hr .lb b{font-weight:400;color:var(--tx)}
#cp .c19 .lgw .hr .lb i{font-style:normal;color:var(--acc)}
#cp .c19 .lgw .hr .hg{min-height:0;overflow:hidden}
#cp .c19 .lgw .key{grid-column:1/3;color:var(--dim);font-size:12px;margin-top:-2px;white-space:normal;line-height:1}
#cp .c19 .gt{position:absolute;inset:16px 8px 22px;display:grid;grid-template-columns:repeat(var(--gc,6),1fr);gap:3px;grid-auto-rows:minmax(0,1fr)}
#cp .c19 .gt .tile{font-size:13px}
#cp .c19 .gt .tile.g{color:var(--tx);border-color:var(--tx)}
#cp .c19 .gt .tile.me{outline:1px solid var(--acc);color:var(--acc)}
#cp .c19 .gn{position:absolute;left:8px;bottom:3px;color:var(--acc);font-size:15px}
#cp .c19 .like{position:absolute;inset:16px 10px 6px;display:grid;align-content:center;gap:5px;font-size:17px;color:var(--dim);text-align:center}
#cp .c19 .like b{font-weight:400;color:var(--tx)}
#cp .c19 .like .hint{font-size:14px}
`)
  root.classList.add('skel')
  window.__cpBead = 3.4
  api.NN.setFpsCap(30)
  const ctl = makeControls(api, U), ses = makeSession(api)
  const q = new URLSearchParams(location.search)
  let lay = q.get('lay') || (() => { try { return localStorage.getItem('nn-lay-19') } catch { return null } })() || 'a'
  if (!LAY[lay]) lay = 'a'
  let mode = q.get('mode19') || 'replay', filter = 'giants', idx = 0, edited = false, tab = 'face', pinned = false, balls = [], cur = null, wired = true

  root.innerHTML = `<div class="c19"><div class="hdr"><span class="ps">DINGER DOJO // STUDY 19 // WIRE PARK II</span><span class="rt">
    <span class="grp">MODE <span class="bt" data-mode="replay">REPLAY</span><span class="bt" data-mode="whatif">WHAT-IF</span></span>
    <span class="grp">LAYOUT ${Object.keys(LAY).map((k) => `<span class="bt" data-lay="${k}" title="${LAY[k].name}">${k.toUpperCase()}</span>`).join('')}</span>
    <span class="grp">VIEW <span class="bt" data-cam="home">HOME</span><span class="bt" data-cam="lf">LF POLE</span><span class="bt" data-cam="top">TOP</span><span class="bt" id="c19w">WIRE ON</span></span><span id="c19a"></span></span></div>
  <div class="cell hero" data-a="hero"><div class="pnl clear win" id="c19h"><span class="t">/ O R A C L E &nbsp; P A R K /</span>
    <div class="rd" id="c19rd"></div><div class="bsel p" id="c19b"></div><div class="tly" id="c19t"></div><div class="ovs" id="c19ov"></div></div></div>
  <div class="cell lift verd" data-a="verd"><div class="pnl p"><span class="t">/ V E R D I C T /</span><div class="vd" id="c19v"><div class="ps st">PREVIEW</div><div class="hd">. . .</div><div class="sb"></div><div class="ed"></div></div></div></div>
  <div class="cell tilt zone" data-a="zone"><div class="pnl p"><span class="t">/ P I T C H /</span><div class="fig" id="c19z"></div></div></div>
  <div class="cell tilt swing" data-a="swing"><div class="pnl p"><span class="t">/ S W I N G /</span><div class="fig" id="c19s"></div></div></div>
  <div class="cell tilt card" data-a="card"><div class="pnl p"><span class="t">/ B A T T E R /</span><div class="cd" id="c19c"></div><div class="cdt"><span class="bt" data-tab="face">FACE</span><span class="bt" data-tab="stance">STANCE</span></div></div></div>
  <div class="cell ctl" data-a="ctl"><div class="pnl nob p"><div class="strip" id="c19s2">${ctl.SLOTS.map((s, i) => `<div class="bt" data-i="${i}"><span class="ps">${i + 1} ${s.label}</span><b></b><span class="ud"><i data-d="1">+</i><i data-d="-1">-</i></span></div>`).join('')}<div class="bt hot" data-i="6"><span class="ps">ENTER</span><b>SWING</b></div></div></div></div>
  <div class="cell tilt plan" data-a="plan"><div class="pnl p"><span class="t">/ P L A N /</span><div class="fig" id="c19p"></div></div></div>
  <div class="cell lift arc" data-a="arc"><div class="pnl p"><span class="t">/ A R C /</span><div class="fig" id="c19ar"></div></div></div>
  <div class="cell lift lg" data-a="lg"><div class="pnl p"><span class="t">/ V S &nbsp; L E A G U E /</span><div class="lgw" id="c19l"></div></div></div>
  <div class="cell lift prk" data-a="prk"><div class="pnl p"><span class="t">/ P A R K S /</span><div class="gt" id="c19g"></div><div class="gn" id="c19n"></div></div></div></div>`
  const E = (id) => root.querySelector(id), C = E('.c19'), hero = E('#c19h'), ovs = E('#c19ov')
  const cells = Object.fromEntries([...root.querySelectorAll('.cell')].map((c) => [c.dataset.a, c]))
  const setLayout = (k) => {
    lay = k
    const L = LAY[k]
    C.style.gridTemplateRows = L.rows
    C.style.gridTemplateAreas = L.areas.join(' ')
    for (const [a, el] of Object.entries(cells)) {
      if (a === 'hero') continue
      const ov = L.ov.includes(a)
      el.classList.toggle('ovl', ov)
      if (ov) { el.style.gridArea = ''; ovs.appendChild(el) } else { el.style.gridArea = a; C.appendChild(el) }
    }
    cells.hero.style.gridArea = 'hero'
    root.querySelectorAll('[data-lay]').forEach((b) => b.classList.toggle('on', b.dataset.lay === k))
    try { localStorage.setItem('nn-lay-19', k) } catch {}
    requestAnimationFrame(() => last && render(last))
  }
  const showWire = () => {
    api.NN.setDuo(null)
    const t = { tx: getComputedStyle(root).getPropertyValue('--tx').trim(), k: getComputedStyle(root).getPropertyValue('--k').trim() }
    if (wired) { api.NN.setPix({ pix: 0, mode: 0 }); api.NN.setWire(true, { split: true, angle: 78, step: 0, hidden: true, opacity: 0.9, color: t.tx, face: t.k, fog: [230, 560], rebuild: !!showWire.built }); showWire.built = true } else { api.NN.setWire(false); api.NN.setPix({ pix: 2, mode: 2, levels: 2, a: '#030403', b: '#e9e7dc' }) }
    E('#c19w').textContent = wired ? 'WIRE ON' : 'WIRE OFF'
  }
  themePicker(root, E('#c19a'), api, 19, 'orange', { park: true, onChange: () => { if (wired) showWire() } })
  hoverRule(root)
  windowSync(api, hero, { zoom: 0.82 })
  const CAM = { home: [[0.3, 150, 170], [0.3, 0, -85]], lf: [[-130, 70, -20], [20, 6, -95]], top: [[0.3, 330, -45], [0.3, 0, -60]] }
  const camTo = (k) => { const [p, t] = CAM[k]; api.NN.camera.position.set(...p); api.NN.controls.target.set(...t); api.NN.controls.update() }
  setTimeout(() => camTo('home'), 60)

  const [D, parks, R, pool, faces] = await Promise.all([loadDists(), loadParks(), loadReplay(), loadPool(), loadFaces()])
  const fences = parks.parks.map((p) => ({ pts: fencePoly(parks, p), hot: p.abbr === 'SF' }))
  const pname = (id) => R.players?.[String(id)] ?? null
  const filtered = () => (filter === 'giants' ? R.balls.filter((b) => b.g && b.hr) : filter === 'oracle' ? R.balls.filter((b) => b.park === 'SF' && b.hr) : R.balls)
  function applyBall(b) {
    cur = b; edited = false
    Object.assign(api.state, { ev: b.ev, la: b.la, dir: b.dir, hand: b.s === 'R' ? 1 : -1, temp: b.temp, wind: 0, carry: b.carry, dws: b.dws ?? 0 }) // carry and dws make the physics land the ball where the real one landed
    api.setPreview(true)
    api.update()
  }
  function setMode(m) {
    mode = m
    root.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === m))
    if (m === 'replay' && R.balls.length) { balls = filtered(); idx = Math.min(idx, balls.length - 1); applyBall(balls[idx]) } else { if (m === 'replay') mode = 'whatif'; cur = null; api.state.carry = 1; api.state.dws = 0; api.setPreview(true); api.update() }
    paintChooser()
  }
  const step = (d) => { if (mode !== 'replay' || !balls.length) return; idx = (idx + d + balls.length) % balls.length; applyBall(balls[idx]); paintChooser() }
  function paintChooser() {
    const el = E('#c19b')
    if (mode !== 'replay') { el.innerHTML = '<div class="r2">WHAT-IF: THE SWING YOU SET. NO PITCH, NO BAT TRACKING.</div>'; return }
    const bn = pname(cur?.b), pn = pname(cur?.p)
    el.innerHTML = `<div class="r1"><span class="bt" data-st="-1">&lt;</span><span class="bt" data-st="1">&gt;</span> BALL ${idx + 1} OF ${balls.length}
      ${[['giants', 'GIANTS HR'], ['oracle', 'ORACLE HR'], ['all', 'ALL']].map(([k, l]) => `<span class="bt${filter === k ? ' on' : ''}" data-f="${k}">${l}</span>`).join('')}</div>
      <div class="r2"><b>${bn ? bn[0].toUpperCase() : 'BATTER ' + cur?.b}</b> V ${pn ? pn[0].toUpperCase() : 'PITCHER'} ${cur?.d ?? ''} ${cur?.park === 'SF' ? 'AT ORACLE' : 'AT ' + (cur?.park ?? '')}${cur?.ev_ && cur.ev_ !== 'home_run' ? ' ' + cur.ev_.replace(/_/g, ' ').toUpperCase() : ''}</div>`
    el.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', () => { pressEl(b); step(Number(b.dataset.st)) }))
    el.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { pressEl(b); filter = b.dataset.f; balls = filtered(); idx = 0; applyBall(balls[0]); paintChooser() }))
    finishUI.tab?.(el)
    for (const x of el.querySelectorAll('.bt')) { x.tabIndex = 0; x.setAttribute('role', 'button'); x.setAttribute('aria-label', x.textContent.trim() === '<' ? 'previous ball' : x.textContent.trim() === '>' ? 'next ball' : x.textContent.trim()) }
  }
  // header and card buttons
  root.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { pressEl(b); setMode(b.dataset.mode) }))
  root.querySelectorAll('[data-lay]').forEach((b) => b.addEventListener('click', () => { pressEl(b); setLayout(b.dataset.lay) }))
  root.querySelectorAll('[data-cam]').forEach((b) => b.addEventListener('click', () => { pressEl(b); camTo(b.dataset.cam) }))
  root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { pressEl(b); tab = b.dataset.tab; pinned = true; paintCard() }))
  E('#c19w').addEventListener('click', () => { pressEl(E('#c19w')); wired = !wired; showWire() })
  // slots
  const slots = [...root.querySelectorAll('.strip .bt')]
  ctl.els = slots
  ctl.onArm = () => paintSlots()
  ctl.onChange = () => { edited = true; paintSlots() }
  slots.forEach((el, i) => {
    el.addEventListener('click', (e) => {
      const d = e.target.closest('i[data-d]')
      if (i === 6) { fire(); return }
      ctl.arm(i); if (d) ctl.change(i, Number(d.dataset.d))
    })
    el.addEventListener('wheel', (e) => { if (i === 6) return; e.preventDefault(); ctl.arm(i); ctl.change(i, e.deltaY < 0 ? 1 : -1) }, { passive: false })
  })
  let swingTimer = 0
  function playSwing() { // the batter swings at the real attack angle: stance, contact, follow-through, then back to the portrait unless pinned
    if (window.__fixedTime !== undefined) return
    const was = tab
    tab = 'stance'
    let k = 0
    clearInterval(swingTimer)
    swingTimer = setInterval(() => { k++; paintCard(k / 9); if (k >= 12) { clearInterval(swingTimer); if (!pinned) { tab = was; paintCard() } } }, 110)
  }
  const fire = () => { pressEl(slots[6]); playSwing(); ses.fire() }
  ctl.bind(fire, 'h')
  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (e.key === ']' || e.key === '.') { e.preventDefault(); step(1) } else if (e.key === '[' || e.key === ',') { e.preventDefault(); step(-1) } else if (e.key === 'l' || e.key === 'L') { const ks = Object.keys(LAY); setLayout(ks[(ks.indexOf(lay) + 1) % ks.length]) } else if (e.key === 'm' || e.key === 'M') setMode(mode === 'replay' ? 'whatif' : 'replay')
  })
  api.setPreview(true)

  function paintSlots() {
    slots.forEach((el, i) => { el.classList.toggle('arm', i === ctl.armed && i < 6); if (i < 6) el.querySelector('b').textContent = ctl.text(ctl.SLOTS[i].k) })
  }
  const dim = (el, dw = 0, dh = 0) => ({ w: Math.max(90, el.clientWidth - dw), h: Math.max(60, el.clientHeight - dh) })
  function paintCard(t = 0.5) {
    const s = api.state, bat = cur ? pname(cur.b) : null, hand = cur ? cur.s : s.hand > 0 ? 'R' : 'L'
    let art
    if (tab === 'stance') art = asciiBatter({ cols: 28, rows: 16, t, aa: cur?.aa ?? 1.73 + 0.078 * s.la + 0.063 * s.ev, hand }).join('\n')
    else { const f = cur && faces[String(cur.b)]; art = (f ? f.badge : asciiBust({ cols: 28, rows: 14 })).join('\n') }
    const name = bat ? bat[0] : cur ? 'BATTER ' + cur.b : 'YOUR SWING', num = bat?.[1]
    E('#c19c').innerHTML = `<pre>${art.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre><div class="info"><b>${name.toUpperCase()}</b>${num ? `<pre class="dn">${dotDigits(num).join('\n')}</pre>` : ''}<span>BATS ${hand === 'R' ? 'RIGHT' : 'LEFT'}</span>${cur?.aa != null ? `<span>ATTACK ${cur.aa.toFixed(0)}° BAT ${cur.bs ?? '--'} MPH</span>` : '<span>NO BAT TRACKING</span>'}${cur ? '' : '<span>GENERIC PORTRAIT</span>'}</div>`
    root.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab))
  }
  let last = null, roll = null
  function render(res) {
    last = res
    const s = api.state, v = res.verdict, pv = !!ses.beat?.preview
    const pf = dim(E('#c19p')), af = dim(E('#c19ar')), zf = dim(E('#c19z')), sf2 = dim(E('#c19s'))
    E('#c19p').innerHTML = bigPlan(res, api.FT, { w: pf.w, h: pf.h, fences: oracleFences(api, fences), park: pf.w > 300 ? oracleFence(api, parks) : null, bearings: [-45, -22.5, 0, 22.5, 45], preview: pv, ghost: pv ? ses.committed?.path : null, reach: 440 })
    E('#c19ar').innerHTML = arcSVG(res, api.FT, { w: af.w, h: af.h, preview: pv, ghost: pv ? ses.committed?.path : null })
    E('#c19z').innerHTML = mode === 'replay' && cur ? zoneSVG(cur, { w: zf.w, h: zf.h }) : ''
    E('#c19s').innerHTML = swingSVG(mode === 'replay' ? cur : null, s, { w: sf2.w, h: sf2.h })
    if (mode !== 'replay' || !cur) {
      const l = ballsLike(pool, s.ev, s.la, s.dir)
      E('#c19z').innerHTML = `<div class="like"><b>NO PITCH FOR A WHAT-IF SWING</b>${l.n ? `<span>${l.n} REAL BALLS WITHIN 3 MPH, 3° AND 8° OF DIRECTION</span><span><b>${Math.round(l.hr * 100)}%</b> WERE HOME RUNS</span><span>DISTANCE ${l.lo} TO ${l.hi} FT, MEDIAN ${l.med}</span>` : '<span>NO REAL BALLS THAT CLOSE</span>'}<span class="hint">M SWITCHES TO REPLAY</span></div>`
    }
    // readout (distance rolls on a swing)
    const rd = E('#c19rd')
    if (!rd.firstChild) rd.innerHTML = '<b><span id="c19d">0</span><i> FT</i></b><span id="c19x"></span>'
    const dEl = E('#c19d')
    if (window.__cpFire || pv || !roll) dEl.textContent = Math.round(res.landFt)
    dEl.dataset.v = Math.round(res.landFt)
    E('#c19x').textContent = `APEX ${Math.round(res.peakFt)} FT  HANG ${res.hang.toFixed(1)} S${v.wallFt ? `  WALL ${Math.round(v.wallFt)}/${v.wallH.toFixed(0)}` : ''}`
    // league
    const lg = E('#c19l'), lw = lg.clientWidth || 400, fs = Math.max(6.5, Math.min(11, (lw * 0.5) / (53 * 0.55))), M = D.evla
    if (M) {
      const ei = Math.min(M.all.length - 1, Math.max(0, Math.floor((s.ev - M.ev0) / M.evstep))), li = Math.min(M.all[0].length - 1, Math.max(0, Math.floor((s.la - M.la0) / M.lastep)))
      const n = M.all[ei][li], rate = n >= 6 ? Math.round((100 * M.hr[ei][li]) / n) : null
      const evp = histHonest(D, 'ev', s.ev, { w: 120, h: 40 }).pct
      const hd = histHonest(D, 'dir', s.dir, { w: Math.max(120, lw * 0.4), h: 34 }), flyb = s.la >= 15
      const hf = histHonest(D, flyb ? 'dist_fb' : 'dist', res.landFt, { w: Math.max(120, lw * 0.4), h: 34 }), hh = histHonest(D, 'hang', res.hang, { w: Math.max(120, lw * 0.4), h: 34 })
      const stand = s.hand > 0 ? 'R' : 'L', side = Math.abs(s.dir) < 12 ? 'CENTER' : (stand === 'R' ? s.dir < 0 : s.dir > 0) ? 'PULL' : 'OPPO'
      const hw = Math.max(110, Math.round(lw * 0.46))
      lg.innerHTML = `<div><div class="bmh"><b>${Math.round(s.ev)} MPH AT ${Math.round(s.la)}°</b> BEATS ${evp}% IN EXIT SPEED${rate != null ? `; <b>${rate}%</b> OF BALLS IN THIS CELL LEFT THE PARK` : ''}</div><pre style="font-size:${fs}px;line-height:${(fs * 0.95).toFixed(1)}px">${barrelMap(D, s.ev, s.la)}</pre></div>
        <div class="hs"><div class="hr"><div class="lb"><span>DIRECTION <b>${SPEC.dir.fmt(s.dir)}</b></span><i>${side}</i></div><div class="hg">${histHonest(D, 'dir', s.dir, { w: hw, h: 36 }).svg}</div></div>
        <div class="hr"><div class="lb"><span>DIST <b>${Math.round(res.landFt)}</b></span><i>${flyb ? `BEATS ${hf.pct}% OF FLY BALLS` : 'NOT A FLY BALL'}</i></div><div class="hg">${histHonest(D, flyb ? 'dist_fb' : 'dist', res.landFt, { w: hw, h: 36 }).svg}</div></div>
        <div class="hr"><div class="lb"><span>HANG <b>${res.hang.toFixed(1)} S</b></span><i>MODELED</i></div><div class="hg">${histHonest(D, 'hang', res.hang, { w: hw, h: 36 }).svg}</div></div></div>
        <div class="key">BARS: ALL BALLS 2023-25. LINE: HR RATE. DASH: AVERAGE. MAP: DARKER = MORE HR</div>`
      void hd; void hh
    }
    if (parks.parks.length) {
      const pr = evalParks(parks, api), gt = E('#c19g'), w = gt.clientWidth || 160
      gt.style.setProperty('--gc', w > 300 ? 10 : w > 220 ? 6 : 5)
      gt.innerHTML = tileHTML(pr)
      E('#c19n').textContent = `GONE IN ${pr.filter((r) => r.k === 'GONE').length} OF ${pr.length}`
    }
    paintSlots(); paintTally(); paintVerdict(false)
    if (tab === 'face' || !swingTimer || window.__fixedTime !== undefined) paintCard(tab === 'stance' ? 0.5 : undefined)
  }
  function paintTally() {
    E('#c19t').innerHTML = `<div class="c"><span>SWINGS </span>${String(ses.swings).padStart(2, '0')} <span> HR </span>${String(ses.hrs).padStart(2, '0')} <span> BEST </span>${ses.best || '---'}</div>` + ses.log.slice(-3).map((l, i, a) => `<div class="${i === a.length - 1 ? 'n' : l.hr ? 'h' : ''}">${ses.line(l)}</div>`).join('')
  }
  function paintVerdict(stampIt) {
    const vd = E('#c19v'), b = ses.beat
    vd.classList.toggle('hr', isHR(b)); vd.classList.toggle('pv', !!b?.preview)
    vd.querySelector('.st').textContent = b ? b.state : 'PREVIEW'
    vd.querySelector('.hd').textContent = b?.preview ? 'PRESS SWING' : b ? b.text : '. . .'
    vd.querySelector('.sb').textContent = b?.sub ?? ''
    vd.querySelector('.ed').textContent = mode === 'replay' && cur ? (edited ? 'EDITED: NOT THE REAL BALL ANY MORE' : cur.hr ? 'REAL HOME RUN' : 'REAL BALL: ' + (cur.ev_ ?? '').replace(/_/g, ' ').toUpperCase()) : ''
    if (stampIt) restamp(vd.querySelector('.hd'))
  }
  finishUI(root)
  setLayout(lay)
  root.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode))
  showWire()
  setMode(mode)
  const wantBat = q.get('bat')
  if (wantBat && R.balls.length) { filter = 'all'; balls = R.balls.filter((b) => String(b.b) === wantBat); idx = 0; if (balls.length) { mode = 'replay'; applyBall(balls[0]); paintChooser() } }
  if (q.get('tab')) { tab = q.get('tab'); pinned = true; paintCard(0.5) }
  return {
    render,
    beat: (b) => {
      ses.onBeat(b); paintVerdict(!!b.last); paintTally()
      if (b.last && last) { roll = true; rollTo(E('#c19d'), Math.round(last.landFt), { steps: 8 }) }
      if (last) render(last)
    },
  }
}
