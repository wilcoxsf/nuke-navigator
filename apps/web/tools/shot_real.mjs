// Screenshots the Dojo (skin B, the over-the-wall drive) with the current flat look and the real-colour variants, for side-by-side comparison.
// Usage: node tools/shot_real.mjs <base url> <out folder> [width height]
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const [base = 'http://localhost:5174', outDir = 'shots', w = '1400', h = '880'] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const variants = {
  'vibe1': '&vibe=1',
  'vibe2': '&vibe=2',
  'vibe3': '&vibe=3',
  'vibe4': '&vibe=4',
  'vibe5': '&vibe=5',
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
for (const [name, q] of Object.entries(variants)) {
  await page.goto(`${base}/?mode=dojo&ui=B&ev=104&la=27&dir=-25&seed=7${q}`)
  await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady, null, { timeout: 180000 })
  await page.waitForTimeout(2500)
  console.log(name, await page.title())
  await page.screenshot({ path: `${outDir}/real-${name}.png` })
}
await browser.close()
