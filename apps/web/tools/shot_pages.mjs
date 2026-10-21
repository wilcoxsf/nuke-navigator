// Screenshots the interface mockups (every NN-*.html in the folder) after their verdict beats have played, plus a thumbnail each.
// Usage: node tools/shot_pages.mjs <folder> [only-prefix]
import { chromium } from 'playwright-core'
import { readdirSync } from 'node:fs'

const [dir, only = ''] = process.argv.slice(2)
const files = readdirSync(dir).filter((f) => /^[A-Z]\d+-.*\.html$/.test(f) && f.startsWith(only))
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1400, height: 860 }, deviceScaleFactor: 1 })
page.on('pageerror', (e) => console.log('[page error]', e.message))
page.on('console', (m) => { if (m.type() === 'error') console.log('[console error]', m.text()) })
for (const f of files) {
  await page.goto('file:///' + dir.replace(/\\/g, '/') + '/' + f)
  await page.waitForTimeout(2600)
  await page.screenshot({ path: `${dir}/shots/${f.replace('.html', '.png')}` })
  console.log('shot', f)
}
await browser.close()
