// is something holding the old flight tracks? (11 Nov, overnight) Counts live three.js objects by kind (CDP queryObjects after GC) before and after N swings,
// and finds which of them are no longer in the scene. Usage: N=12 node tools/probe_leak2.mjs http://localhost:5196
import { chromium } from 'playwright-core'
const URL0 = process.argv[2] || 'http://localhost:5196', N = +(process.env.N || 12)
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--expose-gc'] })
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
await page.route('**/api.open-meteo.com/**', (r) => r.abort())
await page.goto(URL0 + '/?mode=dojo&ui=K&cp=25&seed=7&ir=0&menu=0')
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 180000 })
await page.waitForTimeout(2000)
const ev = (f, a) => page.evaluate(f, a), wait = (ms) => page.waitForTimeout(ms)
const cdp = await page.context().newCDPSession(page)
const swing = async (i) => {
  await ev((i) => { let c = 0; if (window.__mix25.ball((b) => !!b.hr === (i % 3 === 0) && ++c > (i * 7) % 40) < 0) window.__mix25.ball(() => true) }, i)
  const f0 = await ev(() => window.__mix25.fires()); await ev(() => document.querySelector('#c25nk')?.click())
  for (let k = 0; k < 30 && (await ev(() => window.__mix25.fires())) <= f0; k++) await wait(500)
  await wait(3000)
}
const count = async (tag) => {
  await cdp.send('HeapProfiler.enable'); await cdp.send('HeapProfiler.collectGarbage')
  const out = {}
  for (const k of ['Object3D', 'Mesh', 'InstancedMesh', 'Group', 'BufferGeometry', 'Material', 'Vector3']) {
    const { result: proto } = await cdp.send('Runtime.evaluate', { expression: `window.__cp.THREE.${k}.prototype` })
    const { objects } = await cdp.send('Runtime.queryObjects', { prototypeObjectId: proto.objectId, objectGroup: 'q' })
    // how many, and (for scene objects) how many are not under any scene: detached but alive
    const { result } = await cdp.send('Runtime.callFunctionOn', { objectId: objects.objectId, functionDeclaration: `function () { let off = 0, offKinds = {}; for (const o of this) { if (!o.isObject3D) continue; let r = o; while (r.parent) r = r.parent; if (!r.isScene) { off++; const n = (o.userData && Object.keys(o.userData).join('+')) || o.type; offKinds[n] = (offKinds[n] || 0) + 1 } } const top = Object.entries(offKinds).sort((a, b) => b[1] - a[1]).slice(0, 8); return JSON.stringify({ n: this.length, off, top }) }`, returnByValue: true })
    out[k] = JSON.parse(result.value)
    await cdp.send('Runtime.releaseObjectGroup', { objectGroup: 'q' })
  }
  console.log(tag, JSON.stringify(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.n + (v.off ? ` (off-scene ${v.off})` : '')]))))
  return out
}
for (let i = 0; i < 4; i++) await swing(i)
const a = await count('after 4 swings ')
for (let i = 4; i < 4 + N; i++) await swing(i)
const b = await count(`after ${4 + N} swings`)
console.log('off-scene Object3D kinds now:', JSON.stringify(b.Object3D.top))
console.log('off-scene Object3D kinds at 4 :', JSON.stringify(a.Object3D.top))
await browser.close()
