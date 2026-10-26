// Checks the shaded mannequin batter in the swing diagram (cockpit 22, ?batter=3d) without screenshots: the swing box holds braille text, it differs from the old stick-figure batter, nothing errors,
// and the text is written to a file so it can be looked at as text. Usage: node tools/test_batter3d.mjs [base url] [out.txt]
import fs from 'node:fs'
import { chromium } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:5174', outFile = process.argv[3]
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
let fails = 0
const check = (name, ok, extra = '') => { if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', name, extra) }
const errs = []
async function swingText(q) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 }, deviceScaleFactor: 1 })
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)))
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)) })
  await page.goto(`${base}/?mode=dojo&ui=K&cp=22${q}`)
  await page.waitForFunction(() => window.__cpReady, null, { timeout: 120000 })
  await page.waitForTimeout(3500)
  const r = await page.evaluate(() => { const p = document.querySelector('#c22s pre'); return p ? { text: p.textContent, fs: p.style.fontSize } : null })
  await page.close()
  return r
}
const old = await swingText(''), neu = await swingText('&batter=3d')
check('old swing box has text', !!old && old.text.length > 200, old ? `${old.text.length} chars` : 'missing')
check('3d swing box has text', !!neu && neu.text.length > 200, neu ? `${neu.text.length} chars` : 'missing')
const braille = (s) => [...s].filter((c) => c >= '\u2800' && c <= '\u28ff' && c !== '\u2800').length
check('3d swing box is braille art with real ink', braille(neu.text) > 250, `${braille(neu.text)} inked cells vs ${braille(old.text)} in the old one`)
check('3d batter differs from the old stick figure', neu.text !== old.text)
const lines = neu.text.split('\n')
check('the text is a clean rectangle of lines', lines.length > 20 && new Set(lines.map((l) => l.length)).size <= 2, `${lines.length} lines of ${lines[0].length}`)
if (outFile) fs.writeFileSync(outFile, `\n=== 3d swing ${lines[0].length} x ${lines.length}\n` + neu.text + `\n\n=== old swing\n` + old.text + '\n', 'utf8')
check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '))
console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
await browser.close()
process.exit(fails ? 1 : 0)
