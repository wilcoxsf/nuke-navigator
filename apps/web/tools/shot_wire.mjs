// Screenshots the wireframe park in a few styles and prints the mesh and line counts and the build time.
// Usage: node tools/shot_wire.mjs <base url> <out folder> [width height]
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const [base = 'http://localhost:5174', outDir = 'shots', w = '1400', h = '880'] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 1.5 })
await page.addInitScript(() => { window.__fixedTime = 3.0 })
page.on('console', (m) => { if (m.type() === 'error') console.log('[console error]', m.text()) })
page.on('pageerror', (e) => console.log('[page error]', e.message))
await page.goto(`${base}/?mode=dojo&ui=K&cp=13&ev=108&la=29&dir=12&seed=7&prev=1`)
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady, null, { timeout: 180000 })
await page.waitForFunction(() => window.__cpReady, null, { timeout: 60000 })
await page.waitForTimeout(800)
const styles = {
  contours: { angle: 0, step: 3, hidden: true, opacity: 0.85 },
  both: { angle: 60, step: 4, hidden: true, opacity: 0.85 },
  seethrough: { angle: 60, step: 4, hidden: false, opacity: 0.5 },
}
for (const [name, o] of Object.entries(styles)) {
  const info = await page.evaluate(async (o) => {
    const nn = window.__nn
    nn.setWire(false)
    const t0 = performance.now()
    nn.setWire(true, { ...o, rebuild: true })
    nn.setPix({ pix: 0, mode: 0 })
    const ms = performance.now() - t0
    let segs = 0
    nn.scene.getObjectByName('wire').children.forEach((c) => { segs += c.geometry.attributes.position.count / 2 })
    return { segs, buildMs: Math.round(ms) }
  }, o)
  console.log(name, JSON.stringify(info))
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${outDir}/wire-${name}.png` })
}
await browser.close()
