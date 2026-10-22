// Real-interaction test for studies 14 to 18 and the press/hover juice in study 12: load each, check there are no page errors, change an input with the mouse and with the keyboard,
// swing with Enter, switch theme with the swatches, and screenshot hover and press states. Prints PASS/FAIL per check.
// Usage: node tools/test_studies2.mjs <base url> <out folder>
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const [base = 'http://localhost:5174', outDir = 'shots'] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
let fails = 0
const check = (name, ok, extra = '') => { if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', name, extra) }
const ev = (page) => page.evaluate(() => window.__cp?.state?.ev ?? window.__dojo?.ev)
for (const cp of [14, 15, 16, 17, 18, 12]) {
  const page = await browser.newPage({ viewport: { width: 1500, height: 940 }, deviceScaleFactor: 1 })
  const errs = []
  page.on('pageerror', (e) => errs.push(e.message))
  await page.goto(`${base}/?mode=dojo&ui=K&cp=${cp}&ev=100&la=28&dir=10&seed=7`)
  await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady, null, { timeout: 180000 })
  await page.waitForTimeout(1500)
  const e0 = await page.evaluate(() => window.__cp.state.ev)
  if (cp === 12) {
    const slot = page.locator('#cp .c12 .slot').first()
    await slot.hover(); await page.waitForTimeout(250)
    const pn = page.locator('#cp .c12 .pnl.p').nth(2)
    const pb = await pn.boundingBox()
    await page.mouse.move(pb.x + pb.width * 0.5, pb.y + pb.height * 0.5); await page.mouse.move(pb.x + pb.width * 0.9, pb.y + pb.height * 0.15, { steps: 4 }); await page.waitForTimeout(600)
    const panelT = await pn.evaluate((el) => getComputedStyle(el).transform)
    await page.screenshot({ path: `${outDir}/c12-hover.png` })
    check('c12 hovered panel pops and tilts (matrix3d)', panelT.startsWith('matrix3d'), panelT.slice(0, 60))
    const box = await slot.boundingBox()
    await page.mouse.move(box.x + 20, box.y + box.height / 2); await page.mouse.down(); await page.waitForTimeout(250)
    await page.screenshot({ path: `${outDir}/c12-press.png` })
    const tr = await slot.evaluate((el) => getComputedStyle(el).transform)
    await page.mouse.up()
    check('c12 slot depresses while held', tr !== 'none', tr)
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowUp'); await page.waitForTimeout(300)
  } else {
    // keyboard: the list-style studies use up/down to pick and left/right to change (the strip uses left/right and up/down)
    const strip = cp === 16
    await page.keyboard.press(strip ? 'ArrowUp' : 'ArrowRight'); await page.waitForTimeout(250)
    const e1 = await page.evaluate(() => window.__cp.state.ev)
    check(`c${cp} keyboard changes exit speed`, e1 !== e0, `${e0} -> ${e1}`)
    // mouse: click the + of the first input row
    const plus = page.locator('#cp [data-d="1"]').first()
    await plus.click(); await page.waitForTimeout(250)
    const e2 = await page.evaluate(() => window.__cp.state.ev)
    check(`c${cp} mouse + changes exit speed`, e2 !== e1, `${e1} -> ${e2}`)
    // swing with Enter and make sure the tally counts it
    await page.keyboard.press('Enter'); await page.waitForTimeout(4500)
    const txt = await page.evaluate(() => document.getElementById('cp').innerText)
    check(`c${cp} swing lands in the tally`, /0001_|00001_/.test(txt) || /SWINGS\s*0?1/.test(txt), '')
    // theme switch
    const sw = page.locator('#cp .thm b[data-k="green"]')
    await sw.click(); await page.waitForTimeout(400)
    const acc = await page.evaluate(() => getComputedStyle(document.getElementById('cp')).getPropertyValue('--acc').trim())
    check(`c${cp} theme swatch recolors`, acc.toLowerCase() === '#7dff9d', acc)
    await page.screenshot({ path: `${outDir}/c${cp}-green.png` })
  }
  check(`c${cp} no page errors`, errs.length === 0, errs.join(' | ').slice(0, 200))
  await page.close()
}
console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
await browser.close()
