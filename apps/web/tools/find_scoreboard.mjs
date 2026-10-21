// Ray-casts a grid of screen points over the video board in the default Dojo view to find its plane in world coordinates.
// Usage: node tools/find_scoreboard.mjs <base url>
import { chromium } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:5174'
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 1400, height: 880 }, deviceScaleFactor: 1 })
await page.addInitScript(() => { window.__fixedTime = 3.0 })
await page.goto(`${base}/?mode=dojo&ui=B&ev=104&la=27&dir=-25&seed=7`)
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady, null, { timeout: 180000 })
const out = await page.evaluate(() => {
  const { THREE, camera, stadium } = window.__nn
  const rc = new THREE.Raycaster()
  const hits = []
  const meshes = []
  stadium.traverse((o) => { if (o.isMesh) meshes.push(o) })
  for (let px = 595; px <= 725; px += 5) {
    for (let py = 300; py <= 365; py += 5) {
      rc.setFromCamera(new THREE.Vector2((px / 1400) * 2 - 1, -((py / 880) * 2 - 1)), camera)
      const h = rc.intersectObjects(meshes, false)[0]
      if (!h) continue
      const n = h.face.normal.clone().transformDirection(h.object.matrixWorld)
      hits.push({ px, py, x: h.point.x, y: h.point.y, z: h.point.z, nx: n.x, ny: n.y, nz: n.z, mat: h.object.material.name })
    }
  }
  return hits
})
const facing = out.filter((h) => h.nz > 0.85 && Math.abs(h.ny) < 0.3)
const rng = (k, a) => [Math.min(...a.map((h) => h[k])).toFixed(1), Math.max(...a.map((h) => h[k])).toFixed(1)]
console.log('hits', out.length, 'facing the field', facing.length)
if (facing.length) console.log('x', rng('x', facing), 'y', rng('y', facing), 'z', rng('z', facing), 'mats', [...new Set(facing.map((h) => h.mat))])
console.log(JSON.stringify(facing.slice(0, 12)))
await browser.close()
