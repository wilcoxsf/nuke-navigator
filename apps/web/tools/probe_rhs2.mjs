// one-off probe (10 Nov): the corner buttons under the histograms: inside the panel, off the park, not over the histograms, text fits, clickable
import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const out = []
for (const [w, h] of [[1827, 992], [1440, 820], [1280, 720]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  const errs = []; page.on('pageerror', (e) => errs.push(e.message))
  await page.route('**/api.open-meteo.com/**', (r) => r.abort())
  await page.goto('http://localhost:5195/?mode=dojo&ui=K&cp=25&seed=7&ir=0&menu=0')
  await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 180000 })
  await page.waitForTimeout(1500)
  for (const m of ['replay', 'whatif']) {
    await page.evaluate((m) => window.__mix25.setMode(m), m); await page.waitForTimeout(1500)
    const r = await page.evaluate(() => {
      const R = (e) => { const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)] }
      const bw = document.querySelector('#c25ch .bw'), hi = document.querySelector('#c25hi'), park = document.querySelector('#c25h')
      const a = bw.getBoundingClientRect(), H = hi.getBoundingClientRect(), P = park.getBoundingClientRect()
      const used = Math.max(...[...document.querySelectorAll('#c25hb > *')].filter((k) => k.offsetParent).map((k) => k.getBoundingClientRect().bottom))
      const btns = [...bw.querySelectorAll('.bt.bwb')].filter((b) => b.offsetParent)
      const over = btns.filter((b) => b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1).map((b) => b.textContent)
      const top = btns.map((b) => { const q = b.getBoundingClientRect(); const e = document.elementFromPoint((q.left + q.right) / 2, (q.top + q.bottom) / 2); return b.contains(e) })
      return { bw: R(bw), inside: a.left >= H.left - 1 && a.right <= H.right + 1 && a.bottom <= H.bottom + 1, offPark: a.left >= P.right - 1, clearOfHists: a.top >= used + 4, used: Math.round(used), fit: window.__mix25.cornerFit(), tight: bw.classList.contains('tight'), n: btns.length, rows: [...bw.querySelectorAll('.bwr')].map((r) => [...r.querySelectorAll('.bt.bwb')].filter((b) => b.offsetParent).map((b) => b.textContent.replace(/\s+/g, ' ').trim().slice(0, 26)).join(' | ')), overflow: over, clickable: top.every(Boolean), info: [...document.querySelectorAll('#c25i b, #c25i span')].filter((e) => e.offsetParent).map((e) => e.textContent.trim().slice(0, 18) + (e.scrollWidth > e.clientWidth + 1 ? ' CUT' : '')).join(' | '), face: (() => { const f = document.querySelector('#c25f').getBoundingClientRect(); return [Math.round(f.width), Math.round(f.height)] })() }
    })
    out.push(`${w}x${h} ${m}: ${JSON.stringify(r)}`)
  }
  // a panel opened from the corner
  await page.evaluate(() => window.__mix25.setMode('replay')); await page.waitForTimeout(1000)
  await page.click('#c25pp'); await page.waitForTimeout(600)
  const pp = await page.evaluate(() => { const p = document.querySelector('#c25ch .ppl'); if (!p) return null; const b = p.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom), innerWidth, innerHeight] })
  out.push(`  BOMB BINDER panel: ${JSON.stringify(pp)}`)
  await page.screenshot({ path: `C:/Users/andrewwi/.claude/jobs/81090a71/tmp/rhs_${w}.png` })
  out.push('  errors ' + JSON.stringify(errs)); await page.close()
}
console.log(out.join('\n')); await browser.close()
