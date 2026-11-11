// the phone, touch only (10 Nov, night): with the tabs hidden, can a thumb reach every mode, the jukebox, a song, and get back out of each window?
import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
const page = await ctx.newPage(), errs = []
page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)))
await page.route('**/api.open-meteo.com/**', (r) => r.abort())
await page.goto('http://localhost:5195/?mode=dojo&ui=K&cp=25&seed=7&ir=0&menu=0')
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 180000 })
await page.waitForTimeout(1500)
const say = (ok, what, info) => console.log(`${ok ? 'OK ' : 'ODD'} ${what}${ok ? '' : '  ' + JSON.stringify(info).slice(0, 400)}`)
const ev = (f, a) => page.evaluate(f, a), wait = (ms) => page.waitForTimeout(ms)
const visible = (sel) => ev((sel) => { const e = document.querySelector(sel); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 && r.right <= innerWidth + 1 && r.left >= -1 && getComputedStyle(e).visibility !== 'hidden' }, sel)
say(await visible('#c25mn'), '1 the MENU button is on screen', {})
const menuItems = ['replay', 'dojo', 'shot', 'witness', 'blast', 'jukebox']
for (const [n, want] of [[1, 'replay'], [2, 'whatif'], [3, 'shot'], [5, 'whatif'], [1, 'replay']]) {
  await page.tap('#c25mn'); await wait(700)
  const open = await ev(() => document.querySelector('.c25 .sm')?.classList.contains('open'))
  if (!open) { say(false, `2 the menu opens from MENU (for line ${n})`, {}); continue }
  await page.tap(`.c25 .sm .smi:nth-child(${n})`); await wait(1800)
  const st = await ev(() => ({ mode: window.__mix25.mode(), blast: document.querySelector('.c25').classList.contains('blast'), menu: document.querySelector('.c25 .sm')?.classList.contains('open') }))
  say(st.mode === want && !st.menu && (n === 5 ? st.blast : !st.blast), `2 MENU, then line ${n} (${menuItems[n - 1]}) by touch`, st)
}
// the jukebox by touch: open it, play a song, close it
await page.tap('#c25mn'); await wait(700); await page.tap('.c25 .sm .smi:nth-child(6)'); await wait(1200)
const jk = await ev(() => ({ open: document.querySelector('#c25m')?.classList.contains('open'), rows: document.querySelectorAll('#c25mb [data-song]').length }))
say(jk.open && jk.rows > 50, '3a JUKEBOX from the menu by touch', jk)
await page.tap('#c25mb [data-song] b'); await wait(1000)
const pl = await ev(() => window.__mix25.jukebox.playing()); say(!!pl, '3b a tapped song plays', { pl })
const close = await visible('#c25cl'); say(close, '3c the window has a CLOSE a thumb can reach', {})
if (close) { await page.tap('#c25cl'); await wait(600) }
const shut = await ev(() => !document.querySelector('#c25m')?.classList.contains('open')); say(shut, '3d CLOSE shuts it', {})
// SKIP by touch
const sk0 = await ev(() => window.__mix25.jukebox.playing())
if (await visible('#c25sk')) { await page.tap('#c25sk'); await wait(1000) }
const sk1 = await ev(() => window.__mix25.jukebox.playing()); say(await visible('#c25sk') && sk1 && sk1 !== sk0, '4 SKIP is on screen and works by touch', { sk0, sk1 })
// WALLOP WITNESS by touch, and out again
await page.tap('#c25mn'); await wait(700); await page.tap('.c25 .sm .smi:nth-child(4)'); await wait(1500)
const ww = await ev(() => document.querySelector('#c25m')?.classList.contains('open')); say(ww, '5a WALLOP WITNESS opens from the menu by touch', {})
if (await visible('#c25cl')) { await page.tap('#c25cl'); await wait(600) }
say(await ev(() => !document.querySelector('#c25m')?.classList.contains('open')), '5b and CLOSE gets out', {})
// a swing by touch
await ev(() => { window.__f0 = window.__mix25.fires() }); if (await visible('#c25nk')) await page.tap('#c25nk'); for (let k = 0; k < 20 && !(await ev(() => window.__mix25.fires() > window.__f0)); k++) await wait(500)
say(await ev(() => window.__mix25.fires() > window.__f0), '6 NUKE IT by touch swings', {})
say(await ev(() => document.scrollingElement.scrollWidth <= innerWidth + 1), '7 no sideways scroll on the phone', {})
say(errs.length === 0, '8 no page errors', errs)
await browser.close()
