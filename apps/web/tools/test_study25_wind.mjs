// Study 25 wind (29 Oct, night): the engine's crosswind and the windsocks and air streams (src/cockpits/wind25.js).
// Run against a server on 5174 (dev) or URL=...: node tools/test_study25_wind.mjs
//   flights with no crosswind are exactly what they were before the change (the numbers below were recorded from the engine before it)
//   a crosswind pushes the landing toward the side it blows to, by a plausible amount; the compass conversion uses Oracle's 85 degree azimuth
//   the socks hang in a calm and stream downwind in a breeze; the streams are off in a calm and on in a breeze; nothing throws
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const URL0 = process.env.URL ?? 'http://localhost:5174'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 820 } })
const errs = []
page.on('pageerror', (e) => errs.push(e.message))
await page.route('**/api.open-meteo.com/**', (r) => r.abort())
await page.goto(URL0 + '/?mode=dojo&ui=K&cp=25&seed=7&menu=0')
await page.waitForFunction(() => window.__cp && window.__cp.fly && window.__cpReady, null, { timeout: 180000 })
let fails = 0
const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) fails++ }
// recorded before the crosswind went in (scratch baseline, 29 Oct): ev, la, dir, hand, temp, wind, carry, tab -> landFt, landB
const BEFORE = [
  [{ ev: 103, la: 28, dir: 0, hand: 1, temp: 62, wind: 0, carry: 1, dws: 0, tab: true }, 396.73334072553587, 5.725805365625539],
  [{ ev: 110, la: 30, dir: 25, hand: -1, temp: 70, wind: 0, carry: 1, dws: 0, tab: true }, 429.6903707884327, 31.82570488074357],
  [{ ev: 98, la: 24, dir: -30, hand: 1, temp: 55, wind: 0, carry: 1.02, dws: 0, tab: false }, 352.3057083824303, -38.72306266331189],
  [{ ev: 105, la: 27, dir: 10, hand: 1, temp: 62, wind: 10, carry: 1, dws: 0, tab: true }, 429.36813569160427, 17.386995234909765],
  [{ ev: 105, la: 27, dir: -10, hand: 1, temp: 62, wind: -12, carry: 1, dws: 0, tab: false }, 352.9475999190286, -10.141416580467943],
]
const same = await page.evaluate((B) => B.map(([s, ft, b]) => { const r = window.__cp.fly(s, {}); return [Math.abs(r.landFt - ft), Math.abs(r.landB - b)] }), BEFORE)
ok(same.every(([a, b]) => a < 1e-9 && b < 1e-9), 'no crosswind: every flight lands exactly where it did before the change ' + JSON.stringify(same.map(([a, b]) => +(a + b).toExponential(1))))
// a crosswind: 15 mph toward right field, then toward left field, on a ball that flies about 400 ft to center
const side = await page.evaluate(() => {
  const s = { ev: 104, la: 28, dir: 0, hand: 1, temp: 62, wind: 0, carry: 1, dws: 0, tab: false }
  const lat = (r) => r.landFt * Math.sin((r.landB * Math.PI) / 180), calm = window.__cp.fly(s, {})
  const rf = window.__cp.fly({ ...s, xwind: 15 }, {}), lf = window.__cp.fly({ ...s, xwind: -15 }, {}), z = window.__cp.fly({ ...s, xwind: 0 }, {})
  return { calmFt: calm.landFt, toRF: lat(rf) - lat(calm), toLF: lat(lf) - lat(calm), zero: Math.abs(z.landFt - calm.landFt) + Math.abs(z.landB - calm.landB), hang: calm.hang }
})
console.log('  a ' + side.calmFt.toFixed(0) + ' ft fly ball (' + side.hang.toFixed(1) + ' s in the air): 15 mph across moves it ' + side.toRF.toFixed(1) + ' ft toward right, ' + side.toLF.toFixed(1) + ' ft toward left')
ok(side.zero < 1e-9, 'xwind 0 is the same as no xwind')
ok(side.toRF > 10 && side.toRF < 80, 'a 15 mph crosswind toward right field moves the landing right by tens of feet')
ok(side.toLF < -10 && side.toLF > -80, 'and toward left field moves it left by about as much')
// the compass: Oracle's home-to-center azimuth is 85, so a wind from 265 blows straight out and a wind from 175 (the Cove side) blows toward left field
const cp = await page.evaluate(() => [window.__cp.windParts(15, 265), window.__cp.windParts(10, 175), window.__cp.windParts(10, 85)])
ok(Math.abs(cp[0].wind - 15) < 1e-9 && Math.abs(cp[0].xwind) < 1e-9, 'a 15 mph wind from 265 degrees blows straight out to center')
ok(Math.abs(cp[1].xwind + 10) < 1e-9 && Math.abs(cp[1].wind) < 1e-9, 'a wind from 175 (the Cove side) blows toward left field')
ok(Math.abs(cp[2].wind + 10) < 1e-9, 'a wind from 85 (the bay) blows in from center')
// the socks and the streams. The dev server reloads the page when other files change, so each phase makes its own windsocks and runs again (up to 3 times) if the page went away under it
const fresh = async () => { await page.waitForFunction(() => window.__cp && window.__cpReady, null, { timeout: 180000 }); return page.evaluate(async () => { if (!window.__w25) { const m = await import('/src/cockpits/wind25.js'); window.__w25 = m.initWind25(window.__cp, {}) } return true }) }
async function phase(fn) { for (let k = 0; k < 3; k++) { try { await fresh(); const r = await fn(); if (r !== 'reloaded') return r } catch (e) { if (k === 2) throw e } } }
const settle = async (mph, from, test) => { await page.evaluate(([m, f]) => window.__w25.set({ mph: m, fromDeg: f }), [mph, from]); for (let k = 0; k < 25; k++) { await page.waitForTimeout(300); const st = await page.evaluate(() => window.__w25?.state()); if (!st) return 'reloaded'; if (test(st)) break } return page.evaluate(() => window.__w25?.state() ?? 'reloaded') }
const calm = await phase(() => settle(0, 265, (st) => st.socks.every((s) => s.droop < 0.25)))
ok(calm.streams === 0, 'calm: no air streams')
const hang = calm.socks.map((s) => { const dx = s.tip[0] - s.hoop[0], dy = s.tip[1] - s.hoop[1], dz = s.tip[2] - s.hoop[2]; return -dy / Math.hypot(dx, dy, dz) })
ok(hang.every((h) => h > 0.9), 'calm: both socks hang nearly straight down ' + JSON.stringify(hang.map((h) => +h.toFixed(2))))
const blow = await phase(() => settle(18, 265, (st) => st.socks.every((s) => s.droop > 1.3)))
ok(blow.streams > 20, '18 mph: the air streams are up (' + blow.streams + ')')
const along = blow.socks.map((s) => { const v = [s.tip[0] - s.hoop[0], s.tip[1] - s.hoop[1], s.tip[2] - s.hoop[2]], L = Math.hypot(...v); return (v[0] * blow.dir[0] + v[1] * blow.dir[1] + v[2] * blow.dir[2]) / L })
ok(along.every((a) => a > 0.85), '18 mph: both socks stream downwind ' + JSON.stringify(along.map((a) => +a.toFixed(2))))
const out = await page.evaluate((d) => { const c = window.__cp.toWorld([0, 0, 0]), f = window.__cp.toWorld([0, 100, 0]); const v = [f.x - c.x, f.z - c.z], L = Math.hypot(...v); return (v[0] * d[0] + v[1] * d[2]) / L }, blow.dir)
ok(out > 0.99, 'a wind from 265 points the socks out toward center field')
const f2 = await phase(() => page.evaluate(() => { window.__w25.setField({ wind: 0, xwind: 12 }); return window.__w25.now }))
ok(Math.abs(f2.xwind - 12) < 1e-6 && Math.abs(f2.wind) < 1e-6 && Math.abs(f2.fromDeg - 355) < 1e-6, 'the dojo frame round-trips: 12 mph toward right field is a wind from 355')
const gusts = await phase(async () => { await page.evaluate(() => { window.__w25.set({ mph: 15, fromDeg: 265 }); window.__w25.gust() }); for (let k = 0; k < 10; k++) { const g = await page.evaluate(() => window.__w25?.state().gusts); if (g == null) return 'reloaded'; if (g) return g; await page.waitForTimeout(300) } return 0 })
ok(gusts >= 1, 'a gust comes when called')
ok(errs.length === 0, 'no page errors ' + JSON.stringify(errs.slice(0, 3)))
await browser.close()
console.log(fails ? `${fails} FAILED` : 'ALL PASS')
process.exit(fails ? 1 : 0)
