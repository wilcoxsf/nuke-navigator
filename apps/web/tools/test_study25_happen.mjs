// Study 25 happenings (happen25.js): every happening forced once runs without a page error and shows up where it belongs, measured against the park in the plate frame
// (x to the right, y toward center field, metres): the seal, the serpent, the escapee and the whale out on the water beyond the right-field arcade; the mole on the outfield
// grass inside the wall; the fan with the fries in the lower bowl; the jets high up; and (30 Oct) no streets or buildings round the park, just the water. Then the
// scheduler: one at a time, never
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
  return { sign: pl(h.splashSign()), wall36: window.__cp.wallAt(36).map((v) => v * 0.3048), signTop: (() => { const b = new window.__cp.NN.THREE.Box3().setFromObject(h.splashSign()); return b.max.y - H.y })(), minX: bb.min.x - H.x, names: h.names }
})
check('seven happenings, none of them on a street', geo.names.length === 7 && !['startup', 'ipo', 'evict', 'robocar', 'cablecar'].some((n) => geo.names.includes(n)), geo.names.join())
check('the SPLASH HITS sign is on the face of the right-field wall, below its top', Math.abs(Math.hypot(geo.sign.x, geo.sign.y) - geo.wall36[0]) < 1.5 && geo.signTop < geo.wall36[1] && geo.signTop > 3, JSON.stringify({ sign: geo.sign, wall: geo.wall36, top: geo.signTop }))
// nothing built round the park: no quay, street or block in the happenings' own layer outside the water
const city = await page.evaluate(() => { const h = window.__mix25.happen(), H = window.__cp.toWorld([0, 0, 0]), m4 = new window.__cp.NN.THREE.Matrix4(), v = new window.__cp.NN.THREE.Vector3(); let n = 0
  for (const m of h.root.children) if (m.isInstancedMesh && m.visible) for (let i = 0; i < m.count; i++) { m.getMatrixAt(i, m4); v.setFromMatrixPosition(m4); if (v.y - H.y > -1 && Math.hypot(v.x - H.x, H.z - v.z) > 140 && m.count > 1) n++ }
  return n })
check('no streets or buildings round the park (just the ballpark and the ocean)', city === 0, String(city))
const field = (p) => { const b = (Math.atan2(p.x, p.y) * 180) / Math.PI, d = Math.hypot(p.x, p.y); return Math.abs(b) < 45 && d < 120 }
const RULE = {
  seal: [2, (ps) => ps.every((p) => p.x > 75 && p.z < 3 && p.z > -9), 'in the Cove beyond the right-field arcade, at the water'],
  serpent: [3, (ps) => ps.every((p) => p.x > 120 && p.z < 1), 'out in the bay beyond the Cove'],
  mole: [2, (ps) => ps.length >= 1 && ps.every((p) => field(p) && Math.hypot(p.x, p.y) > 55 && p.z < 1), 'on the outfield grass, inside the wall'],
  fries: [1.2, (ps) => ps.length >= 1 && ps.some((p) => !field(p) && Math.hypot(p.x, p.y) < 110 && p.z > 0 && p.z < 16), 'a fan in the lower bowl'],
  jets: [2, (ps) => ps.filter((p) => p.n > 1).every((p) => p.z > 80), 'high over the park'],
  escapee: [3, (ps) => ps.every((p) => p.x > 120), 'out in the bay'],
  whale: [1, () => true, ''],
}
for (const name of geo.names) {
  const ok = await page.evaluate((n) => window.__mix25.happen().force(n), name)
  check(`${name}: starts when forced`, ok)
  if (!ok) continue
  const [wait, rule, words] = RULE[name]
  await poll(page, (w) => (window.__mix25.happen().since() ?? 0) >= w, wait, 90000) // happening time: frames run slow on the software renderer
  const ps = await pieces(), act = await page.evaluate(() => window.__mix25.happen().active())
  if (words) check(`${name}: ${words}`, act === name && rule(ps), JSON.stringify({ act, ps: ps.map((p) => [p.x, p.y, p.z].map((v) => Math.round(v))) }))
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

// reduced motion: the blimp stays put and nothing is scheduled
const still = await open({ reducedMotion: 'reduce' })
const r0 = await still.evaluate(() => { const h = window.__mix25.happen(); h.setGap(0.2, 0.3); return h.blimp.position.toArray() })
await still.waitForTimeout(4000)
const r1 = await still.evaluate(() => ({ p: window.__mix25.happen().blimp.position.toArray(), act: window.__mix25.happen().active() }))
check('reduced motion: the blimp stays put and nothing starts', r0.every((v, i) => Math.abs(v - r1.p[i]) < 1e-6) && r1.act == null, JSON.stringify([r0, r1]))
await still._ctx.close()
check('no page errors (reduced motion)', errs.length === 0, errs.slice(0, 4).join(' || '))
await browser.close()
console.log(fails ? `${fails} FAILED` : 'ALL PASS')
process.exit(fails ? 1 : 0)
