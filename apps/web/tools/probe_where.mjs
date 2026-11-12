// WHERE? (12 Nov, Andrew: "the where button is broken it stays at oracle no matter what I click"): pick AWAY and EVERYWHERE and see what changes
import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } }), errs = []
page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)))
await page.route('**/api.open-meteo.com/**', (r) => r.abort())
await page.goto((process.argv[2] || 'http://localhost:5195') + '/?ui=K&cp=25&seed=7&ir=0&menu=0')
await page.waitForFunction(() => window.__ready && window.__ready() && window.__cpReady && window.__mix25, null, { timeout: 180000 })
await page.waitForTimeout(2500)
const st = () => page.evaluate(() => ({ mode: window.__mix25.mode(), label: document.querySelector('#c25fw em')?.textContent, park: window.__mix25.cur()?.park, d: window.__mix25.cur()?.d, n: document.querySelectorAll('#c25ch [data-pw]').length }))
console.log('start', JSON.stringify(await st()))
for (const k of ['away', 'all', 'oracle']) {
  await page.click('#c25fw', { timeout: 5000 }).catch((e) => console.log('WHERE? not clickable:', e.message.split(String.fromCharCode(10)).slice(0, 4).join(' | '))); await page.waitForTimeout(800)
  const opts = await page.evaluate(() => [...document.querySelectorAll('[data-pw]')].map((b) => b.dataset.pw + ':' + b.className))
  const hit = await page.evaluate((k) => { const b = document.querySelector(`[data-pw="${k}"]`); if (!b) return 'none'; const r = b.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], top: t === b || b.contains(t) ? 'itself' : (t?.id || t?.className || t?.tagName) } }, k)
  console.log('  what is on top of', k, JSON.stringify(hit))
  await page.click(`[data-pw="${k}"]`, { timeout: 5000 }).catch((e) => console.log('  not clickable:', e.message.split(String.fromCharCode(10)).slice(0, 6).join(' | '))); await page.waitForTimeout(1500)
  console.log('picked', k, JSON.stringify(opts), JSON.stringify(await st()))
}
console.log('errors', JSON.stringify(errs))
await browser.close()
