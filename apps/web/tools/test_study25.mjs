// Real-interaction test of Study 25 (THE BUILD). No screenshots: boxes are measured. Every layout (L1-L3) x frame (P1, P5) in the replay (no number strip) and in the
// dojo (strip) at three window sizes: panels do not overlap or leave the screen, every panel title is the topmost thing at its centre, park overlays do not collide,
// pictures fit, nothing spills, histogram labels are not cut, header buttons are uncovered. Then every type set (T), the SELECT menu (keys and clicks), TWEAK THE
// TATER and back, the OFF THE MENU filter and tag, the ORACLE ONLY histograms, the side-on contact drawing, the odds receipt, the type picker, the effects (hit-stop
// setting, contact spark, fireworks on a home run, a splash hit with its banner and kayaks, Karl's fog), another park's team color, and phones.
// Usage: node tools/test_study25.mjs [base url]
import { chromium } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:5175'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
let fails = 0
const check = (name, ok, extra = '') => { if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : extra) }
const errs = []
const FIX = (r) => { const t = Array.from({ length: 48 }, (_, i) => new Date(Date.now() + (i - 1) * 3600e3).toISOString().slice(0, 13) + ':00'); r.fulfill({ contentType: 'application/json', body: JSON.stringify({ hourly: { time: t, temperature_2m: t.map(() => 58), relative_humidity_2m: t.map(() => 80), surface_pressure: t.map(() => 1012), wind_speed_10m: t.map(() => 14), wind_direction_10m: t.map(() => 280), cloud_cover_low: t.map(() => 20), visibility: t.map(() => 20000) } }) }) }

async function open(w, h, qs = '', ctxOpts = null) {
  const ctx = ctxOpts ? await browser.newContext(ctxOpts) : null
  const page = ctx ? await ctx.newPage() : await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
  page.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')))
  await page.route('**/api.open-meteo.com/**', FIX)
  await page.goto(`${base}/?mode=dojo&ui=K&cp=25&seed=7${qs}${/[?&]ir=/.test(qs) ? "" : "&ir=0"}${/[?&]lab=/.test(qs) ? "" : "&lab=CV1"}`) // (2 Nov, night: THE COVE pinned to the kayaks; EITHER sends the diver one splash in three)
  await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 180000 })
  await page.waitForTimeout(2500)
  page._ctx = ctx
  return page
}
const layout = (page) => page.evaluate(() => {
  const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } }
  const Q = (s) => document.querySelector(s)
  const inter = (a, b) => a && b && a.w > 0 && b.w > 0 && a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1
  const out = { overlaps: [], fits: [], titles: [] }
  const P = { hdr: Q('.c25>.hdr'), park: Q('.c25>.park'), pitch: Q('.c25>.pitch'), batter: Q('.c25>.batter'), slice: Q('.c25>.slice'), hists: Q('.c25>.hists'), strip: Q('.c25>.strip') }
  const names = Object.keys(P)
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) if (inter(R(P[names[i]]), R(P[names[j]]))) out.overlaps.push(names[i] + ' x ' + names[j])
  for (const k of names) { const r = R(P[k]); if (r.w && (r.l < -1 || r.t < -1 || r.r > innerWidth + 1 || r.b > innerHeight + 1)) out.overlaps.push(k + ' off screen') }
  const ov = ['#c25rd', '#c25v', '#c25ch', '#c25t', '#c25bug'].map((s) => [s, R(Q(s))])
  for (let i = 0; i < ov.length; i++) for (let j = i + 1; j < ov.length; j++) if (inter(ov[i][1], ov[j][1])) out.overlaps.push(ov[i][0] + ' x ' + ov[j][0])
  for (const [s, r] of ov) { const pr = R(P.park); if (r && r.w && (r.r > pr.r + 1 || r.b > pr.b + 1 || r.l < pr.l - 1)) out.overlaps.push(s + ' outside the park') }
  // the park is the hero: it gets the biggest share of the screen
  const area = (r) => (r ? r.w * r.h : 0), pa = area(R(P.park))
  for (const k of ['pitch', 'batter', 'slice', 'hists']) if (area(R(P[k])) > pa) out.overlaps.push(k + ' bigger than the park')
  for (const t of document.querySelectorAll('.c25>.pnl>.t')) {
    const r = R(t)
    if (!r.w) continue
    const pe = t.style.pointerEvents; t.style.pointerEvents = 'auto'
    const el = document.elementFromPoint(r.l + r.w / 2, r.t + r.h / 2)
    t.style.pointerEvents = pe
    if (!(el === t || t.contains(el))) out.titles.push(t.textContent.replace(/\s+/g, '').slice(0, 14) + ' hidden by ' + (el?.className || el?.tagName))
    if (r.t < 0 || r.b > innerHeight) out.titles.push(t.textContent.replace(/\s+/g, '').slice(0, 14) + ' off screen')
    const sw = Q('#c25hw'), swr = R(sw); if (t.closest('.hists') && swr?.w && inter(r, swr)) out.titles.push('hist title under the ALL MLB / ORACLE switch')
  }
  { const box = R(Q('#c25f')), pre = R(Q('#c25f pre')); if (box && pre && box.w && (pre.w > box.w + 2 || pre.h > box.h + 2)) out.fits.push(`face ${Math.round(pre.w)}x${Math.round(pre.h)} in ${Math.round(box.w)}x${Math.round(box.h)}`) }
  { const box = R(Q('#c25f')), cv = Q('#c25f canvas'); if (cv && cv.style.display !== 'none') { const r = R(cv); if (r.w > box.w + 2 || r.h > box.h + 2) out.fits.push('face canvas bigger than its box') } }
  { const box = R(Q('#c25sv')), sv = R(Q('#c25sv svg')); if (box && sv && box.w && (sv.w > box.w + 2 || sv.h > box.h + 2)) out.fits.push('side-on drawing bigger than its box') }
  for (const sel of ['#c25hb', '.c25 .pitch .pin', '.c25 .batter .bin', '#c25pl']) { const p = Q(sel); if (p && p.clientHeight && p.scrollHeight > p.clientHeight + 2) out.fits.push(sel + ' spills ' + p.scrollHeight + '>' + p.clientHeight) }
  { const sl = R(P.slice), cap = R(Q('#c25cap')); if (sl?.w && cap && cap.b > sl.b + 1) out.fits.push('contact caption spills') }
  for (const lb of document.querySelectorAll('#c25hb .lb')) if (lb.scrollWidth > lb.clientWidth + 2) out.fits.push('histogram label cut: ' + lb.textContent.slice(0, 30))
  for (const hd of document.querySelectorAll('#c25pl .hd')) { const r = R(hd), fsz = parseFloat(getComputedStyle(hd).fontSize); if (hd.offsetParent && r.h < fsz * 0.9) out.fits.push('pitch name squashed ' + r.h) }
  for (const b of document.querySelectorAll('.c25 .strip .bt[data-i]')) {
    const lab = b.querySelector('.ps'), ud = b.querySelector('.ud')
    if (lab && ud && b.offsetWidth) { const a = lab.getBoundingClientRect(), u = ud.getBoundingClientRect(); if (a.right > u.left + 1 && a.left < u.right && a.bottom > u.top && a.top < u.bottom) out.overlaps.push('label x +/- in ' + lab.textContent) }
  }
  for (const row of document.querySelectorAll('.c25>.hdr>div')) if (getComputedStyle(row).overflowX !== 'auto' && row.scrollWidth > row.clientWidth + 2) out.fits.push('header row cut ' + row.scrollWidth + '>' + row.clientWidth)
  const hr = R(P.hdr)
  for (const b of document.querySelectorAll('.c25>.hdr .bt')) {
    const r = R(b), row = R(b.closest('.h1, .h2'))
    if (!r.w || r.l + r.w / 2 < row.l || r.l + r.w / 2 > row.r) continue
    const el = document.elementFromPoint(r.l + r.w / 2, r.t + r.h / 2)
    if (!(el === b || b.contains(el))) out.overlaps.push('header button covered: ' + b.textContent.trim())
    if (r.b > hr.b + 1 || r.t < hr.t - 1) out.overlaps.push('header button outside the header: ' + b.textContent.trim())
  }
  return out
})
const setMode = async (page, m) => { if ((await page.evaluate(() => window.__mix25.mode())) !== m) { await page.keyboard.press('m'); await page.waitForTimeout(900) } }

const on = (x) => !process.env.PART || process.env.PART.includes(x) // PART=ABCDEFG runs only those parts of the suite (all when unset), so it fits a loaded machine
const SIZES = process.env.PHONE_ONLY || !on('A') ? [] : [[1827, 992], [1440, 820], [1280, 720]]
for (const [w, h] of SIZES) {
  const page = await open(w, h, '&menu=0&mix=L1P5A3T1')
  for (const m of ['replay', 'whatif']) {
    await setMode(page, m)
    for (const L of [1, 2, 3]) for (const P of [1, 5]) {
      const code = `L${L}P${P}A3T1`
      await page.evaluate((c) => window.__mix25.set(c), code); await page.waitForTimeout(800)
      const X = await layout(page), bad = X.overlaps.concat(X.fits, X.titles)
      check(`${w}x${h} ${m === 'replay' ? 'DEJA-VU' : 'DOJO'} ${code}`, bad.length === 0, bad.slice(0, 6).join('; '))
    }
  }
  if (w === 1440) {
    // every pixel type set fits, in the replay and the dojo, on the as-asked layout and the broadcast one
    for (const m of ['replay', 'whatif']) {
      await setMode(page, m)
      for (const L of [1, 2, 3]) for (const T of [1, 6, 15, 16, 17, 18]) {
        const code = `L${L}P5A3T${T}`
        await page.evaluate((c) => window.__mix25.set(c), code); await page.waitForTimeout(700)
        const X = await layout(page), bad = X.overlaps.concat(X.fits, X.titles)
        check(`type ${m === 'replay' ? 'DEJA-VU' : 'DOJO'} ${code}`, bad.length === 0, bad.slice(0, 6).join('; '))
      }
    }
    await setMode(page, 'replay')
    await page.evaluate(() => window.__mix25.set('L1P5A3T1')); await page.waitForTimeout(800)
    const r0 = await page.evaluate(() => ({ strip: getComputedStyle(document.querySelector('.c25>.strip')).display, title: document.querySelector('#c25ti').textContent, rd: document.querySelector('#c25rd').textContent, meter: document.querySelectorAll('#c25rd .meter s').length }))
    check('the replay has no number strip, its own title, and the odds meter', r0.strip === 'none' && /DÉJÀ-VU/.test(r0.title) && r0.meter === 20 && /\d+%|<1%|>99%/.test(r0.rd.replace(/\s+/g, '')), JSON.stringify(r0).slice(0, 160))
    // the side-on drawing: pitch, bat and ball on a real ball with bat tracking
    const sv = await page.evaluate(() => ({ t: document.querySelector('#c25sv').textContent, cap: document.querySelector('#c25cap').textContent }))
    check('CONTACT, SIDE ON draws the pitch, the bat and the ball', /PITCH \d+ MPH/.test(sv.t) && /BAT \d+ MPH/.test(sv.t) && /BALL \d+ MPH/.test(sv.t) && /PLANE/.test(sv.cap), JSON.stringify(sv).slice(0, 200))
    // the histograms: rate in the label, the peak on the line, hover numbers on every bar, and the ORACLE switch
    const hs = await page.evaluate(() => ({ lb: [...document.querySelectorAll('#c25hb .lb')].map((x) => x.textContent), pk: document.querySelectorAll('#c25hb svg .pk').length, hv: document.querySelectorAll('#c25hb svg .hv title').length, key: document.querySelector('#c25hb').textContent }))
    check('histograms say what share went out, label the peak, explain themselves', hs.lb.length === 3 && hs.lb.every((t) => /\d+% WENT OUT|-- WENT OUT/.test(t)) && hs.pk >= 1 && hs.hv > 60 && /SHARE OF THEM THAT WENT OUT/.test(hs.key) && /ALL 30 PARKS/.test(hs.key), JSON.stringify(hs).slice(0, 220))
    await page.click('#c25hw [data-w="sf"]'); await page.waitForTimeout(1500)
    const ho = await page.evaluate(() => ({ key: document.querySelector('#c25hb').textContent, on: document.querySelector('#c25hw [data-w="sf"]').classList.contains('on') }))
    check('ORACLE switches the histograms to Oracle Park only', ho.on && /AT ORACLE/.test(ho.key) && /15,198/.test(ho.key), ho.key.slice(-120))
    let X = await layout(page); check('Oracle-only histograms fit', X.fits.length === 0, X.fits.join('; '))
    await page.click('#c25hw [data-w="mlb"]'); await page.waitForTimeout(800)
    // OFF THE MENU: the filter keeps only home runs off pitches outside the zone, and the pitch panel names where
    await page.click('#c25ch [data-f="menu"]'); await page.waitForTimeout(1200)
    const om = await page.evaluate(() => ({ n: document.querySelector('#c25ch').textContent.match(/OF (\d+)/)?.[1], tag: document.querySelector('#c25pl .om')?.textContent ?? '' }))
    check('OFF THE MENU filter and tag', Number(om.n) > 30 && /OFF THE MENU: (GOLF SHOT|TOMAHAWK|CHASE SCENE|INSIDE JOB)/.test(om.tag) && /\d+\.\d IN/.test(om.tag), JSON.stringify(om))
    X = await layout(page); check('OFF THE MENU ball fits', X.fits.length === 0 && X.overlaps.length === 0, X.fits.concat(X.overlaps).join('; '))
    // TWEAK THE TATER: into the dojo with the ball's own numbers, and back to the same ball
    const before = await page.evaluate(() => ({ ev: window.__cp?.state?.ev ?? null, ch: document.querySelector('#c25ch').textContent.match(/BALL (\d+)/)?.[1] }))
    const ev0 = await page.evaluate(() => Number(document.querySelector('#c25sv').textContent.match(/BALL (\d+) MPH/)?.[1]))
    await page.click('#c25tw'); await page.waitForTimeout(2600) // (4 Nov: the panels fit themselves to the dojo's numbers after the first draw; a loaded machine takes a couple of seconds)
    const tw = await page.evaluate(() => ({ mode: window.__mix25.mode(), strip: getComputedStyle(document.querySelector('.c25>.strip')).display, ch: document.querySelector('#c25ch').textContent, title: document.querySelector('#c25ti').textContent, ball: Number(document.querySelector('#c25sv').textContent.match(/BALL (\d+) MPH/)?.[1]), rd: Number(document.querySelector('#c25d').dataset.v) }))
    check('TWEAK THE TATER carries the home run into the dojo, flying the real distance until you change something', tw.mode === 'whatif' && tw.strip !== 'none' && /REAL BALL/.test(tw.ch) && /RESET TO THE REAL BALL/.test(tw.ch) && /TWEAK THE TATER/.test(tw.title) && Math.abs(tw.ball - ev0) <= 1 && Number(tw.ch.match(/: (\d+) FT/)?.[1]) === tw.rd, JSON.stringify(tw).slice(0, 260))
    X = await layout(page); check('the dojo with the strip fits', X.overlaps.concat(X.fits, X.titles).length === 0, X.overlaps.concat(X.fits, X.titles).join('; '))
    // TWEAK THE TATER has sliders: five of them (not BATTER), and dragging one moves the swing
    const sld = await page.evaluate(() => { const ss = [...document.querySelectorAll('.c25 .strip .sld')], s0 = window.__cp.state.ev; const sl = ss[0]; sl.value = '900'; sl.dispatchEvent(new Event('input', { bubbles: true })); return { n: ss.length, before: s0, after: window.__cp.state.ev, visible: ss.every((x) => x.getBoundingClientRect().width > 40) } })
    check('TWEAK THE TATER has a slider on each number, and dragging one changes the swing', sld.n === 5 && sld.visible && sld.after !== sld.before, JSON.stringify(sld))
    await page.hover('.c25 .strip .bt[data-i="1"]'); await page.waitForTimeout(300)
    check('no hover tilt on buttons or panels', await page.evaluate(() => !/rotate|matrix3d/.test(getComputedStyle(document.querySelector('.c25 .strip .bt[data-i="1"]')).transform)))
    await page.click('#c25back'); await page.waitForTimeout(1200)
    const bk = await page.evaluate(() => ({ mode: window.__mix25.mode(), ch: document.querySelector('#c25ch').textContent.match(/BALL (\d+)/)?.[1] }))
    check('BACK TO THE REPLAY returns to the same ball', bk.mode === 'replay' && bk.ch === before.ch, JSON.stringify({ bk, before }))
    await page.click('#c25ch [data-f="giants"]'); await page.waitForTimeout(900)
    // THE SITUATION and BIG ONES: the game state line, a stamp on the big home runs
    const si = await page.evaluate(() => document.querySelector('#c25bug').textContent.replace(/\s+/g, ' '))
    check('a real ball shows its situation in the score bug', /[▲▼]\d+/.test(si) && /\d-\d/.test(si) && /WPA/.test(si), si)
    await page.click('#c25ch [data-f="big"]'); await page.waitForTimeout(1200)
    const bo = await page.evaluate(() => ({ n: Number(document.querySelector('#c25ch').textContent.match(/OF (\d+)/)?.[1]), st: document.querySelector('#c25v .st').textContent }))
    check('BIG ONES keeps the grand slams, walk-offs and late go-ahead home runs, stamped', bo.n > 20 && /WALK-OFF|GRAND SLAM|GO-AHEAD/.test(bo.st), JSON.stringify(bo))
    X = await layout(page); check('a stamped ball fits', X.overlaps.concat(X.fits).length === 0, X.overlaps.concat(X.fits).join('; '))
    await page.click('#c25ch [data-f="giants"]'); await page.waitForTimeout(900)
    // ODDS RECEIPT, STAR MAP, KARL and the SHOT CALLER button are gone from DEJA-VU's header (29 Oct, evening); Shot Caller is a mode of its own
    const gone = await page.evaluate(() => ['#c25rc', '#c25sm', '#c25kl', '#c25sc'].map((q) => getComputedStyle(document.querySelector(q)).display))
    check('ODDS RECEIPT, STAR MAP, KARL and the SHOT CALLER button are off the header', gone.every((d) => d === 'none'), JSON.stringify(gone))
    // the type picker
    await page.keyboard.press('t'); await page.waitForTimeout(800)
    const ty = await page.evaluate(() => document.querySelectorAll('#c25mb .ty').length)
    await page.click('#c25mb .ty[data-c="6"]'); await page.waitForTimeout(600)
    const tyc = await page.evaluate(() => window.__mix25.code())
    check('the type picker shows the six kept sets and applies a click', ty === 6 && /T6 /.test(tyc), `${ty} ${tyc}`)
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    // the cut sets fall back to the default; a hidden set still loads from an old code
    await page.evaluate(() => window.__mix25.set('L1P5A3T10')); await page.waitForTimeout(300)
    const t10 = await page.evaluate(() => window.__mix25.code())
    await page.evaluate(() => window.__mix25.set('L1P5A3T7')); await page.waitForTimeout(300)
    const t7 = await page.evaluate(() => window.__mix25.code())
    check('a cut type code (T10) falls back to the default T16, a hidden one (T7) still loads', /T16 /.test(t10) && /T7 /.test(t7), `${t10} | ${t7}`)
    await page.keyboard.press('t'); await page.waitForTimeout(300)
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    await page.evaluate(() => window.__mix25.set('L1P5A3T1')); await page.waitForTimeout(600)
    // 30 Oct: RIDE IT is gone; ? opens the dock with every choice (the locked ones marked), and Esc closes it
    await page.keyboard.press('?'); await page.waitForTimeout(500)
    const dk = await page.evaluate(() => ({ open: document.querySelector('.c25').classList.contains('dk'), chips: document.querySelectorAll('#c25dk .dx [data-ax]').length, ride: !!document.querySelector('#c25ri') }))
    check('? opens the side menu with what is still open (2 Nov, night: SLINGSHOT, LANDING PARTY MARKS, LANDING IMPACT, THE COVE, SHOT CALLER: THE WAYS IN); no RIDE IT', dk.open && dk.chips === 4 && !dk.ride /* (4 Nov, evening: BLAST RADIUS's COLORS, PILLAR HEIGHT, PILLAR PAINT and CAMERA open) */, JSON.stringify(dk))
    await page.focus('#c25dk'); await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    // the existing features still work in the shared panel
    await page.keyboard.press('l'); await page.waitForTimeout(2500)
    const lpx = await page.evaluate(() => ({ t: document.querySelector('#c25hi>.t').textContent.replace(/\s+/g, ''), rows: document.querySelectorAll('#c25hb .lpr').length }))
    check('LANDING PARTY still lists real Oracle home runs', /LANDINGPARTY/.test(lpx.t) && lpx.rows === 8, JSON.stringify(lpx))
    await page.keyboard.press('l'); await page.waitForTimeout(500)
    // effects: the hit-stop is set; a dojo swing throws the contact spark; a home run shoots fireworks; a splash hit gets its banner and the kayaks; Karl's fog
    check('the hit-stop holds the ball 110 ms', await page.evaluate(() => window.__cpHold === 110))
    await setMode(page, 'whatif')
    await page.evaluate(() => { const s = window.__cp.state; Object.assign(s, { ev: 112, la: 28, dir: -4, hand: 1, temp: 70 }); window.__cp.update() }); await page.waitForTimeout(600)
    // the spark lives a third of a second, two frames under the software renderer, so it is counted the moment it is thrown, not polled for (29 Oct; the trail behind the
    // ball is the voxel arc now, flight25.js)
    const ft0 = await page.evaluate(() => { const f = window.__mix25.fx, o = f.contact; window.__spark = null; f.contact = (ev) => { const n0 = f.count(); o(ev); window.__spark = [n0, f.count()] }; return f.count() })
    await page.keyboard.press('Enter')
    let ft1 = null
    for (let k = 0; k < 20 && !ft1; k++) { await page.waitForTimeout(150); ft1 = await page.evaluate(() => window.__spark) }
    check('a swing throws the contact spark (16 squares at the plate)', ft1 && ft1[1] - ft1[0] >= 16, JSON.stringify({ ft0, ft1 }))
    for (let k = 0; k < 60 && (await page.evaluate(() => !!window.__cp.anim())); k++) await page.waitForTimeout(400)
    await page.waitForTimeout(4000)
    check('the kayaks are waiting in McCovey Cove', (await page.evaluate(() => window.__mix25.fx.kayaks())) === 6)
    await page.evaluate(() => { const s = window.__cp.state; Object.assign(s, { ev: 116, la: 28, dir: 24, hand: -1, temp: 70 }); window.__cp.update() }); await page.waitForTimeout(600)
    const key0 = await page.evaluate(() => window.__dojo?.key)
    if (process.env.DBG) await page.evaluate(() => { for (const k of ['update', 'setPreview']) { const u = window.__cp[k]; window.__cp[k] = function (...a) { (window.__updLog ??= []).push(k + ' ' + new Error().stack.split(String.fromCharCode(10)).slice(2, 6).map((x) => x.trim().replace(/https?:\/\/[^/]+/, '')).join(' < ')); return u.apply(this, a) } } })
    await page.keyboard.press('Enter')
    if (process.env.DBG) { await page.waitForTimeout(1500); console.log('DBG updates', JSON.stringify(await page.evaluate(() => window.__updLog ?? []), null, 1).slice(0, 3000)) }
    let sp = null // watch for the banner: the flight is 2.7 s of wall clock, but a frame can stall for a second or more on a loaded machine
    for (let k = 0; k < 30; k++) { await page.waitForTimeout(300); sp = await page.evaluate(() => ({ bn: document.querySelector('#c25bn').textContent, on: document.querySelector('#c25bn').classList.contains('go') })); if (/SPLASH HIT/.test(sp.bn)) break; if (process.env.DBG) console.log('DBG', k, JSON.stringify(await page.evaluate(() => ({ a: window.__cp.anim() ? { ex: window.__cp.anim().exploded, t0: Math.round(window.__cp.anim().t0 - performance.now()), dur: window.__cp.anim().dur } : null, fires: window.__mix25.fires(), lands: window.__mix25.lands(), hold: window.__cpHold, slow: window.__cpSlow, ft: window.__fixedTime, look: window.__mix25.look(), mode: window.__mix25.mode(), active: document.activeElement?.id || document.activeElement?.tagName })))) }
    check('a splash hit puts up no banner words (2 Nov, later: no set dressing on a landing)', key0 !== 'SPLASH' || !/SPLASH HIT/.test(sp.bn) || !sp.on, JSON.stringify({ key0, sp }))
    if (key0 !== 'SPLASH') console.log('NOTE the splash preset did not land in the Cove here:', key0)
    let win = false
    for (let k = 0; k < 50 && !win; k++) { await page.waitForTimeout(500); win = await page.evaluate(() => !!window.__mix25.fx.winner() || !!window.__mix25.fx.actNow()) } // (1 Nov, later: a splash sets off one of the Cove's five acts, fx25.js)
    check('the Cove\'s kayakers go after the splash (one of the five acts)', key0 !== 'SPLASH' || win)
    await page.evaluate(() => window.__mix25.karl(true)); await page.waitForTimeout(1500) // Karl comes in with the forecast; the test brings him in by hand
    for (let k = 0; k < 20 && !(await page.evaluate(() => window.__mix25.fx.karlBanks().some((x) => x.op > 0))); k++) await page.waitForTimeout(300) // it fades in on the effects clock: slow frames under the software renderer
    const kl = await page.evaluate(() => ({ on: window.__mix25.fx.karlOn(), lv: window.__mix25.fx.karlLevel(), b: document.querySelector('#c25kl').textContent, banks: window.__mix25.fx.karlBanks() }))
    const kd = Math.min(...kl.banks.map((x) => x.d)), kh = Math.max(...kl.banks.map((x) => x.h)), ko = Math.max(...kl.banks.map((x) => x.op))
    check('Karl comes in, K1 WHISPER by default', kl.on && kl.lv === 1, JSON.stringify({ on: kl.on, lv: kl.lv }))
    check('K1 fog stays faint, low, and at least 120 m out (clear of the infield and the climb)', kd >= 120 && kh <= 13 && ko <= 0.081 && ko > 0, JSON.stringify({ kd, kh, ko }))
    await page.waitForTimeout(4000)
    const kd2 = Math.min(...(await page.evaluate(() => window.__mix25.fx.karlBanks())).map((x) => x.d))
    check('the fog banks drift round their ring and never come nearer the plate', kd2 >= 120, String(kd2))
    await page.evaluate(() => window.__mix25.set('L1P5A3T1K3'))
    let k3 = false // the fog fades in on frame time, which runs slowly under the software renderer
    for (let k = 0; k < 30 && !k3; k++) { await page.waitForTimeout(500); k3 = await page.evaluate(() => window.__mix25.fx.karlLevel() === 3 && Math.max(...window.__mix25.fx.karlBanks().map((x) => x.op)) > 0.2) }
    check('K3 PEA SOUP brings back the 27 Oct fog', k3)
    await page.evaluate(() => window.__mix25.set('L1P5A3T1K1'))
    await page.evaluate(() => window.__mix25.karl(false)); await page.waitForTimeout(300)
    X = await layout(page); check('after the effects the dojo still fits', X.overlaps.concat(X.fits).length === 0, X.overlaps.concat(X.fits).join('; '))
    // the scoreboard reports the last landing, and the gulls scattered on the home run
    const sb = await page.evaluate(() => ({ t: window.__mix25.life.text(), g: window.__mix25.life.gulls() }))
    check('the scoreboard shows the result and the gulls are out', /FT|SPLASH|HOME RUN/.test(sb.t) && sb.g === 10, JSON.stringify(sb))
    // the landing styles: confetti, and the quiet style hides the gulls
    await page.evaluate(() => window.__mix25.set('L1P5A3T1F2')); await page.waitForTimeout(500)
    await page.evaluate(() => { const s = window.__cp.state; Object.assign(s, { ev: 112, la: 28, dir: -4, hand: 1, temp: 70 }); window.__cp.update() }); await page.waitForTimeout(600)
    await page.keyboard.press('Enter')
    let cf = 0
    for (let k = 0; k < 40 && cf <= 120; k++) { await page.waitForTimeout(400); cf = Math.max(cf, await page.evaluate(() => window.__mix25.fx.count())) }
    check('F2 CONFETTI rains on a home run', cf > 120, String(cf))
    await page.evaluate(() => window.__mix25.set('L1P5A3T1F4')); await page.waitForTimeout(400)
    check('F4 CRT is gone (the code falls back to F1)', await page.evaluate(() => /F1 /.test(window.__mix25.code()) && !document.querySelector('.c25').classList.contains('F4')))
    await page.evaluate(() => window.__mix25.set('L1P5A3T1F3')); await page.waitForTimeout(400)
    check('F3 QUIET hides the gulls but keeps the scoreboard', await page.evaluate(() => (window.__mix25.life.board.visible || window.__mix25.life.vboard.visible) && window.__cp.NN.scene.children.filter((c) => c.isLineSegments && c.geometry.attributes.position.count === 4).every((g) => !g.visible)))
    await page.evaluate(() => window.__mix25.set('L1P5A3T1F1')); await page.waitForTimeout(400)
    await setMode(page, 'replay')
    // STATS and PRINT IT are gone; STATS BEFORE THIS SHOT opens his season up to this swing in three groups
    const btns = await page.evaluate(() => ({ old: !!document.querySelector('#c25pr') || /^STATS$/.test(document.querySelector('#c25bs')?.textContent ?? ''), label: document.querySelector('#c25bs')?.textContent }))
    await page.click('#c25bs')
    for (let k = 0; k < 20 && !(await page.evaluate(() => document.querySelectorAll('#c25mb .bfa > div').length)); k++) await page.waitForTimeout(300)
    const bf = await page.evaluate(() => ({ title: document.querySelector('#c25mt').textContent, groups: [...document.querySelectorAll('#c25mb .bfa h5')].map((h) => h.textContent), rows: document.querySelectorAll('#c25mb .bfa .r').length, avg: [...document.querySelectorAll('#c25mb .bfa .r')].find((r) => r.firstChild.textContent === 'AVG')?.lastChild.textContent, head: document.querySelector('#c25mb .bfh')?.textContent }))
    check('STATS BEFORE THIS SHOT: no STATS or PRINT IT; his season up to the swing in three named groups, the card, the Statcast and the deep cuts', !btns.old && /BEFORE THIS SHOT/.test(btns.label) && bf.groups.join('|') === 'BOX SCORE|FRONT OFFICE|NO LIFE' && bf.rows > 50 && /^\.\d{3}$|^--$/.test(bf.avg ?? '') && /RIGHT BEFORE THIS SWING/.test(bf.head), JSON.stringify({ btns, bf }))
    const ev = await page.evaluate(() => [...document.querySelectorAll('#c25mb .bfa .r')].filter((r) => /EXIT VELO|^AVG$|LUCK/.test(r.firstChild.textContent)).map((r) => [r.firstChild.textContent, r.lastChild.textContent]))
    check('the numbers read right: AVG as .274, exit velocity in mph, the luck gap signed', ev.some(([k, v]) => k === 'AVG' && /^\.\d{3}$|^--$/.test(v)) && ev.filter(([k]) => /EXIT VELO/.test(k)).every(([, v]) => /^\d+\.\d MPH$|^--$/.test(v)) && ev.some(([k, v]) => /LUCK/.test(k) && /^[+-]?\.\d{3}$|^--$/.test(v)), JSON.stringify(ev))
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    // PLAY IT in the replay: the pitch flies into the zone, then the flight
    const c0 = await page.evaluate(() => window.__mix25.fx.count())
    await page.click('#c25nk')
    let anim = false, fired = false
    void c0
    for (let k = 0; k < 120 && !(anim && fired); k++) { await page.waitForTimeout(150); const r = await page.evaluate(() => ({ a: document.querySelector('#c25zg').classList.contains('anim'), f: /TRACKING/.test(window.__mix25.life.text()) || !!window.__cp.anim() })); anim ||= r.a; fired ||= r.f }
    check('PLAY IT throws the pitch into the zone, then plays the flight', anim && fired, JSON.stringify({ anim, fired }))
    // the menu title options
    await page.evaluate(() => window.__mix25.set('L1P5A3T1F1M2')); await page.waitForTimeout(300)
    const m2 = await page.evaluate(() => !!document.querySelector('.c25 .sm .lg2 svg'))
    await page.evaluate(() => window.__mix25.set('L1P5A3T1F1M3')); await page.waitForTimeout(300)
    const m3 = await page.evaluate(() => !!document.querySelector('.c25 .sm .lg3'))
    check('M2 ARC and M3 MARQUEE titles build', m2 && m3, JSON.stringify({ m2, m3 }))
    await page.evaluate(() => window.__mix25.set('L1P5A3T1F1M1'))
    // THE FUN LINE (29 Oct, evening): one distance simile and one speed simile, both shown, nothing turning over; no "about", no 1/N
    await page.evaluate(() => window.__mix25.ball((b) => b.hr && b.park === 'SF' && b.ft > 400)); await page.waitForTimeout(1500)
    const fl = await page.evaluate(() => ({ list: window.__mix25.fun(), shown: [...document.querySelectorAll('#c25rd .fun span')].map((x) => x.textContent) }))
    await page.waitForTimeout(7500)
    const fl2 = await page.evaluate(() => [...document.querySelectorAll('#c25rd .fun span')].map((x) => x.textContent))
    check('the fun line: one line for the distance and one for the speed, both under the distance, and they stay put', fl.list.length === 2 && /^\d+ FT: /.test(fl.list[0]) && /MPH OFF THE BAT/.test(fl.list[1]) && fl.shown.join() === fl.list.join() && fl2.join() === fl.shown.join() && !/\bABOUT\b|: 1\//.test(fl.list.join()), JSON.stringify({ fl, fl2 }).slice(0, 400))
    check('clicking the fun line turns it over', await page.evaluate((a) => document.querySelector('#c25rd .fun').textContent !== a, fl.shown))
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  }
  await page.close()
}
// the pitch arrow (R), the score bug (S) and the WPA numbers, checked against replay.json by hand-picked balls; instant replay is gone
if (!process.env.PHONE_ONLY && on('B')) {
  const fs = await import('fs')
  const RJ = JSON.parse(fs.readFileSync(new URL('../public/replay.json', import.meta.url), 'utf8')).balls
  const wpa = (b) => (b.tb === 'Top' ? -b.dwe : b.dwe)
  const page = await open(1440, 820, '&menu=0&mix=L2P5A2T1R1')
  check('instant replay is gone (no REPLAY button)', await page.evaluate(() => !document.querySelector('#c25ir')))
  // R1 on a right-handed sinker: the arrow runs from arm side into the ball and its head stops at the ball's edge (the arrow is the movement a batter feels: against an average four-seamer)
  await page.evaluate(() => window.__mix25.ball((b) => b.hr && b.t === 'R' && b.pt === 'SI' && b.hx < -12)); await page.waitForTimeout(900)
  const ar = await page.evaluate(() => {
    const g = document.querySelector('#c25zg .pa'), ball = document.querySelector('#c25zg .pb'), svg = document.querySelector('#c25zg svg')
    if (!g || !ball) return null
    const ln = g.querySelector('line'), bb = ball.getBBox(), bx = bb.x + bb.width / 2, by = bb.y + bb.height / 2, rr = (bb.width - 2) / 2
    const vb = svg.getAttribute('viewBox').split(' ').map(Number)
    const xs = [...g.querySelectorAll('line')].flatMap((l) => [+l.getAttribute('x1'), +l.getAttribute('x2')]), ys = [...g.querySelectorAll('line')].flatMap((l) => [+l.getAttribute('y1'), +l.getAttribute('y2')])
    // a right-handed sinker moves toward the catcher's left (pfx_x negative), so a spinless pitch would have crossed to the right of the ball: the tail sits there
    return { r: g.dataset.r, dx: +g.dataset.dx, headGap: Math.hypot(+ln.getAttribute('x2') - bx, +ln.getAttribute('y2') - by) - rr, tailRightOfBall: +ln.getAttribute('x1') > bx, inBox: Math.min(...xs) >= 0 && Math.max(...xs) <= vb[2] && Math.min(...ys) >= 0 && Math.max(...ys) <= vb[3] }
  })
  check('R1: a right-handed sinker breaks arm side (catcher\'s left), the arrow comes in from the right and stops at the ball', ar && ar.r === '1' && ar.dx < 0 && ar.tailRightOfBall && Math.abs(ar.headGap - 2) <= 1 && ar.inBox, JSON.stringify(ar))
  for (const R of [2, 3, 0]) {
    await page.evaluate((c) => window.__mix25.set(c), `L2P5A2T1R${R}`); await page.waitForTimeout(500)
    const n = await page.evaluate(() => document.querySelectorAll('#c25zg .pa').length)
    check(`R${R} ${R ? 'draws its arrow' : 'draws no arrow'}`, R ? n === 1 : n === 0, String(n))
  }
  await page.keyboard.press('r'); await page.waitForTimeout(400)
  check('the R key brings the arrow back', await page.evaluate(() => document.querySelectorAll('#c25zg .pa').length === 1 && /R3/.test(window.__mix25.code())))
  await page.evaluate(() => window.__mix25.set('L2P5A2T1R1S1')); await page.waitForTimeout(400)
  // five balls checked by hand against replay.json: the bug's before and after win chance and WPA
  const picks = [
    ['a walk-off', (b) => b.hr && b.tb === 'Bot' && b.in >= 9 && b.bwe + b.dwe > 0.999],
    ['a road grand slam', (b) => b.hr && b.tb === 'Top' && b.r1 && b.r2 && b.r3],
    ['a garbage-time home run', (b) => b.hr && Math.abs(wpa(b)) < 0.01 && Math.abs(b.bsc - b.fsc) >= 6],
    ['a go-ahead home run', (b) => b.hr && b.bsc <= b.fsc && b.bsc + 1 + (b.r1 ? 1 : 0) + (b.r2 ? 1 : 0) + (b.r3 ? 1 : 0) > b.fsc && b.in < 9],
    ['a game-tying home run', (b) => b.hr && b.bsc < b.fsc && b.bsc + 1 + (b.r1 ? 1 : 0) + (b.r2 ? 1 : 0) + (b.r3 ? 1 : 0) === b.fsc],
  ]
  for (const [lab, pred] of picks) {
    const want = RJ.find(pred)
    if (!want) { check(`WPA: ${lab} exists in the replay set`, false); continue }
    await page.evaluate((s) => window.__mix25.ball(new Function('b', 'return ' + s)), `b.d === '${want.d}' && b.b === ${want.b} && b.pn === ${want.pn} && b.in === ${want.in}`); await page.waitForTimeout(700)
    const t = await page.evaluate(() => document.querySelector('#c25bug').textContent.replace(/\s+/g, ' '))
    const w0 = Math.round(want.bwe * 100), w1 = Math.round(Math.max(0, Math.min(1, want.bwe + wpa(want))) * 100), w = Math.round(wpa(want) * 100)
    const ok = t.includes(`WIN CHANCE ${w0}% → ${w1}%`) && t.includes(`${w >= 0 ? '+' : '-'}${Math.abs(w)}% WPA`)
    check(`WPA: ${lab} (${want.d}) reads ${w0}% → ${w1}%, ${w >= 0 ? '+' : ''}${w}%`, ok, t)
  }
  // the bug sits clear of the flight: every point of the projected path stays outside it
  const clear = await page.evaluate(() => {
    const cp = window.__cp, res = window.__dojo, path = res?.visPath ?? res?.path, cam = cp.NN.camera, c = cp.NN.renderer?.domElement ?? document.querySelector('canvas')
    if (!path) return { err: 'no path' }
    const cr = c.getBoundingClientRect(), bug = document.querySelector('#c25bug').getBoundingClientRect()
    let hits = 0
    for (const p of path) { const v = cp.toWorld(p.p).project(cam), x = cr.left + ((v.x + 1) / 2) * cr.width, y = cr.top + ((1 - v.y) / 2) * cr.height; if (x > bug.left && x < bug.right && y > bug.top && y < bug.bottom) hits++ }
    return { hits, n: path.length, bug: [bug.left, bug.top, bug.width, bug.height].map(Math.round) }
  })
  check('the score bug never covers the flight', clear.hits === 0 && clear.n > 10, JSON.stringify(clear))
  let X = await layout(page); check('L2 with the score bug fits', X.overlaps.concat(X.fits, X.titles).length === 0, X.overlaps.concat(X.fits, X.titles).join('; '))
  await page.evaluate(() => window.__mix25.set('L2P5A2T1R1S2')); await page.waitForTimeout(500)
  const s2 = await page.evaluate(() => ({ sit: document.querySelector('#c25rd .sit').textContent, bug: getComputedStyle(document.querySelector('#c25bug')).display }))
  check('S2 READOUT LINE puts the situation and WPA under the distance', /WPA/.test(s2.sit) && s2.bug === 'none', JSON.stringify(s2))
  await page.evaluate(() => window.__mix25.set('L2P5A2T1R1S3')); await page.waitForTimeout(800)
  const s3 = await page.evaluate(() => ({ t: document.querySelector('#c25bugc').textContent, d: getComputedStyle(document.querySelector('#c25bugc')).display, park: getComputedStyle(document.querySelector('#c25bug')).display }))
  check('S3 BATTER CARD puts the bug under the face', /WPA/.test(s3.t) && s3.d === 'grid' && s3.park === 'none', JSON.stringify(s3).slice(0, 160))
  X = await layout(page); check('S3 fits', X.overlaps.concat(X.fits, X.titles).length === 0, X.overlaps.concat(X.fits, X.titles).join('; '))
  // the faces: the five canvas styles each draw and fit; the braille one still renders as text (on a batter with a photo: one without gets the D stand-in)
  await page.evaluate(() => window.__mix25.ball((b) => b.hr && window.__mix25.hasFace(b.b))); await page.waitForTimeout(600)
  for (const A of [2, 4, 5, 6, 7, 3]) {
    await page.evaluate((c) => window.__mix25.set(c), 'L2P5A' + A + 'T1R1S1'); await page.waitForTimeout(900)
    const f = await page.evaluate(() => { const cv = document.querySelector('#c25f canvas'), pre = document.querySelector('#c25f pre'), box = document.querySelector('#c25f').getBoundingClientRect(); const on = cv && cv.style.display !== 'none'; let ink = 0; if (on) { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; for (let i = 3; i < d.length; i += 4) if (d[i] > 40) ink++ } const r = on ? cv.getBoundingClientRect() : pre.getBoundingClientRect(); return { on, ink: on ? ink / (cv.width * cv.height) : null, text: !on && pre.textContent.length, fit: r.width <= box.width + 2 && r.height <= box.height + 2 } })
    check('A' + A + (A === 3 ? ' WOODCUT renders as braille text' : ' draws the face on a canvas that fits its box'), f.fit && (A === 3 ? !f.on && f.text > 200 : f.on && f.ink > 0.05 && f.ink < 0.9), JSON.stringify(f))
  }
  // the panel icons: a pitcher, a batter, bars; I0 brings the words back
  for (const I of [1, 2, 3, 0]) {
    await page.evaluate((c) => window.__mix25.set(c), 'L2P5A2T1R1S1I' + I); await page.waitForTimeout(500)
    const ic = await page.evaluate(() => ['pitch', 'slice', 'hists'].map((k) => { const t = document.querySelector('.c25>.' + k + '>.t'); return { svg: !!t.querySelector('svg.ico'), label: t.querySelector('svg')?.getAttribute('aria-label') ?? t.textContent.replace(/\s+/g, ''), rects: t.querySelectorAll('rect').length } }))
    check('I' + I + (I ? ' puts pixel icons on the three titles' : ' brings back the words'), I ? ic.every((x) => x.svg && x.rects >= 12) && ic[0].label === 'THE PITCH' : ic.every((x) => !x.svg) && /THEPITCH/.test(ic[0].label), JSON.stringify(ic))
    const X = await layout(page); check('I' + I + ' titles sit on top and fit', X.titles.length === 0 && X.overlaps.length === 0, X.titles.concat(X.overlaps).join('; '))
  }
  await page.evaluate(() => window.__mix25.set('L2P5A2T1R1S1I1')); await page.waitForTimeout(400)
  // PITCH ARC: PLAY IT draws the pitch on the park (the camera never moves, 28 Oct), in the pitch color, then the hit flies; the arc stays up for the flight
  {
    await page.evaluate(() => window.__mix25.set('L2P5A2T16I2R1S1Z1')); await page.waitForTimeout(400)
    await page.evaluate(() => window.__mix25.ball((b) => b.hr && b.pt === 'ST' && b.hx > 12)); await page.waitForTimeout(800)
    const c0 = await page.evaluate(() => window.__cp.NN.camera.position.toArray())
    await page.click('#c25nk')
    let drew = false, moved = 0
    for (let k = 0; k < 60 && !drew; k++) { await page.waitForTimeout(150); const r = await page.evaluate(() => { const c = window.__cp.NN.camera.position.toArray(); return { busy: window.__mix25.pitchCam().busy(), n: window.__mix25.pitchCam().shown(), c } }); moved = Math.max(moved, Math.hypot(r.c[0] - c0[0], r.c[1] - c0[1], r.c[2] - c0[2])); if (r.busy && r.n > 0) drew = true }
    let flew = false
    for (let k = 0; k < 60 && !flew; k++) { await page.waitForTimeout(200); flew = await page.evaluate(() => !!window.__cp.anim()) }
    const dots = await page.evaluate(() => window.__mix25.pitchCam().lastDots()), up = await page.evaluate(() => window.__mix25.pitchCam().shown()), gap = await page.evaluate(() => window.__mix25.pitchCam().gap())
    check('PITCH ARC: the pitch is drawn on the park in full as one unbroken trail (no gap wider than its 0.22 m cubes), the camera stays put, then the hit flies with the arc still up', dots > 90 && gap < 0.22 && moved < 0.5 && flew && up >= dots, JSON.stringify({ drew, dots, gap, moved, flew, up }))
    for (let k = 0; k < 60 && (await page.evaluate(() => !!window.__cp.anim() && !window.__cp.anim().exploded)); k++) await page.waitForTimeout(300)
    // the engine's ball is drawn at 0.42 of its old size
    check('the ball in flight is drawn smaller (0.42 of the engine size)', await page.evaluate(() => Math.abs(window.__cp.ballMesh().scale.x - 0.42) < 1e-6))
  }
  // red-team fixes (28 Oct): a double PLAY IT fires once; a new ball during the pitch fires nothing; sound off stops the jukebox
  {
    await page.evaluate(() => window.__mix25.ball((b) => b.hr && b.pt === 'SI')); await page.waitForTimeout(800)
    const f0 = await page.evaluate(() => window.__mix25.fires())
    await page.evaluate(() => { const b = document.querySelector('#c25nk'); b.click(); b.click(); b.click() }) // three presses inside one task: the guard, not the click latency, is what is tested
    for (let k = 0; k < 60 && (await page.evaluate((n) => window.__mix25.fires() === n, f0)); k++) await page.waitForTimeout(200)
    await page.waitForTimeout(3500)
    const f1 = await page.evaluate(() => window.__mix25.fires())
    check('pressing PLAY IT three times fires the ball once', f1 - f0 === 1, JSON.stringify({ f0, f1 }))
    for (let k = 0; k < 60 && (await page.evaluate(() => !!window.__cp.anim() && !window.__cp.anim().exploded)); k++) await page.waitForTimeout(300)
    const f2 = await page.evaluate(() => window.__mix25.fires())
    await page.click('#c25nk'); await page.waitForTimeout(300); await page.keyboard.press(']'); await page.waitForTimeout(4000)
    const f3 = await page.evaluate(() => ({ f: window.__mix25.fires(), busy: window.__mix25.pitchCam().busy() }))
    check('a new ball during the pitch calls the pitch off (nothing fires)', f3.f === f2 && !f3.busy, JSON.stringify({ f2, f3 }))
    await page.evaluate(() => { localStorage.setItem('nn-snd', '1'); window.__mix25.jukebox.play('saints') }); await page.waitForTimeout(300)
    await page.keyboard.press('s'); await page.waitForTimeout(300)
    const off = await page.evaluate(() => ({ playing: window.__mix25.jukebox.playing(), on: localStorage.getItem('nn-snd') }))
    await page.keyboard.press('s'); await page.waitForTimeout(200)
    check('sound off (S) stops the jukebox', off.playing === null && off.on === '0', JSON.stringify(off))
  }
  // the arrow is the movement a batter feels (28 Oct, night): an average four-seamer shows next to nothing, a curveball a big drop; the pitch color is on the arrow and the side view
  {
    const felt = async () => page.evaluate(() => { const g = document.querySelector('#c25zg .pa'), pc = getComputedStyle(document.querySelector('.c25')).getPropertyValue('--pc').trim(), t = document.querySelector('#c25pl').textContent; return { dx: g ? +g.dataset.dx : 0, dy: g ? +g.dataset.dy : 0, col: g?.querySelector('line,rect')?.getAttribute('stroke') ?? g?.querySelector('rect')?.getAttribute('fill'), pc, side: [...document.querySelectorAll('#c25sv line')].some((l) => l.getAttribute('stroke') === 'var(--pc,var(--dim))'), drop: t.match(/DROP\s*(\d+) IN/)?.[1], brk: t.match(/BREAK\s*(\d+) IN/)?.[1] } })
    await page.evaluate(() => window.__mix25.set('L2P5A2T16I2R1S1Z1Y1')); await page.waitForTimeout(300)
    await page.evaluate(() => window.__mix25.ball((b) => b.hr && b.pt === 'FF' && b.t === 'R' && Math.abs(b.hx + 7.8) < 1.2 && Math.abs(b.hz - 16) < 1.2 && Math.abs(b.pv - 94.5) < 1.5)); await page.waitForTimeout(800)
    const ff = await felt()
    await page.evaluate(() => window.__mix25.ball((b) => b.hr && b.pt === 'CU' && b.hz < -8)); await page.waitForTimeout(800)
    const cu = await felt()
    check('the arrow is the movement a batter feels: a typical four-seamer barely moves, a curveball drops hard, in the pitch color matching the side view', Math.hypot(ff.dx, ff.dy) < 6 && Number(ff.drop ?? ff.brk ?? 0) <= 3 && cu.dy > 20 && Number(cu.drop) >= 15 && cu.col === 'var(--pc)' && cu.pc === '#6da7de' && cu.side, JSON.stringify({ ff, cu }))
    const ys = []
    for (let Y = 1; Y <= 10; Y++) { await page.evaluate((c) => window.__mix25.set(c), 'L2P5A2T16I2R1Z1Y' + Y); await page.waitForTimeout(200); ys.push(await page.evaluate(() => getComputedStyle(document.querySelector('.c25')).getPropertyValue('--pc').trim().toLowerCase())) }
    check('Y1 to Y10: ten different pitch colors, all real hex colors', new Set(ys).size === 10 && ys.every((c) => /^#[0-9a-f]{6}$/.test(c)) && ys[1] === '#3ee6a0', JSON.stringify(ys))
    await page.evaluate(() => window.__mix25.set('L2P5A2T16I2R1S1Z1Y1')); await page.waitForTimeout(300)
  }
  // after TWEAK THE TATER the dojo keeps the original game's bug; a fresh dojo swing has none
  await page.evaluate(() => window.__mix25.set('L2P5A2T1R1S1')); await page.waitForTimeout(400)
  await page.click('#c25tw')
  let tb = 'none' // (2 Nov, later: the bug comes back a beat after the tweak; on the software renderer that can be past a second, so wait for it)
  for (let k = 0; k < 25 && tb !== 'grid'; k++) { await page.waitForTimeout(200); tb = await page.evaluate(() => getComputedStyle(document.querySelector('#c25bug')).display) }
  await page.keyboard.press('m'); await page.waitForTimeout(600); await page.keyboard.press('m'); await page.waitForTimeout(900)
  const fb = await page.evaluate(() => ({ m: window.__mix25.mode(), d: getComputedStyle(document.querySelector('#c25bug')).display }))
  check('the dojo shows the original game after TWEAK THE TATER, and no bug for a fresh swing', tb === 'grid' && (fb.m !== 'whatif' || fb.d === 'none'), JSON.stringify({ tb, fb }))
  await page.close()
}
// the scoreboard library and the landing moments, from real flights
if (!process.env.PHONE_ONLY && on('C')) {
  const page = await open(1440, 820, '&menu=0&mix=L2P5A2T1F1Z1')
  const lb = await page.evaluate(() => {
    const L = window.__mix25.life, b = L.board, cam = window.__cp.NN.camera, c = document.querySelector('canvas').getBoundingClientRect(), g = b.geometry.parameters
    b.updateMatrixWorld()
    const P = (x, y) => { const v = new window.__cp.THREE.Vector3(x, y, 0).applyMatrix4(b.matrixWorld).project(cam); return [c.left + ((v.x + 1) / 2) * c.width, c.top + ((1 - v.y) / 2) * c.height] }
    const a = P(-g.width / 2, 0), z = P(g.width / 2, 0)
    return { size: L.size, ledPx: Math.hypot(z[0] - a[0], z[1] - a[1]) / L.size[0] }
  })
  // the board replaces Oracle's own screen (28 Oct, night remeasure by raycast: a flat face 149 m out, -8 to +9 degrees, 13 to 35 m up); 72 LEDs across its 44 m
  const bp = await page.evaluate(() => { const b = window.__mix25.life.board.position, h = window.__cp.toWorld([0, 0, 0]), dx = b.x - h.x, dz = b.z - h.z; return { r: Math.hypot(dx, dz), y: b.y - h.y, bear: (Math.atan2(dx, -dz) * 180) / Math.PI, w: window.__mix25.life.board.geometry.parameters.width, h: window.__mix25.life.board.geometry.parameters.height } })
  check('the LED board covers Oracle\'s own board, flush on its face between the light towers', Math.abs(bp.r - 148.4) < 0.3 && Math.abs(bp.y - 24) < 0.3 && Math.abs(bp.bear) < 0.1 && Math.abs(bp.w - 44.2) < 0.3 && bp.y - bp.h / 2 > 12.5 && bp.y + bp.h / 2 < 35.5, JSON.stringify(bp))
  // the sea: one plane out to the horizon at the water's level, the park an island in it; the kayaks float on it (voxel models), not under it
  const sw = await page.evaluate(() => { const W = window.__mix25.water(), lv = W.level(), s = W.sea, ks = window.__mix25.fx.kayakBoats(); return { size: s.geometry.parameters.width, y: s.position.y - lv, mode: W.mode(), boats: ks.length, models: ks.every((k) => k.model), afloat: ks.every((k) => Math.abs(k.y - lv) < 0.6), cost: W.cost() } })
  check('the sea runs 9 km out in every direction at the water level, with the kayaks afloat on it as voxel models', sw.size >= 9000 && Math.abs(sw.y) < 0.01 && sw.boats === 6 && sw.models && sw.afloat && sw.cost < 1, JSON.stringify(sw))
  check('the LED board is 72 x 22 inside its 36 rows, each LED at least 1.4 screen pixels at 1440 (L2)', lb.size[0] === 72 && lb.size[1] === 22 && lb.ledPx >= 1.4, JSON.stringify(lb))
  // the jukebox: in the menu, on the J key, and its songs play and stop; San Francisco is transcribed from the lead sheet with its chords (33 bars, two roots a bar)
  await page.keyboard.press('j'); await page.waitForTimeout(500)
  const jb = await page.evaluate(() => ({ open: document.querySelector('#c25m').classList.contains('open'), rows: document.querySelectorAll('#c25mb .jk').length, txt: document.querySelector('#c25mb').textContent }))
  await page.click('#c25mb [data-song="ballgame"]'); await page.waitForTimeout(400)
  const jp = await page.evaluate(() => window.__mix25.jukebox.playing())
  await page.click('#c25mb [data-song="ballgame"]'); await page.waitForTimeout(300)
  const js = await page.evaluate(() => window.__mix25.jukebox.playing())
  check('J opens the JUKEBOX with all ten songs (2 Nov, later: the anthem and Hava Nagila in, the Hat Dance out), and a song plays and stops', jb.open && jb.rows === 10 && /SAN FRANCISCO/.test(jb.txt) && jp === 'ballgame' && js === null, JSON.stringify({ open: jb.open, rows: jb.rows, jp, js }))
  await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  const ARGS = { odometer: { n: 12 }, cable: { ft: 457 }, flip: { word: 'GO-AHEAD', bat: 'SF', fld: 'LAD', b0: 3, b1: 5, f: 4 } }
  const pk = await page.evaluate((A) => { const L = window.__mix25.life; return L.names().map((n) => { const d = L.dur(n), r = [0.15, 0.5, 0.85].map((f) => L.peek(n, d * f, A[n] ?? {}).lit); return { n, r } }) }, ARGS)
  const dead = pk.filter((x) => x.r.some((v) => v < 12)).map((x) => x.n)
  check(`all ${pk.length} board animations draw something all the way through`, pk.length >= 18 && dead.length === 0, JSON.stringify(dead))
  await page.evaluate(() => window.__mix25.life.play('bagcheck')); let done = false
  for (let k = 0; k < 120 && !done; k++) { await page.waitForTimeout(500); done = await page.evaluate(() => window.__mix25.life.played().includes('bagcheck') && !window.__mix25.life.anim()) } // the board runs on frame time, slow under the software renderer
  const after = await page.evaluate(() => ({ lit: window.__mix25.life.litCount(), t: window.__mix25.life.text() }))
  check('an animation plays through and the board goes back to its text', done && after.lit > 20, JSON.stringify(after))
  // real flights: a seats home run, a splash, a scraper, a wall ball (found with the engine's own probe)
  const swing = async (st) => {
    if ((await page.evaluate(() => window.__mix25.mode())) !== 'whatif') { await page.keyboard.press('m'); await page.waitForTimeout(900) }
    await page.evaluate((s) => { Object.assign(window.__cp.state, s); window.__cp.update() }, st); await page.waitForTimeout(500)
    // nothing may still be in the air (a slow landing must not be read as this swing's), then swing and wait for one more landing
    const flying = () => page.evaluate(() => { const a = window.__cp.anim(); return !!a && !a.exploded })
    for (let k = 0; k < 200 && (await flying()); k++) await page.waitForTimeout(300)
    const l0 = await page.evaluate(() => window.__mix25.lands())
    await page.keyboard.press('Enter')
    for (let k = 0; k < 200 && (await page.evaluate((n) => window.__mix25.lands() === n, l0)); k++) await page.waitForTimeout(300)
    await page.waitForTimeout(400)
    return page.evaluate(() => ({ key: window.__dojo.key, land: window.__dojo.landing?.kind, moment: window.__mix25.lastMoment(), boxes: window.__mix25.moments.boxes() }))
  }
  await page.evaluate(() => { window.__mix25.moments.setBobble(0); window.__mix25.moments.setVariety(false) }) // the glove every time, for this check
  const s1 = await swing({ ev: 108, la: 27, dir: -18, hand: 1, temp: 70, wind: 0 })
  check('a home run into the seats: a voxel glove comes up where it lands, on screen', s1.moment === 'seats' && s1.boxes.length >= 1 && s1.boxes.every((b) => b.d < 2 && b.on && b.model), JSON.stringify(s1))
  await page.waitForTimeout(3500)
  const s2 = await swing({ ev: 116, la: 28, dir: 24, hand: -1, temp: 70, wind: 0 })
  // the new seat moments (29 Oct, later): a gull steals it, a dog catches it, a beer goes up
  const nm = await page.evaluate(async () => { const m = window.__mix25.moments, at = window.__cp.toWorld([-30, 110, 12]), out = {}; for (const k of ['gull', 'dog', 'beer']) { m.try(k, at); out[k] = m.shown() } /* (1 Nov, night: each clears the last, one landing show at a time) */ await new Promise((r) => setTimeout(r, 300)); out.log = m.log().slice(-3); return out })
  check('the new seat moments build: GULL GRAB, GOOD BOY, BEER SHOWER', nm.gull >= 1 && nm.dog >= 1 && nm.beer >= 1 && nm.log.join() === 'gull,dog,beer', JSON.stringify(nm))
  await page.waitForTimeout(3600)
  check('a splash hit: the Cove answers it (the kayakers when they are out, the sea lion when not)', s2.key !== 'SPLASH' || s2.moment === 'cove' || (s2.moment === 'seal' && s2.boxes.some((b) => b.on)), JSON.stringify(s2))
  // (2 Nov, night) THE COVE on THE SCUBA DIVER: the same splash sends the diver, and no sea lion
  if (s2.key === 'SPLASH') {
    await page.evaluate(() => window.__mix25.lab('CV', 2)); await page.waitForTimeout(3000)
    const d0 = await page.evaluate(() => window.__mix25.impact().count().diver)
    const s3 = await swing({ ev: 116, la: 28, dir: 24, hand: -1, temp: 70, wind: 0 })
    const d1 = await page.evaluate(() => window.__mix25.impact().count().diver)
    check('THE COVE: THE SCUBA DIVER comes up for a splash hit, and the sea lion stays down', s3.key !== 'SPLASH' || (d1 === d0 + 1 && s3.moment !== 'seal'), JSON.stringify({ d0, d1, moment: s3.moment }))
    await page.evaluate(() => window.__mix25.lab('CV', 1)); await page.waitForTimeout(3000)
  }
  // (30 Oct: the board plays Dodger gags and nothing else)
  const onlyGags = () => page.evaluate(() => { const L = window.__mix25.life, g = L.gags(); return [...L.played(), L.anim(), ...L.queued()].filter((n) => n && !g.includes(n)) })
  await page.waitForTimeout(3000)
  check('a splash hit plays no board show (the board is Dodger gags only)', (await onlyGags()).length === 0, JSON.stringify(await onlyGags()))
  const find = (key, la, dir) => page.evaluate(([key, la, dir]) => { for (let ev = 88; ev <= 112; ev += 0.25) { const r = window.__dojoProbe({ ev, la, dir, hand: 1, temp: 70, wind: 0, carry: 1, dws: 0 }); if (r.key === key) return ev } return null }, [key, la, dir])
  const evW = await find('WALL', 30, 0), evS = await find('SCRAPER', 30, 0)
  if (evW) { const s3 = await swing({ ev: evW, la: 30, dir: 0, hand: 1, temp: 70, wind: 0 }); check('a ball off the wall: dust and the ball dropping, at the wall', s3.moment === 'dust' && s3.boxes.some((b) => b.on), JSON.stringify(s3)) } else check('found a WALL swing to test', false)
  await page.waitForTimeout(3000)
  if (evS) {
    await swing({ ev: evS, la: 30, dir: 0, hand: 1, temp: 70, wind: 0 })
    await page.waitForTimeout(3000)
    check('a wall scraper plays no board show', (await onlyGags()).length === 0, JSON.stringify(await onlyGags()))
  } else check('found a SCRAPER swing to test', false)
  // a Giants home run against the Dodgers in the replay plays a gag
  const vsLA = await page.evaluate(() => window.__mix25.ball((b) => b.hr && b.park === 'SF' && (b.tb === 'Top' ? b.at === 'SF' && b.ht === 'LAD' : b.ht === 'SF' && b.at === 'LAD'))); await page.waitForTimeout(800)
  if (vsLA >= 0) {
    await page.click('#c25nk')
    let gq = []
    for (let k = 0; k < 60 && !gq.some((n) => n); k++) { await page.waitForTimeout(500); gq = await page.evaluate(() => { const L = window.__mix25.life, g = L.gags(); return [L.anim(), ...L.queued()].filter((n) => n && g.includes(n)) }) }
    check('a Giants home run against the Dodgers plays a Dodger gag on the board', gq.length > 0 && (await onlyGags()).length === 0, JSON.stringify({ gq, other: await onlyGags() }))
  }
  // TWEAK THE TATER no longer plays anything on the board
  await page.click('#c25tw'); await page.waitForTimeout(600)
  check('TWEAK THE TATER plays no board show', (await onlyGags()).length === 0, JSON.stringify(await onlyGags()))
  // Z2 PUSH eases the camera toward the landing and brings it back
  await page.evaluate(() => window.__mix25.set('L2P5A2T1F1Z2')); await page.waitForTimeout(500)
  const cam0 = await page.evaluate(() => window.__cp.NN.camera.position.toArray())
  await swing({ ev: 108, la: 27, dir: -18, hand: 1, temp: 70, wind: 0 })
  // the push runs on the wall clock but moves only when a frame draws, and frames are slow under the software renderer: watch for it rather than sample once
  let camMid = await page.evaluate(() => ({ p: window.__cp.NN.camera.position.toArray(), on: window.__mix25.pushing() }))
  for (let k = 0; k < 20 && camMid.on && Math.hypot(...camMid.p.map((v, i) => v - cam0[i])) <= 5; k++) { await page.waitForTimeout(150); const c = await page.evaluate(() => ({ p: window.__cp.NN.camera.position.toArray(), on: window.__mix25.pushing() })); if (!c.on) break; camMid = c }
  let home = false
  for (let k = 0; k < 30 && !home; k++) { await page.waitForTimeout(400); home = await page.evaluate(() => !window.__mix25.pushing()) }
  const cam1 = await page.evaluate(() => window.__cp.NN.camera.position.toArray())
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
  check('Z2 PUSH moves the camera toward the landing, then puts it back', camMid.on && dist(camMid.p, cam0) > 5 && home && dist(cam1, cam0) < 0.5, JSON.stringify({ mid: dist(camMid.p, cam0), back: dist(cam1, cam0) }))
  await page.evaluate(() => window.__mix25.set('L2P5A2T1F2Z1')); await page.waitForTimeout(400)
  const s5 = await swing({ ev: 108, la: 27, dir: -18, hand: 1, temp: 70, wind: 0 })
  check('F2 CONFETTI has no landing moment', s5.moment === null, JSON.stringify(s5))
  await page.close()
}
// the SELECT menu: shown on arrival, keys move and choose, Esc comes back, number keys jump
if (!process.env.PHONE_ONLY && on('D')) {
  const page = await open(1440, 820, '&mix=L1P5A3T1')
  const m0 = await page.evaluate(() => ({ open: document.querySelector('.c25 .sm').classList.contains('open'), n: document.querySelectorAll('.c25 .sm .smi').length, on: document.querySelector('.c25 .sm .smi.on b')?.textContent }))
  check('the SELECT menu opens on arrival with five lines: the modes (3 Nov, later: BLAST RADIUS is the fifth; nothing else)', m0.open && m0.n === 5 && /DÉJÀ-VU/.test(m0.on), JSON.stringify(m0))
  const mc = await page.evaluate(() => { const on = document.querySelector('.c25 .sm .smi.on'); return { arrows: document.querySelectorAll('.c25 .sm .cur').length, anim: [on, ...on.children].map((e) => getComputedStyle(e).animationName).filter((a) => a !== 'none'), border: getComputedStyle(on).borderTopColor } })
  check('the chosen menu line is a plain boxed button: no arrow, nothing blinking (28 Oct)', mc.arrows === 0 && mc.anim.length === 0 && mc.border !== 'rgba(0, 0, 0, 0)', JSON.stringify(mc))
  // the menu's bottom line is a little game: pitcher, batter, a line drive back to the mound (it moves, and draws pixels)
  const sc0 = await page.evaluate(() => { const c = document.querySelector('.c25 .sm canvas.ins2'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return { n, sig: Array.from(d.filter((_, i) => i % 97 === 3)).join('') } })
  let sc1 = sc0.sig
  for (let k = 0; k < 8 && sc1 === sc0.sig; k++) { await page.waitForTimeout(450); sc1 = await page.evaluate(() => { const c = document.querySelector('.c25 .sm canvas.ins2'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; return Array.from(d.filter((_, i) => i % 97 === 3)).join('') }) }
  check('the menu plays its pitcher-batter scene at the bottom (no more 1 PLAYER FREE PLAY)', sc0.n > 150 && sc1 !== sc0.sig && !/FREE PLAY/.test(await page.evaluate(() => document.querySelector('.c25 .sm').textContent)), JSON.stringify({ n: sc0.n, changed: sc1 !== sc0.sig }))
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(200)
  await page.keyboard.press('Enter'); await page.waitForTimeout(1200)
  const m1 = await page.evaluate(() => ({ open: document.querySelector('.c25 .sm').classList.contains('open'), mode: window.__mix25.mode() }))
  check('down and Enter start the DOJO', !m1.open && m1.mode === 'whatif', JSON.stringify(m1))
  await page.keyboard.press('Escape'); await page.waitForTimeout(400)
  const m2 = await page.evaluate(() => ({ open: document.querySelector('.c25 .sm').classList.contains('open'), on: document.querySelector('.c25 .sm .smi.on b')?.textContent }))
  check('Esc brings the menu back on the current mode', m2.open && /DINGER DOJO/.test(m2.on), JSON.stringify(m2))
  await page.keyboard.press('1'); await page.waitForTimeout(1200)
  check('a number key jumps straight to that mode', await page.evaluate(() => window.__mix25.mode() === 'replay' && !document.querySelector('.c25 .sm').classList.contains('open')))
  // findable (28 Oct): the MENU button wears its ESC keycap at the top left, the title opens it too, and a one-time hint follows the first close
  const mb = await page.evaluate(() => { const b = document.querySelector('#c25mn').getBoundingClientRect(), t = document.querySelector('#c25ti').getBoundingClientRect(); return { txt: document.querySelector('#c25mn').textContent, l: b.left, t: b.top, rightOfTitle: b.left > t.left, hint: document.querySelector('#c25mh').classList.contains('go'), seen: localStorage.getItem('nn-mhint25') } })
  check('the MENU button sits top left with its ESC keycap; the first close showed the ESC hint once', /MENU\s*ESC/.test(mb.txt) && mb.l < 40 && mb.t < 30 && !mb.rightOfTitle && mb.seen === '1', JSON.stringify(mb))
  await page.click('#c25ti'); await page.waitForTimeout(400)
  check('clicking the title opens the menu', await page.evaluate(() => document.querySelector('.c25 .sm').classList.contains('open')))
  await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  // HIGHLIGHT REEL plays the big ones one after another
  await page.click('#c25rl')
  let b1 = null, b2 = null
  for (let k = 0; k < 80 && !(b1 && b2 && b2 !== b1); k++) { await page.waitForTimeout(500); const r = await page.evaluate(() => ({ on: !!window.__mix25.reel(), ch: document.querySelector('#c25ch').textContent.match(/BALL (\d+)/)?.[1] })); if (r.on) { b1 ??= r.ch; b2 = r.ch } }
  check('the REEL button by PLAY IT runs the highlight reel, moving on to the next big one by itself', !!b1 && b2 !== b1, JSON.stringify({ b1, b2 }))
  await page.keyboard.press('Escape'); await page.waitForTimeout(400)
  check('Esc stops the reel', await page.evaluate(() => !window.__mix25.reel()))
  await page.evaluate(() => window.__mix25.menu.close())
  await page.click('#c25mn'); await page.waitForTimeout(400)
  await page.click('.c25 .sm .smi:nth-child(4)'); await page.waitForTimeout(4000)
  const m3 = await page.evaluate(() => ({ open: document.querySelector('#c25m').classList.contains('open'), title: document.querySelector('#c25mt').textContent, txt: document.querySelector('#c25mb').textContent.slice(0, 160) }))
  check('clicking WALLOP WITNESS in the menu opens it', m3.open && /W\s*A\s*L\s*L\s*O\s*P/.test(m3.title), JSON.stringify(m3))
  await page.close()
  // another park: its team's color, Oracle-only features hidden
  const p2 = await open(1440, 820, '&menu=0&park=NYY&mix=L1P5A3T1')
  const ny = await page2info(p2)
  check('another park takes its team color and hides the Oracle-only features', ny.acc.toLowerCase() === '#8fb3e8' && ny.hidden && /YANKEE/.test(ny.title.replace(/\s+/g, '')), JSON.stringify(ny))
  const X = await layout(p2); check('another park fits', X.overlaps.concat(X.fits, X.titles).length === 0, X.overlaps.concat(X.fits, X.titles).join('; '))
  await p2.close()
}
async function page2info(p) { return p.evaluate(() => ({ acc: getComputedStyle(document.querySelector('#cp')).getPropertyValue('--acc').trim(), hidden: ['#c25lp', '#c25se', '#c25sc', '#c25bb', '#c25kl'].every((s) => document.querySelector(s).style.display === 'none'), title: document.querySelector('#c25h>.t').textContent })) }
// phones: 390x844 and 360x740, every tab's card in the replay and the dojo
for (const [w, h] of on('D') ? [[390, 844], [360, 740]] : []) {
  const page = await open(w, h, '&menu=0&mix=L1P5A3T1', { viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  for (const m of ['replay', 'whatif']) {
    await setMode(page, m)
    for (const card of ['batter', 'pitch', 'slice', 'hists']) {
      await page.click(`#c25pt [data-card="${card}"]`); await page.waitForTimeout(700)
      const X = await layout(page)
      const ph = await page.evaluate((card) => ({ side: document.documentElement.scrollWidth > innerWidth + 1, guard: [...document.querySelectorAll('.guard')].some((g) => getComputedStyle(g).display !== 'none'), shown: getComputedStyle(document.querySelector('.c25>.' + card)).display !== 'none', tall: [...document.querySelectorAll('.c25>.pnl>.t')].filter((t) => t.getBoundingClientRect().height > 16).map((t) => t.textContent.slice(0, 12)) }), card)
      const bad = X.overlaps.concat(X.fits, X.titles, ph.side ? ['sideways scroll'] : [], ph.guard ? ['too-small guard shown'] : [], ph.shown ? [] : ['card not shown'], ph.tall.map((t) => 'title wraps: ' + t))
      check(`phone ${w}x${h} ${m === 'replay' ? 'DEJA-VU' : 'DOJO'} ${card}`, bad.length === 0, bad.slice(0, 6).join('; '))
    }
  }
  await page._ctx.close()
}
// 28 Oct, night round: the locks, the voxel park, the seat call, the arcs, the look, the stand-ins, the tater
if (!process.env.PHONE_ONLY && on('E')) {
  const page = await open(1440, 900, '&menu=0')
  const hdr = await page.evaluate(() => [...document.querySelectorAll('#c25mx .mx[data-ax]')].map((b) => b.dataset.ax).join('') + '|' + getComputedStyle(document.querySelector('#c25mx')).display)
  check('nothing open sits in the header (1 Nov, night: V and J locked, MIX gone); TYPE gone too', hdr === '|none' && (await page.evaluate(() => !document.querySelector('#c25ty'))), hdr)
  check('the locks are the defaults: L2 P5 A2 T16 F1 I2 R3 S1 K1 B12 Z2 H1 U2 D1 M1 X2 E1 Y3 N1 W1 Q2 C1 O2 G2, V (STANDS) open at V5 LOWER BOWL (31 Oct) and J (DOJO CONTROLS) open at J8 (BIG ARCS)', /L2 P5 A2 T16 F1 I2 R3 Y3 S1 K1 B12 V5 Z2 H1 U2 D1 M1 X2 E1 N1 J8 W1 Q2 C1 O2 G2$/.test(await page.evaluate(() => window.__mix25.code())), await page.evaluate(() => window.__mix25.code()))
  // the side view's ball is a pixel baseball (bone hide, red stitches), and so is the ball on the zone
  await page.evaluate(() => window.__mix25.ball((b) => b.hr && b.park === 'SF' && b.ft > 410)); await page.waitForTimeout(900)
  const bl = await page.evaluate(() => ['#c25sv', '#c25zg'].map((s) => { const g = document.querySelector(s + ' [data-ball]'); return g ? { seam: [...g.querySelectorAll('rect')].filter((r) => /--sc/.test(r.getAttribute('fill'))).length, hide: [...g.querySelectorAll('rect')].filter((r) => r.getAttribute('fill') === '#f2efe6').length } : null }))
  check('the ball in the side view and on the zone is a pixel baseball, its seams in the E color', bl.every((x) => x && x.seam >= 10 && x.hide >= 30), JSON.stringify(bl))
  // E: the seams in the pitch color (E1), bone, none (the hide color) or red
  const seam = []
  for (const E of [1, 2, 3, 4]) { await page.evaluate((c) => window.__mix25.set(c), 'E' + E); await page.waitForTimeout(300); seam.push(await page.evaluate(() => { const g = getComputedStyle(document.querySelector('.c25')); return [g.getPropertyValue('--sc').trim().toLowerCase(), g.getPropertyValue('--pc').trim().toLowerCase()] })) }
  check('E1 to E4: the seams take the pitch color, bone, none (white) or red', seam[0][0] === seam[0][1] && seam[1][0] === '#b3a888' && seam[2][0] === '#f2efe6' && seam[3][0] === '#e4002b', JSON.stringify(seam))
  await page.evaluate(() => window.__mix25.set('E4')); await page.waitForTimeout(200)
  // the clock over the board: the time this ball was hit, after its hands spin back
  for (let k = 0; k < 30 && (await page.evaluate(() => window.__mix25.life.clock().spinning)); k++) await page.waitForTimeout(400)
  const ck = await page.evaluate(() => ({ c: window.__mix25.life.clock(), tm: window.__mix25.cur()?.tm }))
  const hm = (ck.tm ?? '').split(':').map(Number)
  check('the clock over the board shows when this home run was hit', !ck.c.live && ck.c.hm === ck.tm && ck.c.h === (hm[0] % 12 || 12) && ck.c.m === hm[1], JSON.stringify(ck))
  // a flight: the arc in voxels (U3 by default), a zenith post and a clearance post that rise as the ball passes, a distance tag where it lands
  await page.click('#c25nk')
  for (let k = 0; k < 80 && (await page.evaluate(() => !(window.__cp.anim() && window.__cp.anim().exploded))); k++) await page.waitForTimeout(400)
  await page.waitForTimeout(600)
  const fl = await page.evaluate(() => { const t = window.__mix25.flight().last(); const rv = t.userData.reveal; let cubes = 0; t.traverse((o) => { if (o.isInstancedMesh) cubes += o.count }); return { posts: rv.length, shown: rv.filter(([, o]) => o.visible).length, cubes, ballVox: !!window.__cp.ballMesh().userData.vox?.isObject3D, sphereHidden: window.__cp.ballMesh().material.visible === false } })
  check('a home run draws its arc in voxels with the zenith, the wall clearance and the landing distance posted', fl.posts === 3 && fl.shown === 3 && fl.cubes > 60 && fl.ballVox && fl.sphereHidden, JSON.stringify(fl))
  // X: a dot in the line at the zenith and where it cleared the wall, in the X color (X5 MINT by default); the voxel ball's seams follow E
  const dots = await page.evaluate(() => { const t = window.__mix25.flight().last(), out = []; for (const [, o] of t.userData.reveal.slice(0, 2)) o.traverse((m) => { if (m.isInstancedMesh && m.count === 1) out.push(m.material.color.getHexString()) }); let sm = null; window.__cp.ballMesh().userData.vox?.traverse?.((o) => { if (o.userData.seam) sm = o.material.color.getHexString() }); return { out, sm, signs: window.__mix25.life.signCount() } })
  check('the zenith gets a dot in the line in the pitch color (X2), the wall one in GEIGER (2 Nov, later); the voxel ball has red seams under E4', dots.out.length === 2 && dots.out[0] === '5ce1ff' && dots.out[1] === '9dff00' && dots.sm === 'e4002b', JSON.stringify(dots))
  check('the ORACLE PARK sign over the board lit up for the home run', dots.signs >= 1, JSON.stringify(dots))
  for (const U of [1, 2, 3, 4, 5]) {
    await page.evaluate((c) => window.__mix25.set(c), 'U' + U); await page.waitForTimeout(500)
    const n = await page.evaluate(() => { let c = 0; window.__mix25.flight().last()?.traverse((o) => { if (o.isInstancedMesh) c += o.count }); return { c, st: window.__mix25.flight().style() } })
    check(`U${U} ${['BEADS', 'PIXEL LINE', 'SHADOW', 'CURTAIN', 'COMET'][U - 1]} builds its arc`, n.st === U && n.c > 20, JSON.stringify(n))
  }
  await page.evaluate(() => window.__mix25.set('U2E1')); await page.waitForTimeout(300)
  for (let k = 0; k < 40 && (await page.evaluate(() => window.__mix25.pushing())); k++) await page.waitForTimeout(400)
  // the board finishes its own landing messages first (they would replace the seat call)
  for (let k = 0; k < 40 && (await page.evaluate(() => !!window.__mix25.life.anim() || window.__mix25.life.queued().length > 0)); k++) await page.waitForTimeout(400)
  await page.waitForTimeout(2500)
  // a mix change puts the camera home on the next frame; let that frame happen before the seance starts its glide
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await page.waitForTimeout(300)
  // SEAT SEANCE: a tight cloud and a seat; the camera glides over it and back
  const c0 = await page.evaluate(() => window.__cp.NN.camera.position.toArray())
  await page.keyboard.press('g')
  for (let k = 0; k < 40; k++) { await page.waitForTimeout(500); const c = await page.evaluate(() => window.__cp.NN.camera.position.toArray()); if (Math.hypot(...c.map((v, i) => v - c0[i])) > 40 && !(await page.evaluate(() => window.__mix25.look()?.moving))) break }
  const se = await page.evaluate(() => { const r = window.__mix25.seance(); return { call: r?.call, half: r?.half, most: r?.most, panel: document.querySelector('#c25hb .scall')?.textContent, cam: window.__cp.NN.camera.position.toArray(), board: window.__mix25.life.text() } })
  const moved = Math.hypot(...se.cam.map((v, i) => v - c0[i]))
  check('SEAT SEANCE calls a seat (section, row, seat) from a cloud a few sections wide, and says it on the board', se.call?.what === 'seat' && /^1[3-5]\d|^10\d|^135$/.test(se.call.sec) && se.half <= 30 && se.most <= 70 && /SECTION/.test(se.panel) && /ROW .* SEAT/.test(se.board), JSON.stringify(se).slice(0, 300))
  check('the camera glides in over the seance cloud', moved > 40, String(moved))
  await page.keyboard.press('g')
  let back = null
  for (let k = 0; k < 40; k++) { await page.waitForTimeout(500); if (!(await page.evaluate(() => window.__mix25.look()))) break }
  back = await page.evaluate(() => window.__cp.NN.camera.position.toArray())
  check('and glides back when SEAT SEANCE closes', Math.hypot(...back.map((v, i) => v - c0[i])) < 1, JSON.stringify({ c0, back }))
  // LANDING PARTY: voxel numbers on stakes
  await page.keyboard.press('l'); await page.waitForTimeout(4000)
  const lp = await page.evaluate(() => { let vox = 0, sprites = 0; window.__cp.NN.scene.traverse((o) => { if (o.isInstancedMesh && o.userData.vox) vox++; if (o.isSprite && o.material?.map) sprites++ }); return { vox, sprites, rows: document.querySelectorAll('#c25hb .lpr').length } })
  check('LANDING PARTY numbers are voxels (no flat number sprites)', lp.vox >= 16 && lp.sprites === 0 && lp.rows >= 4, JSON.stringify(lp))
  await page.keyboard.press('l'); await page.waitForTimeout(2000)
  // a second swing keeps the voxel ball (the engine strips the ball's children on every swing)
  await page.click('#c25nk')
  for (let k = 0; k < 80 && (await page.evaluate(() => !(window.__cp.anim() && window.__cp.anim().exploded))); k++) await page.waitForTimeout(400)
  check('the voxel ball is still there on the second swing', await page.evaluate(() => { const bm = window.__cp.ballMesh(), v = bm.userData.vox; return !!v?.isObject3D && v.parent === bm && bm.material.visible === false }))
  await page.keyboard.press('h'); await page.waitForTimeout(300) // the old hand key: must not throw now the strip has no hand
  // STAND-INS: every D style draws for a batter with no photo
  await page.evaluate(() => window.__mix25.mode() === 'replay' && document.querySelector('#c25tw') && null)
  await page.evaluate(() => { const m = window.__mix25; m.set('D1') })
  await page.keyboard.press('m'); await page.waitForTimeout(1200)
  for (const D of [1, 2, 3, 4, 5]) {
    await page.evaluate((c) => window.__mix25.set(c), 'D' + D); await page.waitForTimeout(500)
    const px = await page.evaluate(() => { const c = document.querySelector('#c25f canvas'); if (!c || c.style.display === 'none') return -1; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 0) n++; return n })
    check(`D${D} draws the stand-in batter for your own swing`, px > 150, String(px))
  }
  await page.keyboard.press('m'); await page.waitForTimeout(1200)
  // TWEAK THE TATER: the line over the strip says what a change did
  await page.click('#c25tw'); await page.waitForTimeout(1200)
  const t0 = await page.evaluate(() => ({ line: document.querySelector('#c25ch .r2').textContent, slots: document.querySelectorAll('.strip .bt').length, ghost: (window.__mix25.flight().ghost() ?? []).length }))
  await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp'); await page.waitForTimeout(800)
  const t1 = await page.evaluate(() => ({ line: document.querySelector('#c25ch .r2').textContent, dv: document.querySelector('.strip .bt .dv')?.textContent }))
  check('TWEAK THE TATER: five numbers and SWING (no batter hand), the real flight ghosted, and the line says what +3 MPH did', t0.slots === 6 && t0.ghost > 10 && /REAL BALL/.test(t0.line) && /\+3 MPH: \d+ FT \(\+\d+\)/.test(t1.line) && t1.dv === '+3', JSON.stringify({ t0, t1 }))
  await page.click('#c25rst'); await page.waitForTimeout(800)
  check('RESET TO THE REAL BALL puts the numbers back', /REAL BALL, /.test(await page.evaluate(() => document.querySelector('#c25ch .r2').textContent)))
  // leaving through the menu and coming back to TWEAK THE TATER is a fresh dojo, not the old tweak
  await page.keyboard.press('Escape'); await page.waitForTimeout(400)
  await page.click('.c25 .sm .smi:nth-child(2)'); await page.waitForTimeout(1200)
  const fr = await page.evaluate(() => { const s = window.__cp.state, R = (q) => document.querySelector(q).getBoundingClientRect(); return { fresh: !/REAL BALL/.test(document.querySelector('#c25ch .r2').textContent) && !document.querySelector('#c25rst') && !window.__mix25.flight().ghost(), st: [s.ev, s.la, s.dir, s.temp, s.carry, s.dws], title: document.querySelector('#c25ti').textContent, dj: document.querySelector('.c25').classList.contains('dj'), strip: R('.c25>.strip'), park: R('#c25h'), pitch: getComputedStyle(document.querySelector('.c25>.pitch')).display, clock: window.__mix25.life.clock().live } })
  check('DINGER DOJO from the menu is a blank swing (103 mph, 28°, dead center, 62°), no stale tweak, the clock on the time now', fr.fresh && fr.st.join() === '103,28,0,62,1,0' && /DINGER DOJO/.test(fr.title) && fr.clock, JSON.stringify(fr))
  check('the dojo\'s controls sit top left where the pitch was', fr.dj && fr.pitch === 'none' && fr.strip.right <= fr.park.left && fr.strip.top < 120 && fr.strip.height > 250, JSON.stringify(fr))
  // the stand-in: the batter's team kit (home whites, road greys), his own height; no mascots, no WHO'S UP (29 Oct, later: no nicknames)
  const kit = await page.evaluate(async () => {
    const m = window.__mix25, away = m.ball((b) => b.tb === 'Top' && b.at === 'SF'), a = m.standIn(m.cur().b)
    m.ball((b) => b.tb === 'Bot' && b.ht === 'SF'); const h = m.standIn(m.cur().b), hb = m.bio(m.cur().b)
    return { away: away >= 0 ? a.kit : null, home: h.kit, h: h.height, hb, kind: h.kind }
  })
  check('a stand-in wears the Giants cream at home and road greys away, at his own height from the MLB Stats API', kit.away?.jersey === '#a3a6ab' && kit.home.jersey === '#f1e6cf' && kit.h === kit.hb?.h && kit.h >= 64 && kit.kind === 'human', JSON.stringify(kit))
  await page.keyboard.press('m'); await page.waitForTimeout(1200)
  const who = await page.evaluate(() => ({ btn: !!document.querySelector('#c25who'), you: window.__mix25.you(), name: document.querySelector('#c25i b').textContent }))
  const batHid = await page.evaluate(() => getComputedStyle(document.querySelector('.c25>.batter')).display === 'none')
  check('no nicknames: no WHO\'S UP button, and you are up as yourself (31 Oct: in the dojo the batter card is gone altogether)', !who.btn && who.you === 'you' && (batHid || /YOUR SWING|YOU/.test(who.name)), JSON.stringify({ ...who, batHid }))
  await page.close()
}
// 29 Oct, later: a headshot for every batter, the real sign in voxels with the pennants, gull faces, the voxel Coke corner, the dojo's icons and typed numbers, one mound
if (!process.env.PHONE_ONLY && on('H')) {
  const page = await open(1440, 900, '&menu=0')
  const fc = await page.evaluate(() => { const m = window.__mix25, ids = [...new Set(m.allBalls().map((b) => b.b))]; return { n: ids.length, faces: ids.filter((i) => m.hasFace(i)).length } })
  check('every batter in DEJA-VU has his headshot', fc.n > 200 && fc.faces === fc.n, JSON.stringify(fc))
  const sk = await page.evaluate(() => window.__mix25.standIn(window.__mix25.cur().b).skin)
  check('the stand-in takes the batter\'s skin tone from his headshot', /^#[0-9a-f]{6}$/.test(sk ?? ''), String(sk))
  // the sign: Q2 by default, letters and outline in voxels, the eight pennants waving; Q1 brings the bulbs back, Q3 the night
  const sg = await page.evaluate(async () => { const L = window.__mix25.life, w0 = L.flagWave(); for (let k = 0; k < 20 && L.flagWave() === w0; k++) await new Promise((r) => setTimeout(r, 300)); // the flags move on the board's tick: slow frames under the software renderer
 return { q: L.signNow(), vox: L.signVox(), flags: L.flags(), w0, w1: L.flagWave(), bulbs: L.sign.visible, vs: L.vsign.visible } })
  check('THE REAL SIGN (Q2): ORACLE PARK in voxels on the arch, the bulbs off, nine pennants that wave, the clock in voxels', sg.q === 2 && sg.vox > 1000 && sg.flags === 9 && sg.w0 !== sg.w1 && !sg.bulbs && sg.vs, JSON.stringify(sg))
  const sgs = []
  for (const Q of [1, 3, 2]) { await page.evaluate((c) => window.__mix25.set(c), 'Q' + Q); await page.waitForTimeout(400); sgs.push(await page.evaluate(() => { const L = window.__mix25.life; return [L.signNow(), L.sign.visible, L.signVox()] })) }
  check('Q1 is the bulbs (no voxel letters), Q3 the voxel sign at night, Q2 back', sgs[0][0] === 1 && sgs[0][1] && sgs[0][2] === 0 && sgs[1][0] === 3 && !sgs[1][1] && sgs[1][2] > 1000 && sgs[2][0] === 2, JSON.stringify(sgs))
  // the scoreboard: G2 RELIEF by default (lit LEDs stand out of it), the four looks switch, the new animations draw
  const bd = []
  for (const G of [2, 1, 3, 4, 2]) { await page.evaluate((c) => window.__mix25.set(c), 'G' + G); await page.evaluate(() => window.__mix25.life.play('bagcheck', {}, 0, true)); for (let k = 0; k < 20 && G !== 4 && (await page.evaluate(() => window.__mix25.life.ledsOut())) < 20; k++) await page.waitForTimeout(300); bd.push(await page.evaluate(() => ({ g: window.__mix25.life.boardNow(), vox: window.__mix25.life.vboard.visible, bulbs: window.__mix25.life.board.visible, out: window.__mix25.life.ledsOut() }))) }
  check('G1 to G4: the voxel board (cubes, relief, flip dots) or the old bulbs, the lit LEDs counted on the voxel ones', bd.every((x, i) => x.g === [2, 1, 3, 4, 2][i]) && bd.filter((x) => x.g !== 4).every((x) => x.vox && !x.bulbs && x.out > 20) && bd[3].bulbs && !bd[3].vox, JSON.stringify(bd))
  const an = await page.evaluate(() => { const L = window.__mix25.life; L.boardStyle = 4; const r = L.gags().map((n) => [n, L.peek(n, L.dur(n) * 0.55, {}).lit]); L.boardStyle = 2; return r })
  check('the gags draw on the old bulbs too (G4)', an.length === 37 && an.every(([, n]) => n > 10), JSON.stringify(an))
  await page.evaluate(() => window.__mix25.life.signFx('hr')); await page.waitForTimeout(400)
  check('a home run still lights the sign', await page.evaluate(() => window.__mix25.life.signState() === 'hr'))
  // the model's own sign and its own mound and boxes are out of the wire; ours are in
  const wire = await page.evaluate(() => { const st = window.__nn.wireStats, L = window.__nn.wireMarks; return { marks: st?.marks ?? 0, funSkipped: st?.funSkipped ?? 0 } })
  check('the field markings are drawn (one set: the model\'s own mound and boxes are left out)', wire.marks > 100, JSON.stringify(wire))
  // gulls: a face each, three looks
  const gf = []
  for (const W of [1, 2, 3]) { await page.evaluate((c) => window.__mix25.set(c), 'W' + W); await page.waitForTimeout(300); gf.push(await page.evaluate(() => [window.__mix25.life.faceNow(), window.__mix25.life.gullFaces()])) }
  check('W1 to W3: every gull wears a face (western gull, cartoon, shades)', gf.every(([f, n], i) => f === i + 1 && n.length >= 8 && n.every((k) => k >= 4)) && gf[1][1][0] !== gf[0][1][0], JSON.stringify(gf.map(([f, n]) => [f, n[0]])))
  await page.evaluate(() => window.__mix25.set('W1'))
  // the Coke corner: voxels (C1, C2), or the model's wire (C3)
  for (let k = 0; k < 20 && !(await page.evaluate(() => !!window.__mix25.coke())); k++) await page.waitForTimeout(300)
  const ck = []
  for (const C of [1, 2, 1]) { await page.evaluate((c) => window.__mix25.set(c), 'C' + C); await page.waitForTimeout(400); ck.push(await page.evaluate(() => { const c = window.__mix25.coke(); return { s: c.styleNow(), shown: c.shown(), n: c.count() } })) }
  check('the Coke corner in voxels on the model wireframe: the bottle neck up with its mouth open (no cap), the painted Coca-Cola label, a slide, three kids, the mitt; C2 paints it red', ck[0].shown && ck[0].n.bottle > 5000 && ck[0].n.cap === 0 && ck[0].n.label === 1 && ck[0].n.slide > 100 && ck[0].n.kids === 3 && ck[0].n.glove > 800 && ck[1].s === 2 && ck[2].s === 1, JSON.stringify(ck))
  const kid = await page.evaluate(async () => { const c = window.__mix25.coke(), a = [0, 1, 2].map((i) => c.kidAt(i)), mv = () => Math.max(...a.map((p, i) => p.distanceTo(c.kidAt(i)))); for (let k = 0; k < 40 && mv() <= 0.2; k++) await new Promise((r) => setTimeout(r, 500)); return { moved: mv(), cut: window.__mix25.cut() } }) // (30 Oct: the slower ladder climb; all three, over 3 s)
  check('the kids keep moving (up the inside, down the slide), and the model\'s own sign, board, bottle and glove are cut out of it', kid.moved > 0.2 && kid.cut > 5000, JSON.stringify(kid))
  // red team, 29 Oct: in DEJA-VU the arrows and + no longer edit the real ball behind your back
  await page.evaluate(() => window.__mix25.setMode('replay')); await page.waitForTimeout(800)
  const kb0 = await page.evaluate(() => window.__cp.state.ev)
  await page.keyboard.press('ArrowUp'); await page.keyboard.press('+'); await page.waitForTimeout(300)
  const kb1 = await page.evaluate(() => ({ ev: window.__cp.state.ev, chip: document.querySelector('#c25ch').textContent }))
  check('in DEJA-VU the up arrow and + leave the real ball alone', kb1.ev === kb0 && !/EDITED/.test(kb1.chip), JSON.stringify({ kb0, kb1 }))
  // the dojo: icons, not numbers; type the speed, the angle and the aim
  await page.evaluate(() => { window.__mix25.setMode('whatif'); window.__mix25.set('J2') }); await page.waitForTimeout(1200) // (the slider layout: BIG ARCS, the default since 31 Oct, labels in words)
  const lab = await page.evaluate(() => [...document.querySelectorAll('.c25 .strip .bt[data-i]:not(.hot) .ps')].map((x) => ({ t: x.textContent, svg: !!x.querySelector('svg') })))
  check('the dojo controls have an icon each and no numbers', lab.length === 5 && lab.every((x) => x.svg && !/\d/.test(x.t)), JSON.stringify(lab))
  // every box has its icon for a title, the dojo's YOUR SWING too
  const ic = await page.evaluate(() => ({ park: !!document.querySelector('.c25>.park>.t svg'), batter: !!document.querySelector('.c25>.batter>.t svg'), swing: getComputedStyle(document.querySelector('.c25 .strip>.swi')).display !== 'none' }))
  check('every box has an icon for its title (park, batter, the dojo\'s swing too)', ic.park && ic.batter && ic.swing, JSON.stringify(ic))
  const typed = []
  for (const [k, v] of [['ev', '111'], ['la', '33'], ['dir', '25L'], ['dir', 'R12'], ['dir', 'C'], ['ev', 'banana']]) {
    await page.click(`.c25 .strip .bt[data-k="${k}"] b.num`); await page.keyboard.press('Control+A'); await page.keyboard.type(v); await page.keyboard.press('Enter'); await page.waitForTimeout(250)
    typed.push(await page.evaluate(() => [window.__cp.state.ev, window.__cp.state.la, window.__cp.state.dir, !!document.querySelector('.c25 .strip input.tv'), window.__mix25.mode()]))
  }
  check('typing sets it: 111 mph, 33 degrees, 25L, R12 and C for the aim; nonsense changes nothing; the box closes and the mode stays', typed[0][0] === 111 && typed[1][1] === 33 && typed[2][2] === -25 && typed[3][2] === 12 && typed[4][2] === 0 && typed[5][0] === 111 && typed.every((x) => !x[3] && x[4] === 'whatif'), JSON.stringify(typed))
  // red team, 29 Oct: strict typing (no 1e2, nothing out of range, LEFT 20 and 20 LF fine), leaving a box untouched changes nothing
  const typed2 = []
  for (const [k, v] of [['ev', '1e2'], ['ev', '200'], ['dir', 'LEFT 20'], ['dir', '15 RF'], ['dir', 'L20R'], ['la', '-5']]) {
    await page.click(`.c25 .strip .bt[data-k="${k}"] b.num`); await page.keyboard.press('Control+A'); await page.keyboard.type(v); await page.keyboard.press('Enter'); await page.waitForTimeout(250)
    typed2.push(await page.evaluate(() => [window.__cp.state.ev, window.__cp.state.la, window.__cp.state.dir]))
  }
  check('typing is strict: 1e2 and 200 refused, LEFT 20 and 15 RF taken, L20R refused, -5 degrees taken', typed2[0][0] === 111 && typed2[1][0] === 111 && typed2[2][2] === -20 && typed2[3][2] === 15 && typed2[4][2] === 15 && typed2[5][1] === -5, JSON.stringify(typed2))
  await page.evaluate(() => window.__mix25.set('J2')); await page.waitForTimeout(300)
  check('J2 (the first choice) puts his words beside each icon', await page.evaluate(() => [...document.querySelectorAll('.c25 .strip .bt[data-i]:not(.hot) .ps em')].map((x) => x.textContent).join() === 'EXIT VELOCITY,LAUNCH ANGLE,LAUNCH DIRECTION,AIR TEMPERATURE,WIND'))
  await page.evaluate(() => window.__mix25.set('J1'))
  let X = await layout(page); check('the dojo fits with the icons', X.overlaps.concat(X.fits, X.titles).length === 0, X.overlaps.concat(X.fits, X.titles).join('; '))
  // 31 Oct: the pixel instruments (J3 to J9): a drawing in every control, inside its box; dragging them sets the numbers
  for (const j of [3, 5, 6, 7, 8]) {
    await page.evaluate((j) => window.__mix25.set('J' + j), j); await page.waitForTimeout(350)
    const bx = await page.evaluate(() => { const out = []; for (const el of document.querySelectorAll('.c25 .strip .bt[data-k]')) { const c = el.querySelector('.pxc'), a = el.getBoundingClientRect(), b = c?.getBoundingClientRect(); out.push(!!b && b.width > 30 && b.height > 18 && b.left >= a.left - 1 && b.right <= a.right + 1 && b.top >= a.top - 1 && b.bottom <= a.bottom + 1) } return out })
    const sl = await page.evaluate(() => [...document.querySelectorAll('.c25 .strip .bt[data-k] .sld')].filter((x) => x.offsetParent).length)
    X = await layout(page)
    check(`J${j}: a drawing in each of the five controls, inside its box, the sliders hidden, nothing overlapping`, bx.length === 5 && bx.every(Boolean) && sl === 0 && X.overlaps.concat(X.fits, X.titles).length === 0, JSON.stringify(bx) + ' ' + sl + ' ' + X.overlaps.concat(X.fits, X.titles).join('; '))
    if (j === 3 || j === 8) {
      const grab = async (k, v) => { const pt = await page.evaluate(([k, v]) => window.__mix25.pix().pointFor(k, v), [k, v]); await page.mouse.move(pt[0], pt[1]); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(250) }
      await grab('la', 40); await grab('dir', -30); await grab('temp', 85); await grab('wind', { wind: 12, xwind: 8 })
      const st = await page.evaluate(() => { const s = window.__cp.state; return [s.la, s.dir, s.temp, s.wind, s.xwind] })
      check(`J${j}: clicking the drawings sets the angle (40), the aim (30 left), the air (85) and the wind out and across`, Math.abs(st[0] - 40) <= 3 && Math.abs(st[1] + 30) <= 3 && Math.abs(st[2] - 85) <= 3 && st[3] > 6 && st[4] > 3, JSON.stringify(st))
    }
  }
  await page.evaluate(() => window.__mix25.set('J1'))
  await page.close()
}
// 29 Oct: SHOT CALLER as its own mode: type a seat or click one; the ways to get there, most common first; PLAY IT flies three
if (!process.env.PHONE_ONLY && on('G')) {
  const page = await open(1440, 900, '&menu=0')
  await page.click('#c25mn'); await page.waitForTimeout(400)
  await page.click('.c25 .sm .smi:nth-child(3)'); await page.waitForTimeout(1500)
  const s0 = await page.evaluate(() => ({ mode: window.__mix25.mode(), title: document.querySelector('#c25ti').textContent, form: !!document.querySelector('.sfm select'), pt: document.querySelector('.c25>.pitch>.t').textContent.replace(/\s+/g, ''), hint: document.querySelector('#c25ch').textContent, strip: getComputedStyle(document.querySelector('.c25>.strip')).display, dim: getComputedStyle(document.querySelector('#c25lp')).opacity }))
  check('SHOT CALLER is its own mode from the menu: a seat form top left, no strip, the other park features stood down', s0.mode === 'shot' && /SHOT CALLER/.test(s0.title) && s0.form && /CALLASEAT/.test(s0.pt) && /CLICK A SEAT/.test(s0.hint) && s0.strip === 'none' && Number(s0.dim) < 0.5, JSON.stringify(s0))
  // a seat by its numbers maps to a spot that reads back as the same seat; a row or section that does not exist says so
  const sp = await page.evaluate(() => { const m = window.__mix25, out = []; for (const [a, b, c] of [['140', '12', '8'], ['136', 'A', '3'], ['148', '2', '10'], ['143', '20', '15']]) { const r = m.seatPoint(a, b, c); out.push([r.line ?? r.err, r.at ? m.seatOf(r.at).line : null]) } return { out, e1: m.seatPoint('140', '30', '1').err, e2: m.seatPoint('200', '1', '1').err, e3: m.seatPoint('140', '5', '999').err } })
  check('a typed seat finds its spot on the stands and reads back as the same seat', sp.out.every(([a, b]) => a === b), JSON.stringify(sp.out))
  check('a seat that is not there says what is', /HAS ROWS A, 1 TO 26/.test(sp.e1) && /NO SECTION 200/.test(sp.e2) && /HAS SEATS 1 TO \d+/.test(sp.e3), JSON.stringify(sp))
  // typing it: keys in the form are not shortcuts (m would leave the mode); Enter finds it
  await page.selectOption('#c25ss', '140'); await page.fill('#c25sr', '12'); await page.click('#c25st'); await page.keyboard.type('8'); await page.keyboard.press('m'); await page.keyboard.press('Backspace'); await page.keyboard.press('Enter')
  await page.waitForFunction(() => window.__mix25.shot(), null, { timeout: 60000 })
  await page.waitForTimeout(800)
  const s1 = await page.evaluate(() => { const r = window.__mix25.shot(); return { mode: window.__mix25.mode(), seat: r.seat?.line, n: r.ways.length, sorted: r.ways.every((w, i, a) => !i || a[i - 1].w >= w.w), top: r.ways[0], st: [window.__cp.state.ev, window.__cp.state.la], bar: document.querySelector('#c25ch').textContent, panel: document.querySelector('#c25hb').textContent, rows: document.querySelectorAll('#c25pl .swy').length, recipe: document.querySelectorAll('#c25hb .sfr rect[data-k]').length, look: !!window.__mix25.look() } })
  check('typing SEC 140 ROW 12 SEAT 8 and Enter calls it: the ways in, most common first, the first one set up to fly', s1.mode === 'shot' && s1.seat === 'SEC 140 ROW 12 SEAT 8' && s1.n >= 5 && s1.sorted && s1.st[0] === s1.top.evx && s1.st[1] === s1.top.la /* (3 Nov, later: the swing set up is the one solved onto the seat, to the hundredth) */ && /WAY 1 OF/.test(s1.bar) && /SEC 140/.test(s1.panel) && /1 IN [\d,]+/.test(s1.panel) && s1.rows >= 1 && s1.recipe === s1.n && s1.look, JSON.stringify(s1).slice(0, 400))
  let X = await layout(page); check('Shot Caller fits', X.overlaps.concat(X.fits, X.titles).length === 0, X.overlaps.concat(X.fits, X.titles).join('; '))
  // the next way, and a click on a listed way
  await page.click('#c25ch [data-sw="1"]'); await page.waitForTimeout(500)
  const nx = await page.evaluate(() => ({ sel: window.__mix25.shot().sel, bar: document.querySelector('#c25ch').textContent }))
  await page.click('#c25pl .swy[data-w="2"]'); await page.waitForTimeout(500)
  const cl = await page.evaluate(() => window.__mix25.shot().sel)
  check('> steps to the next way, and a listed way can be picked', nx.sel === 1 && /WAY 2 OF/.test(nx.bar) && cl === 2, JSON.stringify({ nx, cl }))
  // the frontier: the arrow keys walk it (right: a steeper angle; up: a harder hit at the same angle), a drag goes to the way under the pointer, and the park flies it
  {
    const way = () => page.evaluate(() => { const r = window.__mix25.shot(), w = r.ways[r.sel]; return { sel: r.sel, ev: w.ev, evx: w.evx, la: w.la, st: [window.__cp.state.ev, window.__cp.state.la], cells: document.querySelectorAll('#c25hb .sfr rect[data-k]').length, bl: [+document.querySelector('#c25hb .sfr .bl').getAttribute('x'), +document.querySelector('#c25hb .sfr .bl').getAttribute('y')], ro: document.querySelector('#c25hb .sfro').textContent } })
    await page.focus('#c25hb .sfr')
    const w0 = await way()
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(400)
    const w1 = await way()
    await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(400)
    const w2 = await way()
    const tgt = await page.evaluate(() => { const r = window.__mix25.shot(), far = r.ways.reduce((a, w, i) => (Math.abs(w.la - r.ways[r.sel].la) > Math.abs(a.w.la - r.ways[r.sel].la) ? { w, i } : a), { w: r.ways[r.sel], i: r.sel }), el = document.querySelector('#c25hb .sfr rect[data-k="' + far.i + '"]').getBoundingClientRect(); return { i: far.i, x: el.left + el.width / 2, y: el.top + el.height / 2 } })
    const b0 = (await way()).bl
    await page.mouse.move(tgt.x, tgt.y); await page.mouse.down(); await page.waitForTimeout(300); await page.mouse.up(); await page.waitForTimeout(400)
    const w3 = await way()
    check('the frontier: right arrow goes to a steeper angle, left back past it, a press on a square picks that way; the ball moves, the readout and the park follow, the chart is not rebuilt', w1.la > w0.la && w2.la < w1.la && w3.sel === tgt.i && w3.st[0] === w3.evx && w3.st[1] === w3.la && (w3.bl[0] !== b0[0] || w3.bl[1] !== b0[1]) && new RegExp(Math.round(w3.evx) + 'MPH' + w3.la).test(w3.ro.replace(/\s|°/g, '')) && w3.cells === w0.cells, JSON.stringify({ w0, w1, w2, w3, tgt }))
    for (const N of [2, 3, 1]) { await page.evaluate((c) => window.__mix25.set(c), 'N' + N); await page.waitForTimeout(300) }
    X = await layout(page); check('Shot Caller still fits after the frontier looks', X.overlaps.concat(X.fits, X.titles).length === 0, X.overlaps.concat(X.fits, X.titles).join('; '))
  }
  // PLAY IT flies the three most common ways, one after another
  for (let k = 0; k < 20 && (await page.evaluate(() => window.__mix25.look()?.moving)); k++) await page.waitForTimeout(300)
  const l0 = await page.evaluate(() => window.__mix25.lands())
  await page.click('#c25nk')
  for (let k = 0; k < 150 && (await page.evaluate((n) => window.__mix25.lands() < n + 3, l0)); k++) await page.waitForTimeout(500)
  for (let k = 0; k < 20 && (await page.evaluate(() => window.__mix25.shotPlaying())); k++) await page.waitForTimeout(400)
  const pl = await page.evaluate((n) => ({ lands: window.__mix25.lands() - n, playing: window.__mix25.shotPlaying(), sel: window.__mix25.shot().sel }), l0)
  check('PLAY IT flies the three most common ways, then sets the first up again', pl.lands === 3 && !pl.playing && pl.sel === 0, JSON.stringify(pl))
  // a click on a seat in the park calls it too
  await page.keyboard.press('b'); await page.waitForTimeout(800) // bird's eye: the whole park, the arcade too
  const xy = await page.evaluate(() => { const r = window.__mix25.seatPoint('145', '3', '6'), v = (window.__cp.NN.camera.updateMatrixWorld(), r.at.clone().project(window.__cp.NN.camera)), c = document.querySelector('canvas').getBoundingClientRect(); return { x: c.left + ((v.x + 1) / 2) * c.width, y: c.top + ((1 - v.y) / 2) * c.height, on: v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1, at: r.at.toArray().map(Math.round), vz: v.z } })
  if (xy.on) {
    await page.mouse.click(xy.x, xy.y); await page.waitForTimeout(500)
    let s2 = null; for (let k = 0; k < 60; k++) { await page.waitForTimeout(500); s2 = await page.evaluate(() => window.__mix25.shot()?.seat); if (s2 && s2.line !== 'SEC 140 ROW 12 SEAT 8') break }
    check('clicking a seat in the park calls that seat', s2?.what === 'seat' && /^14[4-6]$/.test(s2.sec), JSON.stringify(s2))
  } else check('the arcade seat is on screen to click', false, JSON.stringify({ ...xy, cam: await page.evaluate(() => [window.__cp.NN.camera.position.toArray().map(Math.round), window.__cp.NN.controls.target.toArray().map(Math.round), window.__mix25.look(), window.__mix25.mode()]) }))
  // C goes back to the replay, and the shared panel is the histograms again
  await page.keyboard.press('c'); await page.waitForTimeout(1500)
  const bk = await page.evaluate(() => ({ mode: window.__mix25.mode(), t: document.querySelector('#c25hi>.t').textContent.replace(/\s+/g, ''), pt: document.querySelector('.c25>.pitch>.t').textContent.replace(/\s+/g, ''), form: !!document.querySelector('.sfm') }))
  check('C leaves Shot Caller for the replay: the pitch panel and the histograms come back', bk.mode === 'replay' && !/SHOTCALLER/.test(bk.t) && !/CALLASEAT/.test(bk.pt) && !bk.form, JSON.stringify(bk))
  await page.close()
}
// the SELECT screen on a phone: readable, nothing off the sides, every line reachable
if (on('F')) {
  const page = await open(390, 844, '&mix=L1P5A3T1', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  const sm = await page.evaluate(() => { const items = [...document.querySelectorAll('.c25 .sm .smi')]; const R = (e) => e.getBoundingClientRect(); return { open: document.querySelector('.c25 .sm').classList.contains('open'), n: items.length, side: document.documentElement.scrollWidth > innerWidth + 1, out: items.filter((i) => R(i).left < -1 || R(i).right > innerWidth + 1).length, cut: items.filter((i) => [...i.children].some((c) => c.scrollWidth > c.clientWidth + 2 && getComputedStyle(c).textOverflow !== 'ellipsis')).length } })
  check('the SELECT screen fits a phone (the five modes)', sm.open && sm.n === 5 && !sm.side && sm.out === 0 && sm.cut === 0, JSON.stringify(sm))
  await page.click('.c25 .sm .smi:nth-child(2)'); await page.waitForTimeout(1200)
  check('tapping a mode on the phone starts it', await page.evaluate(() => window.__mix25.mode() === 'whatif'))
  await page._ctx.close()
  // the dojo on a phone at the locked layout (its controls top left on a big screen) keeps the strip along the bottom
  const pdj = await open(390, 844, '&menu=0&mode25=whatif', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  const X = await layout(pdj), dj = await pdj.evaluate(() => { const s = document.querySelector('.c25>.strip').getBoundingClientRect(); return { b: s.bottom, t: s.top, h: innerHeight, side: document.documentElement.scrollWidth > innerWidth + 1 } })
  check('the dojo on a phone keeps its strip along the bottom and fits', X.overlaps.concat(X.fits, X.titles).length === 0 && dj.b <= dj.h && dj.t > dj.h * 0.7 && !dj.side, X.overlaps.concat(X.fits, X.titles).join('; ') + JSON.stringify(dj))
  await pdj._ctx.close()
}
// the ABC parser (music25.js), with no browser: a tie across a barline keeps its accidental, and // halves twice
if (on('F')) {
  const { parseABC } = await import('../src/cockpits/music25.js')
  const P = parseABC(['M:4/4', 'L:1/4', 'K:C', '^G2 G2-| G4| A// z3 z3/4|'].join(String.fromCharCode(10)))
  check('ABC: a tie across a barline keeps the sharp; // is a quarter of the unit', P.notes[0].m === 68 && P.notes[1].m === 68 && P.notes[1].d === 6 && P.notes[2].d === 0.25, JSON.stringify(P.notes))
}
check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '))
console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
await browser.close()
process.exit(fails ? 1 : 0)
