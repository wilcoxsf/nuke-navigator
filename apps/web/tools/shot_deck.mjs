// Screenshots the slang deck: first card, a mid-deck card after a few key presses, and the summary view; prints page errors and answer counts.
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const [file, outDir] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1400, height: 860 } })
page.on('pageerror', (e) => console.log('[page error]', e.message))
page.on('console', (m) => { if (m.type() === 'error') console.log('[console error]', m.text()) })
await page.goto('file:///' + file)
await page.waitForTimeout(400)
await page.screenshot({ path: `${outDir}/deck-1.png` })
for (const k of ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowRight']) await page.keyboard.press(k)
await page.keyboard.press('ArrowUp')
await page.waitForTimeout(200)
await page.screenshot({ path: `${outDir}/deck-2.png` })
console.log('progress', await page.textContent('#c'))
await page.click('#all')
await page.waitForTimeout(200)
await page.screenshot({ path: `${outDir}/deck-3.png` })
await browser.close()
