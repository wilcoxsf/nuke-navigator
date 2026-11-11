// the weird-states pass, round three (10 Nov, night; Andrew: "viciously bug pass this thing, multiple sets of red teams. I want it to 'just work'"): a long session
// (does the scene or the GPU memory grow?), the keyboard only, key spam, every window in every mode, resizes mid-flight, the sound switch hammered
import { chromium } from 'playwright-core'
const URL = process.argv[2] ?? 'http://localhost:5195'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport: { width: 1827, height: 992 } }), errs = []
page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)))
await page.route('**/api.open-meteo.com/**', (r) => r.abort())
await page.goto(URL + '/?mode=dojo&ui=K&cp=25&seed=7&ir=0&menu=0')
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 180000 })
await page.waitForTimeout(1500); await page.mouse.click(5, 5)
let n0 = 0
const say = (ok, what, info) => { console.log(`${ok ? 'OK ' : 'ODD'} ${what}${ok ? '' : '  ' + JSON.stringify(info).slice(0, 500)}`); if (errs.length > n0) { console.log(`ODD   page errors after "${what}": ${errs.slice(n0).join(' || ')}`); n0 = errs.length } }
const ev = (f, a) => page.evaluate(f, a), wait = (ms) => page.waitForTimeout(ms)
const tab = (t) => ev((t) => document.querySelector(`#c25tabs [data-tab="${t}"]`).click(), t)
const count = () => ev(() => { let n = 0; window.__cp.NN.scene.traverse(() => n++); const r = window.__cp.NN.renderer?.info?.memory; return { obj: n, geo: r?.geometries ?? null, tex: r?.textures ?? null } })
const fly = async () => { await ev(() => { window.__f0 = window.__mix25.fires() }); await page.click('#c25nk').catch(() => {}); for (let k = 0; k < 60; k++) { await wait(300); if (await ev(() => window.__mix25.fires() > window.__f0 && !!(window.__cp.anim?.() && window.__cp.anim().exploded))) break } await wait(400) }

// 1. a long session: twenty balls flown in DEJA-VU, ten trips round the modes; the scene and the GPU's geometries should come back to about where they started
await tab('replay'); await wait(1200); await fly()
const c0 = await count()
for (let i = 0; i < 20; i++) { await page.keyboard.press(']'); await wait(250); if (i % 4 === 0) await fly() }
for (let i = 0; i < 10; i++) { for (const t of ['whatif', 'shot', 'blast', 'replay']) { await tab(t); await wait(500) } }
await wait(1500); await fly()
const c1 = await count()
say(c1.obj <= c0.obj * 1.25 + 60 && (c0.geo == null || c1.geo <= c0.geo * 1.3 + 40), '1a a long session does not pile up scene objects or geometries', { c0, c1 })

// 2. the keyboard only: J, Tab to the search, type, Tab to a song, Enter, Esc
await ev(() => document.activeElement?.blur?.()); await page.keyboard.press('j'); await wait(800)
await page.focus('#jks'); await page.keyboard.type('blue'); await wait(300)
let k = await ev(() => ({ n: document.querySelectorAll('#jkl [data-song]').length, first: document.querySelector('#jkl [data-song]')?.dataset.song }))
await page.keyboard.press('Tab'); await wait(150)
const f1 = await ev(() => document.activeElement?.dataset?.song ?? document.activeElement?.id ?? document.activeElement?.className)
await page.keyboard.press('Enter'); await wait(900)
const k2 = await ev(() => ({ playing: window.__mix25.jukebox.playing(), focus: document.activeElement?.dataset?.song ?? document.activeElement?.id ?? null }))
say(k.n >= 1 && f1 === k.first && k2.playing === k.first, '2a the jukebox by keyboard: search, Tab to the first song, Enter plays it', { k, f1, k2 })
say(!!k2.focus, '2b the focus stays in the player after Enter', k2)
await page.keyboard.press('Escape'); await wait(500)
const open1 = await ev(() => document.querySelector('#c25m')?.classList.contains('open')); say(!open1, '2c Esc in the player closes it', { open1 })

// 3. key spam: ] thirty times fast, then [ thirty times; number keys while a ball is up
const i0 = await ev(() => document.querySelector('#c25ch').textContent.match(/BALL (\d+)/)?.[1])
for (let i = 0; i < 30; i++) await page.keyboard.press(']')
for (let i = 0; i < 30; i++) await page.keyboard.press('[')
await wait(1500)
const i1 = await ev(() => document.querySelector('#c25ch').textContent.match(/BALL (\d+)/)?.[1])
say(i0 === i1, '3a thirty ] then thirty [ lands back on the same ball', { i0, i1 })
await page.click('#c25nk').catch(() => {}); await wait(400)
for (const key of ['2', '3', '1', '5', '1']) { await page.keyboard.press(key); await wait(120) }
await wait(2500)
const m = await ev(() => ({ mode: window.__mix25.mode(), open: document.querySelector('#c25m')?.classList.contains('open') }))
say(m.mode === 'replay', '3b number keys hammered mid-flight end where the last one says', m)
if (m.open) { await page.keyboard.press('Escape'); await wait(400) }

// 4. every window in every mode: J, A, ?, Esc out of each
const stuck = []
for (const t of ['replay', 'whatif', 'shot', 'blast']) {
  await tab(t); await wait(900)
  for (const key of ['j', 'a', '?']) {
    await ev(() => document.activeElement?.blur?.()); await page.keyboard.press(key); await wait(500)
    await page.keyboard.press('Escape'); await wait(400)
    const s = await ev(() => ({ modal: document.querySelector('#c25m')?.classList.contains('open'), dock: document.querySelector('.c25')?.classList.contains('dk') || document.querySelector('#c25dk')?.classList.contains('on'), menu: document.querySelector('.c25 .sm')?.classList.contains('open') }))
    if (s.modal || s.dock) stuck.push({ t, key, ...s })
    if (s.menu) { await ev(() => window.__mix25.menu.close()); await wait(200) }
  }
}
say(stuck.length === 0, '4a J, A and ? in every mode, and Esc closes each', stuck)
await tab('replay'); await wait(800)

// 5. resizes while a ball is in the air
await page.click('#c25nk').catch(() => {}); await wait(300)
for (const [w, h] of [[1280, 720], [1440, 820], [390, 844], [1827, 992]]) { await page.setViewportSize({ width: w, height: h }); await wait(500) }
await wait(2500)
const r = await ev(() => ({ fit: window.__mix25.cornerFit(), sx: document.scrollingElement.scrollWidth > innerWidth + 1 }))
say(!r.sx && r.fit !== false, '5a resized four times mid-flight: no sideways scroll, the corner fits again', r)

// 6. the sound switch hammered: one song at most, and the state matches the last press
for (let i = 0; i < 11; i++) { await page.keyboard.press('s'); await wait(90) }
await wait(2500)
const so = await ev(() => ({ on: window.__nnSoundStats?.().on, playing: window.__mix25.jukebox.playing() }))
say(so.on === false && so.playing === null, '6a S pressed eleven times: off, and nothing playing', so)
await page.keyboard.press('s'); await wait(2500)
const so2 = await ev(() => ({ on: window.__nnSoundStats?.().on, playing: window.__mix25.jukebox.playing() }))
say(so2.on === true && !!so2.playing, '6b S once more: on, and one song playing', so2)

console.log(`errors in all: ${errs.length}`)
await browser.close()
