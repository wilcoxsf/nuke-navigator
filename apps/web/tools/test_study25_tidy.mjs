// Real-interaction test of Study 25's 30 Oct tidy-up. No screenshots: boxes are measured. RIDE IT is gone and the dock with it; the Seance waits for the dragging
// to stop, calls a seat only for a ball that leaves, its ghost rises clear with the call on a placard, and the landing moments stand down under it; the 3D tags keep
// out of each other's way and off the scoreboard; the dojo's park controls (protractor, spray fan, slingshot, wind rose) drag and the slingshot swings; MY SEAT
// finds the home runs near a seat; tonight's wind reaches the windsocks and a dojo crosswind never follows a real ball; and the header and panels hold at three sizes.
// Usage: node tools/test_study25_tidy.mjs [base url]
import { chromium } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:5175'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
let fails = 0
const check = (name, ok, extra = '') => { if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : extra) }
const errs = []
const FIX = (r) => { const t = Array.from({ length: 48 }, (_, i) => new Date(Date.now() + (i - 1) * 3600e3).toISOString().slice(0, 13) + ':00'); r.fulfill({ contentType: 'application/json', body: JSON.stringify({ hourly: { time: t, temperature_2m: t.map(() => 58), relative_humidity_2m: t.map(() => 80), surface_pressure: t.map(() => 1012), wind_speed_10m: t.map(() => 14), wind_direction_10m: t.map(() => 280), cloud_cover_low: t.map(() => 20), visibility: t.map(() => 20000) } }) }) }
async function open(w, h, qs = '') {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
  page.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')))
  await page.route('**/api.open-meteo.com/**', FIX)
  await page.goto(`${base}/?mode=dojo&ui=K&cp=25&seed=7&ir=0&menu=0${qs}`)
  await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 180000 })
  await page.waitForTimeout(2000)
  return page
}
const until = async (page, fn, ms = 20000, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn, arg)) return true; await page.waitForTimeout(200) } return false }
const set = (page, o) => page.evaluate((o) => { Object.assign(window.__cp.state, o); window.__cp.update() }, o)
const hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0

const page = await open(1827, 992)
// ---- RIDE IT and the dock ----
{
  const r = await page.evaluate(() => ({ ri: !!document.querySelector('#c25ri'), riding: 'riding' in window.__mix25, mx: document.querySelector('#c25mx')?.hidden, dock: document.querySelector('#c25dk')?.innerHTML.trim() ?? '' }))
  check('RIDE IT is gone: no button, no ride in the page', !r.ri && !r.riding, JSON.stringify(r))
  check('the dock starts closed', r.dock === '', JSON.stringify(r))
  const cam0 = await page.evaluate(() => window.__cp.NN.camera.position.toArray().map((v) => +v.toFixed(2)).join())
  await page.keyboard.press('v'); await page.waitForTimeout(800)
  check('V does nothing now', cam0 === (await page.evaluate(() => window.__cp.NN.camera.position.toArray().map((v) => +v.toFixed(2)).join())))
}
// ---- OPTIONS: every choice in the dock, the locked ones too (30 Oct, "how do I tweak options now") ----
{
  await page.keyboard.press('?'); await page.waitForTimeout(500)
  const d = await page.evaluate(() => ({ chips: document.querySelectorAll('#c25dk .dx [data-ax]').length, lk: document.querySelectorAll('#c25dk .dx .lk').length }))
  check('? opens the side menu with only what is still open: the one switch still open: BLAST RADIUS PILLAR HEIGHT (4 Nov, later: the rest locked)', d.chips === 5 && d.lk === 0, JSON.stringify(d))
  // (31 Oct, later: the side menu holds THE LAB as well; a lab choice is kept on the device)
  await page.click('#c25dk .dx [data-ax="CN"]'); await page.waitForTimeout(300)
  await page.click('#c25dk .do[data-c="3"]'); await page.waitForTimeout(400)
  check('a lab choice can be picked in the side menu (CN3 OFF)', (await page.evaluate(() => window.__mix25.lab().CN)) === 3)
  await page.reload(); await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 180000 }); await page.waitForTimeout(1500)
  check('a reload keeps the lab choice (CN3)', (await page.evaluate(() => window.__mix25.lab().CN)) === 3)
  await page.evaluate(() => window.__mix25.lab('CN', 1))
}
// ---- GAG REEL ----
{
  await page.evaluate(() => window.__mix25.setShow('reel')); await page.waitForTimeout(1500)
  const r = await page.evaluate(() => ({ rows: document.querySelectorAll('#c25hb [data-rl]').length, gags: window.__mix25.gagReel().list.length, t: document.querySelector('#c25hi>.t').textContent.replace(/\s+/g, '') }))
  check('GAG REEL lists the 37 Dodger gags and nothing else, each with its own PLAY', /GAGREEL/.test(r.t) && r.gags === 37 && r.rows === 37, JSON.stringify(r))
  await page.click('#c25hb [data-rl="merch"]'); await page.waitForTimeout(500)
  const c1 = await page.evaluate(() => [window.__mix25.life.anim(), ...window.__mix25.life.queued(), window.__mix25.life.played().at(-1)])
  check('clicking one plays it on the board', c1.includes('merch'), JSON.stringify(c1))
  await page.click('#c25ra'); await until(page, () => window.__mix25.life.anim() === 'muniwait', 6000) // (31 Oct: the software renderer takes a second or more to start it)
  const a1 = await page.evaluate(() => [window.__mix25.gagReel().all, window.__mix25.life.anim()])
  check('PLAY ALL runs them from the first', a1[0] === true && a1[1] === 'muniwait', JSON.stringify(a1))
  await page.evaluate(() => window.__mix25.setShow('reel')); await page.waitForTimeout(300)
  check('leaving the reel stops PLAY ALL', !(await page.evaluate(() => window.__mix25.gagReel().all)))
}
// ---- the Seance ----
await page.evaluate(() => window.__mix25.setMode('whatif'))
await page.waitForTimeout(1200)
await page.evaluate(() => window.__mix25.setShow('se'))
await set(page, { ev: 85, la: 20, dir: 0 })
await page.waitForTimeout(1200)
{
  const r = await page.evaluate(() => ({ se: !!window.__mix25.seance(), g: window.__mix25.ghost().shown(), t: document.querySelector('#c25hb').innerText }))
  check('Seance: a ball that stays in gets a line, no ghost, no call', !r.se && !r.g && /STAYS IN THE PARK/.test(r.t), JSON.stringify(r).slice(0, 200))
}
await set(page, { ev: 112, la: 27, dir: -8 }); await set(page, { ev: 114, la: 28, dir: -6 }); await set(page, { ev: 116, la: 28, dir: -5 }) // a no-doubter to left-center
{
  const soon = await page.evaluate(() => !!window.__mix25.seance())
  check('Seance: it waits while the numbers are still moving', !soon)
  const ok = await until(page, () => !!window.__mix25.seance(), 20000)
  const r = await page.evaluate(() => { const s = window.__mix25.seance(); return { what: s?.call?.what, line: s?.call?.line } })
  check('Seance: a ball that leaves is called in the seats (or the Cove or the street), never the field', ok && ['seat', 'cove', 'street'].includes(r.what), JSON.stringify(r))
  await until(page, () => window.__mix25.ghost().height() > 18, 30000)
  const g = await page.evaluate(() => { const gh = window.__mix25.ghost(); return { shown: gh.shown(), h: gh.height(), sign: !!gh.sign(), lines: gh.sign()?.children.length ?? 0 } })
  check('Seance: the ghost rises 18 m or more clear of the seat with the call on a placard (GH1)', g.shown && g.h >= 18 && g.sign && g.lines >= 1, JSON.stringify(g))
  const n0 = await page.evaluate(() => window.__mix25.moments.log().length)
  await page.keyboard.press('Enter')
  await until(page, () => window.__mix25.lands() > 0 && !(window.__cp.anim?.() && !window.__cp.anim().exploded), 30000)
  await page.waitForTimeout(1500)
  check('Seance: no gull, dog or glove lands on the ghost\'s seat', (await page.evaluate(() => window.__mix25.moments.log().length)) === n0)
}
// ---- the 3D tags ----
{
  await page.evaluate(() => window.__mix25.setShow('se')) // off: back to the histograms
  await set(page, { ev: 112, la: 30, dir: 2 })
  await page.keyboard.press('Enter')
  await until(page, () => !(window.__cp.anim?.() && !window.__cp.anim().exploded), 30000)
  await page.waitForTimeout(1500)
  const rs = await page.evaluate(() => window.__mix25.readable().filter((r) => r.rect))
  const free = rs.filter((r) => !r.fixed), fixed = rs.filter((r) => r.fixed)
  let bad = 0
  for (let i = 0; i < free.length; i++) { for (let j = i + 1; j < free.length; j++) if (hit(free[i].rect, free[j].rect)) bad++; for (const f of fixed) if (hit(free[i].rect, f.rect)) bad++ }
  check('3D tags: none on another, none on the scoreboard or the sign (2 Nov, later: ZENITH and the wall on hover only; the landing number is up, held over the spot)', bad === 0 && rs.some((r) => r.ln), `tags ${free.length}, fixed ${fixed.length}, overlaps ${bad}, landing number ${rs.some((r) => r.ln)}`)
  const wb = await page.evaluate(() => { const W = window.__cpWindow; return { x0: (2 * W.l) / innerWidth - 1, x1: 1 - (2 * W.r) / innerWidth, y0: (2 * W.b) / innerHeight - 1, y1: 1 - (2 * W.t) / innerHeight } })
  const outs = free.filter((r) => r.rect.x0 < wb.x0 - 0.002 || r.rect.x1 > wb.x1 + 0.002 || r.rect.y0 < wb.y0 - 0.002 || r.rect.y1 > wb.y1 + 0.002)
  check('3D tags: every one shown sits inside the park window, none under a panel', outs.length === 0, JSON.stringify(outs.map((r) => r.rect)))
  // from the broadcast seat, pulled far back
  await page.evaluate(() => { const NN = window.__cp.NN; NN.camera.position.multiplyScalar(1.6); NN.controls.update() })
  await page.waitForTimeout(1500)
  const rs2 = await page.evaluate(() => window.__mix25.readable().filter((r) => r.rect))
  let bad2 = 0; const pairs = []
  for (let i = 0; i < rs2.length; i++) for (let j = i + 1; j < rs2.length; j++) if (!(rs2[i].fixed && rs2[j].fixed) && hit(rs2[i].rect, rs2[j].rect)) { bad2++; pairs.push([rs2[i].text ?? (rs2[i].fixed ? 'fixed' : '?'), rs2[j].text ?? (rs2[j].fixed ? 'fixed' : '?')]) }
  check('3D tags: still clear of each other from far back', bad2 === 0, `overlaps ${bad2} ${JSON.stringify(pairs)}`)
}
// ---- the dojo's controls in the park ----
await page.close()
{
  const p = await open(1827, 992)
  await p.evaluate(() => window.__mix25.setMode('whatif'))
  await p.waitForTimeout(1500)
  const S = () => p.evaluate(() => { const s = window.__cp.state; return { ev: s.ev, la: s.la, dir: s.dir, wind: s.wind, xwind: s.xwind, temp: s.temp } })
  const drag = async (k, dx, dy) => { const h = (await p.evaluate(() => window.__mix25.controls().handles()))[k]; await p.mouse.move(h[0], h[1]); await p.mouse.down(); for (let i = 1; i <= 6; i++) { await p.mouse.move(h[0] + (dx * i) / 6, h[1] + (dy * i) / 6); await p.waitForTimeout(50) } const held = await p.evaluate(() => window.__mix25.controls().dragging()); await p.mouse.up(); await p.waitForTimeout(300); return held }
  check('controls: shown in the dojo', await p.evaluate(() => window.__mix25.controls().visible))
  // (31 Oct, Andrew: "The click the scoreboard thing just doesn't work": the hit test needed the renderer, which window.__nn did not carry)
  const bAt = await p.evaluate(() => { const NN = window.__cp.NN, L = window.__mix25.life, b = L.vboard.visible ? L.vboard : L.board, c = new NN.THREE.Box3().setFromObject(b).getCenter(new NN.THREE.Vector3()).project(NN.camera), r = NN.renderer.domElement.getBoundingClientRect(); return [((c.x + 1) / 2) * r.width + r.left, ((1 - c.y) / 2) * r.height + r.top] })
  const g0 = await p.evaluate(() => window.__mix25.life.played().length + (window.__mix25.life.anim() ? 1 : 0))
  await p.mouse.click(bAt[0], bAt[1])
  let gOn = false; for (let k = 0; k < 20 && !gOn; k++) { await p.waitForTimeout(200); gOn = await p.evaluate(() => !!window.__mix25.life.anim() || window.__mix25.life.queued().length > 0) }
  check('a click on the scoreboard plays a gag', gOn, `at ${bAt.map(Math.round)} before ${g0}`)
  const s0 = await S(), cam0 = await p.evaluate(() => window.__cp.NN.camera.position.toArray().join())
  // (30 Oct, later: the slingshot does it all; the spray fan and the protractor are gone)
  check('controls: four grips, the slingshot ball, the top of its fork, the end of the sock and the top of the thermometer', (await p.evaluate(() => Object.keys(window.__mix25.controls().handles()).join())) === 'ev,la,wind,temp')
  const s1 = s0
  const h2 = await drag('la', 0, -60), s2 = await S()
  check('slingshot fork: leaning it back (dragging its top up) raises the angle; the camera stays put', h2 === 'la' && s2.la > s1.la + 5 && cam0 === (await p.evaluate(() => window.__cp.NN.camera.position.toArray().join())), JSON.stringify([s1.la, s2.la]))
  const h3 = await drag('wind', 70, -40), s3 = await S()
  check('windsock: dragging the end of the sock sets a wind out and across', h3 === 'wind' && s3.wind !== 0 && s3.xwind !== 0, JSON.stringify(s3))
  check('windsock: the foul-pole windsocks take the dojo wind', await p.evaluate(() => { const w = window.__mix25.wind()?.state?.(); return !!w && w.mph > 3 }), JSON.stringify(await p.evaluate(() => window.__mix25.wind()?.state?.())))
  // (31 Oct: the sock stands on first base, the thermometer just left of it)
  const sp = await p.evaluate(() => window.__mix25.controls().handles())
  check('windsock and thermometer: side by side, the thermometer on the left', sp.temp[0] < sp.wind[0] + 40 && Math.abs(sp.temp[1] - sp.wind[1]) < 260, JSON.stringify(sp))
  const t5 = (await S()).temp ?? 0, h5 = await drag('temp', 0, -50), s5 = await p.evaluate(() => window.__cp.state.temp)
  check('thermometer: dragging the red up warms the air', h5 === 'temp' && s5 > t5, JSON.stringify([t5, s5]))
  const f0 = await p.evaluate(() => window.__mix25.fires())
  const h4 = await drag('ev', 60, 140)
  await p.waitForTimeout(800)
  const s4 = await S()
  check('slingshot: pulling back sets the speed, off to the side aims the other way, and letting go swings', h4 === 'ev' && s4.ev > 110 && s4.dir !== s3.dir && (await p.evaluate(() => window.__mix25.fires())) === f0 + 1, JSON.stringify([s4, f0]))
  await until(p, () => !(window.__cp.anim?.() && !window.__cp.anim().exploded), 30000)
  // a real ball never keeps the dojo's crosswind
  await p.evaluate(() => window.__mix25.setMode('replay'))
  await p.waitForTimeout(1500)
  const r = await p.evaluate(() => ({ x: window.__cp.state.xwind, w: window.__cp.state.wind, vis: window.__mix25.controls().visible }))
  check('back in DEJA-VU: no dojo wind on the real ball, and the controls are hidden', r.x === 0 && r.w === 0 && !r.vis, JSON.stringify(r))
  // ---- MY SEAT (6 Nov: gone, Andrew: "'My seat' shouldn't matter we can kill that mode") ----
  await p.evaluate(() => window.__mix25.setMode('whatif')); await p.waitForTimeout(800)
  const mySeen = await p.evaluate(() => [...document.querySelectorAll('.bt')].filter((b) => b.offsetParent && /MY SEAT/.test(b.textContent)).map((b) => b.textContent))
  check('no MY SEAT button anywhere in the dojo', mySeen.length === 0, JSON.stringify(mySeen))
  await p.close()
}
// ---- tonight's wind and the header at three sizes ----
for (const [w, h] of [[1920, 1080], [1440, 820], [1280, 720]]) {
  const p = await open(w, h)
  await p.evaluate(() => window.__mix25.setMode('replay'))
  if (w === 1920) check('tonight\'s forecast wind (14 mph from 280) reaches the windsocks', await until(p, () => (window.__mix25.wind()?.state?.()?.mph ?? 0) > 10, 15000), JSON.stringify(await p.evaluate(() => window.__mix25.wind()?.state?.())))
  const r = await p.evaluate(() => {
    const out = []
    const bts = [...document.querySelectorAll('.c25>.hdr .bt')].filter((b) => b.offsetParent).map((b) => [b.id || b.textContent.trim(), b.getBoundingClientRect()])
    for (let i = 0; i < bts.length; i++) { const a = bts[i][1]; if (a.right > innerWidth + 1 || a.left < -1) out.push(bts[i][0] + ' off screen'); for (let j = i + 1; j < bts.length; j++) { const b = bts[j][1]; if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) out.push(bts[i][0] + ' x ' + bts[j][0]) } }
    // text that runs past its panel's edge
    for (const pn of document.querySelectorAll('.c25>.pnl, .c25>.batter, .c25>.pitch, .c25>.hists')) { const pr = pn.getBoundingClientRect(); for (const el of pn.querySelectorAll('b,span,div')) { if (!el.offsetParent || el.children.length) continue; const r = el.getBoundingClientRect(); if (r.width && (r.right > pr.right + 2 || r.left < pr.left - 2) && getComputedStyle(el).textOverflow !== 'ellipsis') out.push('spills: ' + el.textContent.trim().slice(0, 30)) } }
    return out
  })
  check(`${w}x${h}: header buttons on screen and apart, no panel text past its panel`, r.length === 0, r.slice(0, 6).join(' / '))
  await p.close()
}
check('no page errors', errs.length === 0, errs.slice(0, 3).join(' || '))
await browser.close()
console.log(fails ? `${fails} FAILED` : 'ALL PASS')
process.exit(fails ? 1 : 0)
