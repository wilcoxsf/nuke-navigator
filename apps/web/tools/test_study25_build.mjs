// Study 25, the voxel builds (30 Oct): the Coke corner baked from the park model's own triangles (coke25.js, science/bake_coke_vox.py) and the all-voxel infield
// (diamond25.js). Measures geometry, never judges a picture:
//   the bottle: a closed shell on its revolved outline (no cube more than a cube and a half off it), a lip ring and a cap that meets it, the red label, the word
//     "Coca-Cola" in cubes raised one cube off the label, and how tall its letters come out on screen from two cameras
//   the glove: solid (enough cubes, no tunnel through its middle)
//   the cut: no live model triangle left where the bottle, the glove or the voxel infield stand, and nothing of the model's infield above the voxel ground
//   the infield: the bags, the plate, the mound and the rubber where the rule book puts them in the flights' own plate frame (within 0.1 m)
//   no page errors
// Usage: node tools/test_study25_build.mjs [base url, default http://localhost:5174]
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const base = process.argv[2] ?? 'http://localhost:5174'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 820 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
await page.route('**/api.open-meteo.com/**', (r) => r.abort())
let fails = 0
const check = (name, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '   ' + info : ''}`); if (!ok) fails++ }
await page.goto(`${base}/?mode=dojo&ui=K&cp=25&seed=7&menu=0`)
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 240000 })
for (let k = 0; k < 60 && !(await page.evaluate(() => !!window.__mix25.coke() && window.__mix25.cut() > 0)); k++) await page.waitForTimeout(300)

// ---- the bottle ----
const B = await page.evaluate(() => {
  const c = window.__mix25.coke(), n = c.count(), f = c.frame(), THREE = window.__cp.NN.THREE, V = 0.25, VF = 0.2
  const u = f.u, c0 = f.c0, w = new THREE.Vector3()
  const tr = (p) => { w.set(p[0], p[1], p[2]).sub(c0); const s = w.dot(u), t = ((s - f.s0) / f.L) * 100; w.addScaledVector(u, -s); return [t, w.length()] }
  // every shell cube within a cube and a half of the outline (the lip ring stands a cube proud; the end faces are discs)
  let off = 0, worst = 0
  // (the distance to the outline in the bottle's own plane, so a steep shoulder counts what the eye sees: the nearest point of the curve, not the one straight out)
  const toCurve = (t, r, lip) => { let best = 1e9; for (let k = -12; k <= 12; k++) { const t2 = Math.min(100, Math.max(0, t + (k * 0.25 * 100) / (4 * f.L))), R = f.R(t2) + (lip && t2 >= 93 && t2 < 96.5 ? V : 0); best = Math.min(best, Math.hypot(((t2 - t) / 100) * f.L, r - R)) } return best }
  for (const p of f.cells) { const [t, r] = tr(p), endFace = t < 2.5 || t > 97.5, dd = endFace ? 0 : toCurve(t, r, p[3] === 5); worst = Math.max(worst, dd); if (dd > 1.5 * V) off++ }
  // every letter cube on the label, just outside the shell: no more than a shell cube and a letter cube off the outline, never inside it
  let loose = 0
  for (const p of f.letters) { const [t, r] = tr(p), R = f.R(t); if (r < R - 0.05 || r > R + V + VF || t < f.band[0] || t > f.band[1]) loose++ }
  // the cap meets the lip: the nearest cap cube to the lip ring along the bottle
  const lipT = f.cells.filter((p) => p[3] === 5).map((p) => tr(p)[0]), capT = f.cells.filter((p) => p[3] === 4).map((p) => tr(p)[0])
  const gap = ((Math.min(...capT) - Math.max(...lipT)) / 100) * f.L
  // the glove: no tunnel through its middle (a vertical line through the middle of its footprint passes through cubes)
  const gx = f.glove.reduce((a, p) => a + p[0], 0) / f.glove.length, gz = f.glove.reduce((a, p) => a + p[2], 0) / f.glove.length
  const column = f.glove.filter((p) => Math.abs(p[0] - gx) < 0.6 && Math.abs(p[2] - gz) < 0.6).length
  return { n, off, worst: +worst.toFixed(2), loose, gap: +gap.toFixed(2), column, L: f.L }
})
check('the bottle is a closed shell of cubes on its own outline (none more than 1.5 cubes off), with the red label', B.n.bottle > 8000 && B.off === 0 && B.n.red > 2000, JSON.stringify({ n: B.n, off: B.off, worst: B.worst }))
check('a lip ring at the mouth and a red cap that meets it (no gap along the bottle)', B.n.lip > 50 && B.n.cap > 100 && B.gap <= 0.3, JSON.stringify({ lip: B.n.lip, cap: B.n.cap, gap: B.gap }))
check('"Coca-Cola" in cubes, every one raised one cube off the label (none floating, none sunk)', B.n.letters > 300 && B.loose === 0 && B.n.label === 1, JSON.stringify({ letters: B.n.letters, loose: B.loose }))
check('the glove is solid: a column through its middle meets cubes, and it has the cubes of a shell', B.n.glove > 1500 && B.column > 0, JSON.stringify({ glove: B.n.glove, column: B.column }))
check('the slide, three kids', B.n.slide > 100 && B.n.kids === 3, JSON.stringify({ slide: B.n.slide, kids: B.n.kids }))

// how tall the capitals come out on screen: the spread of the letter cubes square to the bottle on screen, less the ascenders and descenders (the glyph is 1.25 caps)
const capPx = (cam, target) => page.evaluate(([cam, target]) => {
  const NN = window.__cp.NN, THREE = NN.THREE
  if (cam) { NN.camera.position.set(...cam); NN.controls.target.set(...target); NN.controls.update() }
  NN.camera.updateMatrixWorld(); NN.camera.updateProjectionMatrix()
  const f = window.__mix25.coke().frame(), el = [...document.querySelectorAll('canvas')].sort((p, q) => q.clientWidth * q.clientHeight - p.clientWidth * p.clientHeight)[0], W = el.clientWidth, H = el.clientHeight
  const px = (v) => { const p = new THREE.Vector3(...v).project(NN.camera); return [(p.x * 0.5 + 0.5) * W, (-p.y * 0.5 + 0.5) * H] }
  const a = px(f.c0.toArray()), b = px(f.c0.clone().addScaledVector(f.u, 5).toArray()), dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L
  const q = f.letters.map((p) => { const s = px(p); return s[0] * nx + s[1] * ny }).sort((x, y) => x - y)
  const spread = q[Math.floor(q.length * 0.98)] - q[Math.floor(q.length * 0.02)]
  const ends = [px(f.c0.clone().addScaledVector(f.u, f.s0).toArray()), px(f.c0.clone().addScaledVector(f.u, f.s0 + f.L).toArray())]
  return { cap: +(spread / 1.25).toFixed(1), bottlePx: Math.round(Math.hypot(ends[1][0] - ends[0][0], ends[1][1] - ends[0][1])) }
}, [cam, target])
const atDefault = await capPx(null, null)
// a broadcast-distance look at the left-field corner (as in his screengrabs of 29 Oct: the camera over the third-base side, about 70 m from the bottle)
const atCorner = await capPx([-20, 40, -75], [-62, 13, -133])
check('the word reads from the left-field view: capitals at least 14 px tall (from the default whole-park view the whole bottle is only so long; reported)', atCorner.cap >= 14, JSON.stringify({ corner: atCorner, wholePark: atDefault }))

// ---- the cut: no live model triangle where the voxels stand, nothing of the model's infield above the voxel ground ----
const CUT = await page.evaluate(() => {
  const NN = window.__cp.NN, THREE = NN.THREE, c = window.__mix25.coke(), dm = window.__mix25.diamond(), h0 = window.__cp.toWorld([0, 0, 0])
  const a = new THREE.Vector3(), b = new THREE.Vector3(), q = new THREE.Vector3()
  let coke = 0, infield = 0, raised = 0, cutTris = 0
  window.__nn.stadium.updateMatrixWorld(true)
  window.__nn.stadium.traverse((m) => {
    if (!m.isMesh) return
    const g = m.geometry, pos = g.attributes.position, idx = g.index, nt = (idx ? idx.count : pos.count) / 3, vi = (k) => (idx ? idx.getX(k) : k)
    for (let t = 0; t < nt; t++) {
      const i0 = vi(t * 3), i1 = vi(t * 3 + 1), i2 = vi(t * 3 + 2)
      a.fromBufferAttribute(pos, i0).applyMatrix4(m.matrixWorld); b.fromBufferAttribute(pos, i1).applyMatrix4(m.matrixWorld); q.fromBufferAttribute(pos, i2).applyMatrix4(m.matrixWorld)
      if ((i0 === i1 && i1 === i2) || (a.distanceToSquared(b) < 1e-12 && a.distanceToSquared(q) < 1e-12)) { cutTris++; continue }
      const x = (a.x + b.x + q.x) / 3, y = (a.y + b.y + q.y) / 3, z = (a.z + b.z + q.z) / 3
      if (c.under(x, y, z)) coke++
      if (dm.under(x, y, z)) infield++
      const ex = x - h0.x, ey = -(z - h0.z)
      if (dm.inFill(ex, ey) && y > 0.02 && y < 1.2) raised++ // the model's mound (0.3 m), bags (0.1 m) or anything else poking up through the voxel ground
    }
  })
  return { coke, infield, raised, cutTris }
})
check('no live model triangle left inside the voxel bottle or glove, or under the voxel infield; none of the model\'s infield stands above the voxel ground', CUT.coke === 0 && CUT.infield === 0 && CUT.raised === 0 && CUT.cutTris > 5000, JSON.stringify(CUT))

// ---- the infield where the rule book puts it, in the flights' plate frame ----
const P = await page.evaluate(() => window.__mix25.diamond().parts())
const FT = 0.3048, IN = 0.0254, R2 = Math.SQRT1_2, xy = (a, b) => [(a - b) * R2, (a + b) * R2]
const want = [xy(90 * FT - 7.5 * IN, 7.5 * IN), xy(7.5 * IN, 90 * FT - 7.5 * IN), xy(90 * FT, 90 * FT)]
const dB = P.bases.map((p, i) => Math.hypot(p[0] - want[i][0], p[1] - want[i][1]))
check('first, third and second within 0.1 m of where the rule book puts them; the mound 59 ft out, the rubber\'s front 60.5 ft out', dB.every((x) => x <= 0.1) && Math.abs(P.mound[1] - 59 * FT) < 0.05 && Math.abs(P.rubber[1] + 3 * IN - 60.5 * FT) < 0.05 && P.ground > 15000,
  JSON.stringify({ bases: dB.map((x) => +x.toFixed(3)), mound: P.mound, ground: P.ground, foul: P.foul.map((x) => +x.toFixed(1)) }))
// the voxel bags stand on the same spots as the field markings the wire draws (wiremarks.js), so nothing doubles
const marks = await page.evaluate(() => { const L = window.__nn.wireMarks; return L ? { n: L.marks.length / 6 } : null })
check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
console.log(fails ? `${fails} FAILED` : 'ALL PASS', marks ? `(wire marks: ${marks.n} segments)` : '')
await browser.close()
process.exit(fails ? 1 : 0)
