// Real-interaction test of the wireframe toggle in the Skeleton Deck (study 3): click the wire chip, type `wire acc`, then `wire off`; checks the scene state and screenshots each.
// Usage: node tools/test_wire.mjs <base url> <out folder>
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const [base = 'http://localhost:5174', outDir = 'shots'] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 1400, height: 880 }, deviceScaleFactor: 1.5 })
page.on('pageerror', (e) => console.log('[page error]', e.message))
await page.goto(`${base}/?mode=dojo&ui=K&cp=13&ev=108&la=29&dir=12&seed=7`)
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady, null, { timeout: 180000 })
await page.waitForTimeout(1500)
const state = () => page.evaluate(() => { const w = window.__nn.scene.getObjectByName('wire'); return { wireVisible: !!(w && w.visible), segs: w ? w.children.reduce((s, c) => s + c.geometry.attributes.position.count / 2, 0) : 0, lastLine: [...document.querySelectorAll('#c13l div')].slice(-1)[0]?.textContent } })
console.log('start', JSON.stringify(await state()))
await page.click('button[data-c="wire"]')
await page.waitForTimeout(5000)
console.log('after chip click', JSON.stringify(await state()))
await page.screenshot({ path: `${outDir}/test-wire-on.png` })
for (const ch of 'wire acc') await page.keyboard.type(ch)
await page.keyboard.press('Enter')
await page.waitForTimeout(500)
await page.keyboard.press('Enter') // empty line swings
await page.waitForTimeout(2500)
console.log('after wire acc + swing', JSON.stringify(await state()))
await page.screenshot({ path: `${outDir}/test-wire-acc.png` })
for (const ch of 'wire off') await page.keyboard.type(ch)
await page.keyboard.press('Enter')
await page.waitForTimeout(1500)
console.log('after wire off', JSON.stringify(await state()))
await page.screenshot({ path: `${outDir}/test-wire-off.png` })
await browser.close()
