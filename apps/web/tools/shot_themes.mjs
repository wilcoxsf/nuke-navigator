// Screenshots one mockup page once per theme hash (#1..#4). Usage: node tools/shot_themes.mjs <html file> <out prefix> [n=4]
import { chromium } from 'playwright-core'

const [file, prefix, n = '4'] = process.argv.slice(2)
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1400, height: 860 }, deviceScaleFactor: 1 })
page.on('pageerror', (e) => console.log('[page error]', e.message))
for (let i = 1; i <= Number(n); i++) {
  await page.goto(`file:///${file.replace(/\\/g, '/')}#${i}`)
  await page.reload()
  await page.waitForTimeout(2600)
  await page.screenshot({ path: `${prefix}-${i}.png` })
  console.log('shot', i)
}
await browser.close()
