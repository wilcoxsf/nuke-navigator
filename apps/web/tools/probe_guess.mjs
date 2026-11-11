// the guessing jukebox (11 Nov): every song numbered, played from the list to guess it; wrong guesses counted; the two hints; right guesses written loosely; a
// guessed song as a table row (song, artist, year, how it was guessed); names nowhere until guessed; GUESS in the header; kept over a reload; a phone. Reads the
// real titles from the private songbook (Documents/NukeNavigator/songbook/songs_full.json) to know what to type. Usage: node tools/probe_guess.mjs [url]
import { chromium } from 'playwright-core'
import { readFileSync } from 'fs'
import { createHash } from 'crypto'
const URL0 = process.argv[2] || 'http://localhost:5195'
const full = JSON.parse(readFileSync('C:/Users/andrewwi/Documents/NukeNavigator/songbook/songs_full.json', 'utf8')).songs
const oid = (sid) => 'k' + createHash('sha256').update('nn-id|' + sid).digest('hex').slice(0, 10)
const T = (sid) => full.find((x) => x.id === sid).name
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const say = (ok, what, info) => console.log(`${ok ? 'OK ' : 'ODD'} ${what}${ok ? '' : '  ' + JSON.stringify(info).slice(0, 600)}`)
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
const rowOf = (sid) => ev((id) => { const r = document.querySelector(`#c25mb [data-song="${id}"]`); if (!r) return null; const t = (s) => r.querySelector(s)?.textContent ?? null, c = (s) => r.querySelector(s)?.className ?? null; return { no: t('.jkno'), song: t('.jksn'), artist: t('.jkar'), year: t('.jkyr'), how: t('.jkhow'), songC: c('.jksn'), yearC: c('.jkyr'), howHint: !!r.querySelector('.jkhow .jkhn'), locked: r.classList.contains('jklk') } }, oid(sid))
// 0. the file has no titles, artists or telling ids in it; the walk-off song is sealed too
const leak = await ev(async () => { const t = await (await fetch('/songs_private.json')).text(); return ['BILLIE JEAN', 'GET LUCKY', 'MICHAEL JACKSON', 'SAN FRANCISCO', 'TONY BENNETT', 'billiejean', '"sf"', 'THANG'].filter((w) => t.includes(w)) })
say(leak.length === 0, '0 the song file has no titles, artists or telling ids, the walk-off song included; G Thang is gone', leak)
await openJk(); await play('billiejean')
const a = await ev(() => ({ rows: document.querySelectorAll('#c25mb [data-song]').length, songs: window.__mix25.jukebox.songs.length, named: [...document.querySelectorAll('#c25mb [data-song] .jksn')].filter((e) => e.textContent !== '? ? ?').length, nos: [...document.querySelectorAll('#c25mb [data-song] .jkno')].map((e) => e.textContent).slice(0, 3), head: document.querySelector('#jkh')?.textContent, th: document.querySelector('#c25mb .jkth')?.innerText.replace(/\s+/g, ' '), now: document.querySelector('#jkn .jkt b')?.textContent, box: !!document.querySelector('#jkgi'), all: document.querySelector('#c25mb').innerText }))
say(a.rows === a.songs && a.rows >= 69 && a.named === 0 && a.nos.join() === '01,02,03' && /0 OF \d+ GUESSED/.test(a.head) && /# SONG ARTIST YEAR GUESSED/.test(a.th) && a.box && /\? \? \?/.test(a.now) && !/BILLIE JEAN|SAN FRANCISCO/i.test(a.all), '1 a fresh jukebox: every song numbered 01 on, none named, a SONG / ARTIST / YEAR / GUESSED table head, ? ? ? playing with a guess box', a)
await page.fill('#jkgi', 'thriller'); await page.press('#jkgi', 'Enter'); await wait(700)
const b = await ev(() => ({ g: window.__mix25.mine().g, txt: document.querySelector('#jkn').innerText }))
say(Object.values(b.g)[0] === 1 && /NOPE/.test(b.txt) && /1 GUESS\b/.test(b.txt), '2 a wrong guess is counted (1 GUESS) and says NOPE', b)
await page.click('#jkhb'); await wait(500)
const c = await ev(() => document.querySelector('#jkhb')?.textContent)
say(c === '______ ____', '3 HINT: THE BLANKS shows ______ ____', c)
await page.fill('#jkgi', 'billie-jean!'); await page.press('#jkgi', 'Enter'); await wait(900)
const d = await rowOf('billiejean'), dg = await ev(() => ({ got: document.querySelector('#jkn').innerText, head: document.querySelector('#jkh').textContent }))
say(d && d.song === 'BILLIE JEAN' && d.artist === 'MICHAEL JACKSON' && /^\d{4}$/.test(d.year) && d.how === '2 GUESSES, BLANKS HINT' && /jkhn/.test(d.songC) && !/jkhn/.test(d.yearC) && d.howHint && !d.locked && /GOT IT IN 2, WITH A HINT/.test(dg.got) && /1 OF \d+ GUESSED \(0 BLIND, 1 WITH A HINT\)/.test(dg.head), '4 "billie-jean!" fills its row: BILLIE JEAN | MICHAEL JACKSON | year | 2 GUESSES, BLANKS HINT (title in the hint colour, year not)', { d, dg })
// 5. a locked song plays from its row, then gets guessed: year hint, "the getlucky", first time
await ev((id) => document.querySelector(`#c25mb [data-song="${id}"] b`).click(), oid('getlucky')); await wait(1200)
const pl = await ev(() => window.__mix25.jukebox.playing())
await page.click('#jkhy'); await wait(400)
await page.fill('#jkgi', 'the getlucky'); await page.press('#jkgi', 'Enter'); await wait(900)
const e = await rowOf('getlucky')
say(pl === oid('getlucky') && e.song === 'GET LUCKY' && e.artist === 'DAFT PUNK' && e.how === '1ST GUESS, YEAR HINT' && /jkhn/.test(e.yearC) && !/jkhn/.test(e.songC), '5 click a ? ? ? row and it plays; YEAR hint then "the getlucky": GET LUCKY | DAFT PUNK | year (hint colour) | 1ST GUESS, YEAR HINT', { pl, e })
// 6. the walk-off song is guessable, blind
await play('sf_none').catch(() => {})
const sfId = await ev(() => window.__mix25.jukebox.songs.find((x) => x.no === 1)?.id)
await ev((id) => window.__mix25.jukebox.play(id), sfId); await wait(1200)
await page.fill('#jkgi', 'I left my heart in San Francisco'); await page.press('#jkgi', 'Enter'); await wait(900)
const f = await ev((id) => ({ song: document.querySelector(`#c25mb [data-song="${id}"] .jksn`)?.textContent, artist: document.querySelector(`#c25mb [data-song="${id}"] .jkar`)?.textContent, how: document.querySelector(`#c25mb [data-song="${id}"] .jkhow`)?.textContent, head: document.querySelector('#jkh').textContent }), sfId)
say(f.song === 'I LEFT MY HEART IN SAN FRANCISCO' && f.artist === 'TONY BENNETT' && f.how === 'BLIND, 1ST GUESS' && /3 OF \d+ GUESSED \(1 BLIND, 2 WITH A HINT\)/.test(f.head), '6 song 01, the walk-off song, is guessed like the rest: I LEFT MY HEART IN SAN FRANCISCO | TONY BENNETT | BLIND, 1ST GUESS', f)
// 7. search: only what you have, by title or artist
await page.fill('#jks', 'jackson'); await wait(400)
const g = await ev(() => [...document.querySelectorAll('#c25mb [data-song] .jksn')].map((r) => r.textContent))
await page.fill('#jks', 'hound'); await wait(400)
const g2 = await ev(() => ({ n: document.querySelectorAll('#c25mb [data-song]').length, t: document.querySelector('#jkl').innerText }))
say(g.length === 1 && g[0] === 'BILLIE JEAN' && g2.n === 0 && /NOTHING YOU HAVE GUESSED/.test(g2.t), '7 search covers what you have, by title or artist (jackson: BILLIE JEAN; hound: not yet)', { g, g2 })
await page.fill('#jks', ''); await wait(300)
// 8. GUESS in the header: closes nothing else, opens the jukebox with the cursor in the guess box
await page.keyboard.press('Escape'); await wait(600); await play('hounddog')
await page.click('#c25gs'); await wait(900)
const gs = await ev(() => ({ open: document.querySelector('#c25m')?.classList.contains('open'), t: document.querySelector('#c25mt')?.textContent, focus: document.activeElement?.id }))
say(gs.open && /J U K E B O X/.test(gs.t) && gs.focus === 'jkgi', '8 GUESS, top right by SKIP, opens the jukebox with the cursor in the guess box', gs)
// 9. kept over a reload; SKIP does not name a locked song
await boot(); await openJk()
const h = await ev(() => ({ head: document.querySelector('#jkh').textContent }))
await play('hounddog')
const tip = await ev(() => document.querySelector('#c25sk')?.title)
say(/3 OF \d+/.test(h.head) && !/HOUND/i.test(tip), '9 your jukebox is still there after a reload; SKIP does not name the locked song playing', { h, tip })
// 10. the table fits: no cell runs out of its row
const fit = await ev(() => { const rows = [...document.querySelectorAll('#c25mb .r.jk')].slice(0, 8); return rows.map((r) => { const R = r.getBoundingClientRect(); return [...r.querySelectorAll('.jkno,.jksn,.jkar,.jkyr,.jkhow,b,.bt')].filter((x) => { const b = x.getBoundingClientRect(); return b.width > 0 && (b.right > R.right + 1 || b.left < R.left - 1) }).length }).reduce((a, x) => a + x, 0) })
say(fit === 0, '10 on a desktop every cell sits inside its row', fit)
say(errs.length === 0, '11 no page errors', errs)
// phone (the desktop page closed first: two copies of the app at once is too much memory on this machine)
await ctx.close()
const pctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }), pp = await pctx.newPage(), perrs = []
pp.on('pageerror', (er) => perrs.push(er.message.slice(0, 200)))
await pp.route('**/api.open-meteo.com/**', (r) => r.abort())
await pp.goto(URL0 + '/?mode=dojo&ui=K&cp=25&seed=7&ir=0&menu=0'); await pp.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25 && window.__mix25.jukebox.songs.length > 20, null, { timeout: 180000 }); await pp.waitForTimeout(1500)
const hd = await pp.evaluate(() => { const h = document.querySelector('.c25 .hdr').getBoundingClientRect(), r = [...document.querySelectorAll('.c25 .hdr .bt')].filter((e) => e.offsetParent).map((e) => ({ id: e.id, b: e.getBoundingClientRect() })); return { over: r.filter((a) => a.b.right > h.right + 1).map((a) => a.id), overlap: r.some((a, i) => r.some((b, j) => j > i && a.b.left < b.b.right && b.b.left < a.b.right && a.b.top < b.b.bottom && b.b.top < a.b.bottom)), gs: !!r.find((x) => x.id === 'c25gs') } })
say(hd.gs && hd.over.length === 0 && !hd.overlap, '12 on a phone the header has GUESS by SKIP, nothing overlapping or off the edge', hd)
await pp.tap('#c25gs'); await pp.waitForTimeout(1500)
const ph = await pp.evaluate(() => { const r = (s) => document.querySelector(s)?.getBoundingClientRect(); const box = r('#c25mb'), els = ['#jkgi', '#jkgo', '#jkhb', '#jkhy'].map((s) => ({ s, b: r(s) })); const row = document.querySelector('#c25mb [data-song]'), R = row.getBoundingClientRect(), cells = [...row.querySelectorAll('.jkno,.jksn,.jkhow,b,.bt')].filter((x) => { const b = x.getBoundingClientRect(); return b.right > R.right + 1 }).length; return { sideways: document.scrollingElement.scrollWidth > innerWidth + 1, out: els.filter((x) => !x.b || x.b.right > box.right + 1 || x.b.left < box.left - 1 || x.b.width < 20).map((x) => x.s), tap: els.map((x) => Math.round(x.b?.height ?? 0)), cells } })
say(!ph.sideways && ph.out.length === 0 && ph.tap.every((hh) => hh >= 24) && ph.cells === 0, '13 on a phone GUESS opens the jukebox; the guess box, both hints and a table row fit', ph)
say(perrs.length === 0, '14 no page errors on the phone', perrs)
await browser.close()
