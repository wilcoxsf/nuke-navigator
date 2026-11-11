// one-off (10 Nov, night): the dojo with OTHER PARKS COL: the state, the awayWall crossing, and the flight against Coors by hand
import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1827, height: 992 } }), errs = []
page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)))
await page.route('**/api.open-meteo.com/**', (r) => r.abort())
await page.goto('http://localhost:5195/?mode=dojo&ui=K&cp=25&seed=7&ir=0&menu=0')
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 180000 })
await page.waitForTimeout(1500)
await page.evaluate(() => window.__mix25.ball((b) => b.hr && b.park === 'BOS')); await page.waitForTimeout(1500); await page.click('#c25nk'); await page.waitForTimeout(9000)
await page.evaluate(() => document.querySelector('#c25tabs [data-tab="whatif"]').click()); await page.waitForTimeout(1200)
await page.evaluate(() => { window.__mix25.dojoPark('COL'); Object.assign(window.__cp.state, { ev: 108, la: 29, dir: -18, wind: 0, xwind: 0 }); window.__cp.update() }); await page.waitForTimeout(1200)
console.log(JSON.stringify(await page.evaluate(() => {
  const s = window.__cp.state, aw = window.__mix25.awayWall()
  return { st: { ev: s.ev, la: s.la, dir: s.dir, temp: s.temp, wind: s.wind, xwind: s.xwind, tab: s.tab, carry: s.carry, co: s.carryOverride }, aw, mode: window.__mix25.mode(), show: document.querySelector('.c25').classList.contains('blast') }
})))
console.log('errors', JSON.stringify(errs))
await browser.close()
