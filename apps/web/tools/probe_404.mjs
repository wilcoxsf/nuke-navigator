// Which request returns 404 on a cockpit page? Prints every non-2xx response URL.
import { chromium } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:5174'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1400, height: 880 } })
page.on('response', (r) => { if (r.status() >= 400) console.log(r.status(), r.url()) })
await page.goto(`${base}/?mode=dojo&ui=K&cp=14&seed=7`)
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady, null, { timeout: 180000 })
await page.waitForTimeout(1500)
await browser.close()
console.log('done')
