// Lifecycle checks for Study 25 (6 Nov, from GPT's brutal red team): a landing moment from the last flight never touches the next ball, and the MOMENTS menu
// cancels what it scheduled when it is closed or a tab changes. No screenshots: state is read from the page.
// Usage: node tools/test_study25_life.mjs [base url]
import { chromium } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:5195'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
let fails = 0
const check = (name, ok, extra = '') => { if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : extra) }
const errs = []
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 })
page.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')))
await page.route('**/api.open-meteo.com/**', (r) => r.abort())
await page.goto(`${base}/?mode=dojo&ui=K&cp=25&seed=7&ir=0&menu=0`)
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 180000 })
await page.waitForTimeout(2000)
const until = async (fn, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn)) return true; await page.waitForTimeout(200) } return false }
const landed = () => until(() => !!(window.__cp.anim?.() && window.__cp.anim().exploded))

// ---- 1. a moment from the last flight never hides the next ball ----
{
  await page.evaluate(() => { window.__mix25.lab('MO', 10) }) // CLAW MACHINE (10 since 6 Nov, when three went): it hides the engine ball at its grab, 1.15 s in
  await page.evaluate(() => window.__mix25.ball((b) => b.hr && b.park === 'SF' && b.ft > 390 && b.ft < 430 && b.dir < -10))
  await page.keyboard.press('Space'); await landed()
  await page.waitForTimeout(150)
  await page.keyboard.press('Space') // a re-hit straight away, while the claw is still coming down
  let hidden = 0, samples = 0
  const t0 = Date.now()
  while (Date.now() - t0 < 4500) { const r = await page.evaluate(() => ({ fly: !!(window.__cp.anim?.() && !window.__cp.anim().exploded), vis: !!window.__cp.ballMesh?.()?.visible })); if (r.fly) { samples++; if (!r.vis) hidden++ } await page.waitForTimeout(150) }
  check('a re-hit while the last landing moment plays: the new ball is never hidden mid-flight', samples > 0 && hidden === 0, JSON.stringify({ samples, hidden }))
  await page.evaluate(() => window.__mix25.lab('MO', 1))
}
// ---- 2. the MOMENTS menu cancels what it scheduled ----
{
  await landed(); await page.waitForTimeout(800)
  const live = () => page.evaluate(() => window.__mix25.moments.shown())
  await page.click('#c25mm'); await page.waitForTimeout(300)
  await page.click('.mmenu .mi[data-mm="pinata"]'); await page.waitForTimeout(60)
  await page.click('.mmenu [data-mm="x"]'); await page.waitForTimeout(1200)
  check('MOMENTS: a moment picked and closed at once never plays', (await live()) === 0, JSON.stringify({ live: await live() }))
  await page.click('#c25mm'); await page.waitForTimeout(300)
  await page.click('.mmenu .mi[data-mm="all"]'); await page.waitForTimeout(900)
  await page.click('#c25tabs [data-tab="whatif"]'); await page.waitForTimeout(6500)
  check('MOMENTS: PLAY ALL stops when the tab changes (nothing still playing 6 s later)', (await live()) === 0, JSON.stringify({ live: await live() }))
}
check('no page errors', errs.length === 0, errs.slice(0, 3).join(' || '))
await browser.close()
console.log(fails ? `${fails} FAILED` : 'ALL PASS')
process.exit(fails ? 1 : 0)
