// Study 25 happenings (happen25.js): every happening forced once runs without a page error and shows up where it belongs, measured against the park in the plate frame
// (x to the right, y toward center field, metres): the seal, the serpent, the escapee and the whale out on the water beyond the right-field arcade; the mole on the outfield
// grass inside the wall; the fan with the fries in the lower bowl; the eviction, the driverless car and the cable car on King Street beyond the third-base stands; the
// startup's sign on the roof across the street; the cash over the side stands, not in front of the board; the jets high up. Then the scheduler: one at a time, never
// while a ball is up, the mole clear of the last landing; the SPLASH HITS sign follows the count; under reduced motion nothing drives.
// Usage: node tools/test_study25_happen.mjs [base url]
import { chromium } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:5175'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
let fails = 0
const check = (name, ok, extra = '') => { if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : extra) }
const errs = []
async function open(ctxOpts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 820 }, deviceScaleFactor: 1, ...ctxOpts })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')))
  page.on('console', (m) => { if (m.type() === 'warning' && /^happening/.test(m.text())) errs.push(m.text()) })
  await page.route('**/api.open-meteo.com/**', (r) => r.abort())
  await page.goto(`${base}/?mode=dojo&ui=K&cp=25&seed=7&menu=0&ir=0`)
  await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25?.happen?.()?.splashSign?.(), null, { timeout: 180000 })
  await page.waitForTimeout(1500)
  page._ctx = ctx
  return page
}
const poll = async (page, fn, arg, ms = 8000) => { const t0 = Date.now(); for (;;) { const v = await page.evaluate(fn, arg); if (v || Date.now() - t0 > ms) return v; await page.waitForTimeout(250) } }

const page = await open()
await page.evaluate(() => window.__mix25.happen().setGap(600, 700)) // nothing on its own while each one is forced
// in plate coordinates: where each live piece of the running happening stands
const pieces = () => page.evaluate(() => {
  const h = window.__mix25.happen(), H = window.__cp.toWorld([0, 0, 0]), v = new window.__cp.NN.THREE.Vector3()
  return h.groupOf(h.active()).filter((g) => g.visible).map((g) => { g.getWorldPosition(v); return { x: v.x - H.x, y: H.z - v.z, z: v.y - H.y, n: g.children.length } })
})
const geo = await page.evaluate(() => {
  const h = window.__mix25.happen(), H = window.__cp.toWorld([0, 0, 0]), v = new window.__cp.NN.THREE.Vector3(), st = window.__nn.stadium
  const pl = (o) => { o.getWorldPosition(v); return { x: v.x - H.x, y: H.z - v.z, z: v.y - H.y } }
  const bb = new window.__cp.NN.THREE.Box3().setFromObject(st)
  return { K: h.K, robo: pl(h.robo), sign: pl(h.splashSign()), start: h.startup(), wall36: window.__cp.wallAt(36).map((v) => v * 0.3048), signTop: (() => { const b = new window.__cp.NN.THREE.Box3().setFromObject(h.splashSign()); return b.max.y - H.y })(), minX: bb.min.x - H.x, names: h.names }
})
check('twelve happenings', geo.names.length === 12 && !geo.names.includes('karl'), geo.names.join())
check('King Street runs beyond the third-base stands; the car drives Terry Francois Blvd across the Cove', geo.K.face < geo.minX && geo.K.up < geo.minX - 1 && geo.robo.y > 216 && geo.robo.y < 232, JSON.stringify({ K: geo.K, minX: geo.minX, robo: geo.robo }))
check('the SPLASH HITS sign is on the face of the right-field wall, below its top', Math.abs(Math.hypot(geo.sign.x, geo.sign.y) - geo.wall36[0]) < 1.5 && geo.signTop < geo.wall36[1] && geo.signTop > 3, JSON.stringify({ sign: geo.sign, wall: geo.wall36, top: geo.signTop }))
const seen = await page.evaluate(() => {
  const NN = window.__cp.NN, cam = NN.camera, c = NN.renderer?.domElement ?? document.querySelector('canvas')
  return [[66, 248, 20], [64, 232, 1], [120, 224, 1], [-100, 207, 1]].map((q) => { const v = window.__cp.toWorld(q).project(cam), x = (v.x + 1) / 2 * innerWidth, y = (1 - v.y) / 2 * innerHeight, el = document.elementFromPoint(x, y); return { q, x: Math.round(x), y: Math.round(y), canvas: el?.tagName === 'CANVAS', front: v.z < 1 } })
})
check('from the broadcast seat, the startup roof, the Mission Rock sidewalk and street, and Second Street are in view (not under a panel)', seen.every((s) => s.canvas && s.front), JSON.stringify(seen))
check('a startup is on the roof from the start', !!geo.start?.name && /ROUND|SEED/.test(geo.start.round), JSON.stringify(geo.start))
const field = (p) => { const b = (Math.atan2(p.x, p.y) * 180) / Math.PI, d = Math.hypot(p.x, p.y); return Math.abs(b) < 45 && d < 120 }
const RULE = {
  seal: [2, (ps) => ps.every((p) => p.x > 75 && p.z < 3 && p.z > -9), 'in the Cove beyond the right-field arcade, at the water'],
  serpent: [3, (ps) => ps.every((p) => p.x > 120 && p.z < 1), 'out in the bay beyond the Cove'],
  mole: [2, (ps) => ps.length >= 1 && ps.every((p) => field(p) && Math.hypot(p.x, p.y) > 55 && p.z < 1), 'on the outfield grass, inside the wall'],
  fries: [1.2, (ps) => ps.length >= 1 && ps.some((p) => !field(p) && Math.hypot(p.x, p.y) < 110 && p.z > 0 && p.z < 16), 'a fan in the lower bowl'],
  evict: [3, (ps) => ps.length >= 4 && ps.every((p) => p.y > 229 && p.y < 235 && p.x > 40 && p.x < 95), 'the pile on the sidewalk at Mission Rock, across the Cove'],
  robocar: [1, (ps) => ps.length >= 1 && ps.every((p) => p.x > 20 && p.x < 156 && p.y > 216 && p.y < 232), 'the cone on Terry Francois Blvd'],
  cablecar: [3, (ps) => ps.length >= 1 && ps.every((p) => Math.abs(p.x - geo.K.rail) < 1.5 || Math.abs(p.y - geo.K.sy) < 1.5), 'on the King Street rails'],
  jets: [2, (ps) => ps.filter((p) => p.n > 1).every((p) => p.z > 80), 'high over the park'],
  escapee: [3, (ps) => ps.every((p) => p.x > 120), 'out in the bay'],
  whale: [1, () => true, ''],
  ipo: [2, () => true, ''],
  startup: [1.5, () => true, ''],
}
for (const name of geo.names) {
  const before = await page.evaluate(() => window.__mix25.happen().startup())
  const ok = await page.evaluate((n) => window.__mix25.happen().force(n), name)
  check(`${name}: starts when forced`, ok)
  if (!ok) continue
  const [wait, rule, words] = RULE[name]
  await poll(page, (w) => (window.__mix25.happen().since() ?? 0) >= w, wait, 90000) // happening time: frames run slow on the software renderer
  const ps = await pieces(), act = await page.evaluate(() => window.__mix25.happen().active())
  if (words) check(`${name}: ${words}`, act === name && rule(ps), JSON.stringify({ act, ps: ps.map((p) => [p.x, p.y, p.z].map((v) => Math.round(v))) }))
  if (name === 'startup') { const after = await page.evaluate(() => window.__mix25.happen().startup()); check('startup: a new company on the roof', after.name !== before.name || after.round !== before.round, JSON.stringify([before, after])) }
  if (name === 'ipo') {
    const r = await page.evaluate(() => window.__mix25.happen().startup()), cash = await page.evaluate(() => {
      const h = window.__mix25.happen(), H = window.__cp.toWorld([0, 0, 0]), m4 = new window.__cp.NN.THREE.Matrix4(), v = new window.__cp.NN.THREE.Vector3(), out = []
      for (const g of h.groupOf('ipo')) g.traverse((m) => { if (!m.isInstancedMesh) return; for (let i = 0; i < m.count; i += 7) { m.getMatrixAt(i, m4); v.setFromMatrixPosition(m4); out.push([v.x - H.x, H.z - v.z]) } })
      return out
    })
    check('ipo: the roof sign says IPO', /^IPO!/.test(r.round), JSON.stringify(r))
    check('ipo: the cash comes down over the side stands, not in front of the board', cash.length > 10 && cash.every(([x, y]) => x < -50 || x > 25), JSON.stringify(cash.slice(0, 6)))
  }
  await page.evaluate(() => window.__mix25.happen().stop())
  const lg = await page.evaluate(() => window.__mix25.happen().log().at(-1))
  check(`${name}: ends cleanly`, lg.name === name && lg.end != null && (await page.evaluate(() => window.__mix25.happen().live())) === 0, JSON.stringify(lg))
}
// the scheduler: one at a time, never while a ball is up
await page.evaluate(() => window.__mix25.happen().setGap(0.3, 0.6))
for (let k = 0; k < 240; k++) { // let the scheduler pick; cut each one short after 2 s of its own time so the test does not sit through a 37 s cable car
  const r = await page.evaluate((n) => { const h = window.__mix25.happen(); if ((h.since() ?? 0) > 2) h.stop(); return h.log().length >= n + 4 }, geo.names.length)
  if (r) break
  await page.waitForTimeout(500)
}
const lg = await page.evaluate((n) => window.__mix25.happen().log().slice(n), geo.names.length)
let overlap = false
for (let i = 1; i < lg.length; i++) if (lg[i - 1].end == null || lg[i].start < lg[i - 1].end - 1e-6) overlap = true
check('scheduler: several happenings on their own, one at a time', lg.length >= 2 && !overlap, JSON.stringify(lg.map((l) => [l.name, l.start.toFixed(1), l.end?.toFixed(1)])))
await page.evaluate(() => window.__mix25.happen().stop())
await page.evaluate(() => { const s = window.__cp.state; Object.assign(s, { ev: 104, la: 29, dir: -12 }); window.__cp.fire() })
const during = []
for (let k = 0; k < 16; k++) { const r = await page.evaluate(() => ({ fly: (window.__cp.progress?.() ?? 1) < 1, act: window.__mix25.happen().active() })); if (r.fly) during.push(r.act); await page.waitForTimeout(150) }
check('scheduler: nothing starts while a ball is in the air', during.length > 0 && during.every((a) => a == null), JSON.stringify(during))
await poll(page, () => (window.__cp.progress?.() ?? 1) >= 1, null, 20000)
await page.evaluate(() => window.__mix25.happen().setGap(600, 700))
await page.evaluate(() => window.__mix25.happen().stop())
const far = []
for (let k = 0; k < 4; k++) {
  const r = await page.evaluate(() => { const h = window.__mix25.happen(); if (!h.force('mole')) return null; const at = window.__cp.anim().at, v = new window.__cp.NN.THREE.Vector3(); const g = h.groupOf('mole')[0]; g.getWorldPosition(v); const d = Math.hypot(v.x - at.x, v.z - at.z); h.stop(); return d })
  if (r != null) far.push(Math.round(r))
}
check('mole: comes up well away from where the last ball came down', far.length > 0 && far.every((d) => d >= 28), JSON.stringify(far))
// the SPLASH HITS sign flips to the count
await page.evaluate(() => { const h = window.__mix25.happen(); h.setSplash(7); h.bump(8) })
check('splash sign: flips to the new count', await poll(page, () => window.__mix25.happen().splash() === 8, null, 6000))
check('no page errors', errs.length === 0, errs.slice(0, 4).join(' || '))
await page._ctx.close()

// reduced motion: the car stays parked and nothing is scheduled
const still = await open({ reducedMotion: 'reduce' })
const r0 = await still.evaluate(() => { const h = window.__mix25.happen(); h.setGap(0.2, 0.3); return h.robo.position.toArray() })
await still.waitForTimeout(4000)
const r1 = await still.evaluate(() => ({ p: window.__mix25.happen().robo.position.toArray(), act: window.__mix25.happen().active() }))
check('reduced motion: the car stays put and nothing starts', r0.every((v, i) => Math.abs(v - r1.p[i]) < 1e-6) && r1.act == null, JSON.stringify([r0, r1]))
await still._ctx.close()
check('no page errors (reduced motion)', errs.length === 0, errs.slice(0, 4).join(' || '))
await browser.close()
console.log(fails ? `${fails} FAILED` : 'ALL PASS')
process.exit(fails ? 1 : 0)
