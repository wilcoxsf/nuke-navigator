// Real-interaction test of study 20 (Bird's Eye) and the ASCII lab (study 21): the bird's-eye toggle moves the camera, balls step, modes switch, a swing lands in the tally,
// the stats ledger fills in, buttons (and only buttons) tilt on hover, the lab renders styles and remembers a pick, no page errors.
// Usage: node tools/test_study20.mjs <base url>
import { chromium } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:5174'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
let fails = 0
const check = (name, ok, extra = '') => { if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', name, extra) }
const page = await browser.newPage({ viewport: { width: 1500, height: 940 }, deviceScaleFactor: 1 })
const errs = []
page.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')))
await page.goto(`${base}/?mode=dojo&ui=K&cp=20&seed=7`)
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady, null, { timeout: 180000 })
await page.waitForTimeout(2500)
const txt = () => page.evaluate(() => document.getElementById('cp').innerText)
let t = await txt()
check('replay ball shown', /BALL 1 OF \d+/.test(t))
check('stats ledger has every group', ['GAME', 'PITCH', 'SWING AND CONTACT', 'RESULT AND VALUE', 'FLIGHT AND AIR'].every((g) => t.includes(g)))
check('ledger fills real values (spin rate, bat speed, expected stats)', /SPIN RATE\s*\d{3,4} RPM/.test(t) && /BAT SPEED\s*\d+\.\d MPH/.test(t) && /EXPECTED WOBA\s*\d/.test(t))
check('no plan or arc panel on this screen', !/\/ P L A N \//.test(t) && !/\/ A R C \//.test(t))
const y0 = await page.evaluate(() => window.__nn.camera.position.y)
await page.click('#c20b'); await page.waitForTimeout(400)
const y1 = await page.evaluate(() => window.__nn.camera.position.y)
check("bird's eye raises the camera", y1 > y0 + 60, `${y0.toFixed(0)} -> ${y1.toFixed(0)}`)
await page.click('#c20b'); await page.waitForTimeout(300)
check("bird's eye toggles back", (await page.evaluate(() => window.__nn.camera.position.y)) < y1 - 60)
const e0 = await page.evaluate(() => window.__cp.state.ev)
await page.click('[data-st="1"]'); await page.waitForTimeout(600)
check('next ball changes exit speed', (await page.evaluate(() => window.__cp.state.ev)) !== e0)
// only buttons tilt: hover a button, then a panel
const btn = page.locator('[data-f="oracle"]'); const bb = await btn.boundingBox()
await page.mouse.move(bb.x + 4, bb.y + 3); await page.mouse.move(bb.x + bb.width - 4, bb.y + bb.height - 3, { steps: 3 }); await page.waitForTimeout(300)
const bt = await btn.evaluate((el) => getComputedStyle(el).transform)
check('hovered button tilts (matrix3d)', bt.startsWith('matrix3d'), bt.slice(0, 40))
const pn = page.locator('#cp .c20 .swing'); const pb = await pn.boundingBox()
await page.mouse.move(pb.x + pb.width * 0.5, pb.y + pb.height * 0.5); await page.mouse.move(pb.x + pb.width * 0.9, pb.y + pb.height * 0.2, { steps: 3 }); await page.waitForTimeout(300)
check('hovered panel does not move', (await pn.evaluate((el) => getComputedStyle(el).transform)) === 'none')
await page.keyboard.press('Enter'); await page.waitForTimeout(4500)
check('swing lands in the tally', /SWINGS\s*0?1/.test(await txt()))
await page.click('[data-mode="whatif"]'); await page.waitForTimeout(500)
t = await txt()
check('what-if shows real balls like this and no pitch', /NO PITCH FOR A WHAT-IF SWING/.test(t) && /REAL BALLS WITHIN/.test(t))
check('what-if ledger still renders', /SIMULATED DISTANCE\s*\d{3} FT/.test(t))
// the lab
await page.goto(`${base}/?mode=dojo&ui=K&cp=21&seed=7`)
await page.waitForFunction(() => window.__cpReady, null, { timeout: 120000 })
await page.waitForTimeout(1500)
const tiles = await page.locator('#cp .c21 .tile').count()
check('lab renders sixteen styles for faces', tiles === 16, String(tiles))
await page.locator('#cp .c21 .tile').nth(8).click(); await page.waitForTimeout(500)
check('lab remembers a pick', await page.evaluate(() => !!localStorage.getItem('nn-art-face')))
await page.click('[data-sub="gpt"]'); await page.waitForTimeout(1500)
check('lab shows GPT frames in the dot-snap styles', (await page.locator('#cp .c21 .tile').count()) >= 5 && /DOT SNAP/.test(await txt()))
check('no page errors', errs.length === 0, errs.join(' | ').slice(0, 300))
console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
await browser.close()
