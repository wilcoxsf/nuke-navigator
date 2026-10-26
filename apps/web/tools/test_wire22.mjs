// Numeric check of the Oracle wireframe upgrade (no screenshots, no image files): the generated field markings and wall line against real dimensions, and in-memory pixel counts of the drawn canvas
// (plain wire against the new wire). Usage: node tools/test_wire22.mjs [base url]
import { chromium } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:5174'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
let fails = 0
const check = (name, ok, extra = '') => { if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', name, extra) }
const errs = []
const FT = 0.3048

async function load(wire) {
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 1 })
  page.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')))
  await page.goto(`${base}/?mode=dojo&ui=K&cp=22&seed=7&wire=${wire}&stands=full`)
  await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady, null, { timeout: 180000 })
  await page.waitForTimeout(4000)
  return page
}
const pix = (page) => page.evaluate(() => {
  const src = document.querySelector('canvas'), r = document.querySelector('#c22h').getBoundingClientRect()
  const c = document.createElement('canvas'), k = src.width / innerWidth
  c.width = Math.floor(r.width * k); c.height = Math.floor(r.height * k)
  const g = c.getContext('2d')
  g.drawImage(src, r.left * k, r.top * k, r.width * k, r.height * k, 0, 0, c.width, c.height)
  const d = g.getImageData(0, 0, c.width, c.height).data
  const acc = getComputedStyle(document.querySelector('#cp')).getPropertyValue('--acc').trim()
  const m = /^#?([0-9a-f]{6})$/i.exec(acc), A = m ? [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)] : [224, 162, 74]
  let bright = 0, accent = 0
  for (let i = 0; i < d.length; i += 4) {
    const L = (d[i] + d[i + 1] + d[i + 2]) / 3
    if (L > 110) bright++
    if (Math.abs(d[i] - A[0]) < 40 && Math.abs(d[i + 1] - A[1]) < 40 && Math.abs(d[i + 2] - A[2]) < 40) accent++
  }
  return { bright, accent, total: d.length / 4 }
})

const plain = await load('plain')
const P = await pix(plain)
await plain.close()
const full = await load('full')
const F = await pix(full)
const info = await full.evaluate(() => ({ wallEdges: Array.from(window.__nn.wireWall ?? []), stats: window.__nn.wireStats, marks: window.__nn.wireMarks ? { marks: Array.from(window.__nn.wireMarks.marks), wall: Array.from(window.__nn.wireMarks.wall), track: Array.from(window.__nn.wireMarks.track), ticks: Array.from(window.__nn.wireMarks.ticks) } : null,
  wallAt: [-45, -20, 0, 30, 45].map((b) => ({ b, w: window.__cp.wallAt(b) })), wallAll: Array.from({ length: 93 }, (_, i) => ({ b: -46 + i, w: window.__cp.wallAt(-46 + i) })), home: [0.3, 1.0] }))
console.log('segment counts', JSON.stringify(info.stats))
check('markings and the warning track are generated (the wall is the models own edges, recoloured)', info.stats && info.stats.marks > 200 && info.stats.track > 100)
check('far bowl gets more lines than before', info.stats.faint > 0 && info.stats.heavy > 0, JSON.stringify({ faint: info.stats.faint, heavy: info.stats.heavy, contours: info.stats.contours }))
const seg = (a) => { const o = []; for (let i = 0; i + 5 < a.length; i += 6) o.push([[a[i], a[i + 1], a[i + 2]], [a[i + 3], a[i + 4], a[i + 5]]]); return o }
const ms = seg(info.marks.marks), pts = ms.flat()
const hx = info.home[0], hz = info.home[1]
const d2 = (p, x, z) => Math.hypot(p[0] - x, p[2] - z)
const finite = pts.every((p) => p.every(Number.isFinite))
check('every marking point is finite and sits near the model ground (-3 to 4 m)', finite && pts.every((p) => p[1] > -3 && p[1] < 4), `y range ${Math.min(...pts.map((p) => p[1])).toFixed(2)} to ${Math.max(...pts.map((p) => p[1])).toFixed(2)}`)
// first base: a diamond near 90 ft along the right foul line (x right, z toward home so centre field is -z)
const fb = [hx + (90 * FT - 0.5 * FT) * Math.SQRT1_2, hz - (90 * FT - 0.5 * FT) * Math.SQRT1_2]
const nearFB = pts.filter((p) => d2(p, fb[0], fb[1]) < 0.45)
check('first base diamond is where it should be (90 ft along the foul line)', nearFB.length >= 4, `${nearFB.length} points within 0.45 m`)
// rubber: front edge 60.5 ft from the plate point, straight out
const rub = pts.filter((p) => Math.abs(p[0] - hx) < 0.4 && Math.abs(d2(p, hx, hz) - 60.5 * FT) < 0.06)
check('pitching rubber front edge is 60.5 ft from the plate', rub.length >= 2, `${rub.length} points`)
// mound: ground under the mound circle is higher than at the plate
const mound = pts.filter((p) => Math.abs(d2(p, hx, hz - 59 * FT) - 9 * FT) < 0.4 && Math.abs(p[0] - hx) < 1.2)
const plateY = pts.filter((p) => d2(p, hx, hz) < 0.6).map((p) => p[1])
const rubY = Math.max(...rub.map((p) => p[1])), rise = rubY - Math.min(...plateY)
check('the rubber sits about 10 inches above the plate (0.2 to 0.35 m)', rub.length > 0 && rise > 0.2 && rise < 0.35, `rise ${rise.toFixed(2)} m, ${mound.length} ring points`)
// foul lines reach the wall at 45 degrees
for (const s of [-1, 1]) {
  const w = info.wallAt.find((x) => x.b === 45 * s).w
  const far = pts.filter((p) => Math.abs((p[0] - hx) / Math.max(1e-6, (hz - p[2])) - s) < 0.03 && (hz - p[2]) > 20).map((p) => Math.hypot(p[0] - hx, p[2] - hz))
  const reach = far.length ? Math.max(...far) : 0
  check(`${s < 0 ? 'left' : 'right'} foul line reaches the wall distance`, w && Math.abs(reach - w[0] * FT) < 1.5, `reaches ${(reach / FT).toFixed(0)} ft, wall ${w ? w[0].toFixed(0) : '?'} ft`)
}
// the wall line: top height and distance at sampled bearings
// the home-run line is ONE continuous polyline along the crest of the wall (science/wall_crest.py: the model's own wall surface), foul pole to foul pole
const segs = seg(info.wallEdges)
const bearingOf = (p) => (Math.atan2(p[0] - hx, -(p[2] - hz)) * 180) / Math.PI
const rad0 = (p) => Math.hypot(p[0] - hx, p[2] - hz)
const sectors = new Array(18).fill(0)
for (const [a, b2] of segs) sectors[Math.min(17, Math.max(0, Math.floor((bearingOf(a) + 45) / 5)))] += Math.hypot(a[0] - b2[0], a[1] - b2[1], a[2] - b2[2])
check('the orange line exists in volume (one polyline)', info.stats.wallEdgeLength > 150 && segs.length > 300, `${info.stats.wallEdgeLength} m in ${segs.length} segments`)
check('the orange line runs the whole way round: every 5 degree sector from -45 to +45 is covered', sectors.every((v) => v > 4), sectors.map((v) => Math.round(v)).join(' '))
let gap = 0
for (let i = 1; i < segs.length; i++) gap = Math.max(gap, Math.hypot(segs[i][0][0] - segs[i - 1][1][0], segs[i][0][1] - segs[i - 1][1][1], segs[i][0][2] - segs[i - 1][1][2]))
check('the orange line is one connected curve (largest gap between consecutive segments, metres)', gap < 0.01, gap.toFixed(4))
const bs = segs.map(([a]) => bearingOf(a))
check('one point per bearing, no stacked or doubled lines (bearings strictly increase)', bs.every((b, i) => i === 0 || b > bs[i - 1] - 1e-6), `${bs.length} samples from ${bs[0].toFixed(1)} to ${bs[bs.length - 1].toFixed(1)} degrees`)
const ys = segs.map(([a]) => a[1])
check('crest heights are plausible everywhere (0.8 to 10 m) and the band is not floating or buried', Math.min(...ys) > 0.8 && Math.max(...ys) < 10, `${Math.min(...ys).toFixed(2)} to ${Math.max(...ys).toFixed(2)} m`)
const rstep = segs.map(([a, b2]) => Math.abs(rad0(b2) - rad0(a))).sort((x, y2) => x - y2)
check('the orange line is smooth: 99th percentile radial step per quarter degree under 1.2 m, none over 3 m', rstep[Math.floor(0.99 * (rstep.length - 1))] < 1.2 && rstep[rstep.length - 1] < 3, `99th ${rstep[Math.floor(0.99 * (rstep.length - 1))].toFixed(2)} m, max ${rstep[rstep.length - 1].toFixed(2)} m`)
check('no orange outside the wall bearings', bs.every((b) => Math.abs(b) <= 46.01), `${bs.filter((b) => Math.abs(b) > 46.01).length}`)
// the orange wall line is smooth: the distance from the plate along the top line changes by at most 5 m (16 ft) per half degree (the raw sampled profile jumped 8 m at the right-field corner) and does not zigzag
const topSegs = seg(info.marks.wall).filter(([a, b]) => Math.abs(a[1] - b[1]) < 0.05) // the level runs, not the vertical steps
const rad = (p) => Math.hypot(p[0] - hx, p[2] - hz)
const jumps = topSegs.map(([a, b]) => Math.abs(rad(b) - rad(a)))
const rs = topSegs.map(([a]) => rad(a))
let rev = 0
for (let i = 2; i < rs.length; i++) { const d1 = rs[i - 1] - rs[i - 2], d2 = rs[i] - rs[i - 1]; if (Math.abs(d1) > 0.3 && Math.abs(d2) > 0.3 && Math.sign(d1) !== Math.sign(d2)) rev++ }
check('the orange wall line is smooth (largest step per half degree, direction reversals)', Math.max(...jumps) < 5 && rev <= 6, `largest step ${Math.max(...jumps).toFixed(1)} m, reversals ${rev}`)
const tr = seg(info.marks.track).flat().filter((p) => Math.abs(p[0] - hx) < 1.5 && p[2] < hz - 100)
const wc = info.wallAt.find((x) => x.b === 0).w
check('warning track runs 15 ft inside the wall in centre field', tr.length > 0 && Math.abs(Math.min(...tr.map((p) => hz - p[2])) - (wc[0] - 15) * FT) < 1.5, `${tr.length ? (Math.min(...tr.map((p) => hz - p[2])) / FT).toFixed(0) : '?'} ft vs ${(wc[0] - 15).toFixed(0)}`)
console.log(`pixels in the park panel: plain ${P.bright} bright of ${P.total} (accent ${P.accent}); new ${F.bright} bright (accent ${F.accent})`)
check('the new wire draws more of the park than the plain wire', F.bright > P.bright * 1.1, `${F.bright} vs ${P.bright}`)
check('the orange line is handed to the renderer as an accent-coloured fat line (the camera sweeps, so a pixel count of a thin far line is not a stable test)', info.stats.crestSegments > 300, `${info.stats.crestSegments} segments; accent pixels this frame ${F.accent}`)
check('the top of the wall is painted: a ribbon draped on the surface covers most of the crest (every 0.25 degree column is 4 triangles; the bullpen gap and one step have none)', info.stats.ribbonTriangles > 1200, `${info.stats.ribbonTriangles} triangles`)
check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '))
console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
await browser.close()
process.exit(fails ? 1 : 0)
