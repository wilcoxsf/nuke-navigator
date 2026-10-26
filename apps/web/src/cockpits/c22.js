// Study 22, ONE BALL: the simple screen. Left: the wireframe park (BIRD'S EYE toggle), how far, and the ball chooser. Right: the batter, the swing seen side-on (attack angle meeting the ball, the ball leaving at the launch
// angle), and where this ball sits among every ball in play (exit speed, launch angle, distance histograms). The pitch is always on screen under the park: a 3 by 3 strike zone grid with where it crossed, and its stats beside it. Every other stat and the
// thirty parks are one click away in a pop-up. Character art uses braille poster by default (face, swing); pictures sit in their own boxes and text never overlaps them. Only buttons tilt.
import { SKEL_CSS, restamp, tileHTML, isHR } from './skel.js'
import { THEME_CSS, JUICE_CSS, themePicker, pressEl, makeControls, makeSession, finishUI, loadDists } from './skel2.js'
import { BTN_TILT_CSS, tiltButtons, loadReplay, loadPool, ballsLike, zoneSVG, rollTo, histHonest } from './skel3.js'
import { ART_CSS, STYLES, renderArt, faceSource, drawBatter, drawBust, artMetrics } from './art.js'
import { loadBatter3d, batter3dSource, loadGenericFaces, genericFace } from './batter3d.js'

const LSA = { 1: 'WEAK', 2: 'TOPPED', 3: 'UNDER', 4: 'FLARE OR BURNER', 5: 'SOLID CONTACT', 6: 'BARREL' }
const PITCH = { FF: 'FOUR-SEAM', SI: 'SINKER', FC: 'CUTTER', SL: 'SLIDER', ST: 'SWEEPER', CU: 'CURVEBALL', KC: 'KNUCKLE-CURVE', CH: 'CHANGEUP', FS: 'SPLITTER', SV: 'SLURVE', KN: 'KNUCKLEBALL', EP: 'EEPHUS', CS: 'SLOW CURVE', FO: 'FORKBALL' }
const store = (k) => { try { return localStorage.getItem(k) } catch { return null } }
const f = (v, d = 1, u = '') => (v == null || v !== v ? '--' : (typeof v === 'number' ? v.toFixed(d) : v) + u)
const clock = (ax) => { if (ax == null) return '--'; const h = ((((ax + 180) / 30) % 12) + 12) % 12, hh = Math.floor(h) || 12, mm = Math.round((h % 1) * 60); return `${hh}:${String(mm === 60 ? 59 : mm).padStart(2, '0')}` }

export async function build(root, api, U) {
  const { css, loadParks, evalParks, windowSync } = U
  css('cp22', SKEL_CSS + THEME_CSS + JUICE_CSS + BTN_TILT_CSS + ART_CSS + `
#cp .c22{position:absolute;inset:10px;display:grid;gap:14px;grid-template-columns:minmax(0,1fr) clamp(430px,31vw,600px);grid-template-rows:22px minmax(0,1fr) 84px}
#cp .c22 .hdr{grid-column:1/3;display:flex;justify-content:space-between;align-items:center;gap:12px;white-space:nowrap}
#cp .c22 .hdr .rt{display:flex;gap:14px;align-items:center}
#cp .c22 .hdr .grp{display:flex;gap:6px;align-items:center;font:8px PS2P,monospace;color:var(--dim)}
#cp .c22 .bt{font:8px/1 PS2P,monospace;padding:5px 8px;box-shadow:0 3px 0 var(--e)}
#cp .c22 .bt.on{background:var(--tx);color:var(--k);box-shadow:0 1px 0 var(--e)}
#cp .c22 .bt.off{opacity:.4;pointer-events:none}
#cp .c22 .left{display:grid;grid-template-rows:minmax(0,1fr) 172px;gap:14px;min-height:0}
#cp .c22 .pnl{overflow:hidden}
#cp .c22 .win{pointer-events:none}
#cp .c22 .rd{position:absolute;left:18px;top:14px;pointer-events:none}
#cp .c22 .rd b{font-weight:400;font-size:70px;line-height:.9;display:block}
#cp .c22 .rd b i{font-style:normal;font-size:26px;color:var(--dim)}
#cp .c22 .rd>span{display:block;color:var(--dim);font-size:18px;margin-top:2px}
#cp .c22 .rd .gn{color:var(--acc);font-size:18px;margin-top:6px}
#cp .c22 .chip{position:absolute;right:14px;top:14px;max-width:260px;padding:8px 12px;background:var(--k);border:1px solid var(--tx);text-align:right;pointer-events:none}
#cp .c22 .chip .hd{font-size:24px;line-height:1}
#cp .c22 .chip.hr .hd{color:var(--acc)}
#cp .c22 .chip .sb{font-size:15px;color:var(--dim);margin-top:3px}
#cp .c22 .bsel{position:absolute;left:18px;bottom:12px;right:190px;display:grid;gap:4px;font-size:17px}
#cp .c22 .bsel .r1{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
#cp .c22 .bsel .r2{color:var(--dim)}
#cp .c22 .bsel .r2 b{font-weight:400;color:var(--tx)}
#cp .c22 .tly{position:absolute;right:16px;bottom:12px;width:170px;font-size:15px;display:grid;gap:1px;pointer-events:none;text-align:right}
#cp .c22 .tly div{color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cp .c22 .tly div.n{color:var(--acc)}
#cp .c22 .tly .c{color:var(--tx)}
#cp .c22 .tly .c span{color:var(--dim)}
#cp .c22 .right{display:grid;grid-template-rows:150px minmax(170px,1fr) auto;gap:14px;min-height:0;overflow:hidden}
@media (min-height:880px){#cp .c22 .right{grid-template-rows:160px minmax(0,1fr) auto}}
#cp .c22 .batter{display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-rows:minmax(0,1fr);gap:14px;padding:22px 14px 10px 14px;overflow:hidden}
#cp .c22 .fbox{width:128px;position:relative;align-self:stretch;min-height:0;overflow:hidden}
#cp .c22 .fbox .art,#cp .c22 .swing .fig .art{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);margin:0;color:var(--tx)}
#cp .c22 .info{display:grid;gap:4px;align-content:start;min-width:0}
#cp .c22 .info b{font-weight:400;font-size:24px;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cp .c22 .info .dn{color:var(--acc);font:7px/5.6px Consolas,monospace;margin:1px 0 2px;white-space:pre}
#cp .c22 .info span{color:var(--dim);font-size:16px;line-height:1.1}
#cp .c22 .info .pl{color:var(--tx)}
#cp .c22 .info .row{display:flex;gap:6px;margin-top:4px;flex-wrap:wrap}
#cp .c22 .swing{display:grid;grid-template-rows:minmax(0,1fr) auto;padding:22px 14px 10px}
#cp .c22 .swing .fig{position:relative;min-height:0;overflow:hidden}
#cp .c22 .swing .cap{font-size:17px;line-height:1.15;color:var(--dim);padding-top:6px}
#cp .c22 .swing .cap b{font-weight:400;color:var(--tx)}
#cp .c22 .swing .cap i{font-style:normal;color:var(--acc)}
#cp .c22 .hists{padding:22px 14px 6px;display:grid;gap:4px}
#cp .c22 .hists .h .lb{display:flex;justify-content:space-between;gap:10px;font-size:15px;color:var(--dim);white-space:nowrap}
#cp .c22 .hists .h .lb b{font-weight:400;color:var(--tx)}
#cp .c22 .hists .key{font-size:13px;color:var(--dim)}
#cp .c22 .hists .like{font-size:15px;color:var(--dim)}
#cp .c22 .hists .like b{font-weight:400;color:var(--tx)}
#cp .c22 .strip{grid-column:1/3;position:relative;display:grid;grid-template-columns:repeat(6,1fr) 1.4fr;gap:10px;padding-bottom:6px}
#cp .c22 .strip .bt{padding:8px 34px 4px 10px;display:flex;flex-direction:column;justify-content:space-between;position:relative}
#cp .c22 .strip .bt .ps{color:var(--dim);font-size:7px;white-space:nowrap}
#cp .c22 .strip .bt.arm .ps{color:var(--k)}
#cp .c22 .strip .bt b{font-weight:400;font-size:26px;line-height:.9;white-space:nowrap}
#cp .c22 .strip .bt .ud{position:absolute;right:6px;top:50%;transform:translateY(-50%);display:grid;gap:4px}
#cp .c22 .strip .bt .ud i{display:block;width:18px;height:16px;border:1px solid currentColor;font-style:normal;font-size:13px;line-height:14px;text-align:center}
#cp .c22 .strip .bt.hot{padding:8px 10px 4px}
#cp .c22 .strip .bt.hot b{font:15px/1.3 PS2P,monospace;align-self:center;margin:auto}
#cp .c22 .mod{position:fixed;inset:0;z-index:30;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.72);pointer-events:auto}
#cp .c22 .mod.open{display:flex}
#cp .c22 .mod .box{position:relative;background:var(--k);border:1px solid var(--tx);padding:34px 26px 22px;max-width:min(1500px,94vw);max-height:92vh;overflow:auto}
#cp .c22 .mod .x{position:absolute;right:10px;top:8px}
#cp .c22 .mod h3{position:absolute;left:14px;top:8px;margin:0;font:8px PS2P,monospace;font-weight:400;color:var(--acc)}
#cp .c22 .pitch{display:grid;grid-template-columns:auto minmax(0,1fr);gap:22px;padding:24px 18px 10px}
#cp .c22 .pitch .zg{width:136px;height:100%;position:relative;min-height:0}
#cp .c22 .pitch .zg svg{position:absolute;inset:0;width:100%;height:100%}
#cp .c22 .pitch .pl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px 26px;align-content:start;min-width:0}
#cp .c22 .pitch .pl .r{display:flex;justify-content:space-between;gap:10px;font-size:16px;line-height:19px;white-space:nowrap}
#cp .c22 .pitch .pl .r span{color:var(--dim)}
#cp .c22 .pitch .pl .r b{font-weight:400;overflow:hidden;text-overflow:ellipsis}
#cp .c22 .pitch .pl .hd{grid-column:1/4;font-size:22px;line-height:1;margin-bottom:4px}
#cp .c22 .pitch .none{align-self:center;color:var(--dim);font-size:17px}
#cp .c22 .pitch .none b{font-weight:400;color:var(--tx)}
#cp .c22 .allst h5{font:8px PS2P,monospace;font-weight:400;color:var(--acc);margin:0 0 6px}
#cp .c22 .allst{display:grid;grid-template-columns:repeat(5,minmax(190px,1fr));gap:22px}
#cp .c22 .allst .r{display:flex;justify-content:space-between;gap:10px;font-size:15px;line-height:17px;white-space:nowrap}
#cp .c22 .allst .r span{color:var(--dim)}
#cp .c22 .allst .r b{font-weight:400}
#cp .c22 .pk{display:grid;grid-template-columns:repeat(10,64px);gap:4px}
#cp .c22 .pk .tile{height:46px}
`)
  root.classList.add('skel')
  window.__cpBead = 3.4
  api.NN.setFpsCap(30)
  const ctl = makeControls(api, U), ses = makeSession(api)
  const q = new URLSearchParams(location.search)
  let last = null, mode = q.get('mode22') || 'replay', filter = 'giants', idx = 0, edited = false, balls = [], cur = null, bird = q.get('bird') === '1', modal = null

  root.innerHTML = `<div class="c22"><div class="hdr"><span class="ps">DINGER DOJO // STUDY 22 // ONE BALL</span><span class="rt">
    <span class="grp">MODE <span class="bt" data-mode="replay">REPLAY</span><span class="bt" data-mode="whatif">WHAT-IF</span></span>
    <span class="grp">VIEW <span class="bt" id="c22b">BIRD'S EYE</span></span>
    <span class="grp"><span class="bt" id="c22lab">ART LAB</span></span><span id="c22a"></span></span></div>
  <div class="left"><div class="pnl clear win" id="c22h"><span class="t">/ O R A C L E &nbsp; P A R K /</span>
    <div class="rd" id="c22rd"></div><div class="chip" id="c22v"><div class="hd"></div><div class="sb"></div></div><div class="bsel p" id="c22ch"></div><div class="tly" id="c22t"></div></div>
    <div class="pnl p pitch"><span class="t">/ T H E &nbsp; P I T C H /</span><div class="zg" id="c22zg"></div><div class="pl" id="c22pl"></div></div></div>
  <div class="right">
    <div class="pnl p batter"><span class="t">/ B A T T E R /</span><div class="fbox" id="c22f"><pre class="art"></pre></div><div class="info" id="c22i"></div></div>
    <div class="pnl p swing"><span class="t">/ S W I N G &nbsp; S I D E &nbsp; V I E W /</span><div class="fig" id="c22s"><pre class="art"></pre></div><div class="cap" id="c22cap"></div></div>
    <div class="pnl p hists" id="c22hi"><span class="t">/ T H I S &nbsp; B A L L &nbsp; V S &nbsp; A L L &nbsp; B A L L S /</span></div>
  </div>
  <div class="strip p" id="c22sl">${ctl.SLOTS.map((s, i) => `<div class="bt" data-i="${i}"><span class="ps">${i + 1} ${s.label}</span><b></b><span class="ud"><i data-d="1">+</i><i data-d="-1">-</i></span></div>`).join('')}<div class="bt hot" data-i="6"><span class="ps">ENTER</span><b>SWING</b></div></div>
  <div class="mod" id="c22m"><div class="box"><span class="bt x" id="c22cl" aria-label="close">CLOSE</span><h3 id="c22mt"></h3><div id="c22mb"></div></div></div></div>`
  const E = (id) => root.querySelector(id), hero = E('#c22h')
  const showWire = () => {
    api.NN.setDuo(null)
    const cs = getComputedStyle(root), t = { tx: cs.getPropertyValue('--tx').trim(), k: cs.getPropertyValue('--k').trim(), acc: cs.getPropertyValue('--acc').trim() }
    api.NN.setPix({ pix: 0, mode: 0 })
    // ?wire=plain is the old look; ?wire=nocontour drops the height contours; the default adds thick lines, the field markings and the measured wall (accent colour), a lower crease angle for the far bowl and contours on the outer stands
    const wm = q.get('wire') || 'full'
    const rich = wm === 'plain' ? {} : { fatHeavy: 1.8, faintAngle: 40, faintMin: 0.8, marks: true, wall: (b) => api.wallAt?.(b), accent: t.acc, stands: ['full', 'clean', 'ghost', 'quiet', 'terrace'].includes(q.get('stands')) ? q.get('stands') : 'ghost', fun: true, step: wm === 'nocontour' ? 0 : q.get('stands') === 'terrace' ? 2.5 : 6, contourOuter: q.get('stands') === 'terrace' ? 12 : 40 }
    api.NN.setWire(true, { split: true, angle: 78, step: 0, hidden: true, opacity: 0.9, color: t.tx, face: t.k, fog: [230, 560], rebuild: !!showWire.built, ...rich })
    showWire.built = true
  }
  themePicker(root, E('#c22a'), api, 22, 'orange', { park: true, onChange: () => { showWire(); last && render(last) } })
  tiltButtons(root)
  windowSync(api, hero, { zoom: 0.95 })
  const CAM = { home: [[0.3, 150, 170], [0.3, 0, -85]], top: [[0.3, 300, -50], [0.3, 0, -62]] }
  const camTo = (k) => { const [p, t] = CAM[k]; api.NN.camera.position.set(...p); api.NN.controls.target.set(...t); api.NN.controls.update(); E('#c22b').classList.toggle('on', k === 'top') }
  setTimeout(() => camTo(bird ? 'top' : 'home'), 60)
  const flipBird = () => { bird = !bird; camTo(bird ? 'top' : 'home') }
  E('#c22b').addEventListener('click', () => { pressEl(E('#c22b')); flipBird() })
  E('#c22lab').addEventListener('click', () => { const u = new URL(location.href); u.searchParams.set('cp', '21'); location.href = u.toString() })

  const [parks, R, pool, D, facesRaw] = await Promise.all([loadParks(), loadReplay(), loadPool(), loadDists(), (async () => { try { const r = await fetch('/faces_tone.json'); return r.ok ? await r.json() : {} } catch { return {} } })()])
  const styleOf = (id, fallback) => STYLES.find((s) => s.id === (store('nn-art-' + id) || fallback)) ?? STYLES.find((s) => s.id === fallback)
  const want3d = new URLSearchParams(location.search).get('batter') === '3d' // the shaded mannequin batter (pen and ink), for review: ?batter=3d
  const has3d = want3d ? await loadBatter3d() : false
  const genKind = ['composite', 'bust'].includes(new URLSearchParams(location.search).get('generic')) ? new URLSearchParams(location.search).get('generic') : null // generic faces for batters without a photo, for review: ?generic=composite or ?generic=bust
  const hasGen = genKind ? await loadGenericFaces(genKind) : false
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
    const el = E('#c22ch')
    if (mode !== 'replay') { el.innerHTML = '<div class="r2">WHAT-IF: THE SWING YOU SET BELOW</div>'; return }
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
  const paintSlots = () => slots.forEach((el, i) => { el.classList.toggle('arm', i === ctl.armed && i < 6); if (i < 6) el.querySelector('b').textContent = ctl.text(ctl.SLOTS[i].k) })

  // ---- pop-ups: the pitch, every stat, the thirty parks ----
  const openMod = (k) => { modal = k; E('#c22m').classList.add('open'); paintModal() }
  const closeMod = () => { modal = null; E('#c22m').classList.remove('open') }
  E('#c22cl').addEventListener('click', closeMod)
  E('#c22m').addEventListener('click', (e) => { if (e.target === E('#c22m')) closeMod() })
  function paintModal() {
    if (!modal || !last) return
    const b = cur, body = E('#c22mb')
    if (modal === 'parks') {
      E('#c22mt').textContent = '/ T H I R T Y   P A R K S /'
      const pr = evalParks(parks, api)
      body.innerHTML = `<div style="font-size:20px;margin-bottom:10px;color:var(--acc)">GONE IN ${U.goneWord(parks, api, pr)} PARKS</div><div class="pk">${tileHTML(pr)}</div>`
    } else {
      E('#c22mt').textContent = '/ E V E R Y   S T A T /'
      body.innerHTML = `<div class="allst">${statCols(last).map(([h, rows]) => `<div><h5>${h}</h5>${rows.map(([a, c]) => `<div class="r"><span>${a}</span><b>${c}</b></div>`).join('')}</div>`).join('')}</div>`
    }
  }
  function statCols(res) {
    const s = api.state, b = cur, v = res.verdict, bn = b ? pname(b.b) : null, pn = b ? pname(b.p) : null
    const runners = b ? [b.r1 ? '1B' : '', b.r2 ? '2B' : '', b.r3 ? '3B' : ''].filter(Boolean).join(' ') || 'NONE' : '--'
    const pr = parks.parks.length ? evalParks(parks, api) : [], gone = pr.length ? U.goneWord(parks, api, pr) : '--'
    return [
      ['GAME', [['BATTER', bn ? `${bn[0]}${bn[1] ? ' #' + bn[1] : ''}` : b ? '#' + b.b : 'YOUR SWING'], ['BATS', b ? b.s : s.hand > 0 ? 'R' : 'L'], ['PITCHER', pn ? pn[0] : '--'], ['THROWS', b?.t ?? '--'], ['DATE', b?.d ?? '--'], ['PARK', b ? (b.park === 'SF' ? 'ORACLE PARK' : b.park) : 'ORACLE PARK'], ['INNING', b ? `${b.tb === 'Top' ? 'TOP' : 'BOT'} ${b.in ?? '--'}` : '--'], ['COUNT', b && b.bl != null ? `${b.bl}-${b.sk}` : '--'], ['OUTS', f(b?.ou, 0)], ['RUNNERS ON', runners], ['SCORE (BAT-FLD)', b && b.bsc != null ? `${b.bsc}-${b.fsc}` : '--'], ['TIME THROUGH ORDER', f(b?.tto, 0)], ['BATTER AGE', f(b?.agb, 0)], ['PITCHER AGE', f(b?.agp, 0)]]],
      ['PITCH', [['TYPE', b ? PITCH[b.pt] ?? b.pt ?? '--' : '--'], ['SPEED', f(b?.pv, 1, ' MPH')], ['EFFECTIVE SPEED', f(b?.eff, 1, ' MPH')], ['SPIN RATE', f(b?.rpm, 0, ' RPM')], ['SPIN TILT', b ? clock(b.ax) : '--'], ['SPIN AXIS', f(b?.ax, 0, '°')], ['RELEASE SIDE', f(b?.rx, 2, ' FT')], ['RELEASE HEIGHT', f(b?.rz, 2, ' FT')], ['EXTENSION', f(b?.ext, 1, ' FT')], ['ARM ANGLE', f(b?.arm, 0, '°')], ['PLATE X', f(b?.px, 2, ' FT')], ['PLATE Z', f(b?.pz, 2, ' FT')], ['ZONE', f(b?.zn, 0)], ['BREAK H / V', b && b.hx != null ? `${b.hx.toFixed(0)} / ${b.hz?.toFixed(0)} IN` : '--'], ['APPROACH ANGLE', f(b?.vaa, 1, '°')]]],
      ['SWING AND CONTACT', [['BAT SPEED', f(b?.bs, 1, ' MPH')], ['SWING LENGTH', f(b?.sl, 1, ' FT')], ['ATTACK ANGLE', f(b?.aa, 1, '°')], ['ATTACK DIRECTION', f(b?.ad, 1, '°')], ['SWING TILT', f(b?.tilt, 0, '°')], ['INTERCEPT X / Y', b && b.ix != null ? `${b.ix.toFixed(1)} / ${b.iy?.toFixed(1)} IN` : '--'], ['EXIT SPEED', `${(b?.ev ?? s.ev).toFixed(1)} MPH`], ['LAUNCH ANGLE', `${(b?.la ?? s.la).toFixed(1)}°`], ['GAP (LAUNCH - ATTACK)', b?.aa != null ? `${(b.la - b.aa).toFixed(1)}°` : '--'], ['LANDING BEARING', `${(b?.dir ?? s.dir).toFixed(1)}°`], ['HIT LOCATION', f(b?.hl, 0)], ['BALL TYPE', b?.bbt ? b.bbt.replace(/_/g, ' ').toUpperCase() : '--'], ['CONTACT QUALITY', b?.lsa ? LSA[b.lsa] ?? b.lsa : '--']]],
      ['RESULT AND VALUE', [['OUTCOME', b ? (b.ev_ ?? '').replace(/_/g, ' ').toUpperCase() : '--'], ['PROJECTED DISTANCE', b ? `${b.ft} FT` : '--'], ['EXPECTED AVG', f(b?.xba, 3)], ['EXPECTED WOBA', f(b?.xw, 3)], ['EXPECTED SLG', f(b?.xs, 3)], ['RUN VALUE', b?.dre != null ? (b.dre >= 0 ? '+' : '') + b.dre.toFixed(3) : '--'], ['WIN VALUE', b?.dwe != null ? (b.dwe >= 0 ? '+' : '') + (b.dwe * 100).toFixed(1) + '%' : '--'], ['INFIELD ALIGNMENT', b?.ifa ?? '--'], ['OUTFIELD ALIGNMENT', b?.ofa ?? '--'], ['MODEL HOME RUN ODDS', b?.pm != null ? (b.pm * 100).toFixed(1) + '%' : '--'], ['ENGINE VERDICT', v.kind === 'GONE' ? 'HOME RUN' : v.kind === 'WALL' ? 'OFF THE WALL' : v.kind === 'FOUL' ? 'FOUL' : 'IN PLAY'], ['PARKS WHERE GONE', gone], ['WALL HERE', v.wallFt ? `${Math.round(v.wallFt)} FT, ${v.wallH.toFixed(0)} FT HIGH` : '--'], [v.kind === 'GONE' ? 'CLEARED BY' : 'SHORT BY', v.wallFt ? `${(v.kind === 'GONE' ? v.clearBy : v.short ?? 0).toFixed(1)} FT` : '--']]],
      ['FLIGHT AND AIR', [['SIMULATED DISTANCE', `${Math.round(res.landFt)} FT`], ['APEX', `${Math.round(res.peakFt)} FT`], ['HANG TIME', `${res.hang.toFixed(2)} S`], ['CARRY FACTOR', b ? b.carry.toFixed(3) : '1.000'], ['SIDE SPIN OFFSET', b ? `${b.dws} RPM` : '0 RPM'], ['AIR DENSITY', res.rho.toFixed(3)], ['TEMPERATURE', `${Math.round(s.temp)} F`], ['HUMIDITY', f(b?.rh, 0, '%')], ['PRESSURE', f(b?.hpa, 0, ' HPA')], ['WIND', b?.wm != null ? `${b.wm} MPH` : '--'], ['WIND DIRECTION', f(b?.wd, 0, '°')], ['GUSTS', f(b?.wg, 0, ' MPH')], ['BACKSPIN (PRIOR)', `${Math.round(res.wb)} RPM`], ['SIDE SPIN (PRIOR)', `${Math.round(res.ws)} RPM`]]],
    ]
  }
  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (e.key === 'Escape') closeMod()
    else if (modal) return
    else if (e.key === ']' || e.key === '.') { e.preventDefault(); step(1) } else if (e.key === '[' || e.key === ',') { e.preventDefault(); step(-1) } else if (e.key === 'b' || e.key === 'B') flipBird()
    else if (e.key === 'm' || e.key === 'M') setMode(mode === 'replay' ? 'whatif' : 'replay')
    else if (e.key === 'a' || e.key === 'A') openMod('stats')
  })
  api.setPreview(true)

  // ---- the pieces (each picture sits in its own box; the font is sized to fit that box, so nothing can overflow onto text) ----
  const ro = new ResizeObserver((ents) => { for (const en of ents) { const pre = en.target.querySelector('pre'); if (pre?._fit) fit(pre, en.target, pre._fit.lines, pre._fit.am) } })
  function fit(pre, box, lines, am) {
    if (!pre._fit) ro.observe(box)
    pre._fit = { lines, am }
    const cols = Math.max(...lines.map((l) => l.length))
    const fs = Math.max(3, Math.min(16, (box.clientWidth - 2) / (cols * am.w), (box.clientHeight - 2) / (lines.length * am.h)))
    pre.className = 'art ' + am.cls.replace(/^art\s*/, '')
    pre.style.fontSize = fs + 'px'
    pre.textContent = lines.join('\n')
  }
  function paintBatter() {
    const s = api.state, id = cur ? String(cur.b) : null, bat = id ? pname(id) : null, hand = cur ? cur.s : s.hand > 0 ? 'R' : 'L'
    const real = id && facesRaw[id], gen = !real && id && hasGen ? genericFace(genKind, id) : null
    const st = (gen?.style && STYLES.find((s) => s.id === gen.style)) || styleOf('face', 'braille-poster'), am = artMetrics(st), src = real ? faceSource(facesRaw[id]) : gen ? gen.src : drawBust(160)
    if (src) fit(E('#c22f pre'), E('#c22f'), renderArt(src, st, 34, real ? { enh: { stretch: true, k: 1.5, sigma: 18 } } : gen ? gen.enh : {}).lines, am)
    const name = bat ? bat[0] : cur ? 'BATTER ' + cur.b : 'YOUR SWING'
    E('#c22i').innerHTML = `<b>${name.toUpperCase()}</b><span>${bat?.[1] ? '#' + bat[1] + ' &nbsp; ' : ''}BATS ${hand === 'R' ? 'RIGHT' : 'LEFT'}</span>
      <div class="row"><span class="bt" id="c22bs">STATS</span><span class="bt" id="c22bk">PARKS</span></div>`
    E('#c22bs').addEventListener('click', () => { pressEl(E('#c22bs')); openMod('stats') })
    E('#c22bk').addEventListener('click', () => { pressEl(E('#c22bk')); openMod('parks') })
  }
  function paintSwing() {
    const s = api.state, real = cur && cur.aa != null, aa = real ? cur.aa : 1.73 + 0.078 * s.la + 0.063 * s.ev, la = s.la, vaa = cur?.vaa ?? -6.4, hand = cur ? cur.s : s.hand > 0 ? 'R' : 'L'
    const W = 520, H = 330, src = has3d ? batter3dSource({ aa, hand, w: W, h: H, mirrorW: W, rays: { la, vaa, len: 200 } }) : drawBatter({ t: 2 / 3, aa, hand, w: W, h: H, mirrorW: W, rays: { la, vaa, len: 200 } })
    if (!src) return
    const st = styleOf('swing', has3d ? 'braille-edge' : 'braille-poster'), am = artMetrics(st)
    const bh = E('#c22s').clientHeight, cols = bh < 140 ? 52 : bh < 200 ? 68 : 84 // fewer, larger characters when the box is short, so the text stays legible
    fit(E('#c22s pre'), E('#c22s'), renderArt(src, st, cols).lines, am)
    const gap = la - aa
    E('#c22cap').innerHTML = `<b>ATTACK ${aa >= 0 ? '+' : ''}${aa.toFixed(0)}°</b> &nbsp; <b>LAUNCH ${la.toFixed(0)}°</b> &nbsp; GAP ${gap >= 0 ? '+' : ''}${gap.toFixed(0)}°<br>${real ? `BAT ${f(cur.bs, 0)} MPH &nbsp; ` : '<i>TYPICAL BAT PATH, NOT MEASURED</i> &nbsp; '}EXIT ${Math.round(s.ev)} MPH`
  }
  // the strike zone as a 3 by 3 grid (zones 1 to 9, catcher's view); the dot is where the pitch crossed the plate, shaded cell = its zone, outside the grid for a pitch out of the zone
  function zone3(b, W, H) {
    const zl = 0.708, st = b.st ?? 3.4, sb = b.sb ?? 1.6, mx = 0.55, my = 0.55
    const xr = zl + mx, zt = st + my, zb = sb - my
    const S = Math.min((W - 4) / (2 * xr), (H - 4) / (zt - zb)), cx = W / 2, cy0 = 2 + (H - 4 - S * (zt - zb)) / 2
    const X = (x) => cx + x * S, Y = (z) => cy0 + (zt - z) * S
    let g = `<rect x="${X(-xr)}" y="${Y(zt)}" width="${2 * xr * S}" height="${(zt - zb) * S}" fill="none" stroke="var(--dim)" stroke-dasharray="2 4"/>`
    const zn = b.zn ?? 0
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const n = r * 3 + c + 1, x0 = X(-zl + (2 * zl * c) / 3), x1 = X(-zl + (2 * zl * (c + 1)) / 3), y0 = Y(st - ((st - sb) * r) / 3), y1 = Y(st - ((st - sb) * (r + 1)) / 3)
      g += `<rect x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${(x1 - x0).toFixed(1)}" height="${(y1 - y0).toFixed(1)}" fill="${n === zn ? 'var(--acc)' : 'none'}" fill-opacity=".28" stroke="var(--tx)" stroke-width="1.5"/>`
      g += `<text x="${((x0 + x1) / 2).toFixed(1)}" y="${((y0 + y1) / 2 + 4).toFixed(1)}" fill="var(--dim)" font-size="11" text-anchor="middle">${n}</text>`
    }
    const px = Math.max(-xr + 0.05, Math.min(xr - 0.05, b.px)), pz = Math.max(zb + 0.05, Math.min(zt - 0.05, b.pz))
    g += `<circle cx="${X(px).toFixed(1)}" cy="${Y(pz).toFixed(1)}" r="${Math.max(5, 0.12 * S).toFixed(1)}" fill="var(--acc)" stroke="var(--k)" stroke-width="1.5"/>`
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`
  }
  function paintPitch() {
    const b = cur, zg = E('#c22zg'), pl = E('#c22pl')
    if (mode !== 'replay' || !b) { zg.innerHTML = ''; pl.innerHTML = '<div class="none"><b>NO PITCH FOR A WHAT-IF SWING</b><br>SET THE SWING BELOW; THE BALL IS NOT TIED TO A PITCH</div>'; return }
    zg.innerHTML = zone3(b, zg.clientWidth || 136, zg.clientHeight || 120)
    const rows = [['SPEED', f(b.pv, 1, ' MPH')], ['EFFECTIVE', f(b.eff, 1, ' MPH')], ['SPIN RATE', f(b.rpm, 0, ' RPM')], ['SPIN TILT', clock(b.ax)], ['SPIN AXIS', f(b.ax, 0, '°')],
      ['BREAK H / V', b.hx != null ? `${b.hx.toFixed(0)} / ${b.hz?.toFixed(0)} IN` : '--'], ['APPROACH', f(b.vaa, 1, '°')], ['EXTENSION', f(b.ext, 1, ' FT')], ['RELEASE H', f(b.rz, 2, ' FT')],
      ['LOCATION X / Z', `${f(b.px, 2)} / ${f(b.pz, 2)} FT`], ['ZONE', b.zn != null ? (b.zn <= 9 ? b.zn + ' (IN THE ZONE)' : 'OUT OF THE ZONE') : '--'], ['ARM ANGLE', f(b.arm, 0, '°')]]
    pl.innerHTML = `<div class="hd">${(PITCH[b.pt] ?? b.pt ?? 'PITCH').toUpperCase()}</div>` + rows.map(([a, c]) => `<div class="r"><span>${a}</span><b>${c}</b></div>`).join('')
  }
  function paintHists(res) {
    const s = api.state, el = E('#c22hi'), w = Math.max(200, el.clientWidth - 30), fly = s.la >= 15
    const hh = innerHeight < 760 ? 28 : innerHeight < 860 ? 34 : 44
    const H = [['ev', 'EXIT SPEED', s.ev, `${Math.round(s.ev)} MPH`], ['la', 'LAUNCH ANGLE', s.la, `${Math.round(s.la)}°`], [fly ? 'dist_fb' : 'dist', 'DISTANCE', res.landFt, `${Math.round(res.landFt)} FT`]]
    const rows = H.map(([k, lab, v, txt]) => { const h = histHonest(D, k, v, { w, h: hh }); return `<div class="h"><div class="lb"><span>${lab} <b>${txt}</b></span><span>${h.pct != null ? (h.pct >= 50 ? `HIGHER THAN <b>${h.pct}%</b>` : `LOWER THAN <b>${100 - h.pct}%</b>`) : ''}</span></div>${h.svg}</div>` }).join('')
    let foot = innerHeight < 860 ? '' : '<div class="key">BARS: EVERY BALL IN PLAY 2023-25. LINE: HOME RUN RATE. ACCENT: THIS BALL</div>'
    if (mode !== 'replay' || !cur) { const l = ballsLike(pool, s.ev, s.la, s.dir); foot = l.n ? `<div class="like">${l.n} REAL BALLS LIKE THIS: <b>${Math.round(l.hr * 100)}%</b> WERE HOME RUNS, ${l.lo} TO ${l.hi} FT, MEDIAN ${l.med}</div>` : '<div class="like">NO REAL BALLS THAT CLOSE</div>' }
    el.innerHTML = '<span class="t">/ T H I S &nbsp; B A L L &nbsp; V S &nbsp; A L L &nbsp; B A L L S /</span>' + rows + foot
  }
  function render(res) {
    last = res
    const s = api.state, pv = !!ses.beat?.preview, rd = E('#c22rd')
    if (!rd.firstChild) rd.innerHTML = '<b><span id="c22d">0</span><i> FT</i></b><span id="c22x"></span><div class="gn" id="c22g"></div>'
    const dEl = E('#c22d')
    if (window.__cpFire || pv || !ses.beat) dEl.textContent = Math.round(res.landFt)
    dEl.dataset.v = Math.round(res.landFt)
    E('#c22x').textContent = `APEX ${Math.round(res.peakFt)} FT   HANG ${res.hang.toFixed(1)} S${res.verdict.wallFt ? `   WALL ${Math.round(res.verdict.wallFt)} FT, ${res.verdict.wallH.toFixed(0)} HIGH` : ''}`
    if (parks.parks.length) { const pr = evalParks(parks, api); E('#c22g').textContent = `GONE IN ${U.goneWord(parks, api, pr)} PARKS` }
    paintHists(res); paintBatter(); paintSwing(); paintPitch(); paintSlots(); paintTally(); paintVerdict(false); paintModal()
  }
  function paintTally() {
    E('#c22t').innerHTML = `<div class="c"><span>SWINGS </span>${String(ses.swings).padStart(2, '0')} <span> HR </span>${String(ses.hrs).padStart(2, '0')}</div><div><span>BEST </span>${ses.best || '---'}</div>` + ses.log.slice(-2).map((l, i, a) => `<div class="${i === a.length - 1 ? 'n' : ''}">${ses.line(l)}</div>`).join('')
  }
  function paintVerdict(stampIt) {
    const chip = E('#c22v'), b = ses.beat, v = last?.verdict
    const committed = b && !b.preview
    chip.classList.toggle('hr', committed ? isHR(b) : v?.kind === 'GONE')
    const live = v ? (v.kind === 'GONE' ? 'HOME RUN' : v.kind === 'WALL' ? 'OFF THE WALL' : v.kind === 'FOUL' ? 'FOUL BALL' : 'IN PLAY') : ''
    chip.querySelector('.hd').textContent = committed ? b.text : live
    chip.querySelector('.sb').textContent = committed ? (b.sub ?? '') : mode === 'replay' && cur ? (edited ? 'EDITED: NOT THE REAL BALL' : cur.hr ? 'THE REAL BALL' : 'THE REAL BALL: ' + (cur.ev_ ?? '').replace(/_/g, ' ').toUpperCase()) : 'PREVIEW'
    if (stampIt) restamp(chip.querySelector('.hd'))
  }
  finishUI(root, { minW: 1200, minH: 700 })
  root.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode))
  showWire()
  setMode(mode)
  const wantBat = q.get('bat')
  if (wantBat && R.balls.length) { filter = 'all'; balls = R.balls.filter((b) => String(b.b) === wantBat); idx = 0; if (balls.length) { mode = 'replay'; applyBall(balls[0]); paintChooser() } }
  const wantMod = q.get('mod')
  if (wantMod) setTimeout(() => openMod(wantMod), 1200)
  return {
    render,
    beat: (b) => { ses.onBeat(b); paintVerdict(!!b.last); paintTally(); if (b.last && last) rollTo(E('#c22d'), Math.round(last.landFt), { steps: 8 }); if (last) render(last) },
  }
}
