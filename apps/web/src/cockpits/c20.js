// Study 20, BIRD'S EYE: the simple screen. Left: the wireframe park with a BIRD'S EYE toggle (no plan or arc panels anywhere), the verdict, the ball chooser and the swing controls.
// Right: AT THE PLATE (the batter's portrait and where the pitch crossed the zone, with spin and break) and SWING (the side view, looking straight across the pitch: the batter,
// the bat path at the attack angle meeting the ball, the ball leaving at the launch angle, the gap between them shaded, the pitch's approach dashed, all drawn as character art).
// Along the bottom: every stat we have for the ball (game, pitch, swing and contact, result and value, flight and air). Only buttons tilt on hover; they sink when pressed.
// Character art comes from art.js in the styles you picked in the ASCII lab (?cp=21); until you pick, a default is used.
import { SKEL_CSS, restamp, tileHTML, isHR } from './skel.js'
import { THEME_CSS, JUICE_CSS, themePicker, pressEl, makeControls, makeSession, finishUI } from './skel2.js'
import { BTN_TILT_CSS, tiltButtons, loadReplay, loadPool, ballsLike, zoneSVG, dotDigits, rollTo } from './skel3.js'
import { ART_CSS, STYLES, renderArt, faceSource, drawBatter, drawBust, artMetrics } from './art.js'

const LSA = { 1: 'WEAK', 2: 'TOPPED', 3: 'UNDER', 4: 'FLARE OR BURNER', 5: 'SOLID CONTACT', 6: 'BARREL' }
const PITCH = { FF: 'FOUR-SEAM', SI: 'SINKER', FC: 'CUTTER', SL: 'SLIDER', ST: 'SWEEPER', CU: 'CURVEBALL', KC: 'KNUCKLE-CURVE', CH: 'CHANGEUP', FS: 'SPLITTER', SV: 'SLURVE', KN: 'KNUCKLEBALL', EP: 'EEPHUS', CS: 'SLOW CURVE', FO: 'FORKBALL' }
const store = (k) => { try { return localStorage.getItem(k) } catch { return null } }

export async function build(root, api, U) {
  const { css, loadParks, evalParks, windowSync, SPEC } = U
  css('cp20', SKEL_CSS + THEME_CSS + JUICE_CSS + BTN_TILT_CSS + ART_CSS + `
#cp .c20{position:absolute;inset:10px;display:grid;gap:12px;row-gap:20px;grid-template-columns:minmax(0,1fr) 600px;grid-template-rows:20px minmax(0,1fr) 262px}
#cp .c20 .hdr{grid-column:1/3;display:flex;justify-content:space-between;align-items:center;gap:12px;white-space:nowrap}
#cp .c20 .hdr .rt{display:flex;gap:14px;align-items:center}
#cp .c20 .hdr .grp{display:flex;gap:6px;align-items:center;font:8px PS2P,monospace;color:var(--dim)}
#cp .c20 .hdr .bt{font:8px/1 PS2P,monospace;padding:5px 8px;box-shadow:0 3px 0 var(--e)}
#cp .c20 .bt.on{background:var(--tx);color:var(--k);box-shadow:0 1px 0 var(--e)}
#cp .c20 .left{display:grid;grid-template-rows:minmax(0,1fr) 78px;gap:12px;min-height:0}
#cp .c20 .right{display:grid;grid-template-rows:232px minmax(0,1fr);gap:12px;min-height:0}
#cp .c20 .pnl{overflow:visible}
#cp .c20 .win{pointer-events:none}
#cp .c20 .rd{position:absolute;left:16px;top:12px;pointer-events:none}
#cp .c20 .rd b{font-weight:400;font-size:62px;line-height:.9;display:block}
#cp .c20 .rd b i{font-style:normal;font-size:24px;color:var(--dim)}
#cp .c20 .rd>span{color:var(--dim);font-size:18px}
#cp .c20 .bsel{position:absolute;left:16px;top:96px;display:grid;gap:3px;font-size:17px;max-width:90%}
#cp .c20 .bsel .r1{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
#cp .c20 .bsel .bt{font:8px/1 PS2P,monospace;padding:4px 7px;box-shadow:0 3px 0 var(--e)}
#cp .c20 .bsel .r2{color:var(--dim)}
#cp .c20 .bsel .r2 b{font-weight:400;color:var(--tx)}
#cp .c20 .tly{position:absolute;left:16px;bottom:12px;font-size:17px;display:grid;gap:1px;pointer-events:none}
#cp .c20 .tly div{color:var(--dim)}
#cp .c20 .tly div.n{color:var(--acc)}
#cp .c20 .tly div.h{color:var(--tx)}
#cp .c20 .tly .c{color:var(--tx);margin-bottom:2px}
#cp .c20 .tly .c span{color:var(--dim)}
#cp .c20 .vd{position:absolute;right:14px;top:14px;width:330px;padding:12px 14px;background:var(--k);border:1px solid var(--tx);z-index:3}
#cp .c20 .vd .hd{font-size:30px;line-height:1}
#cp .c20 .vd.hr .hd,#cp .c20 .vd.hr .st{color:var(--acc)}
#cp .c20 .vd.pv .hd{color:var(--dim);font-size:22px}
#cp .c20 .vd .sb{font-size:17px;color:var(--dim);min-height:17px;margin-top:2px}
#cp .c20 .vd .ed{color:var(--acc);font-size:14px;margin-top:4px}
#cp .c20 .strip{position:absolute;inset:0 0 6px;display:grid;grid-template-columns:repeat(6,1fr) 1.4fr;gap:10px}
#cp .c20 .strip .bt{padding:8px 10px 4px;display:flex;flex-direction:column;justify-content:space-between}
#cp .c20 .strip .bt .ps{color:var(--dim)}
#cp .c20 .strip .bt.arm .ps{color:var(--k)}
#cp .c20 .strip .bt b{font-weight:400;font-size:28px;line-height:.9}
#cp .c20 .strip .bt .ud{position:absolute;right:6px;top:6px;display:grid;gap:3px}
#cp .c20 .strip .bt .ud i{display:block;width:16px;height:12px;border:1px solid currentColor;font-style:normal;font-size:12px;line-height:10px;text-align:center}
#cp .c20 .strip .bt.hot b{font:16px/1.3 PS2P,monospace;align-self:center;margin:auto}
#cp .c20 .plate{display:grid;grid-template-columns:330px minmax(0,1fr)}
#cp .c20 .card{padding:18px 8px 8px 12px;display:flex;gap:10px;align-items:flex-start;min-width:0}
#cp .c20 .card .art{color:var(--tx);flex:none}
#cp .c20 .card .info{display:grid;gap:2px;align-content:start;min-width:0}
#cp .c20 .card .info b{font-weight:400;font-size:20px;line-height:1}
#cp .c20 .card .info span{color:var(--dim);font-size:15px;line-height:1.1}
#cp .c20 .card .info .dn{color:var(--acc);font:8px/6.4px Consolas,monospace;margin:2px 0 4px;white-space:pre}
#cp .c20 .zonebox{position:relative}
#cp .c20 .zonebox .fig{position:absolute;inset:14px 6px 4px}
#cp .c20 .like{position:absolute;inset:16px 10px 6px;display:grid;align-content:center;gap:5px;font-size:16px;color:var(--dim);text-align:center}
#cp .c20 .like b{font-weight:400;color:var(--tx)}
#cp .c20 .swing .art{position:absolute;left:12px;top:18px;color:var(--tx)}
#cp .c20 .swing .cap{position:absolute;left:12px;right:12px;bottom:6px;font-size:16px;line-height:1.1;color:var(--dim)}
#cp .c20 .swing .cap b{font-weight:400;color:var(--tx)}
#cp .c20 .swing .cap i{font-style:normal;color:var(--acc)}
#cp .c20 .stats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:18px;padding:18px 14px 6px;grid-column:1/3;overflow:hidden}
#cp .c20 .stats h5{font:8px PS2P,monospace;font-weight:400;color:var(--acc);margin:0 0 5px}
#cp .c20 .stats .r{display:flex;justify-content:space-between;gap:8px;font-size:15px;line-height:15.4px;white-space:nowrap}
#cp .c20 .stats .r span{color:var(--dim)}
#cp .c20 .stats .r b{font-weight:400;overflow:hidden;text-overflow:ellipsis}
`)
  root.classList.add('skel')
  window.__cpBead = 3.4
  api.NN.setFpsCap(30)
  const ctl = makeControls(api, U), ses = makeSession(api)
  const q = new URLSearchParams(location.search)
  let last = null, mode = q.get('mode20') || 'replay', filter = 'giants', idx = 0, edited = false, balls = [], cur = null, wired = true, bird = q.get('bird') === '1'

  root.innerHTML = `<div class="c20"><div class="hdr"><span class="ps">DINGER DOJO // STUDY 20 // BIRD'S EYE</span><span class="rt">
    <span class="grp">MODE <span class="bt" data-mode="replay">REPLAY</span><span class="bt" data-mode="whatif">WHAT-IF</span></span>
    <span class="grp">VIEW <span class="bt" id="c20b">BIRD'S EYE</span></span>
    <span class="grp"><span class="bt" id="c20lab">ART LAB</span></span><span id="c20a"></span></span></div>
  <div class="left"><div class="pnl clear win" id="c20h"><span class="t">/ O R A C L E &nbsp; P A R K /</span>
      <div class="rd" id="c20rd"></div><div class="bsel p" id="c20ch"></div><div class="tly" id="c20t"></div>
      <div class="vd p" id="c20v"><div class="ps st">PREVIEW</div><div class="hd">. . .</div><div class="sb"></div><div class="ed"></div></div></div>
    <div class="pnl p" style="border:none;background:transparent"><div class="strip" id="c20s">${ctl.SLOTS.map((s, i) => `<div class="bt" data-i="${i}"><span class="ps">${i + 1} ${s.label}</span><b></b><span class="ud"><i data-d="1">+</i><i data-d="-1">-</i></span></div>`).join('')}<div class="bt hot" data-i="6"><span class="ps">ENTER</span><b>SWING</b></div></div></div></div>
  <div class="right">
    <div class="pnl p plate"><span class="t">/ A T &nbsp; T H E &nbsp; P L A T E /</span><div class="card" id="c20c"></div><div class="zonebox"><div class="fig" id="c20z"></div></div></div>
    <div class="pnl p swing"><span class="t">/ S W I N G &nbsp; // &nbsp; S I D E &nbsp; V I E W /</span><pre class="art" id="c20art"></pre><div class="cap" id="c20cap"></div></div>
  </div>
  <div class="pnl p stats" id="c20st"><span class="t">/ E V E R Y &nbsp; S T A T /</span></div></div>`
  const E = (id) => root.querySelector(id), hero = E('#c20h')
  const showWire = () => {
    api.NN.setDuo(null)
    const t = { tx: getComputedStyle(root).getPropertyValue('--tx').trim(), k: getComputedStyle(root).getPropertyValue('--k').trim() }
    if (wired) { api.NN.setPix({ pix: 0, mode: 0 }); api.NN.setWire(true, { split: true, angle: 78, step: 0, hidden: true, opacity: 0.9, color: t.tx, face: t.k, fog: [230, 560], rebuild: !!showWire.built }); showWire.built = true } else { api.NN.setWire(false) }
  }
  themePicker(root, E('#c20a'), api, 20, 'orange', { park: true, onChange: () => { if (wired) showWire(); last && render(last) } })
  tiltButtons(root)
  windowSync(api, hero, { zoom: 0.95 })
  const CAM = { home: [[0.3, 150, 170], [0.3, 0, -85]], top: [[0.3, 300, -50], [0.3, 0, -62]] }
  const camTo = (k) => { const [p, t] = CAM[k]; api.NN.camera.position.set(...p); api.NN.controls.target.set(...t); api.NN.controls.update(); E('#c20b').classList.toggle('on', k === 'top') }
  setTimeout(() => camTo(bird ? 'top' : 'home'), 60)
  E('#c20b').addEventListener('click', () => { pressEl(E('#c20b')); bird = !bird; camTo(bird ? 'top' : 'home') })
  E('#c20lab').addEventListener('click', () => { const u = new URL(location.href); u.searchParams.set('cp', '21'); location.href = u.toString() })

  const [parks, R, pool, facesRaw] = await Promise.all([loadParks(), loadReplay(), loadPool(), (async () => { try { const r = await fetch('/faces_tone.json'); return r.ok ? await r.json() : {} } catch { return {} } })()])
  const styleOf = (id, fallback) => STYLES.find((s) => s.id === (store('nn-art-' + id) || fallback)) ?? STYLES.find((s) => s.id === fallback)
  const pname = (id) => R.players?.[String(id)] ?? null
  const filtered = () => (filter === 'giants' ? R.balls.filter((b) => b.g && b.hr) : filter === 'oracle' ? R.balls.filter((b) => b.park === 'SF' && b.hr) : R.balls)
  function applyBall(b) {
    cur = b; edited = false
    Object.assign(api.state, { ev: b.ev, la: b.la, dir: b.dir, hand: b.s === 'R' ? 1 : -1, temp: b.temp, wind: 0, carry: b.carry, dws: b.dws ?? 0, tab: false })
    api.setPreview(true); api.update()
  }
  function setMode(m) {
    mode = m
    root.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === m))
    if (m === 'replay' && R.balls.length) { balls = filtered(); idx = Math.min(idx, balls.length - 1); applyBall(balls[idx]) } else { if (m === 'replay') mode = 'whatif'; cur = null; api.state.carry = 1; api.state.dws = 0; api.state.tab = true; api.setPreview(true); api.update() }
    paintChooser()
  }
  const step = (d) => { if (mode !== 'replay' || !balls.length) return; idx = (idx + d + balls.length) % balls.length; applyBall(balls[idx]); paintChooser() }
  function paintChooser() {
    const el = E('#c20ch')
    if (mode !== 'replay') { el.innerHTML = '<div class="r2">WHAT-IF: THE SWING YOU SET. NO PITCH AND NO BAT TRACKING EXIST FOR IT.</div>'; return }
    const bn = pname(cur?.b), pn = pname(cur?.p)
    el.innerHTML = `<div class="r1"><span class="bt" data-st="-1" aria-label="previous ball">&lt;</span><span class="bt" data-st="1" aria-label="next ball">&gt;</span> BALL ${idx + 1} OF ${balls.length}
      ${[['giants', 'GIANTS HR'], ['oracle', 'ORACLE HR'], ['all', 'ALL']].map(([k, l]) => `<span class="bt${filter === k ? ' on' : ''}" data-f="${k}">${l}</span>`).join('')}</div>
      <div class="r2"><b>${bn ? bn[0].toUpperCase() : 'BATTER ' + cur?.b}</b> V ${pn ? pn[0].toUpperCase() : 'PITCHER'}  ${cur?.d ?? ''}  ${cur?.park === 'SF' ? 'AT ORACLE' : 'AT ' + (cur?.park ?? '')}</div>`
    el.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', () => { pressEl(b); step(Number(b.dataset.st)) }))
    el.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { pressEl(b); filter = b.dataset.f; balls = filtered(); idx = 0; applyBall(balls[0]); paintChooser() }))
    for (const x of el.querySelectorAll('.bt')) { x.tabIndex = 0; x.setAttribute('role', 'button'); if (!x.getAttribute('aria-label')) x.setAttribute('aria-label', x.textContent.trim()) }
  }
  root.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { pressEl(b); setMode(b.dataset.mode) }))
  const slots = [...root.querySelectorAll('.strip .bt')]
  ctl.els = slots
  ctl.onArm = () => paintSlots()
  ctl.onChange = () => { edited = true; paintSlots() }
  slots.forEach((el, i) => {
    el.addEventListener('click', (e) => { const d = e.target.closest('i[data-d]'); if (i === 6) { fire(); return } ctl.arm(i); if (d) ctl.change(i, Number(d.dataset.d)) })
    el.addEventListener('wheel', (e) => { if (i === 6) return; e.preventDefault(); ctl.arm(i); ctl.change(i, e.deltaY < 0 ? 1 : -1) }, { passive: false })
  })
  const fire = () => { pressEl(slots[6]); ses.fire() }
  ctl.bind(fire, 'h')
  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (e.key === ']' || e.key === '.') { e.preventDefault(); step(1) } else if (e.key === '[' || e.key === ',') { e.preventDefault(); step(-1) } else if (e.key === 'b' || e.key === 'B') { bird = !bird; camTo(bird ? 'top' : 'home') } else if (e.key === 'm' || e.key === 'M') setMode(mode === 'replay' ? 'whatif' : 'replay')
  })
  api.setPreview(true)
  const paintSlots = () => slots.forEach((el, i) => { el.classList.toggle('arm', i === ctl.armed && i < 6); if (i < 6) el.querySelector('b').textContent = ctl.text(ctl.SLOTS[i].k) })

  // ---- the pieces ----
  function paintCard() {
    const s = api.state, id = cur ? String(cur.b) : null, bat = id ? pname(id) : null, hand = cur ? cur.s : s.hand > 0 ? 'R' : 'L'
    const fst = styleOf('face', 'braille-poster'), am = artMetrics(fst), src = id && facesRaw[id] ? faceSource(facesRaw[id]) : drawBust(160)
    const fcols = 32, fs = Math.min(11.5, 190 / (fcols * am.w))
    let art = ''
    if (src) { const r = renderArt(src, fst, fcols, id && facesRaw[id] ? { enh: { stretch: true, k: 1.5, sigma: 18 } } : {}); art = r.lines.join('\n') }
    const name = bat ? bat[0] : cur ? 'BATTER ' + cur.b : 'YOUR SWING'
    E('#c20c').innerHTML = `<pre class="${am.cls}" style="font-size:${fs}px"></pre><div class="info"><b>${name.toUpperCase()}</b>${bat?.[1] ? `<pre class="dn">${dotDigits(bat[1]).join('\n')}</pre>` : ''}<span>BATS ${hand === 'R' ? 'RIGHT' : 'LEFT'}</span>${cur ? `<span>${(id && facesRaw[id]) ? 'PORTRAIT: MLB HEADSHOT' : 'GENERIC PORTRAIT'}</span>` : '<span>GENERIC PORTRAIT</span>'}</div>`
    E('#c20c pre').textContent = art
  }
  function paintSwing(res) {
    const s = api.state, real = cur && cur.aa != null, aa = real ? cur.aa : 1.73 + 0.078 * s.la + 0.063 * s.ev, la = s.la, vaa = cur?.vaa ?? -6.4, hand = cur ? cur.s : s.hand > 0 ? 'R' : 'L'
    const W = 520, H = 330, host = E('#c20art'), panel = host.parentElement, pw = panel.clientWidth - 24, ph = panel.clientHeight - 64
    const src = drawBatter({ t: 2 / 3, aa, hand, w: W, h: H, mirrorW: W, rays: { la, vaa, len: 200 } })
    if (!src) return
    const sst = styleOf('swing', 'braille-poster'), am = artMetrics(sst), cols = 78, rowsEst = Math.round((cols * am.w * (H / W)) / am.h), fs = Math.max(6, Math.min(13, pw / (cols * am.w), ph / (rowsEst * am.h)))
    const r = renderArt(src, sst, cols)
    host.className = am.cls
    host.style.fontSize = fs + 'px'
    host.textContent = r.lines.join('\n')
    const gap = la - aa
    E('#c20cap').innerHTML = `${real ? '' : '<i>TYPICAL BAT PATH FOR THIS BALL, NOT MEASURED. </i>'}<b>ATTACK ${aa >= 0 ? '+' : ''}${aa.toFixed(0)}°</b>  /  <b>LAUNCH ${la.toFixed(0)}°</b>  /  GAP ${gap >= 0 ? '+' : ''}${gap.toFixed(0)}° (DERIVED)${real ? `  /  BAT ${cur.bs ?? '--'} MPH` : ''}  /  EXIT ${Math.round(s.ev)} MPH<br>BAT PATH THROUGH THE BALL IS MEASURED. BALL PATH IS MEASURED. THE DASHED PITCH LINE (${vaa.toFixed(0)}°) IS DERIVED. SHADING IS THE GAP.`
  }
  const f = (v, d = 1, u = '') => (v == null || v !== v ? '--' : (typeof v === 'number' ? v.toFixed(d) : v) + u)
  function clock(ax) { if (ax == null) return '--'; const h = ((((ax + 180) / 30) % 12) + 12) % 12, hh = Math.floor(h) || 12, mm = Math.round((h % 1) * 60); return `${hh}:${String(mm === 60 ? 59 : mm).padStart(2, '0')}` }
  function paintStats(res) {
    const s = api.state, b = cur, v = res.verdict, bn = b ? pname(b.b) : null, pn = b ? pname(b.p) : null
    const runners = b ? [b.r1 ? '1B' : '', b.r2 ? '2B' : '', b.r3 ? '3B' : ''].filter(Boolean).join(' ') || 'NONE' : '--'
    let gone = '--'
    if (parks.parks.length) { const pr = evalParks(parks, api); gone = U.goneWord(parks, api, pr) }
    const cols = [
      ['GAME', [['BATTER', bn ? `${bn[0]}${bn[1] ? ' #' + bn[1] : ''}` : b ? '#' + b.b : 'YOUR SWING'], ['BATS', b ? b.s : s.hand > 0 ? 'R' : 'L'], ['PITCHER', pn ? pn[0] : '--'], ['THROWS', b?.t ?? '--'], ['DATE', b?.d ?? '--'], ['PARK', b ? (b.park === 'SF' ? 'ORACLE PARK' : b.park) : 'ORACLE PARK'], ['INNING', b ? `${b.tb === 'Top' ? 'TOP' : 'BOT'} ${b.in ?? '--'}` : '--'], ['COUNT', b && b.bl != null ? `${b.bl}-${b.sk}` : '--'], ['OUTS', f(b?.ou, 0)], ['RUNNERS ON', runners], ['SCORE (BAT-FLD)', b && b.bsc != null ? `${b.bsc}-${b.fsc}` : '--'], ['TIME THROUGH ORDER', f(b?.tto, 0)], ['BATTER AGE', f(b?.agb, 0)], ['PITCHER AGE', f(b?.agp, 0)]]],
      ['PITCH', [['TYPE', b ? PITCH[b.pt] ?? b.pt ?? '--' : '--'], ['SPEED', f(b?.pv, 1, ' MPH')], ['EFFECTIVE SPEED', f(b?.eff, 1, ' MPH')], ['SPIN RATE', f(b?.rpm, 0, ' RPM')], ['SPIN TILT', b ? clock(b.ax) : '--'], ['SPIN AXIS', f(b?.ax, 0, '°')], ['RELEASE SIDE', f(b?.rx, 2, ' FT')], ['RELEASE HEIGHT', f(b?.rz, 2, ' FT')], ['EXTENSION', f(b?.ext, 1, ' FT')], ['ARM ANGLE', f(b?.arm, 0, '°')], ['PLATE X', f(b?.px, 2, ' FT')], ['PLATE Z', f(b?.pz, 2, ' FT')], ['ZONE', f(b?.zn, 0)], ['BREAK H / V', b && b.hx != null ? `${b.hx.toFixed(0)} / ${b.hz?.toFixed(0)} IN` : '--'], ['APPROACH ANGLE', f(b?.vaa, 1, '°')]]],
      ['SWING AND CONTACT', [['BAT SPEED', f(b?.bs, 1, ' MPH')], ['SWING LENGTH', f(b?.sl, 1, ' FT')], ['ATTACK ANGLE', f(b?.aa, 1, '°')], ['ATTACK DIRECTION', f(b?.ad, 1, '°')], ['SWING TILT', f(b?.tilt, 0, '°')], ['INTERCEPT X / Y', b && b.ix != null ? `${b.ix.toFixed(1)} / ${b.iy?.toFixed(1)} IN` : '--'], ['EXIT SPEED', `${(b?.ev ?? s.ev).toFixed(1)} MPH`], ['LAUNCH ANGLE', `${(b?.la ?? s.la).toFixed(1)}°`], ['GAP (LAUNCH - ATTACK)', b?.aa != null ? `${(b.la - b.aa).toFixed(1)}°` : '--'], ['LANDING BEARING', `${(b?.dir ?? s.dir).toFixed(1)}°`], ['HIT LOCATION', f(b?.hl, 0)], ['BALL TYPE', b?.bbt ? b.bbt.replace(/_/g, ' ').toUpperCase() : '--'], ['CONTACT QUALITY', b?.lsa ? LSA[b.lsa] ?? b.lsa : '--']]],
      ['RESULT AND VALUE', [['OUTCOME', b ? (b.ev_ ?? '').replace(/_/g, ' ').toUpperCase() : '--'], ['PROJECTED DISTANCE', b ? `${b.ft} FT` : '--'], ['EXPECTED AVG', f(b?.xba, 3)], ['EXPECTED WOBA', f(b?.xw, 3)], ['EXPECTED SLG', f(b?.xs, 3)], ['RUN VALUE', b?.dre != null ? (b.dre >= 0 ? '+' : '') + b.dre.toFixed(3) : '--'], ['WIN VALUE', b?.dwe != null ? (b.dwe >= 0 ? '+' : '') + (b.dwe * 100).toFixed(1) + '%' : '--'], ['INFIELD ALIGNMENT', b?.ifa ?? '--'], ['OUTFIELD ALIGNMENT', b?.ofa ?? '--'], ['MODEL HOME RUN ODDS', b?.pm != null ? (b.pm * 100).toFixed(1) + '%' : '--'], ['ENGINE VERDICT', v.kind === 'GONE' ? 'HOME RUN' : v.kind === 'WALL' ? 'OFF THE WALL' : v.kind === 'FOUL' ? 'FOUL' : 'IN PLAY'], ['PARKS WHERE GONE', gone], ['WALL HERE', v.wallFt ? `${Math.round(v.wallFt)} FT, ${v.wallH.toFixed(0)} FT HIGH` : '--'], [v.kind === 'GONE' ? 'CLEARED BY' : 'SHORT BY', v.wallFt ? `${(v.kind === 'GONE' ? v.clearBy : v.short ?? 0).toFixed(1)} FT` : '--']]],
      ['FLIGHT AND AIR', [['SIMULATED DISTANCE', `${Math.round(res.landFt)} FT`], ['APEX', `${Math.round(res.peakFt)} FT`], ['HANG TIME', `${res.hang.toFixed(2)} S`], ['CARRY FACTOR', b ? b.carry.toFixed(3) : '1.000'], ['SIDE SPIN OFFSET', b ? `${b.dws} RPM` : '0 RPM'], ['AIR DENSITY', res.rho.toFixed(3)], ['TEMPERATURE', `${Math.round(s.temp)} F`], ['HUMIDITY', f(b?.rh, 0, '%')], ['PRESSURE', f(b?.hpa, 0, ' HPA')], ['WIND', b?.wm != null ? `${b.wm} MPH` : '--'], ['WIND DIRECTION', f(b?.wd, 0, '°')], ['GUSTS', f(b?.wg, 0, ' MPH')], ['BACKSPIN (PRIOR)', `${Math.round(res.wb)} RPM`], ['SIDE SPIN (PRIOR)', `${Math.round(res.ws)} RPM`]]],
    ]
    E('#c20st').innerHTML = '<span class="t">/ E V E R Y &nbsp; S T A T /</span>' + cols.map(([h, rows]) => `<div><h5>${h}</h5>${rows.map(([a, c]) => `<div class="r"><span>${a}</span><b>${c}</b></div>`).join('')}</div>`).join('')
  }
  function render(res) {
    last = res
    const s = api.state, pv = !!ses.beat?.preview
    const rd = E('#c20rd')
    if (!rd.firstChild) rd.innerHTML = '<b><span id="c20d">0</span><i> FT</i></b><span id="c20x"></span>'
    const dEl = E('#c20d')
    if (window.__cpFire || pv || !ses.beat) dEl.textContent = Math.round(res.landFt)
    dEl.dataset.v = Math.round(res.landFt)
    E('#c20x').textContent = `APEX ${Math.round(res.peakFt)} FT  HANG ${res.hang.toFixed(1)} S${res.verdict.wallFt ? `  WALL ${Math.round(res.verdict.wallFt)}/${res.verdict.wallH.toFixed(0)}` : ''}`
    paintCard()
    E('#c20z').innerHTML = mode === 'replay' && cur ? zoneSVG(cur, { w: E('#c20z').clientWidth || 250, h: E('#c20z').clientHeight || 200 }) : ''
    if (mode !== 'replay' || !cur) { const l = ballsLike(pool, s.ev, s.la, s.dir); E('#c20z').innerHTML = `<div class="like"><b>NO PITCH FOR A WHAT-IF SWING</b>${l.n ? `<span>${l.n} REAL BALLS WITHIN 3 MPH, 3°, 8°</span><span><b>${Math.round(l.hr * 100)}%</b> WERE HOME RUNS</span><span>${l.lo} TO ${l.hi} FT, MEDIAN ${l.med}</span>` : '<span>NO REAL BALLS THAT CLOSE</span>'}</div>` }
    paintSwing(res)
    paintStats(res)
    paintSlots(); paintTally(); paintVerdict(false)
  }
  function paintTally() {
    E('#c20t').innerHTML = `<div class="c"><span>SWINGS </span>${String(ses.swings).padStart(2, '0')} <span> HR </span>${String(ses.hrs).padStart(2, '0')} <span> BEST </span>${ses.best || '---'}</div>` + ses.log.slice(-3).map((l, i, a) => `<div class="${i === a.length - 1 ? 'n' : l.hr ? 'h' : ''}">${ses.line(l)}</div>`).join('')
  }
  function paintVerdict(stampIt) {
    const vd = E('#c20v'), b = ses.beat
    vd.classList.toggle('hr', isHR(b)); vd.classList.toggle('pv', !!b?.preview)
    vd.querySelector('.st').textContent = b ? b.state : 'PREVIEW'
    vd.querySelector('.hd').textContent = b?.preview ? 'PRESS SWING' : b ? b.text : '. . .'
    vd.querySelector('.sb').textContent = b?.sub ?? ''
    vd.querySelector('.ed').textContent = mode === 'replay' && cur ? (edited ? 'EDITED: NOT THE REAL BALL ANY MORE' : cur.hr ? 'REAL HOME RUN' : 'REAL BALL: ' + (cur.ev_ ?? '').replace(/_/g, ' ').toUpperCase()) : ''
    if (stampIt) restamp(vd.querySelector('.hd'))
  }
  finishUI(root, { minW: 1200, minH: 700 })
  root.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode))
  showWire()
  setMode(mode)
  const wantBat = q.get('bat')
  if (wantBat && R.balls.length) { filter = 'all'; balls = R.balls.filter((b) => String(b.b) === wantBat); idx = 0; if (balls.length) { mode = 'replay'; applyBall(balls[0]); paintChooser() } }
  return {
    render,
    beat: (b) => { ses.onBeat(b); paintVerdict(!!b.last); paintTally(); if (b.last && last) { rollTo(E('#c20d'), Math.round(last.landFt), { steps: 8 }) } if (last) render(last) },
  }
}
