// 12 Nov: Andrew's layout asks, measured (no screenshots): the arrows and dropdown as tall as WHERE? WHO? SORT THE SHOTS? and on one line with them; TWEAK / LANDING
// PARTY / SEAT SEANCE under the result card, clear of it; SORT THE SHOTS in pairs with words under each; the dropdown following the sort; the arrows' words; the music
// note in the header; the title without NUKE NAVIGATOR; the menu with one big line and nothing replaying behind it. Usage: node tools/probe_nov12.mjs [url]
import { chromium } from 'playwright-core'
const URL0 = process.argv[2] || 'http://localhost:5195'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const say = (ok, what, info) => console.log(`${ok ? 'OK ' : 'ODD'} ${what}${ok ? '' : '  ' + JSON.stringify(info).slice(0, 700)}`)
for (const vp of [{ width: 1600, height: 900 }, { width: 1280, height: 760 }, { width: 1920, height: 1080 }]) {
  const page = await browser.newPage({ viewport: vp }), errs = []
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)))
  await page.route('**/api.open-meteo.com/**', (r) => r.abort())
  await page.goto(URL0 + '/?ui=K&cp=25&seed=7&ir=0&menu=0')
  await page.waitForFunction(() => window.__ready && window.__ready() && window.__cpReady && window.__mix25, null, { timeout: 180000 })
  await page.waitForTimeout(2500)
  const ev = (f, a) => page.evaluate(f, a), wait = (ms) => page.waitForTimeout(ms), tag = `${vp.width}x${vp.height}`
  const box = (sel) => ev((sel) => { const e = document.querySelector(sel); if (!e || getComputedStyle(e).display === 'none' || getComputedStyle(e).visibility === 'hidden') return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), b: Math.round(r.bottom), r: Math.round(r.right) } }, sel)
  const row = await ev(() => [...document.querySelectorAll('#c25ch .r1 .stp, #c25ch .r1 select, #c25ch .bwb')].filter((e) => e.offsetParent).map((e) => { const r = e.getBoundingClientRect(); return { k: e.id || e.className || e.tagName, top: Math.round(r.top), h: Math.round(r.height), b: Math.round(r.bottom) } }))
  const hs = [...new Set(row.map((x) => x.h))], tops = [...new Set(row.map((x) => x.top))]
  say(row.length >= 5 && Math.max(...hs) - Math.min(...hs) <= 1 && Math.max(...tops) - Math.min(...tops) <= 1, `${tag} 1 the arrows, the dropdown and WHERE? WHO? SORT THE SHOTS? are one height on one line`, row)
  await ev(() => window.__mix25.ball((b) => b.hr && b.park === 'SF')); await wait(1200); await ev(() => document.querySelector('#c25nk')?.click()); await wait(9000)
  const chip = (await box('#c25bug')) ?? (await box('#c25v')), tops2 = await box('#c25tops'), tbtn = await ev(() => [...document.querySelectorAll('#c25tops .bt')].map((e) => e.textContent))
  say(chip && tops2 && tops2.y >= chip.b && tops2.y - chip.b <= 16 && tops2.r <= vp.width && tbtn.join() === 'TWEAK THIS TATER,LANDING PARTY,SEAT SEANCE', `${tag} 2 TWEAK / LANDING PARTY / SEAT SEANCE sit just under the result card, top right`, { chip, tops2, tbtn })
  const words = await ev(() => [...document.querySelectorAll('#c25ch .stp')].map((e) => e.textContent))
  say(words.join() === '< NEWER,OLDER >', `${tag} 3 the arrows say NEWER and OLDER`, words)
  const hdr = await ev(() => ({ mu: !!document.querySelector('#c25mu svg'), order: [...document.querySelectorAll('.c25 .hdr .rt .bt')].filter((e) => e.offsetParent).map((e) => e.id), title: document.querySelector('#c25ti')?.textContent }))
  say(hdr.mu && hdr.order.indexOf('c25mu') >= 0 && hdr.order.indexOf('c25mu') < hdr.order.indexOf('c25sk') && !/NUKE NAVIGATOR/.test(hdr.title), `${tag} 4 a music note by GUESS and SKIP; the title is just the mode`, hdr)
  if (vp.width === 1600) {
    // SORT THE SHOTS: pairs and words; LONGEST: the arrows and dropdown follow it
    await ev(() => document.querySelector('#c25pp').click()); await wait(800)
    const sp = await ev(() => [...document.querySelectorAll('.ppsort .pps')].map((r) => [...r.querySelectorAll('.bt')].map((b) => b.querySelector('b').textContent + ' / ' + b.querySelector('i').textContent)))
    const pb = await box('.ppsort'), hb = await box('#c25hi')
    say(sp.length === 6 && sp.slice(0, 5).every((r) => r.length === 2) && /HIGHEST EXIT VELOCITY/.test(sp[2][0]) && pb && pb.y >= 0, `${tag} 5 SORT THE SHOTS: five pairs side by side with words under each, then RANDOM; on screen`, { sp, pb, hb })
    await ev(() => document.querySelector('[data-ps="far"]').click()); await wait(1200)
    const f = await ev(() => ({ words: [...document.querySelectorAll('#c25ch .stp')].map((e) => e.textContent), opts: [...document.querySelectorAll('#c25nt option')].slice(0, 3).map((o) => o.textContent), sel: document.querySelector('#c25nt')?.selectedOptions[0]?.textContent, ft: window.__mix25.cur()?.ft }))
    say(f.words.join() === '< LONGER,SHORTER >' && /^\d+-\d+ FT · \d+ HR$/.test(f.opts[0]) && f.sel?.startsWith(String(Math.floor(f.ft / 10) * 10)), `${tag} 6 sorted by distance: the arrows say LONGER / SHORTER and the dropdown lists 10 ft bands, the one shown picked`, f)
    await ev(() => { const s = document.querySelector('#c25nt'); s.selectedIndex = 3; s.dispatchEvent(new Event('change')) }); await wait(1200)
    const j = await ev(() => ({ sel: document.querySelector('#c25nt')?.selectedOptions[0]?.textContent, ft: window.__mix25.cur()?.ft }))
    say(j.sel && j.ft != null && j.sel.startsWith(String(Math.floor(j.ft / 10) * 10)), `${tag} 7 picking a band jumps to a ball in it`, j)
    if (!(await ev(() => !!document.querySelector('[data-ps="hard"]')))) { await ev(() => document.querySelector('#c25pp').click()); await wait(600) } await ev(() => document.querySelector('[data-ps="hard"]').click()); await wait(1200)
    const h = await ev(() => ({ words: [...document.querySelectorAll('#c25ch .stp')].map((e) => e.textContent), opt: document.querySelector('#c25nt option')?.textContent }))
    say(h.words.join() === '< HARDER,SOFTER >' && /^\d+ MPH · \d+ HR$/.test(h.opt), `${tag} 8 by exit speed: HARDER / SOFTER and 1 mph bands`, h)
    // the stamp: framed, no tilt, the batting team's color
    const st = await ev(() => { window.__mix25.ball((b) => b.hr && b.tb === 'Bot' && b.in >= 9 && (b.bsc ?? 0) - (b.fsc ?? 0) <= 0); return new Promise((r) => setTimeout(() => { const e = document.querySelector('#c25v .st'); e?.getAnimations?.().forEach((a) => a.finish()); r({ t: e?.textContent, svg: !!e?.querySelector('svg'), tf: e ? getComputedStyle(e).transform : null, c: e ? getComputedStyle(e).color : null, stc: e ? getComputedStyle(e).getPropertyValue('--stc') : null, shown: e ? getComputedStyle(e).display : null }) }, 1500)) })
    say(st.svg && (st.tf === 'none' || /matrix\(1, 0, 0, 1/.test(st.tf)) && /^#|rgb/.test(st.stc.trim()) && st.c !== 'rgb(3, 4, 3)', `${tag} 9 the moment plate: a pixel mark, no tilt, in a team color`, st)
    // the menu: one big line; nothing fires behind it
    await ev(() => document.querySelector('#c25mn').click()); await wait(800)
    const m = await ev(() => ({ hero: [...document.querySelectorAll('.c25 .sm .smi.hero')].map((e) => e.querySelector('b').textContent), f0: window.__mix25.fires() }))
    await wait(26000)
    const f1 = await ev(() => window.__mix25.fires())
    say(m.hero.length === 1 && /DÉJÀ-VU/.test(m.hero[0]) && f1 === m.f0, `${tag} 10 the menu: DINGER DÉJÀ-VU the only big line; nothing replays behind it (26 s idle)`, { m, f1 })
  }
  say(errs.length === 0, `${tag} 11 no page errors`, errs)
  await page.close()
}
await browser.close()
