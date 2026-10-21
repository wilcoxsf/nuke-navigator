// Scans Dinger Dojo's physics over a grid of swings and prints the first few that end off the wall. Local pages only.
// Usage: node tools/dojo_scan.mjs <base url>
import { chromium } from 'playwright-core'

const base = process.argv[2] || 'http://localhost:5174'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 800, height: 500 } })
await page.goto(`${base}/?mode=dojo&ui=A`)
await page.waitForFunction(() => window.__dojoReady && window.__dojoFly, null, { timeout: 120000 })
const rows = await page.evaluate(() => {
  const out = []
  for (const dir of [-40, -32, -22, 22, 28, 34]) {
    for (let ev = 94; ev <= 110; ev += 2) {
      for (let la = 12; la <= 30; la += 2) {
        const r = window.__dojoFly({ ev, la, dir, hand: 1, temp: 62, wind: 0 })
        out.push({ ev, la, dir, kind: r.verdict.kind, ft: Math.round(r.landFt), wall: Math.round(r.verdict.wallFt || 0), h: Math.round(r.verdict.cross || 0), wh: Math.round(r.verdict.wallH || 0) })
      }
    }
  }
  return out
})
const walls = rows.filter((r) => r.kind === 'WALL')
console.log('cases', rows.length, 'walls', walls.length, 'gone', rows.filter((r) => r.kind === 'GONE').length, 'foul', rows.filter((r) => r.kind === 'FOUL').length)
for (const r of walls.slice(0, 12)) console.log(JSON.stringify(r))
await browser.close()
