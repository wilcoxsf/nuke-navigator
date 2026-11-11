// the type and stroke measure (10 Nov, night; Andrew: "make sure all the text is the right size and all that jazz too - consistency in stroke size, look, feel"):
// in each mode and window, every visible piece of text (its rendered size, weight, letter-spacing, font) and every button, input and panel border, grouped by where
// it is. Prints the distinct values per area, so drift shows.
import { chromium } from 'playwright-core'
const URL = process.argv[2] ?? 'http://localhost:5195'
const [W, H] = (process.argv[3] ?? '1827x992').split('x').map(Number)
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: W, height: H } })
await page.route('**/api.open-meteo.com/**', (r) => r.abort())
await page.goto(URL + '/?mode=dojo&ui=K&cp=25&seed=7&ir=0&menu=0')
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 180000 })
await page.waitForTimeout(2000)
const tab = (t) => page.evaluate((t) => document.querySelector(`#c25tabs [data-tab="${t}"]`).click(), t)
const measure = (label) => page.evaluate((label) => {
  const area = (e) => { const a = e.closest('#c25m .box, .sm, .hdr, #c25rd, #c25v, #c25ch, #c25nk, #c25bug, .pnl.p, .c25>.strip, #c25dk, .mmenu'); if (!a) return 'other'; return a.id ? '#' + a.id : a.classList.contains('pnl') ? [...a.classList].filter((c) => !['pnl', 'p', 'tm', 'clear', 'win'].includes(c)).join('.') : a.className.split(' ')[0] }
  const text = {}, strokes = {}
  for (const e of document.querySelectorAll('.c25 *')) {
    if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') continue
    const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue
    const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0)
    const cs = getComputedStyle(e)
    if (own && cs.visibility !== 'hidden' && cs.opacity !== '0') {
      const a = area(e), f = cs.fontFamily.split(',')[0].replace(/"/g, '').trim(), key = `${parseFloat(cs.fontSize).toFixed(1)}px ${cs.fontWeight} ls${cs.letterSpacing === 'normal' ? '0' : parseFloat(cs.letterSpacing).toFixed(1)} ${f}`
      ;(text[a] ??= {})[key] ??= []; if (text[a][key].length < 3) text[a][key].push(e.textContent.trim().replace(/\s+/g, ' ').slice(0, 24))
    }
    const isCtl = e.matches('.bt, input, select, textarea, .pnl, .jkn, .jkbar, .ppl, .sm .smi, .chip, .mod .box')
    if (isCtl) { const a = area(e), bw = [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].map((x) => parseFloat(x)), k2 = `${e.tagName.toLowerCase()}.${[...e.classList].slice(0, 2).join('.')} border ${[...new Set(bw)].join('/')}px ${cs.borderTopStyle} outline ${cs.outlineStyle === 'none' ? 0 : parseFloat(cs.outlineWidth)}`; (strokes[a] ??= {})[k2] = ((strokes[a] ??= {})[k2] ?? 0) + 1 }
  }
  return { label, text, strokes }
}, label)
const out = []
await tab('replay'); await page.waitForTimeout(1500); out.push(await measure('DEJA-VU'))
await page.click('#c25pp'); await page.waitForTimeout(400); out.push(await measure('DEJA-VU, SORT open')); await page.click('#c25ch [data-px]').catch(() => {})
await tab('whatif'); await page.waitForTimeout(1500); out.push(await measure('DOJO'))
await tab('shot'); await page.waitForTimeout(1500); out.push(await measure('SHOT CALLER'))
await tab('blast'); await page.waitForTimeout(3000); out.push(await measure('BLAST RADIUS'))
await tab('replay'); await page.waitForTimeout(1000)
await page.evaluate(() => document.activeElement?.blur?.()); await page.keyboard.press('j'); await page.waitForTimeout(900); out.push(await measure('JUKEBOX')); await page.keyboard.press('Escape'); await page.waitForTimeout(400)
await tab('witness'); await page.waitForTimeout(2000); out.push(await measure('WITNESS')); await page.keyboard.press('Escape'); await page.waitForTimeout(400)
await page.keyboard.press('Escape'); await page.waitForTimeout(900); out.push(await measure('MENU'))
for (const o of out) {
  console.log(`\n######## ${o.label}`)
  for (const [a, m] of Object.entries(o.text)) { console.log(`  [${a}] text`); for (const [k, ex] of Object.entries(m).sort()) console.log(`     ${k.padEnd(44)} ${ex.join(' | ')}`) }
  for (const [a, m] of Object.entries(o.strokes)) { console.log(`  [${a}] strokes`); for (const [k, n] of Object.entries(m).sort()) console.log(`     ${k} x${n}`) }
}
await browser.close()
