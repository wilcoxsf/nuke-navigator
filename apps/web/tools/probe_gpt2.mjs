// GPT red team round 2 (11 Nov), the jukebox races: a double Enter is one guess; a new song does not keep the last one's NOPE and typing; two tabs each
// guessing a song keep both. Usage: node tools/probe_gpt2.mjs [url]
import { chromium } from 'playwright-core'
import { readFileSync } from 'fs'
import { createHash } from 'crypto'
const URL0 = process.argv[2] || 'http://localhost:5195'
const full = JSON.parse(readFileSync('C:/Users/andrewwi/Documents/NukeNavigator/songbook/songs_full.json', 'utf8')).songs
const oid = (sid) => 'k' + createHash('sha256').update('nn-id|' + sid).digest('hex').slice(0, 10), T = (sid) => full.find((x) => x.id === sid).name
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const say = (ok, what, info) => console.log(`${ok ? 'OK ' : 'ODD'} ${what}${ok ? '' : '  ' + JSON.stringify(info).slice(0, 500)}`)
const ctx = await browser.newContext({ viewport: { width: 1400, height: 860 } }), errs = []
const open = async () => { const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message.slice(0, 200))); await p.route('**/api.open-meteo.com/**', (r) => r.abort()); await p.goto(URL0 + '/?mode=dojo&ui=K&cp=25&seed=7&ir=0&menu=0'); await p.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25 && window.__mix25.jukebox.songs.length > 20, null, { timeout: 180000 }); await p.waitForTimeout(1200); return p }
const a = await open()
await a.evaluate(() => { localStorage.setItem('nn-snd', '1'); window.__mix25.forget() })
await a.evaluate(() => document.querySelector('#c25gs').click()); await a.waitForTimeout(900)
// 1. double Enter on the right title: one guess
await a.evaluate((id) => window.__mix25.jukebox.play(id), oid('billiejean')); await a.waitForTimeout(1000)
await a.fill('#jkgi', T('billiejean')); await a.evaluate(() => { const i = document.querySelector('#jkgi'); for (let k = 0; k < 2; k++) i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) }); await a.waitForTimeout(1200)
const u1 = await a.evaluate((id) => window.__mix25.mine().u[id], oid('billiejean'))
say(u1?.n === 1, '1 a double Enter on the right title counts as one guess (1ST GUESS)', u1)
// 2. a wrong guess on one song, then PLAY another from its row: no NOPE, no leftover typing
await a.evaluate((id) => window.__mix25.jukebox.play(id), oid('getlucky')); await a.waitForTimeout(1000)
await a.fill('#jkgi', 'nope nope'); await a.press('#jkgi', 'Enter'); await a.waitForTimeout(700)
await a.evaluate((id) => document.querySelector(`#c25mb [data-song="${id}"] b`).click(), oid('starboy')); await a.waitForTimeout(1000)
const st = await a.evaluate(() => ({ txt: document.querySelector('#jkn').innerText, val: document.querySelector('#jkgi')?.value }))
say(!/NOPE/.test(st.txt) && st.val === '' && /NO GUESSES YET/.test(st.txt), '2 a new song from the list starts clean: no NOPE, no typing, NO GUESSES YET', st)
// 3. two tabs: each guesses a different song; both stay
const b = await open()
await b.evaluate((id) => window.__mix25.jukebox.play(id), oid('hounddog')); await b.waitForTimeout(800); const rb = await b.evaluate((t) => window.__mix25.guess(t), T('hounddog'))
await a.evaluate((id) => window.__mix25.jukebox.play(id), oid('roxanne')); await a.waitForTimeout(800); const ra = await a.evaluate((t) => window.__mix25.guess(t), T('roxanne'))
await a.waitForTimeout(600)
const kept = await a.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('nn-jk-1')).u))
const want = [oid('billiejean'), oid('hounddog'), oid('roxanne')]
say(rb && ra && want.every((id) => kept.includes(id)), '3 two tabs each guessing a song: the saved jukebox has both (and the first one)', { rb, ra, kept })
const inA = await a.evaluate((id) => !!window.__mix25.mine().u[id], oid('hounddog'))
say(inA, '4 the other tab\'s guess shows up in this tab too', inA)
say(errs.length === 0, '5 no page errors', errs)
await browser.close()
