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
  await page.goto(`${base}/?mode=dojo&ui=K&cp=25&seed=7${qs}${/[?&]ir=/.test(qs) ? "" : "&ir=0"}`)
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
  const ov = ['#c25rd', '#c25v', '#c25ch', '#c25t'].map((s) => [s, R(Q(s))])
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

const SIZES = process.env.PHONE_ONLY ? [] : [[1827, 992], [1440, 820], [1280, 720]]
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
      for (const L of [1, 3]) for (const T of [1, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]) {
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
    await page.click('#c25tw'); await page.waitForTimeout(1200)
    const tw = await page.evaluate(() => ({ mode: window.__mix25.mode(), strip: getComputedStyle(document.querySelector('.c25>.strip')).display, ch: document.querySelector('#c25ch').textContent, title: document.querySelector('#c25ti').textContent, ball: Number(document.querySelector('#c25sv').textContent.match(/BALL (\d+) MPH/)?.[1]) }))
    check('TWEAK THE TATER carries the home run into the dojo', tw.mode === 'whatif' && tw.strip !== 'none' && /TWEAKING/.test(tw.ch) && /DINGER DOJO/.test(tw.title) && Math.abs(tw.ball - ev0) <= 1, JSON.stringify(tw).slice(0, 200))
    X = await layout(page); check('the dojo with the strip fits', X.overlaps.concat(X.fits, X.titles).length === 0, X.overlaps.concat(X.fits, X.titles).join('; '))
    await page.click('#c25back'); await page.waitForTimeout(1200)
    const bk = await page.evaluate(() => ({ mode: window.__mix25.mode(), ch: document.querySelector('#c25ch').textContent.match(/BALL (\d+)/)?.[1] }))
    check('BACK TO THE REPLAY returns to the same ball', bk.mode === 'replay' && bk.ch === before.ch, JSON.stringify({ bk, before }))
    await page.click('#c25ch [data-f="giants"]'); await page.waitForTimeout(900)
    // the odds receipt
    await page.keyboard.press('o'); await page.waitForTimeout(800)
    const rc = await page.evaluate(() => ({ t: document.querySelector('#c25hi>.t').textContent.replace(/\s+/g, ''), rows: document.querySelectorAll('#c25hb .rc .rr').length, txt: document.querySelector('#c25hb').textContent, sw: getComputedStyle(document.querySelector('#c25hw')).display }))
    check('ODDS RECEIPT builds the odds one input at a time', /ODDSRECEIPT/.test(rc.t) && rc.rows >= 6 && /WHAT-IF MODEL/.test(rc.txt) && rc.sw === 'none', JSON.stringify(rc).slice(0, 160))
    X = await layout(page); check('ODDS RECEIPT fits', X.fits.length === 0, X.fits.join('; '))
    await page.keyboard.press('o'); await page.waitForTimeout(500)
    // the type picker
    await page.keyboard.press('t'); await page.waitForTimeout(800)
    const ty = await page.evaluate(() => document.querySelectorAll('#c25mb .ty').length)
    await page.click('#c25mb .ty[data-c="6"]'); await page.waitForTimeout(600)
    const tyc = await page.evaluate(() => window.__mix25.code())
    check('the type picker shows every set and applies a click', ty === 11 && /T6 /.test(tyc), `${ty} ${tyc}`)
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    await page.evaluate(() => window.__mix25.set('L1P5A3T1')); await page.waitForTimeout(600)
    // the options legend lists every open option with the layout reasons
    await page.click('#c25lg'); await page.waitForTimeout(500)
    const lg = await page.evaluate(() => ({ opts: document.querySelectorAll('#c25mb .legend .o').length, why: document.querySelectorAll('#c25mb .legend .o em').length, txt: document.querySelector('#c25mb').textContent }))
    check('OPTIONS lists every open option and why each layout', lg.opts === 3 + 2 + 2 + 11 + 4 + 3 && lg.why === 2 && /C1 ORANGE/.test(lg.txt), JSON.stringify({ opts: lg.opts, why: lg.why }))
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    // the existing features still work in the shared panel
    await page.keyboard.press('l'); await page.waitForTimeout(2500)
    const lpx = await page.evaluate(() => ({ t: document.querySelector('#c25hi>.t').textContent.replace(/\s+/g, ''), rows: document.querySelectorAll('#c25hb .lpr').length }))
    check('LANDING PARTY still lists real Oracle home runs', /LANDINGPARTY/.test(lpx.t) && lpx.rows === 8, JSON.stringify(lpx))
    await page.keyboard.press('l'); await page.waitForTimeout(500)
    // effects: the hit-stop is set; a dojo swing throws the contact spark; a home run shoots fireworks; a splash hit gets its banner and the kayaks; Karl's fog
    check('the hit-stop holds the ball 110 ms', await page.evaluate(() => window.__cpHold === 110))
    await setMode(page, 'whatif')
    await page.evaluate(() => { const s = window.__cp.state; Object.assign(s, { ev: 112, la: 28, dir: -4, hand: 1, temp: 70 }); window.__cp.update() }); await page.waitForTimeout(600)
    const ft0 = await page.evaluate(() => window.__mix25.fx.count())
    await page.keyboard.press('Enter'); await page.waitForTimeout(350)
    const ft1 = await page.evaluate(() => window.__mix25.fx.count())
    check('a swing throws the contact spark and starts the trail', ft1 > ft0 + 10, `${ft0} -> ${ft1}`)
    let fwMax = 0
    for (let k = 0; k < 40 && fwMax <= 60; k++) { await page.waitForTimeout(400); fwMax = Math.max(fwMax, await page.evaluate(() => window.__mix25.fx.count())) }
    const key1 = await page.evaluate(() => window.__dojo?.key)
    check('a home run shoots fireworks over center field', fwMax > 60, JSON.stringify({ fwMax, key1 }))
    await page.waitForTimeout(6000)
    check('the kayaks are waiting in McCovey Cove', (await page.evaluate(() => window.__mix25.fx.kayaks())) === 6)
    await page.evaluate(() => { const s = window.__cp.state; Object.assign(s, { ev: 116, la: 28, dir: 24, hand: -1, temp: 70 }); window.__cp.update() }); await page.waitForTimeout(600)
    const key0 = await page.evaluate(() => window.__dojo?.key)
    await page.keyboard.press('Enter'); await page.waitForTimeout(3600)
    const sp = await page.evaluate(() => ({ bn: document.querySelector('#c25bn').textContent, on: document.querySelector('#c25bn').classList.contains('go') }))
    check('a splash hit gets its banner', key0 !== 'SPLASH' || (/SPLASH HIT/.test(sp.bn) && sp.on), JSON.stringify({ key0, sp }))
    if (key0 !== 'SPLASH') console.log('NOTE the splash preset did not land in the Cove here:', key0)
    let win = false
    for (let k = 0; k < 50 && !win; k++) { await page.waitForTimeout(500); win = await page.evaluate(() => !!window.__mix25.fx.winner()) }
    check('a kayak reaches the splash', key0 !== 'SPLASH' || win)
    await page.keyboard.press('k'); await page.waitForTimeout(800)
    const kl = await page.evaluate(() => ({ on: window.__mix25.fx.karlOn(), b: document.querySelector('#c25kl').textContent }))
    check('K brings Karl in', kl.on && /KARL: IN/.test(kl.b), JSON.stringify(kl))
    await page.keyboard.press('k'); await page.waitForTimeout(300)
    X = await layout(page); check('after the effects the dojo still fits', X.overlaps.concat(X.fits).length === 0, X.overlaps.concat(X.fits).join('; '))
    // the scoreboard reports the last landing, and the gulls scattered on the home run
    const sb = await page.evaluate(() => ({ t: window.__mix25.life.text(), g: window.__mix25.life.gulls() }))
    check('the scoreboard shows the result and the gulls are out', /FT|SPLASH|HOME RUN/.test(sb.t) && sb.g === 10, JSON.stringify(sb))
    // the effects styles: confetti instead of fireworks, CRT scanlines, the quiet style hides the gulls
    await page.evaluate(() => window.__mix25.set('L1P5A3T1F2')); await page.waitForTimeout(500)
    await page.evaluate(() => { const s = window.__cp.state; Object.assign(s, { ev: 112, la: 28, dir: -4, hand: 1, temp: 70 }); window.__cp.update() }); await page.waitForTimeout(600)
    await page.keyboard.press('Enter')
    let cf = 0
    for (let k = 0; k < 40 && cf <= 120; k++) { await page.waitForTimeout(400); cf = Math.max(cf, await page.evaluate(() => window.__mix25.fx.count())) }
    check('F2 CONFETTI rains on a home run', cf > 120, String(cf))
    await page.evaluate(() => window.__mix25.set('L1P5A3T1F4')); await page.waitForTimeout(400)
    const crt = await page.evaluate(() => ({ cls: document.querySelector('.c25').classList.contains('F4'), bg: getComputedStyle(document.querySelector('.c25'), '::after').backgroundImage }))
    check('F4 CRT lays scanlines over the screen', crt.cls && /repeating-linear-gradient/.test(crt.bg), JSON.stringify(crt).slice(0, 120))
    X = await layout(page); check('the CRT screen still has its titles on top', X.titles.length === 0, X.titles.join('; '))
    await page.evaluate(() => window.__mix25.set('L1P5A3T1F3')); await page.waitForTimeout(400)
    check('F3 QUIET hides the gulls and the board', await page.evaluate(() => window.__mix25.life.board.visible === false))
    await page.evaluate(() => window.__mix25.set('L1P5A3T1F1')); await page.waitForTimeout(400)
    // STAR MAP: every ball in the filter flown at once
    await setMode(page, 'replay')
    await page.click('#c25sm'); let st = null
    for (let k = 0; k < 60 && !st; k++) { await page.waitForTimeout(500); st = await page.evaluate(() => window.__mix25.stars()) }
    const smt = await page.evaluate(() => ({ t: document.querySelector('#c25hi>.t').textContent.replace(/\s+/g, ''), txt: document.querySelector('#c25hb').textContent, n: document.querySelector('#c25ch').textContent.match(/OF (\d+)/)?.[1] }))
    check('STAR MAP flies every home run in the filter', st && st.n === Number(smt.n) && st.segs > st.n * 5 && /STARMAP/.test(smt.t) && /FLOWN AT ONCE/.test(smt.txt) && /IN ORANGE/.test(smt.txt), JSON.stringify({ st, smt: smt.txt.slice(0, 100) }))
    X = await layout(page); check('STAR MAP fits its panel', X.fits.length === 0, X.fits.join('; '))
    await page.click('#c25sm'); await page.waitForTimeout(400)
    // PRINT IT: a PNG poster download
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }).catch(() => null), page.click('#c25pr')])
    const len = await page.evaluate(() => window.__poster25 ?? 0)
    check('PRINT IT downloads a poster', !!dl && /^nuke-navigator-.+\.png$/.test(dl.suggestedFilename()) && len > 40000, `${dl?.suggestedFilename()} ${len}`)
    // PLAY IT in the replay: the pitch flies into the zone, then the flight
    const c0 = await page.evaluate(() => window.__mix25.fx.count())
    await page.click('#c25go')
    let anim = false, fired = false
    void c0
    for (let k = 0; k < 50 && !(anim && fired); k++) { await page.waitForTimeout(150); const r = await page.evaluate(() => ({ a: document.querySelector('#c25zg').classList.contains('anim'), f: /TRACKING/.test(window.__mix25.life.text()) || !!window.__cp.anim() })); anim ||= r.a; fired ||= r.f }
    check('PLAY IT throws the pitch into the zone, then plays the flight', anim && fired, JSON.stringify({ anim, fired }))
    // the menu title options
    await page.evaluate(() => window.__mix25.set('L1P5A3T1F1M2')); await page.waitForTimeout(300)
    const m2 = await page.evaluate(() => !!document.querySelector('.c25 .sm .lg2 svg'))
    await page.evaluate(() => window.__mix25.set('L1P5A3T1F1M3')); await page.waitForTimeout(300)
    const m3 = await page.evaluate(() => !!document.querySelector('.c25 .sm .lg3'))
    check('M2 ARC and M3 MARQUEE titles build', m2 && m3, JSON.stringify({ m2, m3 }))
    await page.evaluate(() => window.__mix25.set('L1P5A3T1F1M1'))
  }
  await page.close()
}
// INSTANT REPLAY: after a home run, the same flight again from a broadcast angle, then the camera comes back
if (!process.env.PHONE_ONLY) {
  const page = await open(1440, 820, '&menu=0&mix=L1P5A3T1&ir=1')
  await setMode(page, 'whatif')
  const cam0 = await page.evaluate(() => window.__cp.NN.camera.position.toArray().map((v) => +v.toFixed(1)).join())
  await page.evaluate(() => { const s = window.__cp.state; Object.assign(s, { ev: 112, la: 28, dir: -4, hand: 1, temp: 70 }); window.__cp.update() }); await page.waitForTimeout(600)
  await page.keyboard.press('Enter')
  let saw = false, bn = ''
  for (let k = 0; k < 60 && !saw; k++) { await page.waitForTimeout(500); const r = await page.evaluate(() => ({ r: window.__mix25.replaying(), b: document.querySelector('#c25bn').textContent })); if (r.r) { saw = true; bn = r.b } }
  const camR = await page.evaluate(() => window.__cp.NN.camera.position.toArray().map((v) => +v.toFixed(1)).join())
  check('a home run gets an INSTANT REPLAY from another camera', saw && /INSTANT REPLAY/.test(bn) && camR !== cam0, JSON.stringify({ saw, bn, cam0, camR }))
  let back = false
  for (let k = 0; k < 120 && !back; k++) { await page.waitForTimeout(500); back = await page.evaluate(() => !window.__mix25.replaying()) }
  const cam1 = await page.evaluate(() => window.__cp.NN.camera.position.toArray().map((v) => +v.toFixed(1)).join())
  check('after the replay the camera comes back', back && cam1 === cam0, JSON.stringify({ back, cam0, cam1 }))
  await page.keyboard.press('i'); await page.waitForTimeout(300)
  check('I switches instant replay off', /REPLAY: OFF/.test(await page.evaluate(() => document.querySelector('#c25ir').textContent)))
  await page.close()
}
// the SELECT menu: shown on arrival, keys move and choose, Esc comes back, number keys jump
if (!process.env.PHONE_ONLY) {
  const page = await open(1440, 820, '&mix=L1P5A3T1')
  const m0 = await page.evaluate(() => ({ open: document.querySelector('.c25 .sm').classList.contains('open'), n: document.querySelectorAll('.c25 .sm .smi').length, on: document.querySelector('.c25 .sm .smi.on b')?.textContent }))
  check('the SELECT menu opens on arrival with eight modes', m0.open && m0.n === 8 && /DÉJÀ-VU/.test(m0.on), JSON.stringify(m0))
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(200)
  await page.keyboard.press('Enter'); await page.waitForTimeout(1200)
  const m1 = await page.evaluate(() => ({ open: document.querySelector('.c25 .sm').classList.contains('open'), mode: window.__mix25.mode() }))
  check('down and Enter start the DOJO', !m1.open && m1.mode === 'whatif', JSON.stringify(m1))
  await page.keyboard.press('Escape'); await page.waitForTimeout(400)
  const m2 = await page.evaluate(() => ({ open: document.querySelector('.c25 .sm').classList.contains('open'), on: document.querySelector('.c25 .sm .smi.on b')?.textContent }))
  check('Esc brings the menu back on the current mode', m2.open && /DOJO/.test(m2.on), JSON.stringify(m2))
  await page.keyboard.press('1'); await page.waitForTimeout(1200)
  check('a number key jumps straight to that mode', await page.evaluate(() => window.__mix25.mode() === 'replay' && !document.querySelector('.c25 .sm').classList.contains('open')))
  await page.click('#c25mn'); await page.waitForTimeout(400)
  await page.click('.c25 .sm .smi:nth-child(4)'); await page.waitForTimeout(4000)
  const m3 = await page.evaluate(() => ({ open: document.querySelector('#c25m').classList.contains('open'), txt: document.querySelector('#c25mb').textContent.slice(0, 120) }))
  check('clicking BLAST BULLETIN in the menu opens it', m3.open && /HOME RUNS IN/.test(m3.txt), JSON.stringify(m3))
  await page.close()
  // another park: its team's color, Oracle-only features hidden
  const p2 = await open(1440, 820, '&menu=0&park=NYY&mix=L1P5A3T1')
  const ny = await page2info(p2)
  check('another park takes its team color and hides the Oracle-only features', ny.acc.toLowerCase() === '#8fb3e8' && ny.hidden && /Y A N K E E/.test(ny.title), JSON.stringify(ny))
  const X = await layout(p2); check('another park fits', X.overlaps.concat(X.fits, X.titles).length === 0, X.overlaps.concat(X.fits, X.titles).join('; '))
  await p2.close()
}
async function page2info(p) { return p.evaluate(() => ({ acc: getComputedStyle(document.querySelector('#cp')).getPropertyValue('--acc').trim(), hidden: ['#c25lp', '#c25se', '#c25sc', '#c25bb', '#c25kl'].every((s) => document.querySelector(s).style.display === 'none'), title: document.querySelector('#c25h>.t').textContent })) }
// phones: 390x844 and 360x740, every tab's card in the replay and the dojo
for (const [w, h] of [[390, 844], [360, 740]]) {
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
check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '))
console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
await browser.close()
process.exit(fails ? 1 : 0)
