// the soak (11 Nov, overnight): one session, many swings and mode changes; logs JS heap (after a forced GC), DOM nodes and three.js GPU objects every 10 swings,
// so a leak shows as a line that keeps climbing. Usage: N=150 LOG=path node tools/probe_soak.mjs [url]
import { chromium } from 'playwright-core'
import { appendFileSync, writeFileSync } from 'fs'
const URL0 = process.argv[2] || 'http://localhost:5195', N = +(process.env.N || 150), LOG = process.env.LOG || 'soak.log'
const log = (s) => { console.log(s); appendFileSync(LOG, s + '\n') }
writeFileSync(LOG, '')
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--expose-gc', '--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } }), errs = []
page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)))
await page.route('**/api.open-meteo.com/**', (r) => r.abort())
await page.goto(URL0 + '/?mode=dojo&ui=K&cp=25&seed=7&ir=0&menu=0')
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 180000 })
await page.waitForTimeout(2000)
const ev = (f, a) => page.evaluate(f, a), wait = (ms) => page.waitForTimeout(ms)
const sample = async (i, what) => {
  const s = await ev(() => { window.gc && window.gc(); return { heap: Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1e6), nodes: document.getElementsByTagName('*').length, gl: window.__glInfo ? window.__glInfo() : null, mode: window.__mix25.mode(), fires: window.__mix25.fires() } })
  log(`${String(i).padStart(4)} ${what.padEnd(8)} heap ${String(s.heap).padStart(4)} MB  nodes ${String(s.nodes).padStart(5)}  geo ${s.gl?.geometries}  tex ${s.gl?.textures}  prog ${s.gl?.programs}  fires ${s.fires}  mode ${s.mode}  errors ${errs.length}`)
  return s
}
const menuLine = async (n) => { await ev(() => document.querySelector('#c25mn').click()); await wait(800); await ev((n) => document.querySelector(`.c25 .sm .smi:nth-child(${n})`)?.click(), n); await wait(1500); await ev(() => document.querySelector('#c25cl')?.click()); await wait(500) }
const first = await sample(0, 'start')
const rows = [first]
for (let i = 1; i <= N; i++) {
  // a swing: a random ball (now and then a home run), NUKE IT, wait for the fire, let it fly
  await ev((i) => { let c = 0; if (window.__mix25.ball((b) => !!b.hr === (i % 3 === 0) && ++c > (i * 7) % 40) < 0) window.__mix25.ball(() => true) }, i) /* (ball() goes back to replay mode, so every swing is a mode change too) */
  const f0 = await ev(() => window.__mix25.fires())
  await ev(() => document.querySelector('#c25nk')?.click())
  for (let k = 0; k < 30 && (await ev(() => window.__mix25.fires())) <= f0; k++) await wait(500)
  await wait(3000)
  // every 15 swings, a trip through the menu: another mode, the jukebox, back to the dojo
  if (i % 15 === 0) { for (const n of [[1], [3], [4], [5], [6], [2]][Math.floor(i / 15) % 6]) await menuLine(n); await menuLine(2) }
  if (i % 10 === 0) rows.push(await sample(i, 'swings'))
}
const last = rows[rows.length - 1], mid = rows[Math.floor(rows.length / 2)]
log(`SUMMARY heap ${first.heap} -> ${mid.heap} -> ${last.heap} MB; nodes ${first.nodes} -> ${last.nodes}; geometries ${first.gl?.geometries} -> ${last.gl?.geometries}; textures ${first.gl?.textures} -> ${last.gl?.textures}; page errors ${errs.length}`)
if (errs.length) log('ERRORS ' + JSON.stringify([...new Set(errs)].slice(0, 8)))
await browser.close()
