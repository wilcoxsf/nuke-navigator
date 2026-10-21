// Screenshots the three navigation concept mockups (static HTML) with the installed Edge. Local files only.
// Usage: node tools/shot_nav.mjs <html file> <out folder>
import { chromium } from 'playwright-core'
import { pathToFileURL } from 'node:url'
import { mkdirSync } from 'node:fs'

const [file, outDir] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1.5 })
await page.goto(pathToFileURL(file).href)
await page.waitForTimeout(800)
for (const id of ['n1', 'n2', 'n3']) await page.locator(`#${id}`).screenshot({ path: `${outDir}/nav-${id}.png` })
await browser.close()
console.log('done')
