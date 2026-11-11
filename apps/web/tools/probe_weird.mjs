// the weird-states pass (10 Nov, evening; Andrew: "do a full pass yourself first for like weird states, 'huh, that doesn't work'"): awkward sequences, and after each
// the things that should not be left behind. Prints OK or ODD per line; ODD lines are the bugs to look at.
import { chromium } from 'playwright-core'
const URL = process.argv[2] ?? 'http://localhost:5195'
const [W, H] = (process.argv[3] ?? '1827x992').split('x').map(Number)
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport: { width: W, height: H } })
const errs = []; page.on('pageerror', (e) => errs.push(e.message.slice(0, 160)))
await page.route('**/api.open-meteo.com/**', (r) => r.abort())
await page.goto(URL + '/?mode=dojo&ui=K&cp=25&seed=7&ir=0&menu=0')
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 180000 })
await page.waitForTimeout(1500)
await page.mouse.click(5, 5) // (a gesture: the songs and sounds may start)
const out = []
let n0 = 0
const say = (ok, what, info) => { console.log(`${ok ? 'OK ' : 'ODD'} ${what}${ok ? '' : '  ' + JSON.stringify(info).slice(0, 400)}`); out.push(`${ok ? 'OK ' : 'ODD'} ${what}${ok ? '' : '  ' + JSON.stringify(info).slice(0, 400)}`); if (errs.length > n0) { out.push(`ODD   page errors after "${what}": ${errs.slice(n0).join(' || ')}`); n0 = errs.length } }
const ev = (f, a) => page.evaluate(f, a)
const tab = (t) => ev((t) => document.querySelector(`#c25tabs [data-tab="${t}"]`).click(), t)
const wait = (ms) => page.waitForTimeout(ms)
const state = () => ev(() => { const M = window.__mix25, pk = document.querySelector('.c25>.park>.t'), pit = document.querySelector('.c25>.pitch'), bat = document.querySelector('.c25>.batter'), ppl = document.querySelector('#c25ch .ppl')
  return { mode: M.mode(), wall: M.awayWall()?.venue ?? null, title: pk?.textContent.replace(/\s+/g, '') ?? '', titleCol: pk?.style.color ?? '', pitTm: pit?.classList.contains('tm'), batTm: bat?.classList.contains('tm'), panel: ppl?.getAttribute('aria-label') ?? null, song: M.jukebox.playing(), dojoPark: M.dojoPark() } })
const swing = async () => { await ev(() => { window.__f0 = window.__mix25.fires() }); await page.click('#c25nk'); for (let k = 0; k < 60; k++) { await wait(400); if (await ev(() => window.__mix25.fires() > window.__f0)) break } }

// 1. the dojo's other park, then DEJA-VU, then Shot Caller, then back to the dojo
await tab('whatif'); await wait(1500)
await page.click('#c25op'); await wait(300); await page.click('#c25ch [data-op="COL"]'); await wait(800)
let s = await state(); say(s.wall && /Coors/.test(s.wall), '1a dojo: OTHER PARKS COL draws Coors', s)
await tab('replay'); await wait(1200); await ev(() => window.__mix25.ball((b) => b.hr && b.park === 'SF')); await wait(800)
s = await state(); say(s.wall === null && /ORACLE/.test(s.title) && !s.titleCol, '1b DEJA-VU Oracle ball after the dojo park: no away wall, Oracle title', s)
await tab('shot'); await wait(1500); s = await state(); say(s.wall === null, '1c Shot Caller: no away wall', s)
say(!s.pitTm, '1d Shot Caller: the seat form has no team corners left over', s)
await tab('whatif'); await wait(1200); s = await state(); say(/Coors/.test(s.wall ?? ''), '1e back in the dojo: the picked park is still up', s)
await ev(() => window.__mix25.dojoPark(null)); await wait(400)

// 2. a corner panel left open across a mode change
await page.click('#c25op'); await wait(300)
await tab('replay'); await wait(1200); s = await state(); say(s.panel === null, '2a the dojo panel does not follow into DEJA-VU', s)
await tab('whatif'); await wait(1200); s = await state(); say(s.panel === null, '2b and is not open again on the way back', s)
await tab('replay'); await wait(1000)
await page.click('#c25pp'); await wait(300); await tab('whatif'); await wait(1000); await tab('replay'); await wait(1000); s = await state(); say(s.panel === null, '2c SORT THE SHOTS? does not stay open across modes', s)

// 3. a mode change mid-flight
await ev(() => window.__mix25.ball((b) => b.hr && b.park === 'COL')); await wait(1000)
await swing(); await wait(300); await tab('whatif'); await wait(2500)
s = await state(); say(s.wall === null, '3a an away ball swung, then the dojo mid-flight: the away wall goes', s)
const left = await ev(() => { const sc = window.__cp.NN.scene; let aw = 0; sc.traverse((o) => { if (o.name === 'awaywall25') aw++ }); return aw }); say(left === 0, '3b nothing of the away wall is left in the scene', { left })
await tab('replay'); await wait(1200)

// 4. songs: pause, close, S off and on, SKIP spam
await ev(() => { document.activeElement?.blur?.() }); await page.keyboard.press('j'); await wait(900)
const before = await ev(() => window.__mix25.jukebox.playing())
if (before) { await page.click('#jkpp'); await wait(600) }
await page.keyboard.press('Escape'); await wait(500)
await page.keyboard.press('s'); await wait(400); await page.keyboard.press('s'); await wait(2500)
s = await state(); say(before ? s.song === before : true, '4a paused, closed, sound off and on: the paused song picks up again (the second red team, 8)', { before, ...s })
for (let i = 0; i < 5; i++) { await page.click('#c25sk'); await wait(120) }
await wait(1500)
const voices = await ev(() => ({ playing: window.__mix25.jukebox.playing(), stats: window.__nnSoundStats?.() }))
say(!!voices.playing, '4b five quick SKIPs: one song playing (and the pause is off)', voices)
await page.keyboard.press('j'); await wait(800); await page.fill('#jks', 'zzzzqqq'); await wait(300)
const none = await ev(() => document.querySelector('#jkl')?.textContent); say(/NOTHING BY THAT NAME/.test(none ?? ''), '4c a search with no match says so', none)
await page.fill('#jks', ''); await wait(300)
const all = await ev(() => document.querySelectorAll('#jkl [data-song]').length); say(all >= 60, '4d clearing the search brings every song back', { all })
await page.keyboard.press('Escape'); await wait(500)
await page.keyboard.press('j'); await wait(800)
const kept = await ev(() => document.querySelector('#jks')?.value); say(kept === '', '4e the window opens with an empty search after clearing it', { kept })
await page.keyboard.press('Escape'); await wait(500)

// 5. TWEAK THIS TATER from an away home run: Oracle title in the dojo, the batter's team kept
await ev(() => window.__mix25.ball((b) => b.hr && b.park === 'COL')); await wait(900)
await page.click('#c25tw').catch(() => {}); await wait(1800)
s = await state(); say(s.mode === 'whatif' && /ORACLE/.test(s.title) && s.wall === null, '5a tweaking an away home run: the dojo shows Oracle, no away wall', s)
await page.click('#c25back').catch(() => {}); await wait(1500)
s = await state(); say(s.mode === 'replay' && /COORS/.test(s.title) && /Coors/.test(s.wall ?? ''), '5b BACK TO THE REPLAY: Coors title and wall again', s)

// 6. the menu over an away ball, BLAST RADIUS, back
await page.keyboard.press('Escape'); await wait(800)
await ev(() => window.__mix25.menu.close()); await wait(300)
await tab('blast'); await wait(2500); s = await state(); say(s.wall === null && !/COORS/.test(s.title), '6a BLAST RADIUS after an away ball: no away wall or title', s)
await tab('replay'); await wait(1500)

// 7. a resize with the corner up
await page.setViewportSize({ width: 1280, height: 720 }); await wait(1500)
let c = await ev(() => ({ fit: window.__mix25.cornerFit(), r: document.querySelector('#c25ch .bw')?.getBoundingClientRect().right, hi: document.querySelector('#c25hi')?.getBoundingClientRect().right }))
say(c.fit !== null && Math.abs(c.r - c.hi) < 20, '7a DEJA-VU resized to 1280: the corner follows the histogram panel', c)
await tab('whatif'); await wait(1500)
c = await ev(() => ({ fit: window.__mix25.cornerFit(), n: document.querySelectorAll('#c25ch .bw .bt.bwb').length, over: [...document.querySelectorAll('#c25ch .bw .bt.bwb')].some((b) => b.scrollWidth > b.clientWidth + 1) }))
say(c.fit === true && c.n === 3 && !c.over, '7b the dojo at 1280: OTHER PARKS?, LANDING PARTY, SEAT SEANCE fit under the histograms', c)
await page.setViewportSize({ width: W, height: H }); await wait(1200)

// 8. Shot Caller: call a seat, play every way, leave mid-play
await tab('shot'); await wait(1500)
await page.selectOption('#c25ss', '140'); await page.fill('#c25sr', '12'); await page.fill('#c25st', '8'); await page.focus('#c25st'); await page.keyboard.press('Enter')
await page.waitForFunction(() => window.__mix25.shot(), null, { timeout: 60000 }); await wait(800)
await page.click('#c25nk').catch(() => {}); await wait(700); await tab('replay'); await wait(3000)
const sg = await ev(() => ({ ghosts: window.__mix25.shotGhosts(), mode: window.__mix25.mode() })); say(sg.ghosts === 0, '8a leaving Shot Caller mid-play leaves no ghost balls', sg)

// 9. the calling card: a new one starts blank; Esc out of it
await tab('witness'); await wait(1500)
const card = await ev(() => !!document.querySelector('#c25wcard')); if (card) { await page.click('#c25wcard'); await wait(900) }
const cv = await ev(() => { const c = document.querySelector('.wcd canvas'); if (!c) return null; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const s0 = new Set(); for (let i = 0; i < d.length; i += 4 * 37) s0.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]); return { colors: s0.size, chaos: [...document.querySelectorAll('.wcd .bt')].some((b) => /CHAOS/.test(b.textContent)), tag: [...document.querySelectorAll('.wcd .lb')].map((x) => x.textContent) } })
say(!cv || (cv.colors <= 3 && !cv.chaos && cv.tag.includes('CALLING CARD')), '9a a new calling card: blank and solid, no CHAOS, the field called CALLING CARD', cv)
await page.keyboard.press('Escape'); await wait(600); await page.keyboard.press('Escape'); await wait(600); await ev(() => window.__mix25.menu.close()); await wait(300)

// 10. a dojo swing with the sound off, then SKIP
await tab('whatif'); await wait(1200); await page.keyboard.press('s'); await wait(300); await swing(); await page.click('#c25sk'); await wait(1200)
const so = await ev(() => ({ on: window.__nnSoundStats?.().on, playing: window.__mix25.jukebox.playing() })); say(so.on && !!so.playing, '10a SKIP with the sound off turns it on and plays', so)

out.push(`errors in all: ${errs.length}`)
console.log('---'); console.log(out.filter((l) => l.startsWith('ODD')).join('\n'))
await browser.close()
