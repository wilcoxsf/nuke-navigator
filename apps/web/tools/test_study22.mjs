// Real-interaction test of study 22 (One Ball). No screenshots: layout is checked by measuring boxes (no two text or picture boxes intersect, each character picture fits inside its own box, control labels
// clear their +/- buttons), at three window sizes. Also: three histograms render, pop-ups open and close, what-if mode, a swing lands in the tally, no page errors.
// Usage: node tools/test_study22.mjs [base url]
import { chromium } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:5174'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
let fails = 0
const check = (name, ok, extra = '') => { if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', name, extra) }
const errs = []

async function open(w, h, qs = '') {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
  page.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')))
  await page.goto(`${base}/?mode=dojo&ui=K&cp=22&seed=7${qs}`)
  await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady, null, { timeout: 180000 })
  await page.waitForTimeout(2500)
  return page
}
const layout = (page) => page.evaluate(() => {
  const R = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } }
  const inter = (a, b) => a && b && a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1
  const out = { overlaps: [], fits: [] }
  const pairs = [['#c22rd', '#c22v'], ['#c22rd', '#c22ch'], ['#c22ch', '#c22t'], ['#c22v', '#c22ch'], ['#c22f', '#c22i'], ['#c22s', '#c22cap'], ['#c22h', '.c22 .right'], ['.c22 .batter', '.c22 .swing'], ['.c22 .swing', '#c22hi'], ['#c22hi', '#c22sl'], ['.c22 .right', '#c22sl'], ['#c22h', '#c22sl'], ['#c22h', '.c22 .pitch'], ['.c22 .pitch', '.c22 .right'], ['.c22 .pitch', '#c22sl'], ['#c22zg', '#c22pl']]
  for (const [a, b] of pairs) if (inter(R(a), R(b))) out.overlaps.push(a + ' x ' + b)
  for (const sel of ['#c22f', '#c22s']) {
    const box = R(sel), pre = R(sel + ' pre')
    if (box && pre && (pre.w > box.w + 2 || pre.h > box.h + 2)) out.fits.push(`${sel}: art ${Math.round(pre.w)}x${Math.round(pre.h)} in box ${Math.round(box.w)}x${Math.round(box.h)}`)
  }
  for (const b of document.querySelectorAll('.c22 .strip .bt[data-i]')) {
    const lab = b.querySelector('.ps'), val = b.querySelector('b'), ud = b.querySelector('.ud')
    if (lab && ud) { const a = lab.getBoundingClientRect(), u = ud.getBoundingClientRect(); if (a.right > u.left + 1 && a.left < u.right && a.bottom > u.top && a.top < u.bottom) out.overlaps.push('label x +/- in ' + lab.textContent) }
    if (val && ud) { const a = val.getBoundingClientRect(), u = ud.getBoundingClientRect(); if (a.right > u.left + 1 && a.left < u.right && a.bottom > u.top && a.top < u.bottom) out.overlaps.push('value x +/- in ' + lab.textContent) }
  }
  // text that spills outside its own panel
  for (const sel of ['.c22 .batter', '.c22 .swing', '#c22hi', '.c22 .pitch']) { const p = document.querySelector(sel); if (p && p.scrollHeight > p.clientHeight + 2) out.fits.push(sel + ' scrolls: ' + p.scrollHeight + ' > ' + p.clientHeight) }
  return out
})

for (const [w, h] of [[1827, 992], [1440, 820], [1280, 720]]) {
  const page = await open(w, h)
  const L = await layout(page)
  check(`${w}x${h}: no overlapping boxes`, L.overlaps.length === 0, L.overlaps.join('; '))
  check(`${w}x${h}: pictures fit their boxes, panels do not spill`, L.fits.length === 0, L.fits.join('; '))
  if (w === 1827) {
    const d = await page.evaluate(() => ({ svgs: document.querySelectorAll('#c22hi svg').length, art: (document.querySelector('#c22f pre')?.textContent ?? '').length, swing: (document.querySelector('#c22s pre')?.textContent ?? '').length, tally: !!document.querySelector('#c22t'), cls: document.querySelector('#c22f pre')?.className, grid: document.querySelector('#c22g')?.textContent }))
    check('three histograms render', d.svgs === 3, String(d.svgs))
    check('face and swing art drawn in braille poster', d.art > 200 && d.swing > 500 && /br/.test(d.cls ?? ''), `${d.art} ${d.swing} ${d.cls}`)
    check('park band shown', /GONE IN/.test(d.grid ?? ''), d.grid)
    const pz = await page.evaluate(() => ({ cells: document.querySelectorAll('#c22zg svg rect[stroke-width="1.5"]').length, dot: !!document.querySelector('#c22zg svg circle'), text: document.querySelector('#c22pl')?.textContent ?? '', shaded: document.querySelectorAll('#c22zg svg rect[fill-opacity]').length, hasBtn: !!document.querySelector('#c22bp') }))
    check('pitch grid always visible: nine cells, a dot and the stats, no PITCH button', pz.cells === 9 && pz.dot && /SPIN RATE/.test(pz.text) && /APPROACH/.test(pz.text) && /LOCATION/.test(pz.text) && !pz.hasBtn, JSON.stringify({ c: pz.cells, d: pz.dot }))
    await page.click('#c22bs'); await page.waitForTimeout(400)
    await page.keyboard.press('Escape'); await page.waitForTimeout(200)
    check('Escape closes the pop-up', !(await page.evaluate(() => document.querySelector('#c22m').classList.contains('open'))))
    await page.click('#c22bs'); await page.waitForTimeout(400)
    let m = await page.evaluate(() => ({ open: document.querySelector('#c22m').classList.contains('open'), rows: document.querySelectorAll('#c22mb .allst .r').length, groups: document.querySelectorAll('#c22mb .allst h5').length }))
    check('all-stats pop-up lists five groups', m.open && m.groups === 5 && m.rows > 60, `${m.groups} groups ${m.rows} rows`)
    await page.click('#c22cl'); await page.waitForTimeout(200)
    await page.click('#c22bk'); await page.waitForTimeout(500)
    m = await page.evaluate(() => ({ open: document.querySelector('#c22m').classList.contains('open'), tiles: document.querySelectorAll('#c22mb .tile').length }))
    check('parks pop-up shows 30 tiles', m.open && m.tiles === 30, String(m.tiles))
    await page.click('#c22cl'); await page.waitForTimeout(200)
    const ev0 = await page.evaluate(() => document.querySelector('#c22d').textContent)
    await page.keyboard.press(']'); await page.waitForTimeout(800)
    check('next ball changes the distance', ev0 !== (await page.evaluate(() => document.querySelector('#c22d').textContent)))
    await page.click('[data-mode="whatif"]'); await page.waitForTimeout(1200)
    const w2 = await page.evaluate(() => ({ pitchOff: /NO PITCH/.test(document.querySelector('#c22pl')?.textContent ?? ''), like: document.querySelector('#c22hi .like')?.textContent ?? '', svgs: document.querySelectorAll('#c22hi svg').length }))
    check('what-if says there is no pitch and shows real balls like this', w2.pitchOff && /REAL BALLS/.test(w2.like) && w2.svgs === 3, w2.like)
    await page.keyboard.press('Enter'); await page.waitForTimeout(6000)
    const tl = await page.evaluate(() => document.querySelector('#c22t')?.textContent ?? '')
    check('a swing lands in the tally', /SWINGS\s*01/.test(tl), tl.slice(0, 60))
    const L2 = await layout(page)
    check('what-if layout has no overlaps either', L2.overlaps.length === 0 && L2.fits.length === 0, L2.overlaps.concat(L2.fits).join('; '))
  }
  await page.close()
}
check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '))
console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
await browser.close()
process.exit(fails ? 1 : 0)
