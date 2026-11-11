// where the soak's heap growth comes from (11 Nov, overnight): warm up, start the sampling heap profiler, swing N more times, GC, and print the call sites
// whose allocations are still alive, biggest first. Use an unminified build (vite build --minify false) so the names mean something.
// Usage: N=30 MODE=swing|ball|menu node tools/probe_leak.mjs http://localhost:5196
import { chromium } from 'playwright-core'
const URL0 = process.argv[2] || 'http://localhost:5196', N = +(process.env.N || 30), MODE = process.env.MODE || 'swing'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--expose-gc', '--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } }), errs = []
page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)))
await page.route('**/api.open-meteo.com/**', (r) => r.abort())
await page.goto(URL0 + '/?mode=dojo&ui=K&cp=25&seed=7&ir=0&menu=0')
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 180000 })
await page.waitForTimeout(2000)
const ev = (f, a) => page.evaluate(f, a), wait = (ms) => page.waitForTimeout(ms)
const heap = () => ev(() => { window.gc(); return Math.round(performance.memory.usedJSHeapSize / 1e5) / 10 })
async function step(i) {
  if (MODE === 'menu') { await ev(() => document.querySelector('#c25mn').click()); await wait(800); await ev((n) => document.querySelector(`.c25 .sm .smi:nth-child(${n})`)?.click(), [1, 2, 3, 2][i % 4]); await wait(1500); return }
  await ev((i) => { let c = 0; if (window.__mix25.ball((b) => !!b.hr === (i % 3 === 0) && ++c > (i * 7) % 40) < 0) window.__mix25.ball(() => true) }, i)
  if (MODE === 'ball') { await wait(1500); return }
  const f0 = await ev(() => window.__mix25.fires()); await ev(() => document.querySelector('#c25nk')?.click())
  for (let k = 0; k < 30 && (await ev(() => window.__mix25.fires())) <= f0; k++) await wait(500)
  await wait(3000)
}
for (let i = 0; i < 6; i++) await step(i) // warm-up: first-use caches
const cdp = await page.context().newCDPSession(page)
await cdp.send('HeapProfiler.enable')
const h0 = await heap()
await cdp.send('HeapProfiler.startSampling', { samplingInterval: 4096 })
for (let i = 6; i < 6 + N; i++) await step(i)
const h1 = await heap()
await cdp.send('HeapProfiler.collectGarbage')
const { profile } = await cdp.send('HeapProfiler.stopSampling')
// self sizes by call site, and by the first app frame up the stack
const self = new Map(), app = new Map()
const walk = (n, stack) => {
  const f = n.callFrame, here = `${f.functionName || '(anon)'} ${(f.url || '').split('/').pop()}:${f.lineNumber + 1}:${f.columnNumber + 1}`, st = [...stack, here]
  if (n.selfSize) { self.set(here, (self.get(here) || 0) + n.selfSize); const a = [...st].reverse().find((s) => /index-|c25|cockpit|main|flight|heat|stage|music|sound|songs|away|hist|core/.test(s) && !/three/.test(s)) || here; app.set(a + '  <=  ' + st.slice(-3).join(' < '), (app.get(a + '  <=  ' + st.slice(-3).join(' < ')) || 0) + n.selfSize) }
  for (const c of n.children || []) walk(c, st)
}
walk(profile.head, [])
const top = (m, k) => [...m].sort((a, b) => b[1] - a[1]).slice(0, k).map(([s, v]) => `${(v / 1e6).toFixed(2).padStart(6)} MB  ${s}`).join('\n')
console.log(`MODE ${MODE}, ${N} steps: heap ${h0} -> ${h1} MB (${((h1 - h0) / N).toFixed(3)} MB a step); page errors ${errs.length}`)
console.log('--- live allocations by call site\n' + top(self, 18))
console.log('--- by stack tail\n' + top(app, 14))
await browser.close()
