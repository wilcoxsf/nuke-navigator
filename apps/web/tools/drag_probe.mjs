// One headless-Edge load of the Baseball Savant drag dashboard (robots.txt allows it). Looks for the chart data: JSON or CSV responses the page itself requests, and arrays embedded in the page source.
// Prints sizes and the first characters only; saves the raw data it finds under data/raw/drag_dashboard/ (one file per source). One page load, no clicking, no loops.
import { chromium } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'node:fs'

const out = 'C:/Users/andrewwi/dev/nuke-navigator-new/data/raw/drag_dashboard'
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage()
const seen = []
page.on('response', async (r) => {
  const u = r.url(), ct = r.headers()['content-type'] || ''
  if (/json|csv/.test(ct) || /\.(json|csv)(\?|$)/.test(u)) { try { const b = await r.body(); seen.push({ u, ct, n: b.length, head: b.toString('utf8').slice(0, 160), body: b }) } catch {} }
})
await page.goto('https://baseballsavant.mlb.com/drag-dashboard', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(3000)
const html = await page.content()
console.log('page html', html.length, 'chars; requests that were json or csv:', seen.length)
for (const s of seen) console.log(' ', s.n, s.ct.split(';')[0], s.u.slice(0, 140), '|', s.head.replace(/\s+/g, ' ').slice(0, 100))
const m = [...html.matchAll(/(?:var|let|const)\s+(\w*(?:drag|data|chart|series)\w*)\s*=\s*(\[|\{)/gi)].map((x) => x[1])
console.log('embedded script variables that look like data:', [...new Set(m)].slice(0, 20))
let k = 0
for (const s of seen) if (/drag/i.test(s.u + s.head)) { writeFileSync(`${out}/response_${k++}.dat`, s.body); console.log('saved response', k - 1, s.u.slice(0, 120)) }
writeFileSync(`${out}/page.html`, html)
await browser.close()
