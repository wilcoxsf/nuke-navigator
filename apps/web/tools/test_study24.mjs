// Real-interaction test of Study 24 (the mixer). No screenshots: every layout (L1-L5) and panel frame (P1-P5) is checked by measuring boxes at three window sizes:
// panels do not overlap (except the THEATER park, which sits behind its rails), every panel title is visible (the topmost element at its centre is the title itself,
// so a title cut by its own border or covered by another panel fails), park overlays do not collide with each other or with the rails, pictures fit their boxes,
// panel contents do not spill, histogram labels are not cut. Then every axis steps without page errors, every verdict style shows odds, what-if and a swing work.
// Usage: node tools/test_study24.mjs [base url]
import { chromium } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:5174'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
let fails = 0
const check = (name, ok, extra = '') => { if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : extra) }
const errs = []

async function open(w, h, mix) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
  page.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')))
  await page.goto(`${base}/?mode=dojo&ui=K&cp=24&seed=7&mix=${mix}`)
  await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix24, null, { timeout: 180000 })
  await page.waitForTimeout(2500)
  return page
}
const layout = (page) => page.evaluate(() => {
  const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } }
  const Q = (s) => document.querySelector(s)
  const inter = (a, b) => a && b && a.w > 0 && b.w > 0 && a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1
  const g = Q('.c24'), L4 = g.classList.contains('L4'), out = { overlaps: [], fits: [], titles: [] }
  const P = { hdr: Q('.c24>.hdr'), park: Q('.c24>.park'), pitch: Q('.c24>.pitch'), batter: Q('.c24>.batter'), swing: Q('.c24>.swing'), hists: Q('.c24>.hists'), strip: Q('.c24>.strip') }
  const names = Object.keys(P)
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
    if (L4 && (names[i] === 'park' || names[j] === 'park')) continue
    if (inter(R(P[names[i]]), R(P[names[j]]))) out.overlaps.push(names[i] + ' x ' + names[j])
  }
  for (const k of names) { const r = R(P[k]); if (r.l < -1 || r.t < -1 || r.r > innerWidth + 1 || r.b > innerHeight + 1) out.overlaps.push(k + ' off screen') }
  // park overlays: with each other, and in THEATER with the rails
  const ov = ['#c24rd', '#c24v', '#c24ch', '#c24t'].map((s) => [s, R(Q(s))])
  for (let i = 0; i < ov.length; i++) for (let j = i + 1; j < ov.length; j++) if (inter(ov[i][1], ov[j][1])) out.overlaps.push(ov[i][0] + ' x ' + ov[j][0])
  if (L4) for (const [s, r] of ov) for (const k of ['batter', 'swing', 'hists', 'pitch']) if (inter(r, R(P[k]))) out.overlaps.push(s + ' under rail ' + k)
  for (const [s, r] of ov) { const pr = R(P.park); if (r && r.w && (r.r > pr.r + 1 || r.b > pr.b + 1 || r.l < pr.l - 1)) out.overlaps.push(s + ' outside the park') }
  // titles: visible and on top at their centre
  for (const t of document.querySelectorAll('.c24>.pnl>.t')) {
    const r = R(t)
    if (!r.w) continue
    const pe = t.style.pointerEvents; t.style.pointerEvents = 'auto' // the park panel ignores the pointer by design; make its title hit-testable for this check
    const el = document.elementFromPoint(r.l + r.w / 2, r.t + r.h / 2)
    t.style.pointerEvents = pe
    if (!(el === t || t.contains(el))) out.titles.push(t.textContent.replace(/\s+/g, '').slice(0, 14) + ' hidden by ' + (el?.className || el?.tagName))
    if (r.t < 0 || r.b > innerHeight) out.titles.push(t.textContent.replace(/\s+/g, '').slice(0, 14) + ' off screen')
  }
  for (const sel of ['#c24f', '#c24s']) { const box = R(Q(sel)), pre = R(Q(sel + ' pre')); if (box && pre && (pre.w > box.w + 2 || pre.h > box.h + 2)) out.fits.push(`${sel}: art ${Math.round(pre.w)}x${Math.round(pre.h)} in ${Math.round(box.w)}x${Math.round(box.h)}`) }
  for (const sel of ['#c24hb', '.c24 .pitch .pin', '.c24 .batter .bin', '#c24pl']) { const p = Q(sel); if (p && p.scrollHeight > p.clientHeight + 2) out.fits.push(sel + ' spills ' + p.scrollHeight + '>' + p.clientHeight) }
  const sw = Q('.c24>.swing'), cap = R(Q('#c24cap')); if (cap && cap.b > R(sw).b + 1) out.fits.push('swing caption spills')
  for (const lb of document.querySelectorAll('#c24hb .lb')) if (lb.scrollWidth > lb.clientWidth + 2) out.fits.push('histogram label cut: ' + lb.textContent.slice(0, 30))
  for (const b of document.querySelectorAll('.c24 .strip .bt[data-i]')) {
    const lab = b.querySelector('.ps'), ud = b.querySelector('.ud')
    if (lab && ud) { const a = lab.getBoundingClientRect(), u = ud.getBoundingClientRect(); if (a.right > u.left + 1 && a.left < u.right && a.bottom > u.top && a.top < u.bottom) out.overlaps.push('label x +/- in ' + lab.textContent) }
  }
  for (const row of document.querySelectorAll('.c24>.hdr>div')) if (getComputedStyle(row).overflowX !== 'auto' && row.scrollWidth > row.clientWidth + 2) out.fits.push('header row cut ' + row.scrollWidth + '>' + row.clientWidth)
  // every header button is the topmost thing at its centre and sits inside the header (a spilled row once hid LANDING PARTY under a panel title)
  const hr = R(P.hdr)
  for (const b of document.querySelectorAll('.c24>.hdr .bt')) {
    const r = R(b), row = R(b.closest('.h1, .h2'))
    if (!r.w || r.l + r.w / 2 < row.l || r.l + r.w / 2 > row.r) continue // hidden on phones, or scrolled out of the sideways-scrolling feature bar
    const el = document.elementFromPoint(r.l + r.w / 2, r.t + r.h / 2)
    if (!(el === b || b.contains(el))) out.overlaps.push('header button covered: ' + b.textContent.trim())
    if (r.b > hr.b + 1 || r.t < hr.t - 1) out.overlaps.push('header button outside the header: ' + b.textContent.trim())
  }
  return out
})

const SIZES = process.env.PHONE_ONLY ? [] : [[1827, 992], [1440, 820], [1280, 720]]
for (const [w, h] of SIZES) {
  const page = await open(w, h, 'L1P1C1W1A1T1V1')
  for (const L of [1, 2, 3, 4, 5]) for (const P of [1, 2, 3, 4, 5]) for (const T of (P === 1 ? [1, 3, 4] : [1])) {
    const code = `L${L}P${P}C1W1A1T${T}V${P === 1 ? 5 : 1}`
    await page.evaluate((c) => window.__mix24.set(c), code)
    await page.waitForTimeout(700)
    const X = await layout(page)
    const bad = X.overlaps.concat(X.fits, X.titles)
    check(`${w}x${h} ${code}`, bad.length === 0, bad.slice(0, 6).join('; '))
  }
  if (w === 1827) {
    await page.evaluate(() => window.__mix24.set('L1P1C1W1A1T1V1')); await page.waitForTimeout(800)
    // every verdict style shows odds
    for (const V of [1, 2, 3, 4, 5]) {
      await page.evaluate((c) => window.__mix24.set(c), `L1P1C1W1A1T1V${V}`); await page.waitForTimeout(400)
      const t = await page.evaluate(() => (document.querySelector('#c24rd').textContent + ' ' + document.querySelector('#c24v').textContent))
      check(`V${V} shows odds and distance`, /\d+%|<1%|>99%/.test(t.replace(/\s+/g, '')) && /FT/.test(t), t.replace(/\s+/g, ' ').slice(0, 120))
    }
    await page.evaluate(() => window.__mix24.set('L1P1C1W1A1T1V1')); await page.waitForTimeout(800)
    // every axis steps through every option without errors
    const before = errs.length
    for (const k of ['L', 'P', 'C', 'W', 'A', 'T', 'V']) {
      const n = await page.evaluate((k) => document.querySelectorAll('.mx[data-ax]').length && ({ L: 5, P: 5, C: 8, W: 6, A: 8, T: 5, V: 5 })[k], k)
      for (let i = 0; i < n; i++) { await page.click(`.mx[data-ax="${k}"]`); await page.waitForTimeout(k === 'W' || k === 'C' ? 900 : 250) }
    }
    check('every option of every axis renders without page errors', errs.length === before, errs.slice(before, before + 2).join(' | '))
    const code = await page.evaluate(() => window.__mix24.code())
    check('stepping each axis all the way round returns to the start', code === 'L1 P1 C1 W1 A1 T1 V1', code)
    await page.click('#c24lg'); await page.waitForTimeout(400)
    const lg = await page.evaluate(() => ({ open: document.querySelector('#c24m').classList.contains('open'), opts: document.querySelectorAll('#c24mb .legend .o').length }))
    check('the ? legend lists every option', lg.open && lg.opts === 42, JSON.stringify(lg))
    await page.click('#c24mb .legend .o[data-k="L"][data-i="3"]'); await page.waitForTimeout(600)
    check('clicking an option in the legend applies it', (await page.evaluate(() => window.__mix24.code())).startsWith('L3'))
    await page.keyboard.press('Escape'); await page.evaluate(() => window.__mix24.set('L1P1C1W1A1T1V1')); await page.waitForTimeout(800)
    const odds = await page.evaluate(() => document.querySelector('#c24v .od').textContent)
    check('replay ball carries model odds', /HOME RUN ODDS \d+%|HOME RUN ODDS >99%/.test(odds), odds)
    await page.click('#c24bs'); await page.waitForTimeout(400)
    const m = await page.evaluate(() => ({ groups: document.querySelectorAll('#c24mb .allst h5').length, txt: document.querySelector('#c24mb').textContent }))
    check('all-stats pop-up has five groups and the odds source', m.groups === 5 && /ODDS FROM/.test(m.txt), String(m.groups))
    await page.keyboard.press('Escape'); await page.waitForTimeout(200)
    const d0 = await page.evaluate(() => document.querySelector('#c24d').textContent)
    await page.keyboard.press(']'); await page.waitForTimeout(900)
    check('next ball changes the distance', d0 !== (await page.evaluate(() => document.querySelector('#c24d').textContent)))
    // features in the shared panel: LANDING PARTY (L), SEAT SEANCE (G), SHOT CALLER (C), and the BAY BAROMETER pop-up (W, answered from a fixture: no network)
    await page.keyboard.press('l'); await page.waitForTimeout(2500)
    const lpx = await page.evaluate(() => ({ t: document.querySelector('#c24hi>.t').textContent.replace(/\s+/g, ''), rows: document.querySelectorAll('#c24hb .lpr').length, vis: [...document.querySelectorAll('#c24hb .lpr')].filter((r) => r.style.display !== 'none').length }))
    check('LANDING PARTY lists real Oracle home runs', /LANDINGPARTY/.test(lpx.t) && lpx.rows === 8 && lpx.vis >= 3, JSON.stringify(lpx))
    let X = await layout(page); check('LANDING PARTY fits its panel', X.fits.length === 0, X.fits.join('; '))
    await page.keyboard.press('g'); await page.waitForTimeout(5000)
    const sex = await page.evaluate(() => ({ t: document.querySelector('#c24hi>.t').textContent.replace(/\s+/g, ''), txt: document.querySelector('#c24hb').textContent }))
    check('SEAT SEANCE tallies 300 ghosts', /SEATSEANCE/.test(sex.t) && /300 GHOSTS/.test(sex.txt) && /HOME RUN\s*\d+%/.test(sex.txt), sex.txt.slice(0, 120))
    X = await layout(page); check('SEAT SEANCE fits its panel', X.fits.length === 0, X.fits.join('; '))
    await page.keyboard.press('c'); await page.waitForTimeout(800)
    const xy = await page.evaluate(() => { const cp = window.__cp, v = cp.toWorld([110 * Math.sin(0.6), 110 * Math.cos(0.6), 9]).project(cp.NN.camera); const r = document.querySelector('canvas').getBoundingClientRect(); return [r.left + ((v.x + 1) / 2) * r.width, r.top + ((1 - v.y) / 2) * r.height] })
    await page.mouse.click(xy[0], xy[1]); await page.waitForTimeout(9000)
    const scx = await page.evaluate(() => document.querySelector('#c24hb').textContent)
    check('SHOT CALLER answers a click in the stands', /SPOT:/.test(scx) && /CLOSEST REAL ORACLE HOME RUNS/.test(scx), scx.slice(0, 160))
    X = await layout(page); check('SHOT CALLER fits its panel', X.fits.length === 0, X.fits.join('; '))
    await page.keyboard.press('c'); await page.waitForTimeout(500)
    await page.route('**/api.open-meteo.com/**', (r) => { const t = Array.from({ length: 48 }, (_, i) => new Date(Date.now() + (i - 1) * 3600e3).toISOString().slice(0, 13) + ':00'); r.fulfill({ contentType: 'application/json', body: JSON.stringify({ hourly: { time: t, temperature_2m: t.map(() => 58), relative_humidity_2m: t.map(() => 80), surface_pressure: t.map(() => 1012), wind_speed_10m: t.map(() => 14), wind_direction_10m: t.map(() => 280), cloud_cover_low: t.map(() => 90), visibility: t.map(() => 3000) } }) }) })
    await page.keyboard.press('w'); await page.waitForTimeout(2500)
    const bay = await page.evaluate(() => document.querySelector('#c24mb').textContent)
    check('BAY BAROMETER turns the forecast into feet and calls Karl', /FT/.test(bay) && /KARL IS IN/.test(bay) && /OPEN-METEO/.test(bay), bay.slice(0, 160))
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    await page.click('#c24bl'); await page.waitForTimeout(4000)
    const bl = await page.evaluate(() => ({ txt: document.querySelector('#c24mb').textContent, rows: document.querySelectorAll('#c24mb .btab .r.go').length, cards: document.querySelectorAll('#c24mb .bcard').length }))
    check('BLAST BULLETIN lists the day with superlatives and the Oracle check', bl.rows > 10 && bl.cards === 4 && /WOULD BE GONE AT ORACLE/.test(bl.txt), JSON.stringify({ rows: bl.rows, cards: bl.cards }))
    await page.click('#c24mb .btab .r.go'); await page.waitForTimeout(1500)
    const ld = await page.evaluate(() => ({ open: document.querySelector('#c24m').classList.contains('open'), mode: document.querySelector('[data-mode="whatif"]').classList.contains('on') }))
    check('a bulletin row flies that swing in the park', !ld.open && ld.mode, JSON.stringify(ld))
    await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('nn-dd-')) localStorage.removeItem(k) })
    await page.click('#c24dd'); await page.waitForTimeout(1500)
    for (let k = 0; k < 5; k++) { await page.click('#c24mb [data-c="' + (k % 2) + '"]'); await page.waitForTimeout(400) }
    const dd = await page.evaluate(() => document.querySelector('#c24mb').textContent)
    check('DAILY DINGER plays five calls and scores you against the model', /YOU \d · THE MODEL \d/.test(dd) && /(BEAT THE MODEL|DEAD HEAT|MODEL WINS)/.test(dd), dd.slice(0, 160))
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    await page.evaluate(() => { try { localStorage.removeItem('nn-witness') } catch {} })
    await page.click('#c24ww'); await page.waitForTimeout(800)
    await page.click('#c24mb .wd >> nth=0'); await page.waitForTimeout(400)
    const ww = await page.evaluate(() => ({ sum: document.querySelector('#c24mb .wsum')?.textContent ?? '', days: document.querySelectorAll('#c24mb .wd').length }))
    check('WALLOP WITNESS lists Oracle game days and counts what you saw', ww.days > 100 && /\d+ HOME RUNS? SEEN/.test(ww.sum) && !/^\s*0 HOME/.test(ww.sum), ww.sum.replace(/\s+/g, ' ').slice(0, 120))
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    await page.click('[data-mode="whatif"]'); await page.waitForTimeout(1200)
    const wf = await page.evaluate(() => ({ pitch: document.querySelector('#c24pl').textContent, od: document.querySelector('#c24v .od').textContent }))
    check('what-if: no pitch, odds still shown', /NO PITCH/.test(wf.pitch) && /\d+%/.test(wf.od), wf.od)
    await page.keyboard.press('Enter'); await page.waitForTimeout(6000)
    const tl = await page.evaluate(() => document.querySelector('#c24t')?.textContent ?? '')
    check('a swing lands in the tally', /SWINGS\s*01/.test(tl), tl.slice(0, 60))
  }
  await page.close()
}
// phones: 390x844 (and a small 360x740), every tab's card, the same overlap, spill and title checks, no sideways scroll, no "needs room" guard
for (const [w, h] of [[390, 844], [360, 740]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errs.push(e.message))
  await page.goto(`${base}/?mode=dojo&ui=K&cp=24&seed=7&mix=L1P1C1W1A1T1V1`)
  await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix24, null, { timeout: 180000 })
  await page.waitForTimeout(2500)
  for (const card of ['batter', 'swing', 'hists', 'pitch']) {
    await page.click(`#c24pt [data-card="${card}"]`); await page.waitForTimeout(700)
    const X = await layout(page)
    const ph = await page.evaluate((card) => ({ side: document.documentElement.scrollWidth > innerWidth + 1, guard: [...document.querySelectorAll('.guard')].some((g) => getComputedStyle(g).display !== 'none'), shown: getComputedStyle(document.querySelector('.c24>.' + card)).display !== 'none', tall: [...document.querySelectorAll('.c24>.pnl>.t')].filter((t) => t.getBoundingClientRect().height > 16).map((t) => t.textContent.slice(0, 12)) }), card)
    const bad = X.overlaps.concat(X.fits, X.titles, ph.side ? ['sideways scroll'] : [], ph.guard ? ['too-small guard shown'] : [], ph.shown ? [] : ['card not shown'], ph.tall.map((t) => 'title wraps: ' + t))
    check(`phone ${w}x${h} ${card}`, bad.length === 0, bad.slice(0, 6).join('; '))
  }
  await ctx.close()
}
check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '))
console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
await browser.close()
process.exit(fails ? 1 : 0)
