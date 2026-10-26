// Checks the generic faces for batters without a photo in cockpit 22 (?generic=composite and ?generic=bust) without screenshots: for a few seeds (each picks a replay ball), a batter with no baked portrait gets a different face text
// under each option, the same batter gets the same face twice, and nothing errors. Usage: node tools/test_generic_faces.mjs [base url] [out.txt]
import fs from 'node:fs'
import { chromium } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:5174', outFile = process.argv[3]
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
let fails = 0
const check = (name, ok, extra = '') => { if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', name, extra) }
const errs = []
async function face(q) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 }, deviceScaleFactor: 1 })
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)))
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)) })
  await page.goto(`${base}/?mode=dojo&ui=K&cp=22${q}`)
  await page.waitForFunction(() => window.__cpReady, null, { timeout: 120000 })
  await page.waitForTimeout(3000)
  const r = await page.evaluate(() => ({ text: document.querySelector('#c22f pre')?.textContent ?? '', who: document.querySelector('#c22i b')?.textContent ?? '' }))
  await page.close()
  return r
}
let found = null
for (const seed of [3, 5, 7, 9, 11, 13]) {
  const d = await face(`&seed=${seed}`), c = await face(`&seed=${seed}&generic=composite`), b = await face(`&seed=${seed}&generic=bust`)
  console.log(`seed ${seed}: ${d.who} | default ${d.text.length} chars, composite same as default ${c.text === d.text}, bust same as default ${b.text === d.text}`)
  if (c.text !== d.text && b.text !== d.text) { found = { seed, d, c, b }; break }
}
check('found a batter without a portrait among the seeds tried', !!found)
if (found) {
  check('composite and bust differ from each other', found.c.text !== found.b.text)
  const c2 = await face(`&seed=${found.seed}&generic=composite`)
  check('the same batter gets the same composite face again', c2.text === found.c.text)
  check('faces are braille text with ink', [...found.c.text].filter((ch) => ch > '\u2800' && ch <= '\u28ff').length > 150 && [...found.b.text].filter((ch) => ch > '\u2800' && ch <= '\u28ff').length > 150)
  if (outFile) fs.writeFileSync(outFile, `\n=== default ${found.d.who}\n${found.d.text}\n\n=== composite\n${found.c.text}\n\n=== bust\n${found.b.text}\n`, 'utf8')
}
check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '))
console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
await browser.close()
process.exit(fails ? 1 : 0)
