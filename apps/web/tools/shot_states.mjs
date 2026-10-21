// Screenshots the Dojo in every callout state (skin B) with the blast partway through, and prints which state each swing landed in.
// Usage: node tools/shot_states.mjs <base url> <out folder> [only,names] [width height]
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const [base = 'http://localhost:5174', outDir = 'shots', only = '', w = '1400', h = '880'] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const cases = {
  nuke: 'ev=116&la=34&dir=-24',
  gone: 'ev=104&la=27&dir=-25',
  scraper: 'ev=98&la=28&dir=-32',
  splash: 'ev=116&la=28&dir=24',
  warning: 'ev=104&la=34&dir=0',
  wall: 'ev=96&la=28&dir=-32',
  close: 'ev=98&la=28&dir=-28',
  fly: 'ev=88&la=40&dir=8',
  liner: 'ev=102&la=22&dir=-12',
  grounder: 'ev=100&la=7&dir=12',
  popup: 'ev=100&la=55&dir=4',
  foul: 'ev=102&la=31&dir=-40',
}
const want = only ? only.split(',') : Object.keys(cases)
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 1.5 })
await page.addInitScript(() => { window.__fixedTime = 3.0 })
page.on('console', (m) => { if (m.type() === 'error') console.log('[console error]', m.text()) })
page.on('pageerror', (e) => console.log('[page error]', e.message))
for (const name of want) {
  await page.goto(`${base}/?mode=dojo&ui=B&${cases[name]}&seed=7&fxt=${process.env.FXT ?? 0.4}`)
  await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady, null, { timeout: 180000 })
  await page.waitForTimeout(800)
  if (process.env.KRAB) { // frames do not run in the frozen-time mode, so place the crab by hand
    await page.waitForFunction(() => window.__krabReady, null, { timeout: 60000 })
    await page.evaluate((p) => window.__krab.snap(p[0], p[1], p[2]), (process.env.KRAB).split(',').map((v, i) => (i < 2 ? Number(v) : v)))
    await page.waitForTimeout(300)
  }
  const info = await page.evaluate(() => ({ key: window.__dojo?.key, kind: window.__dojo?.verdict?.kind, ft: Math.round(window.__dojo?.landFt), head: document.getElementById('dj-verdict')?.innerText, sub: document.getElementById('dj-sub')?.innerText, parts: window.__fx?.count() }))
  console.log(name, JSON.stringify(info))
  await page.screenshot({ path: `${outDir}/state-${name}.png` })
}
await browser.close()
