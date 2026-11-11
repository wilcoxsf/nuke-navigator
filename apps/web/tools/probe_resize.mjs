// one-off (10 Nov, night): after a resize from 1827 to 1280, where do the chooser, the corner block and the histogram panel sit, sampled over time
import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1827, height: 992 } })
await page.route('**/api.open-meteo.com/**', (r) => r.abort())
await page.goto('http://localhost:5195/?mode=dojo&ui=K&cp=25&seed=7&ir=0&menu=0')
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 180000 })
await page.waitForTimeout(1500)
await page.evaluate(() => window.__mix25.setMode('replay')); await page.waitForTimeout(1500)
const snap = (tag) => page.evaluate((tag) => { const R = (q) => { const b = document.querySelector(q)?.getBoundingClientRect(); return b && [Math.round(b.left), Math.round(b.right)] }; const bw = document.querySelector('#c25ch .bw'); return { tag, ch: R('#c25ch'), chRight: document.querySelector('#c25ch').style.right, bw: R('#c25ch .bw'), bwRight: bw?.style.right, inhi: bw?.classList.contains('inhi'), hi: R('#c25hi'), nk: R('#c25nk'), cmp: document.querySelector('.c25').classList.contains('cmp') } }, tag)
console.log(JSON.stringify(await snap('before')))
await page.setViewportSize({ width: 1280, height: 720 })
for (const t of [100, 400, 900, 1500, 3000, 6000]) { await page.waitForTimeout(t === 100 ? 100 : t - [100, 400, 900, 1500, 3000, 6000][[100, 400, 900, 1500, 3000, 6000].indexOf(t) - 1]); console.log(JSON.stringify(await snap('+' + t))) }
await browser.close()
