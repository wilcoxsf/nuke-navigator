// Measures the real width and height of one character cell for each kind of glyph used by the character art (CSS pixels): braille, full block, quadrant block, half block, 'o', and the cell
// the page actually uses for braille (class 'art br'). A square dot grid needs a cell height of twice its width for braille (2 by 4 dots), half blocks (1 by 2) and quadrant blocks (2 by 2).
// Usage: node tools/measure_art.mjs <base url>
import { chromium } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:5174'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1300, height: 900 }, deviceScaleFactor: 1 })
await page.goto(`${base}/?mode=dojo&ui=K&cp=21&seed=7`)
await page.waitForFunction(() => window.__cpReady, null, { timeout: 120000 })
await page.waitForTimeout(2500)
const res = await page.evaluate(() => {
  const out = [], probe = document.createElement('pre')
  document.getElementById('cp').appendChild(probe)
  probe.style.position = 'absolute'; probe.style.left = '-9999px'; probe.style.fontSize = '16px'
  for (const [name, ch, cls] of [['braille', '\u28ff', 'art'], ['braille in the page (art br)', '\u28ff', 'art br'], ['full block', '\u2588', 'art'], ['quadrant block', '\u259a', 'art'], ['half block', '\u2580', 'art'], ['letter o', 'o', 'art']]) {
    probe.className = cls
    probe.textContent = (ch.repeat(40) + '\n').repeat(20).trim()
    const r = probe.getBoundingClientRect()
    out.push({ name, cellW: +(r.width / 40).toFixed(3), cellH: +(r.height / 20).toFixed(3), ratio: +(r.height / 20 / (r.width / 40)).toFixed(3) })
  }
  probe.remove()
  return { loaded: document.fonts.check('12px DJV'), out }
})
console.log('DejaVu loaded:', res.loaded)
console.log(res.out.map((o) => `  ${o.name.padEnd(30)} cell ${o.cellW} x ${o.cellH} px at 16px, height/width ${o.ratio}`).join('\n'))
await browser.close()
