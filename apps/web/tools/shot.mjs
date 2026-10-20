// Screenshots the local dev page with the installed Edge. Local pages only.
// Usage: node tools/shot.mjs <look 1|2|3> <out.png> [width height]
import { chromium } from 'playwright-core'

const [look = '1', out = 'shot.png', w = '1400', h = '880'] = process.argv.slice(2)
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 2 })
page.on('console', (m) => { if (m.type() === 'error') console.log('[console error]', m.text()) })
page.on('pageerror', (e) => console.log('[page error]', e.message))
await page.goto(`http://localhost:5173/?look=${look}`)
await page.waitForFunction(() => window.__ready && window.__ready(), null, { timeout: 120000 })
await page.waitForTimeout(2500)
console.log('title:', await page.title())
await page.screenshot({ path: out })
await browser.close()
