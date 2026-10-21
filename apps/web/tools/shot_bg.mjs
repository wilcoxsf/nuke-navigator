// Clean stadium backdrop (no panels, no flight) for the interface mockups: real colors, base look, 1600 x 900.
// Usage: node tools/shot_bg.mjs <base url> <out.jpg>
import { chromium } from 'playwright-core'

const [base = 'http://localhost:5174', out = 'bg-stadium.jpg'] = process.argv.slice(2)
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 })
await page.addInitScript(() => { window.__fixedTime = 3.0 })
await page.goto(`${base}/?real=1&vibe=1&caps=1`)
await page.waitForFunction(() => window.__ready && window.__ready(), null, { timeout: 180000 })
await page.waitForTimeout(2500)
await page.evaluate(() => {
  const { scene } = window.__nn
  for (const n of ['sampleRibbon', 'sampleBurst']) { const o = scene.getObjectByName(n); if (o) o.visible = false }
  for (const id of ['strip', 'look']) { const e = document.getElementById(id); if (e) e.style.display = 'none' }
})
await page.waitForTimeout(800)
await page.screenshot({ path: out, type: 'jpeg', quality: 82 })
await browser.close()
console.log('saved', out)
