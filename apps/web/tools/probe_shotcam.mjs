// one-off probe (10 Nov): Shot Caller's camera after a seat is called: do home plate, the seat and the top of the highest way all land inside the park window?
import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const out = []
for (const [w, h] of [[1827, 992]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  const errs = []; page.on('pageerror', (e) => errs.push(e.message))
  await page.route('**/api.open-meteo.com/**', (r) => r.abort())
  await page.goto('http://localhost:5195/?mode=dojo&ui=K&cp=25&seed=7&ir=0&menu=0')
  await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 180000 })
  await page.waitForTimeout(1500)
  await page.evaluate(() => window.__mix25.setMode('shot')); await page.waitForTimeout(1500)
  for (const [sec, row, seat] of [['140', '12', '8'], ['148', '2', '10'], ['136', 'A', '3']]) {
    await page.selectOption('#c25ss', sec); await page.fill('#c25sr', row); await page.fill('#c25st', seat); await page.focus('#c25st'); await page.keyboard.press('Enter')
    await page.waitForFunction(() => window.__mix25.shot() && window.__mix25.shotFrame(), null, { timeout: 60000 })
    let prev = null
    await page.waitForTimeout(6000); let same = 0
    for (let k = 0; k < 40 && same < 3; k++) { await page.waitForTimeout(1000); const p = await page.evaluate(() => window.__cp.NN.camera.position.toArray().map((x) => Math.round(x * 10))); same = prev && p.join() === prev.join() ? same + 1 : 0; prev = p }
    const r = await page.evaluate(() => {
      const C = window.__cp.NN.camera, F = window.__mix25.shotFrame(), cv = [...document.querySelectorAll('canvas')].sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0], cr = cv.getBoundingClientRect(), pk = document.querySelector('#c25h').getBoundingClientRect()
      const scr = (v) => { const q = v.clone().project(C); return [Math.round(cr.left + ((q.x + 1) / 2) * cr.width), Math.round(cr.top + ((1 - q.y) / 2) * cr.height)] }
      const pts = { home: scr(F.home), seat: scr(F.spot), top: scr(F.top) }, inside = Object.fromEntries(Object.entries(pts).map(([k, [x, y]]) => [k, x >= pk.left && x <= pk.right && y >= pk.top && y <= pk.bottom]))
      const xs = Object.values(pts).map((p) => p[0]), ys = Object.values(pts).map((p) => p[1])
      return { seat: window.__mix25.shot().seat?.line, ways: window.__mix25.shot().ways.length, pts, inside, park: [Math.round(pk.left), Math.round(pk.top), Math.round(pk.right), Math.round(pk.bottom)], fill: [Math.round(((Math.max(...xs) - Math.min(...xs)) / pk.width) * 100), Math.round(((Math.max(...ys) - Math.min(...ys)) / pk.height) * 100)] }
    })
    out.push(`${w}x${h} ${JSON.stringify(r)}`)
  }
  out.push('  errors ' + JSON.stringify(errs)); await page.close()
}
console.log(out.join('\n')); await browser.close()
