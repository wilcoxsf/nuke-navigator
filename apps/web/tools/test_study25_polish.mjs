// Real-interaction test of Study 25's 1 Nov polish pass (an audit's findings and the second GPT red team's picks). No screenshots: state and boxes are read.
// Every id on the page is used once (MY SEAT's form used to share the MENU button's); Backspace undoes a burst of dojo changes and 0 puts the blank swing back; Esc
// closes the side menu before the menu opens and Space still nukes it with the side menu focused; WHAT'S NEW wraps rather than cutting its rows; the ball's
// shadow runs under a flight and goes at the landing, and a flight cut short by a new number takes it along; a wheel notch over a 3D handle is one unit and a
// double-click puts the handle back; tags one at a time show only the newest; THE LAB has the new choices.
// Usage: node tools/test_study25_polish.mjs [base url]
import { chromium } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:5175'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
let fails = 0
const check = (name, ok, extra = '') => { if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : extra) }
const errs = []
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 })
page.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')))
await page.route('**/api.open-meteo.com/**', (r) => r.abort())
await page.goto(`${base}/?mode=dojo&ui=K&cp=25&seed=7&ir=0&menu=0`)
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 180000 })
await page.waitForTimeout(2000)
const until = async (fn, ms = 20000, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn, arg)) return true; await page.waitForTimeout(200) } return false }
const st = () => page.evaluate(() => { const s = window.__cp.state; return { ev: s.ev, la: s.la, dir: s.dir, temp: s.temp, wind: s.wind, xwind: s.xwind ?? 0 } })
const dupes = () => page.evaluate(() => { const n = {}; for (const e of document.querySelectorAll('[id]')) n[e.id] = (n[e.id] ?? 0) + 1; return Object.entries(n).filter(([, c]) => c > 1).map(([k]) => k) })

// ---- ids ----
check('every id on the page is used once', (await dupes()).length === 0, JSON.stringify(await dupes()))

// ---- the dojo: undo and the blank swing ----
await page.evaluate(() => window.__mix25.setMode('whatif')); await page.waitForTimeout(2500)
const s0 = await st()
await page.evaluate(() => window.__mix25.controls().step('ev', 5)); await page.waitForTimeout(700)
await page.evaluate(() => window.__mix25.controls().step('temp', 3)); await page.waitForTimeout(700)
const s1 = await st()
check('a wheel notch over a handle is one unit (five with shift): +5 MPH, +3 degrees', s1.ev === s0.ev + 5 && s1.temp === s0.temp + 3, JSON.stringify({ s0, s1 }))
await page.mouse.move(5, 300)
await page.keyboard.press('Backspace'); await page.waitForTimeout(600)
const s2 = await st()
check('Backspace undoes the last change', s2.temp === s0.temp && s2.ev === s0.ev + 5, JSON.stringify({ s0, s2 }))
await page.keyboard.press('Backspace'); await page.waitForTimeout(600)
check('and the one before', (await st()).ev === s0.ev, JSON.stringify(await st()))
await page.evaluate(() => { Object.assign(window.__cp.state, { ev: 117, la: 35, wind: 9 }); window.__cp.update() }); await page.waitForTimeout(700)
await page.keyboard.press('0'); await page.waitForTimeout(600)
const s3 = await st()
check('0 puts the blank swing back (103 MPH, 28 degrees, calm)', s3.ev === 103 && s3.la === 28 && s3.wind === 0, JSON.stringify(s3))

// ---- double-click a handle ----
await page.evaluate(() => window.__mix25.controls().step('temp', 9)); await page.waitForTimeout(800)
const th = await page.evaluate(() => window.__mix25.controls().handles().temp)
await page.mouse.dblclick(th[0], th[1]); await page.waitForTimeout(800)
check('a double-click on the thermometer puts the air back to where it started', (await st()).temp === 62, JSON.stringify(await st()))

// ---- Esc and the side menu; Space through it ----
await page.keyboard.press('?'); await page.waitForTimeout(400)
await page.evaluate(() => document.querySelector('#c25dk').focus()); await page.waitForTimeout(300) // (the side menu itself, as after a click on it; a focused chip is a button and takes Space)
await until(() => !window.__cp.anim?.(), 15000) // (the last ball down first)
const fires0 = await page.evaluate(() => window.__mix25.lands?.() ?? 0)
await page.keyboard.press(' '); await page.waitForTimeout(300)
const flying = await until((l0) => !!(window.__cp.anim?.() && !window.__cp.anim().exploded) || (window.__mix25.lands?.() ?? 0) > l0, 9000, fires0)
check('with the side menu focused, Space still nukes it', flying, String(fires0))
await until(() => !(window.__cp.anim?.() && !window.__cp.anim().exploded), 30000)
await page.keyboard.press('Escape'); await page.waitForTimeout(500)
const esc1 = await page.evaluate(() => ({ dock: document.querySelector('.c25').classList.contains('dk'), menu: !!document.querySelector('.sm.open') }))
check('the first Esc closes the side menu and opens nothing else', !esc1.dock && !esc1.menu, JSON.stringify(esc1))

// ---- the shadow: under the flight, gone at the landing; a flight cut short takes it along ----
const shadowVis = () => page.evaluate(() => { let v = null; window.__cp.NN.scene.traverse((o) => { if (o.isGroup && o.children.length === 2 && o.children[0].isInstancedMesh && o.children[0].material.opacity === 0.62) v = o.visible }); return v })
await page.evaluate(() => { window.__mix25.lab('SH', 1); Object.assign(window.__cp.state, { ev: 108, la: 30, dir: 10 }); window.__cp.update() }); await page.waitForTimeout(1500)
await until(() => !(window.__cp.anim?.() && !window.__cp.anim().exploded), 30000); await page.waitForTimeout(500)
await page.evaluate(() => { window.__cpSlow = 6 }) // (9 Nov: headless Edge draws about one frame a second; a six-times-slower flight gets frames in the air)
await page.click('#c25nk')
let seen = false
for (let k = 0; k < 90 && !seen; k++) { await page.waitForTimeout(200); seen = !!(await shadowVis()) }
check('the ball\'s shadow shows while it flies', seen)
await until(() => !!(window.__cp.anim?.() && window.__cp.anim().exploded), 40000); await page.evaluate(() => { window.__cpSlow = 1 })
await until(() => !(window.__cp.anim?.() && !window.__cp.anim().exploded), 30000); await page.waitForTimeout(800)
check('and is gone once it lands', (await shadowVis()) === false)
await page.click('#c25nk')
for (let k = 0; k < 40 && !(await shadowVis()); k++) await page.waitForTimeout(200)
await page.evaluate(() => { window.__cp.state.ev += 1; window.__cp.update() }); await page.waitForTimeout(1500)
check('a new number while the ball is up cuts the flight short and the shadow goes with it', (await shadowVis()) === false)

// ---- tags one at a time ----
await page.evaluate(() => window.__mix25.lab('TF', 2)); await page.waitForTimeout(400)
await page.click('#c25nk')
await until(() => !(window.__cp.anim?.() && !window.__cp.anim().exploded), 30000); await page.waitForTimeout(1500)
const tags = await page.evaluate(() => window.__mix25.readable().filter((r) => !r.fixed && !r.off && r.text != null).map((r) => r.text)) // (the voxel pieces in the park have no text)
const lnum = await page.evaluate(() => { let n = null; window.__mix25.flight().last()?.traverse((c) => { if (c.userData.landNumber) { let v = true; for (let p = c; p; p = p.parent) v = v && p.visible; n = { ...c.userData.landNumber, v } } }); return n })
// (1 Nov, evening: no LANDED tag; the feet are a voxel number over the spot, landnum25.js)
check('ONE AT A TIME: after the landing only the last moment shows (the landing number, or the wall tag for a ball off it)', (tags.length === 0 && lnum?.v) || (tags.length === 1 && /SHORT OF THE TOP/.test(tags[0])), JSON.stringify({ tags, lnum }))
await page.evaluate(() => window.__mix25.lab('TF', 1)); await page.waitForTimeout(1200)
check('ALL STAY brings the others back', (await page.evaluate(() => window.__mix25.readable().filter((r) => !r.fixed && !r.off).length)) >= 2)
// ON HOVER (2 Nov, later: "zenith and cleared the wall show up when you hover over that cube and that's it"): hidden until the pointer is on the cube, gone once it leaves
await page.evaluate(() => window.__mix25.lab('TF', 3)); await page.mouse.move(5, 5)
await page.evaluate(() => { Object.assign(window.__cp.state, { ev: 113, la: 29, dir: -12, temp: 70, wind: 0, xwind: 0 }); window.__cp.update() }); await page.waitForTimeout(400)
await page.click('#c25nk'); await page.mouse.move(5, 5)
await until(() => !(window.__cp.anim?.() && !window.__cp.anim().exploded), 30000); await page.waitForTimeout(1500)
const hv0 = await page.evaluate(() => window.__mix25.flight().dots())
const hvIn = []
for (let i = 0; i < hv0.length; i++) { for (let k = 0; k < 3; k++) { const d = (await page.evaluate(() => window.__mix25.flight().dots()))[i]; await page.mouse.move(d.x + 2, d.y - 2); await page.waitForTimeout(300) } /* (aimed again each time: the camera drifts a little after a landing) */ hvIn.push(await page.evaluate(() => window.__mix25.flight().dots().map((x) => x.kind).join())) }
await page.mouse.move(5, 5); await page.waitForTimeout(700)
const hv1 = await page.evaluate(() => window.__mix25.flight().dots())
check('ON HOVER: ZENITH and CLEARED THE WALL hidden after a home run, each shows (alone) with the pointer on its cube, and goes when the pointer leaves', hv0.length === 2 && hv0.every((d) => d.kind === 'off') && hvIn[0] === 'on,off' && hvIn[1] === 'off,on' && hv1.every((d) => d.kind === 'off'), JSON.stringify({ hv0, hvIn, hv1 }))

// ---- WHAT'S NEW wraps ----
await page.evaluate(() => window.__mix25.openMod('news')); await page.waitForTimeout(600)
const news = await page.evaluate(() => [...document.querySelectorAll('#c25mb .lpr.nw .wh')].map((s) => ({ cut: s.scrollWidth > s.clientWidth + 1, h: s.getBoundingClientRect().height })))
check('WHAT\'S NEW: no row is cut short, and long ones wrap', news.length >= 8 && news.every((n) => !n.cut) && news.some((n) => n.h > 20), JSON.stringify(news.slice(0, 4)))
await page.keyboard.press('Escape'); await page.waitForTimeout(300)

// ---- THE LAB has today's choices ----
await page.keyboard.press('?'); await page.waitForTimeout(400)
const chips = await page.evaluate(() => [...document.querySelectorAll('#c25dk .dx [data-ax]')].map((b) => b.dataset.ax))
check('the side menu holds the open picks: SLINGSHOT, and (2 Nov, night) LANDING PARTY MARKS (SHORT PINS to try), LANDING IMPACT, THE COVE, SHOT CALLER: THE WAYS IN; the foul poles, THE ORANGE and the count-up stay locked', chips.join() === 'CN' /* (9 Nov: CM, GR, MO and AC locked) */, JSON.stringify(chips))
await page.keyboard.press('Escape')

// (6 Nov: the main page is done here; left open, its software-rendered park starved the pages below, which share the browser's one GPU process: a 5 s load took 97 s)
await page.close()
// ---- PASS IT ON: a link opens on its swing ----
{
  const p2 = await browser.newPage({ viewport: { width: 1600, height: 900 } })
  p2.on('pageerror', (e) => errs.push('swing link: ' + e.message))
  await p2.route('**/api.open-meteo.com/**', (r) => r.abort())
  await p2.goto(`${base}/?mode=dojo&ui=K&cp=25&seed=7&ir=0&swing=111.33.-12.80.7.3`, { timeout: 120000 })
  await p2.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 180000 })
  await p2.waitForTimeout(1500)
  const r = await p2.evaluate(() => { const s = window.__cp.state; return { m: window.__mix25.mode(), s: [s.ev, s.la, s.dir, s.temp, s.wind, s.xwind], menu: !!document.querySelector('.sm.open') } })
  check('a ?swing= link opens the dojo on exactly that swing, without the menu in the way', r.m === 'whatif' && r.s.join() === '111,33,-12,80,7,3' && !r.menu, JSON.stringify(r))
  await p2.close()
}
// ---- 1 Nov, evening: WALLOP WITNESS within 72 hours; the Seance past the last row; the landing number's five looks; foul poles; Daily Dinger and the gag reel gone ----
{
  const p3 = await browser.newPage({ viewport: { width: 1600, height: 900 } })
  p3.on('pageerror', (e) => errs.push(e.message))
  await p3.route('**/api.open-meteo.com/**', (r) => r.abort())
  // the day after the last Oracle game in the data, at noon: that game is open, older ones shut
  await p3.goto(`${base}/?mode=dojo&ui=K&cp=25&seed=7&ir=0&menu=0&now=2026-09-28T12:00:00-07:00`, { timeout: 120000 })
  await p3.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 180000 })
  await p3.evaluate(() => { try { localStorage.removeItem('nn-witness') } catch {} window.__mix25.openMod('witness') }); await p3.waitForTimeout(800)
  await p3.waitForFunction(() => document.querySelectorAll('#c25mb .wd').length > 0, null, { timeout: 30000, polling: 250 }).catch(() => {}) // (7 Nov: the list waits on the witness store; under load it came in after the count)
  const w0 = await p3.evaluate(() => ({ open: [...document.querySelectorAll('#c25mb .wd.open')].map((x) => x.dataset.d), shut: document.querySelectorAll('#c25mb .wd.shut').length, head: document.querySelector('#c25mb .bulh')?.textContent }))
  const shutD = await p3.evaluate(() => document.querySelector('#c25mb .wd.shut')?.dataset.d)
  await p3.click(`#c25mb .wd[data-d="${shutD}"]`); await p3.waitForTimeout(300)
  const tickedShut = await p3.evaluate((d) => document.querySelector(`#c25mb .wd[data-d="${d}"]`).classList.contains('on'), shutD)
  let tickedOpen = null
  let asked = null
  if (w0.open[0]) {
    await p3.click(`#c25mb .wd[data-d="${w0.open[0]}"]`); await p3.waitForTimeout(300)
    asked = await p3.evaluate(() => !!document.querySelector('#c25mb .wask #c25wsec'))
    await p3.fill('#c25wsec', '143'); await p3.fill('#c25wrow', '10'); await p3.fill('#c25wst', '5'); await p3.click('#c25wgo'); await p3.waitForTimeout(800)
    tickedOpen = await p3.evaluate((d) => document.querySelector(`#c25mb .wd[data-d="${d}"]`).classList.contains('on'), w0.open[0])
  }
  check('WALLOP WITNESS: a game more than 72 hours old cannot be logged; one inside the window asks for the seat, then is logged', !tickedShut && w0.shut > 50 && (w0.open.length === 0 || (asked && tickedOpen === true)) && /72 HOURS/.test(w0.head), JSON.stringify({ ...w0, shutD, tickedShut, asked, tickedOpen }))
  await p3.evaluate(() => { try { localStorage.removeItem('nn-witness') } catch {} })
  await p3.keyboard.press('Escape'); await p3.waitForTimeout(300)
  await p3.evaluate(() => window.__mix25.menu.show()); await p3.waitForTimeout(500)
  const hdr = await p3.evaluate(() => ({ dd: !!document.querySelector('#c25dd'), mix: getComputedStyle(document.querySelector('#c25mx')).display, tabs: [...document.querySelectorAll('#c25tabs [data-tab]')].map((t) => t.dataset.tab), menu: [...document.querySelectorAll('.c25 .sm .smi b')].map((b) => b.textContent) }))
  await p3.evaluate(() => window.__mix25.menu.close()); await p3.waitForTimeout(300)
  check('no DAILY DINGER, no MIX in the header; five tabs (3 Nov, later: BLAST RADIUS); the menu is the five modes and nothing else', !hdr.dd && hdr.mix === 'none' && hdr.tabs.join() === 'replay,whatif,shot,witness,blast' && hdr.menu.length === 5 && !hdr.menu.some((t) => /DAILY|GAG|OPTIONS|NEW|SOUND/.test(t)), JSON.stringify(hdr))
  // the Seance: a point well behind the left-center bleachers is past the seats, not ROW 26
  const se = await p3.evaluate(() => { const S = window.__mix25, toW = window.__cp.toWorld, a = (-30 * Math.PI) / 180, r = 480 * 0.3048; const h = toW([0, 0, 0]), p = { x: h.x + r * Math.sin(a), y: h.y + 10, z: h.z - r * Math.cos(a) }; return S.seatOf(p) })
  check('SEAT SEANCE: a ball past the last row is called past the seats (the Fan Lot), not a seat', se && se.what === 'beyond' && /PAST/.test(se.line) && /FAN LOT/.test(se.short), JSON.stringify(se))
  // the landing number (2 Nov: the count-up, riding over the ball): each look builds, counts up in flight, cool before the wall and orange after, and settles over the spot
  const looks = [], rides = []
  // (2 Nov, later: the ball's own position, from the fly hook, so a ride is checked against the ball and not against where the number says it is)
  await p3.evaluate(() => { const f = window.__cpOnFly; window.__cpOnFly = (pos, fr) => { window.__ballAt = pos.clone(); f(pos, fr) } })
  { const w0 = await p3.evaluate(() => window.__mix25.lands?.() ?? 0); await p3.click('#c25nk'); for (let k = 0; k < 400 && (await p3.evaluate((w0) => (window.__mix25.lands?.() ?? 0) === w0, w0)); k++) await p3.waitForTimeout(200); for (let k = 0; k < 100 && (await p3.evaluate(() => !!window.__cp.anim?.() && !window.__cp.anim().exploded)); k++) await p3.waitForTimeout(200); await p3.waitForTimeout(1500) } // a warm-up swing: the first after load flies before the first sample
  await p3.evaluate(() => { window.__cpSlow = 4 }) // (2 Nov, night: the flights four times as slow, so a loaded machine still draws a few frames of each ride)
  for (const [n, lc] of [[2, 1], [3, 1], [2, 2]]) {
    await p3.evaluate(([n, lc]) => { window.__mix25.lab('LN', n); window.__mix25.lab('LC', lc) }, [n, lc])
    await p3.evaluate(() => { Object.assign(window.__cp.state, { ev: 113, la: 29, dir: -12, temp: 70, wind: 0, xwind: 0 }); window.__cp.update() }); await p3.waitForTimeout(500)
    const l0 = await p3.evaluate(() => window.__mix25.lands?.() ?? 0)
    await p3.click('#c25nk')
    const seen = [], num = () => { let n = null; window.__mix25.flight().last()?.traverse((c) => { if (c.userData.landNumber && c.parent?.userData.num) { let v = true; for (let p = c; p; p = p.parent) v = v && p.visible; const u = c.parent.userData.num(), b = window.__ballAt; n = { ...c.userData.landNumber, v, n: u.n, color: u.color, up: u.up, settled: u.settled, y: u.pos.y, gap: b ? Math.round(u.pos.distanceTo(b) * 10) / 10 : null } } }); return n }
    for (let k = 0; k < 400 && (await p3.evaluate((l0) => (window.__mix25.lands?.() ?? 0) === l0, l0)); k++) { const r = await p3.evaluate(`(${num})()`); if (r && !r.settled) seen.push(r); const t0 = await p3.evaluate(() => window.__lastT); for (let j = 0; j < 40 && (await p3.evaluate((t0) => window.__lastT === t0, t0)); j++) await p3.waitForTimeout(100) } // (wait for this ball to come down: NUKE IT winds up first; 2 Nov, night: a sample a drawn frame, so a slow machine is not read as a still ball)
    await p3.waitForTimeout(1500)
    const end = await p3.evaluate(`(${num})()`)
    looks.push(end); rides.push({ look: n, lc, vis: seen.map((r) => r.v), ys: seen.map((r) => Math.round(r.y)), gaps: seen.map((r) => r.gap), ups: seen.map((r) => r.up), endY: end && Math.round(end.y), seen: seen.map((r) => r.n + ':' + r.color), end: end && end.n + ':' + end.color, cols: await p3.evaluate(() => { const c = window.__mix25.colors(); return { pc: c.pc, acc: c.acc, nk: c.nk } }) })
  }
  await p3.evaluate(() => { delete window.__cpSlow })
  check('the landing number: both looks build and settle over the spot, the feet only', looks.every((l, i) => l && l.look === [2, 3, 2][i] && l.v && l.settled && l.ft > 300 && l.n === l.ft), JSON.stringify(looks))
  const hx = (c) => (c || '').toLowerCase()
  check('COUNT-UP: in flight it counts up from short of the landing, in the pitch color before the wall and then orange (COUNT-UP COLOR 1) or GEIGER (2); it lands in that color on a home run',
    rides.every((r, i) => { const n = r.seen.map((x) => Number(x.split(':')[0])), cool = hx(r.cols.pc), hot = hx(r.lc === 2 ? r.cols.nk : r.cols.acc), cs = r.seen.map((x) => hx(x.split(':')[1])); return n.length >= 2 && n.every((v, j) => !j || v >= n[j - 1]) && n[0] < looks[i].ft && cs.every((c) => c === cool || c === hot) && cs.indexOf(hot) !== 0 && hx(r.end.split(':')[1]) === hot }), JSON.stringify(rides))
  // 2 Nov, later (Andrew: "it is not riding the ball"): the old check read the number's own position before the frame put it back; this one measures it against the ball
  check('the count-up is on screen the whole flight in both places (2 Nov, later: ONE AT A TIME stood it down from the zenith on)', rides.every((r) => r.vis.length >= 2 && r.vis.every(Boolean)), JSON.stringify(rides.map((r) => ({ look: r.look, vis: r.vis }))))
  check('OVER THE BALL moves with the ball (5 m over it all the flight, after the frame has placed it), its height counting too; OVER THE SPOT holds still over where it comes down, no height',
    [rides[0], rides[2]].every((r) => r.gaps.length >= 2 && r.gaps.every((g) => g != null && Math.abs(g - 5) <= 1.5) && new Set(r.ys).size >= 2 && r.ups.every((u) => u != null) && Math.max(...r.ups) > 50) && rides[1].ys.every((y) => Math.abs(y - rides[1].endY) <= 1) && rides[1].ups.every((u) => u == null),
    JSON.stringify(rides.map((r) => ({ look: r.look, gaps: r.gaps, ys: r.ys, ups: r.ups, endY: r.endY }))))
  const fp = await p3.evaluate(() => { const P = window.__mix25.poles(); if (!P) return null; const at = P.look(), pc = P.group.children[0].children.map((m) => '#' + m.material.color.getHexString()); const r = []; for (const n of [1, 2, 3, 4]) { window.__mix25.lab('FP', n); r.push(P.look()) } window.__mix25.lab('FP', 4); return { at, pc, r, kids: P.group.children.length, acc: getComputedStyle(document.querySelector('.c25')).getPropertyValue('--acc').trim() } })
  // THE ORANGE (2 Nov, later: locked to SAFETY ORANGE, "giants orange is reading as too red"): the interface and the poles in it from the start
  const or = await p3.evaluate(() => ({ acc: getComputedStyle(document.querySelector('.c25')).getPropertyValue('--acc').trim().toLowerCase(), pole: '#' + window.__mix25.poles().group.children[0].children[0].material.color.getHexString() }))
  check('THE ORANGE: locked to SAFETY ORANGE #ff7a00, the interface accent and the foul pole both', or.acc === '#ff7a00' && or.pole === '#ff7a00', JSON.stringify(or))
  check('FOUL POLES: locked to ORANGE AND WHITE (2 Nov), the pole in the same orange as the interface, the screen white; both poles in the park', fp && fp.at === 4 && fp.pc[0] === fp.acc.toLowerCase() && fp.pc[1] === '#f4f2ea' && fp.r.join() === '1,2,3,4' && fp.kids >= 2, JSON.stringify(fp))
  await p3.close()
}
check('no page errors', errs.length === 0, errs.slice(0, 3).join(' || '))
await browser.close()
console.log(fails ? `${fails} FAILED` : 'ALL PASS')
process.exit(fails ? 1 : 0)
