// the guessing jukebox (11 Nov): wrong guesses counted, the two hints, right guesses written loosely, only guessed songs listed, names nowhere until guessed,
// kept over a reload, and a phone. Reads the real titles from the private songbook (Documents/NukeNavigator/songbook/songs_full.json) to know what to type.
// Usage: node tools/probe_guess.mjs http://localhost:5195
import { chromium } from 'playwright-core'
import { readFileSync } from 'fs'
import { createHash } from 'crypto'
const URL0 = process.argv[2] || 'http://localhost:5195'
const full = JSON.parse(readFileSync('C:/Users/andrewwi/Documents/NukeNavigator/songbook/songs_full.json', 'utf8')).songs
const oid = (sid) => 'k' + createHash('sha256').update('nn-id|' + sid).digest('hex').slice(0, 10)
const T = (sid) => full.find((x) => x.id === sid).name
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const say = (ok, what, info) => console.log(`${ok ? 'OK ' : 'ODD'} ${what}${ok ? '' : '  ' + JSON.stringify(info).slice(0, 500)}`)
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } })
const page = await ctx.newPage(), errs = []
page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)))
await page.route('**/api.open-meteo.com/**', (r) => r.abort())
const boot = async () => { await page.goto(URL0 + '/?mode=dojo&ui=K&cp=25&seed=7&ir=0&menu=0'); await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25 && window.__mix25.jukebox.songs.length > 20, null, { timeout: 180000 }); await page.waitForTimeout(1500) }
const ev = (f, a) => page.evaluate(f, a), wait = (ms) => page.waitForTimeout(ms)
await boot()
await ev(() => { localStorage.setItem('nn-snd', '1'); window.__mix25.forget() })
const openJk = async () => { await ev(() => document.querySelector('#c25mn').click()); await wait(800); await ev(() => [...document.querySelectorAll('.c25 .sm .smi')].find((e) => /JUKEBOX/.test(e.textContent))?.click()); await wait(1200) }
const play = async (sid) => { await ev((id) => window.__mix25.jukebox.play(id), oid(sid)); await wait(1200) }
// 0. the file has no titles in it
const leak = await ev(async () => { const t = await (await fetch('/songs_private.json')).text(); return ['BILLIE JEAN', 'GET LUCKY', 'STARBOY', 'billiejean'].filter((w) => t.includes(w)) })
say(leak.length === 0, '0 the song file the browser gets has no titles or telling ids in it', leak)
await openJk(); await play('billiejean')
const a = await ev(() => ({ rows: document.querySelectorAll('#c25mb [data-song]').length, head: document.querySelector('#jkh')?.textContent, now: document.querySelector('#jkn .jkt b')?.textContent, box: !!document.querySelector('#jkgi'), all: document.querySelector('#c25mb').innerText }))
say(a.box && /\? \? \?/.test(a.now) && /0 OF \d+ GUESSED/.test(a.head) && a.rows <= 1 && !/BILLIE JEAN/i.test(a.all), '1 a fresh jukebox: ? ? ? playing, a guess box, nothing listed but the walk-off song, the title nowhere on screen', a)
// 2. a wrong guess is counted and says NOPE
await page.fill('#jkgi', 'thriller'); await page.press('#jkgi', 'Enter'); await wait(700)
const b = await ev(() => ({ g: window.__mix25.mine().g, txt: document.querySelector('#jkn').innerText }))
say(Object.values(b.g)[0] === 1 && /NOPE/.test(b.txt) && /1 GUESS\b/.test(b.txt), '2 a wrong guess is counted (1 GUESS) and says NOPE', b)
// 3. the blanks hint
await page.click('#jkhb'); await wait(500)
const c = await ev(() => ({ hb: document.querySelector('#jkhb')?.textContent, h: window.__mix25.mine().h }))
say(c.hb === '______ ____' && Object.values(c.h)[0]?.b === true, '3 HINT: THE BLANKS shows ______ ____', c)
// 4. the right guess, written loosely, unlocks it: listed, in the hint colour, the year not hinted
await page.fill('#jkgi', 'billie-jean!'); await page.press('#jkgi', 'Enter'); await wait(900)
const d = await ev(() => ({ u: Object.values(window.__mix25.mine().u)[0], rows: [...document.querySelectorAll('#c25mb [data-song]')].map((r) => r.innerText.split('\n')[0]), hn: !!document.querySelector('#c25mb [data-song] .jkhn'), yr: document.querySelector('#c25mb [data-song] .jky')?.className, got: document.querySelector('#jkn').innerText, head: document.querySelector('#jkh').textContent }))
say(d.u?.name === 'BILLIE JEAN' && d.u.n === 2 && d.u.hb && !d.u.hy && d.hn && d.yr === 'jky' && /GOT IT IN 2, WITH A HINT/.test(d.got) && /1 OF \d+ GUESSED \(0 BLIND, 1 WITH A HINT\)/.test(d.head), '4 "billie-jean!" unlocks BILLIE JEAN in 2 guesses: listed, title in the hint colour, year not', d)
// 5. a blind one, no spaces and a THE in front: the year hint alone colours only the year
await play('getlucky'); await page.click('#jkhy'); await wait(400)
const yr = await ev(() => document.querySelector('#jkhy')?.textContent)
await page.fill('#jkgi', 'the getlucky'); await page.press('#jkgi', 'Enter'); await wait(900)
const e = await ev(() => ({ u: window.__mix25.mine().u, row: [...document.querySelectorAll('#c25mb [data-song]')].map((r) => ({ t: r.innerText.split('\n')[0], hn: [...r.querySelectorAll('.jkhn')].map((x) => x.className) })) }))
const gl = Object.values(e.u).find((x) => x.name === 'GET LUCKY')
say(/^\d{4}$/.test(yr) && gl && gl.n === 1 && gl.hy && !gl.hb && e.row.some((r) => /GET LUCKY/.test(r.t) && r.hn.length === 1 && /jky/.test(r.hn[0])), '5 HINT: THE YEAR, then "the getlucky" first time: only the year in the hint colour', { yr, e })
await play('starboy'); await page.fill('#jkgi', T('starboy')); await page.press('#jkgi', 'Enter'); await wait(900)
const f = await ev(() => document.querySelector('#jkh').textContent)
say(/3 OF \d+ GUESSED \(1 BLIND, 2 WITH A HINT\)/.test(f), '6 a straight blind guess counts as blind', f)
// 7. only guessed songs can be searched and played; the queue shows names you have
await page.fill('#jks', 'jean'); await wait(400)
const g = await ev(() => [...document.querySelectorAll('#c25mb [data-song]')].map((r) => r.innerText.split('\n')[0]))
await page.fill('#jks', 'hound'); await wait(400)
const g2 = await ev(() => ({ n: document.querySelectorAll('#c25mb [data-song]').length, t: document.querySelector('#jkl').innerText }))
say(g.length === 1 && /BILLIE JEAN/.test(g[0]) && g2.n === 0 && /NOTHING YOU HAVE GUESSED/.test(g2.t), '7 search finds only what you have guessed (jean: yes; hound: not yet)', { g, g2 })
await page.fill('#jks', ''); await wait(300)
// 8. kept over a reload
await boot(); await openJk()
const h = await ev(() => ({ head: document.querySelector('#jkh').textContent, rows: [...document.querySelectorAll('#c25mb [data-song]')].map((r) => r.innerText.split('\n')[0]) }))
say(/3 OF/.test(h.head) && h.rows.some((r) => /STARBOY/.test(r)), '8 the jukebox you built is still there after a reload', h)
// 9. a song you have plays from the list; SKIP's tooltip never names a locked song
await page.click('#c25mb [data-song] b'); await wait(1000)
const pl = await ev(() => window.__mix25.jukebox.playing())
await play('hounddog')
const tip = await ev(() => document.querySelector('#c25sk')?.title)
say(!!pl && !/HOUND/i.test(tip), '9 a guessed song plays from the list; SKIP does not name the locked one playing', { pl, tip })
say(errs.length === 0, '10 no page errors', errs)
// phone
const pctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }), pp = await pctx.newPage(), perrs = []
pp.on('pageerror', (e) => perrs.push(e.message.slice(0, 200)))
await pp.route('**/api.open-meteo.com/**', (r) => r.abort())
await pp.goto(URL0 + '/?mode=dojo&ui=K&cp=25&seed=7&ir=0&menu=0'); await pp.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25 && window.__mix25.jukebox.songs.length > 20, null, { timeout: 180000 }); await pp.waitForTimeout(1500)
await pp.tap('#c25mn'); await pp.waitForTimeout(700); await pp.tap('.c25 .sm .smi:nth-child(6)'); await pp.waitForTimeout(1200)
await pp.evaluate((id) => window.__mix25.jukebox.play(id), oid('roxanne')); await pp.waitForTimeout(1200)
const ph = await pp.evaluate(() => { const r = (s) => document.querySelector(s)?.getBoundingClientRect(); const box = r('#c25mb'), els = ['#jkgi', '#jkgo', '#jkhb', '#jkhy'].map((s) => ({ s, b: r(s) })); return { sideways: document.scrollingElement.scrollWidth > innerWidth + 1, out: els.filter((x) => !x.b || x.b.right > box.right + 1 || x.b.left < box.left - 1 || x.b.width < 20).map((x) => x.s), tap: els.map((x) => Math.round(x.b?.height ?? 0)) } })
say(!ph.sideways && ph.out.length === 0 && ph.tap.every((hh) => hh >= 24), '11 on a phone the guess box and both hints fit, tall enough to tap', ph)
say(perrs.length === 0, '12 no page errors on the phone', perrs)
await browser.close()
