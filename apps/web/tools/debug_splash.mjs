// Debug helper: loads the Dojo on one swing and prints what the classifier and the page state say (probe against the live update).
import { chromium } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:5174'
const q = process.argv[3] ?? 'ev=106&la=28&dir=24'
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } })
await page.addInitScript(() => { window.__fixedTime = 3.0 })
page.on('console', (m) => console.log('[console]', m.type(), m.text().slice(0, 200)))
page.on('pageerror', (e) => console.log('[page error]', e.message))
await page.goto(`${base}/?mode=dojo&ui=B&${q}&seed=7`)
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady, null, { timeout: 180000 })
console.log(JSON.stringify(await page.evaluate(() => [1, 2, 3].map(() => window.__dojoProbe({ ev: 106, la: 28, dir: 24 })))))
await page.waitForTimeout(2000)
console.log(JSON.stringify(await page.evaluate(() => ({
  stadium: !!window.__nn.stadium, key: window.__dojo.key, landing: window.__dojo.landing && { kind: window.__dojo.landing.kind, p: window.__dojo.landing.point, idx: window.__dojo.landing.index },
  probe: window.__dojoProbe({}), vis: !!window.__dojo.visPath,
}))))
await browser.close()
