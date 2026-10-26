// The other 29 parks in the wire-only view (Study 23, ?park=TEAM), no screenshots by default: each park loads without page errors, its own wire model is the one in the
// scene (registered: the infield sits around home plate at (0.3, 1.0), centre field -z), its home-run line is built from its own crest.json (a continuous polyline foul pole
// to foul pole), the markings are built, and the orange line is on screen from the home and bird's-eye cameras (pixel counts read in memory).
// Usage (dev server running): node tools/test_parks.mjs [base url] [TEAM ...] [--shots DIR]  (--shots saves one bird's-eye PNG per park for private review only)
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const argv = process.argv.slice(2)
const si = argv.indexOf('--shots')
const shots = si >= 0 ? argv.splice(si, 2)[1] : null
const base = argv[0] && argv[0].startsWith('http') ? argv.shift() : 'http://localhost:5174'
const ALL = ['ARI', 'ATH', 'ATL', 'BAL', 'BOS', 'CHC', 'CIN', 'CLE', 'COL', 'CWS', 'DET', 'HOU', 'KC', 'LAA', 'LAD', 'MIA', 'MIL', 'MIN', 'NYM', 'NYY', 'PHI', 'PIT', 'SD', 'SEA', 'STL', 'TB', 'TEX', 'TOR', 'WSH']
const teams = argv.length ? argv : ALL
if (shots) mkdirSync(shots, { recursive: true })
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
let fails = 0
const check = (name, ok, extra = '') => { if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', name, extra) }
const orange = (page) => page.evaluate(() => { const src = document.querySelector('canvas'), c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const g = c.getContext('2d'); g.drawImage(src, 0, 0); const d = g.getImageData(0, 60, c.width, c.height - 60).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 190 && d[i + 1] > 70 && d[i + 1] < 190 && d[i + 2] < 110 && d[i] - d[i + 2] > 110) n++; return n })
const rows = []
async function runPark(team) {
  const errs = [], reqs = []
  let navs = 0
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 1 })
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) navs++ })
  try {
  page.on('pageerror', (e) => errs.push(e.message))
  page.on('requestfinished', (r) => { const u = r.url(); if (/\.glb|crest|fun_oracle/.test(u)) reqs.push(u.replace(base, '')) })
  const t0 = Date.now()
  await page.goto(`${base}/?mode=dojo&ui=K&cp=23&seed=7&park=${team}`)
  await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__nn?.wireStats, null, { timeout: 180000 })
  await page.waitForTimeout(2500)
  await page.waitForFunction(() => window.__nn?.wireStats && window.__nn.wireWall?.length, null, { timeout: 60000 })
  const info = await page.evaluate(() => {
    const st = window.__nn.stadium, THREE = window.__nn.THREE
    const names = new Set(); st.traverse((m) => { if (m.isMesh) names.add(m.userData?.name || m.name) })
    const box = new THREE.Box3().setFromObject(st)
    const w = Array.from(window.__nn.wireWall ?? [])
    const hx = 0.3, hz = 1.0, bear = (x, z) => Math.atan2(x - hx, -(z - hz)) * 180 / Math.PI
    let gaps = 0
    for (let i = 6; i + 5 < w.length; i += 6) if (Math.hypot(w[i] - w[i - 3], w[i + 1] - w[i - 2], w[i + 2] - w[i - 1]) > 1e-6) gaps++
    return { stats: window.__nn.wireStats, title: document.title, first: w.slice(0, 3), box: [box.min.toArray(), box.max.toArray()].map((a) => a.map((v) => Math.round(v))), segs: w.length / 6, gaps, b0: w.length ? bear(w[0], w[2]) : null, b1: w.length ? bear(w[w.length - 3], w[w.length - 1]) : null, heights: [Math.min(...w.filter((_, i) => i % 3 === 1)), Math.max(...w.filter((_, i) => i % 3 === 1))] }
  })
  const st = info.stats
  const crest = await page.evaluate(async (t) => (await fetch(`/parks/${t}/crest.json`)).json(), team)
  const t0r = (crest.bearing[0] * Math.PI) / 180, want = [0.3 + crest.radius[0] * Math.sin(t0r), crest.height[0], 1.0 - crest.radius[0] * Math.cos(t0r)]
  const og = {}
  for (const v of ['home', 'bird']) { await page.click(`[data-v="${v}"]`); await page.waitForTimeout(1000); og[v] = await orange(page) }
  if (shots) { await page.click('[data-v="bird"]'); await page.waitForTimeout(800); await page.screenshot({ path: `${shots}/${team}_bird.png` }); await page.click('[data-v="home"]'); await page.waitForTimeout(800); await page.screenshot({ path: `${shots}/${team}_home.png` }) }
  const ok = [
    ['no page errors', errs.length === 0, errs.slice(0, 2).join(' | ')],
    ['loads its own wire model and crest, not Oracle\'s model or fun objects (dojo.js still reads oracle_crest.json for its flight wall)', reqs.some((u) => u.includes(`/parks/${team}/wire.glb`)) && reqs.some((u) => u.includes(`/parks/${team}/crest.json`)) && !reqs.some((u) => /stadium_sf|fun_oracle/.test(u)), reqs.join(' ')],
    ['the orange line drawn is this park\'s crest (first point within 1 cm)', info.first.length === 3 && Math.hypot(info.first[0] - want[0], info.first[1] - want[1], info.first[2] - want[2]) < 0.01, `${info.first.map((v) => v.toFixed(2))} vs ${want.map((v) => v.toFixed(2))}`],
    ['title names the park', info.title.startsWith(team), info.title],
    ['the model sits in the Oracle frame (home plate inside the model box, centre field toward -z)', info.box[0][2] < -100 && info.box[1][2] > 5 && info.box[0][0] < -60 && info.box[1][0] > 60, JSON.stringify(info.box)],
    ['the home-run line is one continuous polyline from foul pole to foul pole', info.segs >= 360 && info.gaps === 0 && info.b0 < -45 && info.b1 > 45, `${info.segs} segments, ${info.gaps} breaks, bearings ${info.b0?.toFixed(1)} to ${info.b1?.toFixed(1)}, heights ${info.heights.map((v) => v.toFixed(1)).join(' to ')} m`],
    ['markings and a wire are built', st.marks > 200 && st.heavy + st.faint > 2500 && st.wallEdgeLength > 150, `marks ${st.marks} heavy ${st.heavy} faint ${st.faint} line ${st.wallEdgeLength} m`],
    ['no Oracle-only extras (fun objects, protected boxes)', !st.funSegments && st.protectedEdges === 0, `fun ${st.funSegments} protected ${st.protectedEdges}`],
    ['the orange line is on screen (over 150 px from the bird view, and some from home: dome roofs can stand in front of the home camera)', og.bird > 150 && og.home > 20, JSON.stringify(og)],
  ]
  if (navs > 1) throw new Error('the page reloaded during the test (a dev-server hot update from another edit?)')
  return { ok, row: `${team} ${((Date.now() - t0) / 1000).toFixed(0)}s seat-flagged ${st.seatFlagged} dropped ${st.dropped} heavy ${st.heavy} orange ${og.home}/${og.bird}` }
  } finally { await page.close() }
}
for (const team of teams) {
  let res = null
  for (let attempt = 1; attempt <= 3 && !res; attempt++) {
    try { res = await runPark(team) } catch (e) { console.log(`RETRY ${team} (attempt ${attempt}): ${e.message.split(String.fromCharCode(10))[0]}`) }
  }
  if (!res) { check(`${team}: test ran`, false, 'three attempts failed'); continue }
  for (const [n, k, e] of res.ok) check(`${team}: ${n}`, k, e)
  rows.push(res.row)
}
console.log(rows.join('\n'))
console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
await browser.close()
process.exit(fails ? 1 : 0)
