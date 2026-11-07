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
// ---- 3. (7 Nov, red team 4.7) Escape closes MOMENTS and ends what it was playing, as the X does ----
{
  await page.click('#c25tabs [data-tab="replay"]').catch(() => {}); await page.waitForTimeout(800)
  if (!(await page.evaluate(() => document.querySelector('.mmenu')?.classList.contains('on')))) { await page.click('#c25mm'); await page.waitForTimeout(300) } // (the PLAY ALL check before may leave it open)
  await page.click('.mmenu .mi[data-mm="hand"]')
  await until(() => window.__mix25.moments.shown() > 0, 8000)
  const playing = await page.evaluate(() => window.__mix25.moments.shown())
  await page.keyboard.press('Escape'); await page.waitForTimeout(400)
  check('MOMENTS: Escape closes the menu and ends the moment playing', playing > 0 && (await page.evaluate(() => window.__mix25.moments.shown())) === 0, JSON.stringify({ playing }))
}
// ---- 4. (red team 4.1) MAKE YOUR CALLING CARD opens the editor when WALLOP WITNESS opened on YOUR GAMES by itself (a logged game), with no tab clicked first ----
{
  // (the same page, reloaded with a logged game: a second page starves on the software renderer)
  const p2 = page
  await p2.evaluate(() => { try { localStorage.setItem('nn-witness', JSON.stringify(['2025-07-04'])) } catch {} })
  await p2.reload()
  await p2.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 180000, polling: 500 })
  await p2.waitForTimeout(1500)
  await p2.click('#c25tabs [data-tab="witness"]')
  await p2.waitForFunction(() => !!document.querySelector('#c25wcard'), null, { timeout: 30000, polling: 250 }).catch(() => {})
  const onMine = await p2.evaluate(() => document.querySelector('[data-wt="mine"]')?.classList.contains('on'))
  await p2.click('#c25wcard'); await p2.waitForTimeout(800)
  const ed = await p2.evaluate(() => ({ editor: !!document.querySelector('.wcd canvas'), save: [...document.querySelectorAll('.wcd .bt')].some((b) => b.textContent === 'SAVE') }))
  check('WALLOP WITNESS: MAKE YOUR CALLING CARD opens the editor straight from YOUR GAMES (no tab clicked first)', onMine === true && ed.editor && ed.save, JSON.stringify({ onMine, ...ed }))
  await p2.evaluate(() => document.activeElement?.blur?.()); await p2.keyboard.press('5'); await p2.waitForTimeout(600)
  check('WALLOP WITNESS: a tab key with the calling card open (focus outside it) leaves the card being made', await p2.evaluate(() => !!document.querySelector('.wcd canvas')))
  await p2.click('#c25cl').catch(() => {}); await p2.waitForTimeout(500) // (close the window, so the tabs are free)
}
// ---- 5. (red team 4.3) ALL / AT ORACLE / AWAY: the landing puffs and rings go when they finish; nothing piles up in the map ----
{
  await page.click('#c25tabs [data-tab="blast"]')
  await page.waitForFunction(() => !!document.querySelector('#c25hmw'), null, { timeout: 120000, polling: 500 })
  await page.waitForTimeout(800); await page.click('#c25hmw'); await page.waitForTimeout(400); await page.keyboard.type('FLORES', { delay: 30 }); await page.keyboard.press('Enter')
  await until(() => (window.__mix25.heat()?.bombCounts?.()?.all ?? 0) > 0, 240000)
  await page.waitForTimeout(12000)
  const kids = () => page.evaluate(() => window.__nn.scene.children.find((x) => x.userData?.drops?.length)?.children.length ?? -1)
  const k0 = await kids()
  for (const w of ['home', 'away', 'all', 'home', 'all']) { await page.click(`[data-ha="${w}"]`).catch(() => {}); await page.waitForTimeout(9000) }
  const k1 = await kids()
  check('BLAST RADIUS: switching ALL / AT ORACLE / AWAY five times leaves no pile of landing effects in the map', k0 > 0 && k1 <= k0 + 2, JSON.stringify({ k0, k1 }))
}
check('no page errors', errs.length === 0, errs.slice(0, 3).join(' || '))
await browser.close()
console.log(fails ? `${fails} FAILED` : 'ALL PASS')
process.exit(fails ? 1 : 0)
