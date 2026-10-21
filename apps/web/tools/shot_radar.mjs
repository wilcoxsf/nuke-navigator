// Close captures of the radar overlay on the 3D park: a high angle from behind the plate and a lower broadcast angle, cropped to the open window.
// Usage: node tools/shot_radar.mjs <base url> <out folder> [query]
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const [base = 'http://localhost:5174', outDir = 'shots', q = 'ev=104&la=27&dir=-25'] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1400, height: 860 }, deviceScaleFactor: 1.5 })
await page.addInitScript(() => { window.__fixedTime = 3.0 })
page.on('pageerror', (e) => console.log('[page error]', e.message))
await page.goto(`${base}/?mode=dojo&ui=X&${q}&seed=7&fxt=0.4`)
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady, null, { timeout: 180000 })
await page.waitForTimeout(2500)
const views = { high: [[0, 300, 70], [0, 0, -105]], mid: [[-80, 120, 150], [0, 6, -100]], low: [[20, 40, 60], [-20, 8, -140]] }
for (const [name, [pos, tgt]] of Object.entries(views)) {
  await page.evaluate(([p, t]) => { const { camera, controls } = window.__nn; camera.position.set(...p); controls.target.set(...t); controls.update() }, [pos, tgt])
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${outDir}/radar-${name}.png`, clip: { x: 344, y: 56, width: 740, height: 804 } })
  console.log('shot', name, JSON.stringify(await page.evaluate(() => window.__radar)))
}
await browser.close()
