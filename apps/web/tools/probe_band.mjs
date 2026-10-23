// Reads the "gone in N to M of 30 parks" text in study 19 what-if and replay modes, and the main Goner Grid header (ui K). Usage: node tools/probe_band.mjs [base url]
import { chromium } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:5174'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1500, height: 940 } })
const errs = []
page.on('pageerror', (e) => errs.push(e.message))
await page.goto(`${base}/?mode=dojo&ui=K&cp=19&seed=7`)
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady, null, { timeout: 180000 })
await page.waitForTimeout(2500)
console.log('replay   :', await page.evaluate(() => document.querySelector('#c19n')?.textContent))
await page.click('[data-mode="whatif"]')
await page.waitForTimeout(2500)
console.log('what-if  :', await page.evaluate(() => document.querySelector('#c19n')?.textContent), '| tab', await page.evaluate(() => window.__cp.state.tab))
for (const [ev, la, dir] of [[96, 28, -32], [110, 27, 10], [88, 40, 8]]) {
  await page.evaluate(([e, l, d]) => { Object.assign(window.__cp.state, { ev: e, la: l, dir: d }); window.__cp.update() }, [ev, la, dir])
  await page.waitForTimeout(1500)
  console.log(`what-if ${ev} mph ${la} deg dir ${dir}:`, await page.evaluate(() => document.querySelector('#c19n')?.textContent))
}
const p2 = await browser.newPage({ viewport: { width: 1500, height: 940 } })
p2.on('pageerror', (e) => errs.push(e.message))
await p2.goto(`${base}/?mode=dojo&ui=K`)
await p2.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady, null, { timeout: 180000 })
await p2.waitForTimeout(3000)
console.log('main grid:', await p2.evaluate(() => document.querySelector('#dj-grid .n')?.textContent))
console.log('page errors:', errs.length ? errs.join(' | ') : 'none')
await browser.close()
