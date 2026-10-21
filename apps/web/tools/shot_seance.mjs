// Screenshots Seat Seance (300 ghost balls) for a few swings. Local pages only.
// Usage: node tools/shot_seance.mjs <base url> <out folder> [width height]
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const [base = 'http://localhost:5174', outDir = 'shots', w = '1400', h = '880'] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const cases = {
  lf: 'ev=104&la=27&dir=-25',
  rf: 'ev=102&la=29&dir=30',
  wall: 'ev=100&la=24&dir=-22',
}
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 1.5 })
await page.addInitScript(() => { window.__fixedTime = 3.0 })
page.on('console', (m) => { if (m.type() === 'error') console.log('[console error]', m.text()) })
page.on('pageerror', (e) => console.log('[page error]', e.message))
for (const [name, q] of Object.entries(cases)) {
  await page.goto(`${base}/?mode=dojo&ui=B&${q}&seed=7&seance=1`)
  await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady, null, { timeout: 180000 })
  await page.waitForFunction(() => window.__seance, null, { timeout: 120000 })
  await page.waitForTimeout(1500)
  console.log(name, JSON.stringify(await page.evaluate(() => window.__seance)))
  await page.screenshot({ path: `${outDir}/seance-${name}.png` })
}
await browser.close()
