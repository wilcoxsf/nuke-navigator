// Study 25 board gags (29 Oct, night; 30 Oct: the board is Dodger gags only, 23 of them, no sounds, a little slower, SF and LA on the shirts) on the voxel scoreboard.
// No screenshots: the board's LED buffer is read. Every gag draws something all the way through and changes as it goes; each one plays to the end on the board's
// own clock without a page error and sends no sound; the gag bag deals all 23 before repeating and never the same one twice running; under
// reduced motion a gag holds one still frame; in G2 RELIEF the lit LEDs stand out; the wind turns the pennants downwind.
// Usage: node tools/test_study25_gags.mjs [base url]
import { chromium } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:5175'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
let fails = 0
const check = (name, ok, extra = '') => { if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : extra) }
const errs = []
const NEW = ['dynamite', 'bonk', 'runover', 'sealsnack', 'leaves3rd', 'bipped', 'catapult', 'chipper', 'alcatraz', 'tshirt', 'steamroller', 'birds', 'quake', 'balloon', 'bp', 'driverless', 'crabsnip', 'hotdog', 'waterboard', 'ironmaiden', 'rack', 'wifeleaves', 'bridgejump']
const BITS = []

async function open(ctxOpts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 820 }, deviceScaleFactor: 1, ...ctxOpts })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')))
  await page.route('**/api.open-meteo.com/**', (r) => r.abort())
  await page.goto(`${base}/?mode=dojo&ui=K&cp=25&seed=7&menu=0&ir=0`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.waitForFunction(() => window.__ready && window.__ready() && window.__cpReady && window.__mix25?.life, null, { timeout: 180000 })
  await page.waitForTimeout(1500)
  page._ctx = ctx
  return page
}

const page = await open()
// 0. the board plays the gags and nothing else, a little slower than drawn; the players wear SF and LA (the letters' LEDs, read off a frame of BONK before the swing)
const only = await page.evaluate(() => { const L = window.__mix25.life; return { names: L.names().sort().join(), gags: L.gags().sort().join(), pace: L.pace } })
check('the board has the Dodger gags and no other show, run at 0.8 speed', only.names === only.gags && only.pace === 0.8, JSON.stringify(only))
const kit = await page.evaluate(() => { const L = window.__mix25.life, was = L.boardNow(); L.boardStyle = 4; L.peek('bonk', 0.5, {}); L.boardStyle = was; return L.litCount() })
check('BONK before the swing lights both players and the bat', kit > 200, String(kit))
// 1. every frame draws: at 15, 50 and 85 percent of its length at least 12 LEDs are lit, and the frames differ from each other
const pk = await page.evaluate((names) => { const L = window.__mix25.life; return names.map((n) => { const d = L.dur(n); const r = [0.15, 0.5, 0.85].map((f) => { const p = L.peek(n, d * f, {}); return [p.lit, L.sig()] }); return { n, d, lit: r.map((x) => x[0]), sigs: new Set(r.map((x) => x[1])).size } }) }, [...NEW, ...BITS])
const dead = pk.filter((x) => !x.d || x.lit.some((v) => v < 12)).map((x) => x.n + ':' + x.lit.join('/'))
const flat = pk.filter((x) => x.sigs < 3).map((x) => x.n)
check(`all ${pk.length} gags draw something all the way through`, pk.length === NEW.length + BITS.length && dead.length === 0, JSON.stringify(dead))
check('and every one of them changes as it goes (three different frames)', flat.length === 0, JSON.stringify(flat))
// 2. the bag: two bags' worth of draws deal every gag twice, never the same one twice in a row
const bag = await page.evaluate(() => { const L = window.__mix25.life; const d = [], n = L.gags().length; for (let i = 0; i < n * 2; i++) d.push(L.nextGag()); return { d, all: L.gags() } })
const twice = bag.d.filter((g, i) => i && g === bag.d[i - 1])
const counts = bag.all.map((g) => bag.d.filter((x) => x === g).length)
check(`the gag bag deals all ${bag.all.length} gags before any repeats, never twice running`, bag.all.length === 23 && NEW.every((n) => bag.all.includes(n)) && twice.length === 0 && counts.every((c) => c === 2), JSON.stringify({ twice, counts }))
// 3. each new animation plays to the end on the board's clock (run three times as fast: the software renderer gives the page a frame every second or two, and the
// board takes at most half a second a frame), the LEDs change while it plays, and it sends its sound cues
await page.evaluate(() => { window.__mix25.life.rate = 3 })
await page.evaluate(() => { window.__gagSounds = []; const prev = window.__nnSound; window.__nnSound = (k, a) => { window.__gagSounds.push(k); return prev?.(k, a) } })
const ran = []
for (const n of [...NEW, ...BITS]) {
  const e0 = errs.length
  await page.evaluate((n) => { window.__gagSounds.length = 0; window.__mix25.life.play(n, {}, 0, true) }, n)
  const sigs = new Set()
  let done = false
  for (let k = 0; k < 160 && !done; k++) {
    await page.waitForTimeout(250)
    const s = await page.evaluate((n) => { const L = window.__mix25.life; return { sig: L.sig(), now: L.anim(), done: L.played().includes(n) && L.anim() !== n } }, n)
    if (s.now === n) sigs.add(s.sig)
    done = s.done
  }
  const snd = await page.evaluate(() => [...window.__gagSounds])
  ran.push({ n, done, frames: sigs.size, cues: snd.filter((k) => k.startsWith('gag-')).length, err: errs.length - e0 })
}
await page.evaluate(() => { window.__mix25.life.rate = 1 })
const bad = ran.filter((r) => !r.done || r.frames < 3 || r.err)
check(`all ${ran.length} play through without a page error, the LEDs changing as they go`, bad.length === 0, JSON.stringify(bad))
const loud = ran.filter((r) => r.cues > 0).map((r) => r.n)
check('none of them sends a sound (30 Oct: no sound effects for the gags)', loud.length === 0, JSON.stringify(loud))
// 4. G2 RELIEF: a gag frame makes LEDs stand out of the board
const g2 = await page.evaluate(() => { const L = window.__mix25.life, was = L.boardNow(); L.boardStyle = 2; L.peek('chipper', 3); const n = L.ledsOut(); L.boardStyle = was; return n })
check('in G2 RELIEF a gag stands out of the board', g2 > 40, String(g2))
// 5. the wind turns the pennants downwind and they flutter harder
const wind = await page.evaluate(async () => {
  const L = window.__mix25.life, flag = L.vsign.children.find((c) => c.isInstancedMesh && c.count === 250)
  const M = new window.__cp.NN.THREE.Matrix4(), P = new window.__cp.NN.THREE.Vector3()
  const end = () => { flag.getMatrixAt(24, M); P.setFromMatrixPosition(M); const a = P.clone(); flag.getMatrixAt(0, M); P.setFromMatrixPosition(M); return { dx: a.x - P.x, dz: a.z - P.z } }
  // the pennants move only when the page gets a frame: wait for n of them (the wave total changes every frame they move)
  const tick = async (n) => { for (let i = 0; i < n; i++) { const w0 = L.flagWave(), t0 = performance.now(); while (L.flagWave() === w0 && performance.now() - t0 < 20000) await new Promise((r) => setTimeout(r, 100)) } }
  const peak = async () => { let m = 0; for (let i = 0; i < 6; i++) { await tick(1); m = Math.max(m, L.flagWave()) } return m }
  const calm = { e: end(), w: await peak() }
  L.wind = { fromDeg: 75, mph: 18 } // blowing in from center field, straight at home plate: the pennants point at us
  await tick(2)
  const toward = { e: end(), w: await peak() }
  L.wind = { fromDeg: 75 + 90, mph: 18 } // from the right, as seen from home: they point left
  await tick(2)
  const left = end()
  L.wind = null
  return { calm, toward, left, set: L.windNow() }
})
check('wind in from center field turns the pennants toward home, and harder wind waves them more', wind.toward.e.dz > 1.5 && Math.abs(wind.toward.e.dx) < 0.8 && wind.toward.w > wind.calm.w * 1.3, JSON.stringify(wind))
check('wind from the right sends them to the left; no wind puts them back along the sign', wind.left.dx < -1.5 && wind.calm.e.dx > 1.5 && wind.set === null, JSON.stringify(wind))
await page._ctx.close()
// 6. reduced motion: a gag holds one still frame for its whole length
const rm = await open({ reducedMotion: 'reduce' })
const still = await rm.evaluate(async () => {
  const L = window.__mix25.life, out = {}
  for (const n of ['birds', 'chipper', 'tshirt']) {
    L.play(n, {}, 0, true); const s = new Set(); let lit = 0
    for (let i = 0; i < 10; i++) { await new Promise((r) => setTimeout(r, 300)); if (L.anim() === n) { s.add(L.sig()); lit = Math.max(lit, L.litCount()) } }
    out[n] = { frames: s.size, lit, still: L.still(n) }
  }
  return out
})
check('under reduced motion each gag shows one still frame', Object.values(still).every((x) => x.frames === 1 && x.lit > 20 && x.still != null), JSON.stringify(still))
await rm._ctx.close()
check('no page errors', errs.length === 0, errs.slice(0, 5).join('\n'))
await browser.close()
console.log(fails ? `${fails} FAILED` : 'ALL PASS')
process.exit(fails ? 1 : 0)
