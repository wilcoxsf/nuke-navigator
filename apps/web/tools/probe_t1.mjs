// one-off (10 Nov, night): the corner block against the histogram panel at 1440x820, type T1 and the locked T16
import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 820 } })
await page.route('**/api.open-meteo.com/**', (r) => r.abort())
await page.goto('http://localhost:5195/?mode=dojo&ui=K&cp=25&seed=7&ir=0&menu=0')
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 180000 })
await page.waitForTimeout(1500)
await page.evaluate(() => window.__mix25.setMode('replay')); await page.waitForTimeout(1200)
for (const mx of ['L2P5A3T16', 'L2P5A3T1', 'L2P1A3T1']) {
  await page.evaluate((c) => window.__mix25.set(c), mx); await page.waitForTimeout(1500)
  console.log(mx, JSON.stringify(await page.evaluate(() => { const R = (q) => { const b = document.querySelector(q)?.getBoundingClientRect(); return b && [Math.round(b.top), Math.round(b.bottom), Math.round(b.height)] }; return { hi: R('#c25hi'), t: R('#c25hi>.t'), bw: R('#c25ch .bw'), hb: R('#c25hb'), bat: R('.c25>.batter'), hdr: R('.c25>.hdr'), fit: window.__mix25.cornerFit(), tight: document.querySelector('#c25ch .bw')?.classList.contains('tight'), ts: getComputedStyle(document.querySelector('.c25')).getPropertyValue('--ts') } })))
}
await browser.close()
