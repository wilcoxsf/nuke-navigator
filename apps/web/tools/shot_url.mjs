// Screenshot any local URL after a wait; prints page errors. Usage: node tools/shot_url.mjs <url> <out.png> [waitMs]
import { chromium } from 'playwright-core'

const [url, out, wait = '4000'] = process.argv.slice(2)
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1400, height: 860 }, deviceScaleFactor: 1 })
page.on('pageerror', (e) => console.log('[page error]', e.message.slice(0, 300)))
page.on('console', (m) => { if (m.type() === 'error') console.log('[console error]', m.text().slice(0, 300)) })
await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 }).catch((e) => console.log('goto', e.message.slice(0, 120)))
await page.waitForTimeout(Number(wait))
await page.screenshot({ path: out })
await browser.close()
console.log('saved', out)
