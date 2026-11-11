// one-off probe (10 Nov): the right-hand column (histograms), the space under it, NUKE IT and the corner buttons, at three sizes
import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const out = []
for (const [w, h] of [[1827, 992], [1280, 720]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  await page.route('**/api.open-meteo.com/**', (r) => r.abort())
  await page.goto('http://localhost:5195/?mode=dojo&ui=K&cp=25&seed=7&ir=0&menu=0')
  await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 180000 })
  await page.waitForTimeout(1500)
  for (const m of ['replay', 'whatif']) {
    await page.evaluate((m) => window.__mix25.setMode(m), m); await page.waitForTimeout(1200)
    const r = await page.evaluate(() => {
      const R = (e) => { const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)] }
      const kids = [...document.querySelectorAll('.c25 > *')].filter((e) => e.offsetParent && e.getBoundingClientRect().width > 2).map((e) => `${e.id || ''}.${String(e.className).replace(/\s+/g, '.')}:${R(e).join(',')}`)
      const bw = document.querySelector('#c25ch .bw')
      const hi = document.querySelector('#c25hi'), inner = [...hi.querySelectorAll('#c25hb > *, #c25hb > * > *')].filter((e) => e.offsetParent).map((e) => `${e.id || e.tagName}.${String(e.className).slice(0, 20)}:${R(e).join(',')}`), cs = getComputedStyle(hi)
      return { kids: [...kids, 'HI ' + cs.display + ' ' + cs.flexDirection + ' ' + cs.justifyContent + ' pad ' + cs.padding, ...inner.map((x) => '   ' + x)], bw: bw ? R(bw) : null, nk: R(document.querySelector('#c25nk')), ch: R(document.querySelector('#c25ch')) }
    })
    out.push(`${w}x${h} ${m}:\n  ` + r.kids.join('\n  ') + `\n  bw ${r.bw} nk ${r.nk} ch ${r.ch}`)
  }
  await page.close()
}
console.log(out.join('\n')); await browser.close()
