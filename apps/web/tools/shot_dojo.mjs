// Screenshots Dinger Dojo in every skin and a few situations with the installed Edge. Local pages only.
// Usage: node tools/shot_dojo.mjs <base url> <out folder> [width height]
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const [base = 'http://localhost:5174', outDir = 'shots', w = '1400', h = '880'] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const cases = {
  homer: 'ev=104&la=27&dir=-25',     // to left-center, over the wall
  wall: 'ev=103&la=21&dir=26',       // a line drive into the right-field wall
  inplay: 'ev=96&la=42&dir=-12',     // high fly to left-center, in play
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
for (const ui of ['A', 'B', 'C']) {
  for (const [name, q] of Object.entries(cases)) {
    await page.goto(`${base}/?mode=dojo&ui=${ui}&${q}&seed=7`)
    await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady, null, { timeout: 120000 })
    await page.waitForTimeout(1800)
    const v = await page.evaluate(() => window.__dojo && `${window.__dojo.verdict.text} ${Math.round(window.__dojo.landFt)} ft`)
    console.log(ui, name, v)
    await page.screenshot({ path: `${outDir}/dojo-${ui}-${name}.png` })
  }
}
await browser.close()
