// Study 23 (wire only), no screenshots: loads without errors, every camera preset moves the camera and leaves a drawn park on screen (bright-pixel share read in memory, so a camera inside the stands or
// aimed at nothing fails), the line toggles rebuild the wire, no flight overlay is drawn. Usage: node tools/test_study23.mjs [base url]
import { chromium } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:5174'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
let fails = 0
const check = (name, ok, extra = '') => { if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', name, extra) }
const errs = []
const page = await browser.newPage({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 1 })
page.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')))
await page.goto(`${base}/?mode=dojo&ui=K&cp=23&seed=7`)
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady, null, { timeout: 180000 })
await page.waitForTimeout(3500)
const share = () => page.evaluate(() => {
  const src = document.querySelector('canvas'), c = document.createElement('canvas')
  c.width = src.width; c.height = src.height
  const g = c.getContext('2d')
  g.drawImage(src, 0, 0)
  const d = g.getImageData(0, 60, c.width, c.height - 60).data
  let b = 0
  for (let i = 0; i < d.length; i += 4) if ((d[i] + d[i + 1] + d[i + 2]) / 3 > 110) b++
  return b / (d.length / 4)
})
const lum = () => page.evaluate(() => { const src = document.querySelector('canvas'), c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const g = c.getContext('2d'); g.drawImage(src, 0, 0); const d = g.getImageData(0, 60, c.width, c.height - 60).data; let t = 0; for (let i = 0; i < d.length; i += 4) t += (d[i] + d[i + 1] + d[i + 2]) / 3; return t / (d.length / 4) })
const orange = () => page.evaluate(() => { const src = document.querySelector('canvas'), c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const g = c.getContext('2d'); g.drawImage(src, 0, 0); const d = g.getImageData(0, 60, c.width, c.height - 60).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 190 && d[i + 1] > 70 && d[i + 1] < 190 && d[i + 2] < 110 && d[i] - d[i + 2] > 110) n++; return n })
const cam = () => page.evaluate(() => window.__nn.camera.position.toArray().map((v) => Math.round(v)).join(','))
const seen = new Set()
const orangeSeen = {}
for (const k of ['home', 'bird', 'plate', 'lf', 'rf', 'cf']) {
  await page.click(`[data-v="${k}"]`)
  await page.waitForTimeout(1200)
  const c = await cam(), s = await share(), og = await orange()
  seen.add(c)
  orangeSeen[k] = og
  check(`view ${k}: camera moved and the park is drawn`, s > 0.004, `camera ${c}, bright share ${(100 * s).toFixed(2)}%`)
}
console.log('orange pixels per view:', JSON.stringify(orangeSeen))
check('the orange crest line is on screen in the views that face the wall (home, bird, plate, lf, rf each over 150 orange pixels; the cf camera stands at the wall and looks back at the plate, so it is not asked)', ['home', 'bird', 'plate', 'lf', 'rf'].every((k) => orangeSeen[k] > 150), JSON.stringify(orangeSeen))
check('the six views are six different camera positions', seen.size === 6, [...seen].join(' | '))
const st = await page.evaluate(() => window.__nn.wireStats)
check('the wire is built with markings and the orange crest line', st && st.marks > 200 && st.heavy > 4000 && st.wallEdgeLength > 150, JSON.stringify(st))
await page.click('[data-l="plain"]'); await page.waitForTimeout(1500)
const sp = await share()
check('plain lines still draw a park', sp > 0.003, `${(100 * sp).toFixed(2)}%`)
await page.click('[data-l="full"]'); await page.waitForTimeout(1500)
await page.click('#c23c'); await page.waitForTimeout(1500)
const sn = await page.evaluate(() => window.__nn.wireStats)
check('contours toggle rebuilds the wire (contour count goes to zero)', sn && sn.contours === 0, JSON.stringify(sn));
// stands presets: heavy-line counts fall for clean/ghost/terrace and the park gets visibly quieter (bright-pixel share read in memory)
await page.click('[data-v="home"]'); await page.waitForTimeout(800)
if (!(await page.evaluate(() => document.querySelector('#c23c').classList.contains('on')))) { await page.click('#c23c'); await page.waitForTimeout(1500) } // contours back on (an earlier check switched them off)
const P = {}
for (const k of ['full', 'clean', 'ghost', 'quiet', 'terrace']) {
  await page.click(`[data-s="${k}"]`); await page.waitForTimeout(2500)
  P[k] = { st: await page.evaluate(() => window.__nn.wireStats), sh: await share(), lum: await lum() }
}
console.log('presets:', Object.entries(P).map(([k, v]) => `${k}: heavy ${v.st.heavy} faint ${v.st.faint} dropped ${v.st.dropped} contours ${v.st.contours} bright ${(100 * v.sh).toFixed(1)}% mean luminance ${v.lum.toFixed(1)} | seats nearest the field: drawn length ${v.st.nearFieldSeatLength} m, thinned ${v.st.thinned}, Coke white edges skipped ${v.st.funSkipped}`).join(' | '))
check('each preset reports itself', Object.entries(P).every(([k, v]) => v.st.stands === k))
check('clean and ghost thin the thick set to under half of full (seat detail is no longer thick)', P.clean.st.heavy < P.full.st.heavy * 0.5 && P.ghost.st.heavy < P.full.st.heavy * 0.5, `${P.full.st.heavy} -> ${P.clean.st.heavy}, ${P.ghost.st.heavy}`)
check('the seat detector flags a large share of the model and protects the scoreboard and Coke cluster', P.ghost.st.seatFlagged > 50000 && P.ghost.st.protectedEdges > 20000, `seat detail ${P.ghost.st.seatFlagged}, protected ${P.ghost.st.protectedEdges}`)
check('the fan attractions are drawn from the full-detail asset (halo and core, three colour groups)', (P.ghost.st.funSegments ?? 0) > 5000, String(P.ghost.st.funSegments))
check('full thins nothing while every other preset drops seat detail', P.full.st.dropped === 0 && P.clean.st.dropped > 20000 && P.ghost.st.dropped > P.clean.st.dropped * 0.8 && P.quiet.st.dropped > P.ghost.st.dropped && P.terrace.st.dropped > P.quiet.st.dropped, [P.full, P.clean, P.ghost, P.quiet, P.terrace].map((v) => v.st.dropped).join(' < '))
check('ghost drops tiny seat edges', P.ghost.st.dropped > 1000, String(P.ghost.st.dropped))
check('terrace leaves the seats out (fewer heavy than full) and adds denser contours', P.terrace.st.heavy < P.full.st.heavy && P.terrace.st.contours > P.ghost.st.contours, `contours ${P.terrace.st.contours} vs ${P.ghost.st.contours}`)
check('the seats nearest the field thin step by step: drawn line length falls from full to clean to ghost to quiet to terrace', P.clean.st.nearFieldSeatLength < P.full.st.nearFieldSeatLength * 0.9 && P.ghost.st.nearFieldSeatLength < P.clean.st.nearFieldSeatLength * 0.8 && P.quiet.st.nearFieldSeatLength < P.ghost.st.nearFieldSeatLength * 0.8 && P.terrace.st.nearFieldSeatLength < P.quiet.st.nearFieldSeatLength * 0.8, [P.full, P.clean, P.ghost, P.quiet, P.terrace].map((v) => v.st.nearFieldSeatLength).join(' > '))
check('the park gets quieter overall (mean luminance never rises along the ladder, full well above terrace)', P.clean.lum <= P.full.lum && P.ghost.lum <= P.clean.lum + 0.5 && P.quiet.lum <= P.ghost.lum + 0.5 && P.terrace.lum <= P.quiet.lum + 0.5 && P.terrace.lum < P.full.lum * 0.8, [P.full.lum, P.clean.lum, P.ghost.lum, P.quiet.lum, P.terrace.lum].map((v) => v.toFixed(1)).join(' > '))
await page.click('[data-s="ghost"]'); await page.waitForTimeout(1500)
const flightInfo = await page.evaluate(() => window.__nn.scene.children.filter((o) => o.isPoints || (o.isMesh && o.geometry?.type === 'TubeGeometry')).map((o) => ({ n: o.name, t: o.type, v: o.visible })))
const flight = flightInfo.filter((o) => o.v).length
check('no visible flight overlay in the scene', flight === 0, JSON.stringify(flightInfo))
check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '))
console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
await browser.close()
process.exit(fails ? 1 : 0)
