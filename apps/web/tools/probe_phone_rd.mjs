// One-off probe (9 Nov): at 360x740 in DEJA-VU, where the readout (#c25rd) and the ball chooser (#c25ch) sit, and what the chooser holds.
import { chromium } from 'playwright-core'
const base = process.argv[2] ?? 'http://localhost:5195'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
const page = await ctx.newPage()
await page.route('**/api.open-meteo.com/**', (r) => r.abort())
await page.goto(`${base}/?mode=dojo&ui=K&cp=25&seed=7&ir=0&menu=0&mix=L1P5A3T1`)
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 180000 })
await page.waitForTimeout(1500)
await page.evaluate(() => window.__mix25.setMode('replay')); await page.waitForTimeout(1500)
const r = await page.evaluate(() => {
  const R = (q) => { const e = document.querySelector(q); if (!e) return null; const b = e.getBoundingClientRect(); return { l: Math.round(b.left), t: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom) } }
  const kids = [...document.querySelectorAll('#c25ch .r1 > *')].map((e) => { const b = e.getBoundingClientRect(); return `${e.id || e.className}:${Math.round(b.left)},${Math.round(b.top)}-${Math.round(b.right)},${Math.round(b.bottom)} ${getComputedStyle(e).display}` })
  const rdk = [...document.querySelectorAll('#c25rd > *, #c25rd .fun > *')].map((e) => { const b = e.getBoundingClientRect(); return `${e.className}:${Math.round(b.top)}-${Math.round(b.bottom)} ${getComputedStyle(e).display} [${e.textContent.slice(0, 40)}]` })
  return { rdk, rd: R('#c25rd'), ch: R('#c25ch'), r1: R('#c25ch .r1'), r2: R('#c25ch .r2'), kids, rdText: document.querySelector('#c25rd').textContent.slice(0, 80) }
})
console.log(JSON.stringify(r, null, 1))
await browser.close()
