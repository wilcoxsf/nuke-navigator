// Real-interaction test of study 19: replay data loads, ball stepping and filters, mode switch, layout switch, controls, swing with Enter, the replay ball landing where the real one did,
// the portrait/stance tabs, theme switch, camera presets, the small-window card, no page errors. PASS/FAIL per check.
// Usage: node tools/test_study19.mjs <base url> <out folder>
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const [base = 'http://localhost:5174', outDir = 'shots'] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
let fails = 0
const check = (name, ok, extra = '') => { if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', name, extra) }
const page = await browser.newPage({ viewport: { width: 1500, height: 940 }, deviceScaleFactor: 1 })
const errs = []
page.on('pageerror', (e) => errs.push(e.message))
await page.goto(`${base}/?mode=dojo&ui=K&cp=19&seed=7`)
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady, null, { timeout: 180000 })
await page.waitForTimeout(2500)
const st = () => page.evaluate(() => ({ ev: window.__cp.state.ev, carry: window.__cp.state.carry, land: Math.round(window.__dojo?.landFt ?? 0), kind: window.__dojo?.verdict?.kind, text: document.getElementById('cp').innerText }))
let s0 = await st()
check('replay balls loaded', /BALL 1 OF \d{3}/.test(s0.text), (s0.text.match(/BALL 1 OF \d+/) ?? [''])[0])
const real = await page.evaluate(async () => { const r = await (await fetch('/replay.json')).json(); const b = r.balls.find((x) => x.g && x.hr); return { ft: b.ft, ev: b.ev } })
check('first replay ball lands near the real distance', Math.abs(s0.land - real.ft) <= 6, `sim ${s0.land} real ${real.ft}`)
check('first replay home run is a home run in the engine', s0.kind === 'GONE', s0.kind)
// stepping
await page.click('[data-st="1"]'); await page.waitForTimeout(500)
let s1 = await st()
check('next ball changes the exit speed', s1.ev !== s0.ev, `${s0.ev} -> ${s1.ev}`)
await page.keyboard.press(']'); await page.waitForTimeout(400)
check('bracket key steps balls', /BALL 3 OF/.test((await st()).text))
// filter
await page.click('[data-f="oracle"]'); await page.waitForTimeout(500)
check('oracle filter applies', /ORACLE HR/.test((await st()).text) && /BALL 1 OF \d+/.test((await st()).text))
// layouts
for (const k of ['b', 'c', 'd', 'a']) {
  await page.click(`[data-lay="${k}"]`); await page.waitForTimeout(500)
  const ok = await page.evaluate((k) => { const c = document.querySelector('.c19'); const vis = (sel) => { const e = document.querySelector(sel); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 40 && r.height > 40 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 } ; return ['.cell.hero', '.cell.verd', '.cell.zone', '.cell.swing', '.cell.card', '.cell.lg', '.cell.prk', '.cell.ctl'].every(vis) }, k)
  check(`layout ${k} puts every part on screen`, ok)
}
await page.screenshot({ path: `${outDir}/s19-test-a.png` })
// controls
const e0 = (await st()).ev
await page.keyboard.press('ArrowUp'); await page.waitForTimeout(300)
check('keyboard changes exit speed (edited flag)', (await st()).ev !== e0 && /EDITED/.test((await st()).text))
// swing
await page.keyboard.press('Enter'); await page.waitForTimeout(4500)
check('swing lands in the tally', /SWINGS\s*0?1/.test((await st()).text))
// mode
await page.click('[data-mode="whatif"]'); await page.waitForTimeout(500)
const w = await st()
check('what-if resets carry to 1', w.carry === 1, String(w.carry))
check('what-if shows real balls like this', /REAL BALLS WITHIN/.test(w.text))
await page.click('[data-mode="replay"]'); await page.waitForTimeout(500)
// tabs
await page.click('[data-tab="stance"]'); await page.waitForTimeout(300)
check('stance tab draws a silhouette', await page.evaluate(() => /=+/.test(document.querySelector('#c19c pre').textContent) && /H{3,}/.test(document.querySelector('#c19c pre').textContent)))
// theme, camera, wire
await page.click('.thm b[data-k="paper"]'); await page.waitForTimeout(400)
check('theme switch to paper', (await page.evaluate(() => getComputedStyle(document.getElementById('cp')).getPropertyValue('--k').trim())).toLowerCase() === '#ece7d6')
const cam0 = await page.evaluate(() => window.__nn.camera.position.y)
await page.click('[data-cam="top"]'); await page.waitForTimeout(300)
check('top camera preset moves the camera up', (await page.evaluate(() => window.__nn.camera.position.y)) > cam0 + 50)
await page.click('#c19w'); await page.waitForTimeout(300)
check('wire toggle off and on', /WIRE OFF/.test((await st()).text))
await page.click('#c19w'); await page.waitForTimeout(300)
// small window card
await page.setViewportSize({ width: 700, height: 500 }); await page.waitForTimeout(500)
check('small window shows the room card', await page.evaluate(() => { const g = document.querySelector('#cp .guard'); return !!g && !g.hidden && getComputedStyle(g).display !== 'none' }))
await page.setViewportSize({ width: 1500, height: 940 }); await page.waitForTimeout(500)
check('big window hides the card again', await page.evaluate(() => document.querySelector('#cp .guard').hidden))
check('no page errors', errs.length === 0, errs.join(' | ').slice(0, 300))
console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
await browser.close()
