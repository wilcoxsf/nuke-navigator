// Scans exit speed, launch angle and direction through the Dojo's own classifier and prints a few swings for every callout state.
// Usage: node tools/scan_states.mjs <base url>
import { chromium } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:5174'
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } })
await page.addInitScript(() => { window.__fixedTime = 3.0 })
await page.goto(`${base}/?mode=dojo&ui=B&ev=104&la=27&dir=-25&seed=7`)
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady, null, { timeout: 180000 })
const found = await page.evaluate(() => {
  const out = {}
  for (let ev = 84; ev <= 118; ev += 2) for (let la = 4; la <= 56; la += 3) for (let dir = -44; dir <= 44; dir += 4) {
    const r = window.__dojoProbe({ ev, la, dir })
    ;(out[r.key] ??= []).push({ ev, la, dir, ft: r.ft, clear: r.clear == null ? null : +r.clear.toFixed(1), short: r.short == null ? null : +r.short.toFixed(1), land: r.land })
  }
  return out
})
for (const [k, a] of Object.entries(found)) {
  const pick = [a[0], a[Math.floor(a.length / 2)], a[a.length - 1]]
  console.log(k, a.length, JSON.stringify(pick))
}
await browser.close()
