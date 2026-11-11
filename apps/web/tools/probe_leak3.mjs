// who holds an old flight track? (11 Nov, overnight) Swings a few times, tags one off-scene track group with a marker object, takes a heap snapshot and
// prints the shortest path from the GC roots to it. Usage: node --max-old-space-size=3000 tools/probe_leak3.mjs http://localhost:5196
import { chromium } from 'playwright-core'
const URL0 = process.argv[2] || 'http://localhost:5196'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--expose-gc'] })
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
await page.route('**/api.open-meteo.com/**', (r) => r.abort())
await page.goto(URL0 + '/?mode=dojo&ui=K&cp=25&seed=7&ir=0&menu=0')
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 180000 })
await page.waitForTimeout(2000)
const ev = (f, a) => page.evaluate(f, a), wait = (ms) => page.waitForTimeout(ms)
for (let i = 0; i < 6; i++) {
  await ev((i) => { let c = 0; if (window.__mix25.ball((b) => !!b.hr === (i % 3 === 0) && ++c > (i * 7) % 40) < 0) window.__mix25.ball(() => true) }, i)
  const f0 = await ev(() => window.__mix25.fires()); await ev(() => document.querySelector('#c25nk')?.click())
  for (let k = 0; k < 30 && (await ev(() => window.__mix25.fires())) <= f0; k++) await wait(500)
  await wait(3000)
}
const cdp = await page.context().newCDPSession(page)
await cdp.send('HeapProfiler.enable'); await cdp.send('HeapProfiler.collectGarbage')
const { result: proto } = await cdp.send('Runtime.evaluate', { expression: 'window.__cp.THREE.Group.prototype' })
const { objects } = await cdp.send('Runtime.queryObjects', { prototypeObjectId: proto.objectId, objectGroup: 'q' })
const { result } = await cdp.send('Runtime.callFunctionOn', { objectId: objects.objectId, returnByValue: true, functionDeclaration: `function () {
  class LeakTargetMarker {}; const kinds = []
  for (const o of this) { let r = o; while (r.parent) r = r.parent; if (r.isScene) continue; if (o.userData && o.userData.reveal) { o.__leakTarget = new LeakTargetMarker(); kinds.push('track') ; break } }
  if (!kinds.length) for (const o of this) { let r = o; while (r.parent) r = r.parent; if (!r.isScene && o.userData && o.userData.isTag) { o.__leakTarget = new LeakTargetMarker(); kinds.push('tag'); break } }
  return kinds.join() }` })
console.log('marked:', result.value)
await cdp.send('Runtime.releaseObjectGroup', { objectGroup: 'q' })
let chunks = []
cdp.on('HeapProfiler.addHeapSnapshotChunk', (p) => chunks.push(p.chunk))
await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false, captureNumericValue: false })
await browser.close()
const snap = JSON.parse(chunks.join('')); chunks = null
const M = snap.snapshot.meta, NF = M.node_fields.length, EF = M.edge_fields.length, S = snap.strings, nodes = snap.nodes, edges = snap.edges
const nType = M.node_types[0], eType = M.edge_types[0]
const iT = M.node_fields.indexOf('type'), iN = M.node_fields.indexOf('name'), iE = M.node_fields.indexOf('edge_count')
const jT = M.edge_fields.indexOf('type'), jN = M.edge_fields.indexOf('name_or_index'), jTo = M.edge_fields.indexOf('to_node')
const count = nodes.length / NF, first = new Uint32Array(count + 1)
for (let i = 0, e = 0; i < count; i++) { first[i] = e; e += nodes[i * NF + iE] * EF } first[count] = edges.length
const name = (i) => S[nodes[i * NF + iN]], ntype = (i) => nType[nodes[i * NF + iT]]
const ename = (e) => { const t = eType[edges[e + jT]]; return t === 'element' || t === 'hidden' ? '[' + edges[e + jN] + ']' : S[edges[e + jN]] }
let marker = -1; for (let i = 0; i < count; i++) if (name(i) === 'LeakTargetMarker' && ntype(i) === 'object') { marker = i; break }
// the target: the node with a __leakTarget edge to the marker
let target = -1
for (let i = 0; i < count && target < 0; i++) for (let e = first[i]; e < first[i + 1]; e += EF) if (edges[e + jTo] / NF === marker && ename(e) === '__leakTarget') { target = i; break }
console.log('marker', marker, 'target', target, target >= 0 ? name(target) : '')
// BFS from the root, skipping weak edges, to the target
const par = new Int32Array(count).fill(-1), pe = new Int32Array(count).fill(-1), q = new Int32Array(count); let h = 0, t = 0
q[t++] = 0; par[0] = 0
while (h < t) { const i = q[h++]; if (i === target) break; for (let e = first[i]; e < first[i + 1]; e += EF) { const ty = eType[edges[e + jT]]; if (ty === 'weak' || ty === 'shortcut') continue; const j = edges[e + jTo] / NF; if (par[j] < 0) { par[j] = i; pe[j] = e; q[t++] = j } } }
if (target < 0 || par[target] < 0) { console.log('no path'); process.exit(0) }
const path = []; for (let i = target; i !== 0; i = par[i]) path.push(`${ntype(par[i])}:${name(par[i]).slice(0, 60)} --${ename(pe[i])}--> ${ntype(i)}:${name(i).slice(0, 60)}`)
console.log(path.reverse().join('\n'))
