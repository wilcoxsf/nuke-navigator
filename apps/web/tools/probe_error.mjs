// Prints the stack of the first page error on a cockpit. Usage: node tools/probe_error.mjs <cp number> [base url]
import { chromium } from 'playwright-core'

const cp = process.argv[2] ?? '20'
const base = process.argv[3] ?? 'http://localhost:5174'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1500, height: 940 } })
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message, '\n', (e.stack || '').split('\n').slice(0, 8).join('\n')))
await page.goto(`${base}/?mode=dojo&ui=K&cp=${cp}&dev=1`, { waitUntil: 'load' })
await page.waitForTimeout(6000)
await browser.close()
