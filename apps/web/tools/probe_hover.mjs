// Probe: does a hovered panel in study 12 and study 14 really get the 3D pop and tilt? Prints :hover state, computed transform and shadow.
import { chromium } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:5174'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
for (const [cp, sel] of [[12, '#cp .c12 .pnl.p.tal'], [14, '#cp .c14 .vd']]) {
  const page = await browser.newPage({ viewport: { width: 1500, height: 940 } })
  await page.goto(`${base}/?mode=dojo&ui=K&cp=${cp}&ev=100&la=28&dir=10&seed=7`)
  await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady, null, { timeout: 180000 })
  await page.waitForTimeout(1200)
  const el = page.locator(sel).first(), b = await el.boundingBox()
  await page.mouse.move(b.x + b.width * 0.5, b.y + b.height * 0.5)
  await page.mouse.move(b.x + b.width * 0.9, b.y + b.height * 0.15, { steps: 4 })
  await page.waitForTimeout(600)
  console.log(cp, await el.evaluate((e) => ({ hover: e.matches(':hover'), transform: getComputedStyle(e).transform.slice(0, 90), shadow: getComputedStyle(e).boxShadow, rx: e.style.getPropertyValue('--rx'), ry: e.style.getPropertyValue('--ry') })))
  await page.close()
}
await browser.close()
