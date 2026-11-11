// Andrew's 11 Nov picks, checked in the app: the menu's thirteen gags, the DEJA-VU blurb, the mode on the phone's MENU button, Glory Box in the jukebox,
// Rickwood Field for the 20 Jun 2024 game, and no CHARGE! recipe. Usage: node tools/probe_picks1111.mjs http://localhost:5195
import { chromium } from 'playwright-core'
const URL0 = process.argv[2] || 'http://localhost:5195'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const say = (ok, what, info) => console.log(`${ok ? 'OK ' : 'ODD'} ${what}${ok ? '' : '  ' + JSON.stringify(info).slice(0, 400)}`)
const open = async (vp, touch) => {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch }), page = await ctx.newPage(), errs = []
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)))
  await page.route('**/api.open-meteo.com/**', (r) => r.abort())
  await page.goto(URL0 + '/?mode=dojo&ui=K&cp=25&seed=7&ir=0&menu=0')
  await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 180000 })
  await page.waitForTimeout(1500)
  return { page, errs, ev: (f, a) => page.evaluate(f, a), wait: (ms) => page.waitForTimeout(ms) }
}
// desktop
{
  const { page, errs, ev, wait } = await open({ width: 1600, height: 900 }, false)
  await ev(() => document.querySelector('#c25mn').click()); await wait(1200)
  const m = await ev(() => ({ scenes: window.__mix25.menu.scenes, blurb: [...document.querySelectorAll('.c25 .sm .smi')].map((e) => e.textContent).join(' | ') }))
  say(m.scenes.length === 13 && ['balldog', 'parrots', 'robbed'].every((k) => m.scenes.includes(k)) && !m.scenes.includes('moonshot') && !m.scenes.includes('wave'), '1 the menu plays his thirteen gags', m.scenes)
  say(/EVERY HOME RUN IN A GIANTS GAME/.test(m.blurb) && !/EVERY ORACLE HOME RUN/.test(m.blurb), '2 DEJA-VU says EVERY HOME RUN IN A GIANTS GAME', m.blurb)
  await page.keyboard.press('Escape'); await wait(600)
  const mm = await ev(() => { const e = document.querySelector('#c25mnm'); return { txt: e?.textContent, shown: e ? getComputedStyle(e).display : null } })
  say(mm.shown === 'none', '3a on a desktop the MENU button stays MENU (the mode is in the title)', mm)
  const rw = await ev(() => { const i = window.__mix25.ball((b) => b.d === '2024-06-20'); return { i, venue: window.__mix25.awayWall?.() ?? null, v2: document.querySelector('.c25')?.innerText.match(/RICKWOOD FIELD|BUSCH STADIUM/g) } })
  await wait(1500)
  const rw2 = await ev(() => ({ t: (document.querySelector('.c25>.park .t')?.textContent ?? '').replace(/\s+/g, '').match(/RICKWOODFIELD|BUSCHSTADIUM/gi) })) /* (the park's title is spaced out letter by letter) */
  say(rw.i >= 0 && rw2.t && rw2.t.some((x) => /rickwood/i.test(x)) && !rw2.t.some((x) => /busch/i.test(x)), '4 the 20 Jun 2024 game is at RICKWOOD FIELD, not Busch', { rw, rw2 })
  const jk = await ev(async () => { const r = await fetch('/songs_private.json'); const d = await r.json(); return JSON.stringify(d).includes('GLORY BOX') })
  say(jk, '5 Glory Box is in the jukebox file', {})
  /* (6, no CHARGE!: checked by grep on sound25.js; the render hook falls back for a name it does not know, so it cannot tell) */
  say(errs.length === 0, '7 no page errors (desktop)', errs)
  await page.context().close()
}
// phone
{
  const { page, errs, ev, wait } = await open({ width: 390, height: 844 }, true)
  const names = []
  for (const n of [1, 2, 3]) { await page.tap('#c25mn'); await wait(700); await page.tap(`.c25 .sm .smi:nth-child(${n})`); await wait(1500); names.push(await ev(() => { const e = document.querySelector('#c25mnm'), b = document.querySelector('#c25mn').getBoundingClientRect(); return { txt: e?.textContent, shown: getComputedStyle(e).display, w: Math.round(b.width), right: Math.round(b.right) } })) }
  say(names.every((x) => x.shown !== 'none' && /^: \S/.test(x.txt)) && new Set(names.map((x) => x.txt)).size === 3, '8 on a phone the MENU button names the mode, and it changes with the mode', names)
  const fit = await ev(() => { const h = document.querySelector('.c25 .hdr').getBoundingClientRect(), r = [...document.querySelectorAll('.c25 .hdr .bt')].filter((e) => e.offsetParent).map((e) => e.getBoundingClientRect()); return { over: r.some((a) => a.right > h.right + 1), overlap: r.some((a, i) => r.some((b, j) => j > i && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom)) , sideways: document.scrollingElement.scrollWidth > innerWidth + 1 } })
  say(!fit.over && !fit.overlap && !fit.sideways, '9 the header still fits on a phone, nothing overlapping', fit)
  say(errs.length === 0, '10 no page errors (phone)', errs)
  await page.context().close()
}
await browser.close()
