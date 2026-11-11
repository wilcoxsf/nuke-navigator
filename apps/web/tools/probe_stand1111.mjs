// 11 Nov: the calling card's stickers (his 25, drawn, in his order) and the WITNESS STAND's songs: SONGS GUESSED and SONGS GUESSED BLIND boards and
// THE MAESTRO OF MCCOVEY COVE title, filled from the guessing jukebox. Usage: node tools/probe_stand1111.mjs [url]
import { chromium } from 'playwright-core'
import { readFileSync } from 'fs'
import { createHash } from 'crypto'
const URL0 = process.argv[2] || 'http://localhost:5195'
const full = JSON.parse(readFileSync('C:/Users/andrewwi/Documents/NukeNavigator/songbook/songs_full.json', 'utf8')).songs
const oid = (sid) => 'k' + createHash('sha256').update('nn-id|' + sid).digest('hex').slice(0, 10), T = (sid) => full.find((x) => x.id === sid).name
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const say = (ok, what, info) => console.log(`${ok ? 'OK ' : 'ODD'} ${what}${ok ? '' : '  ' + JSON.stringify(info).slice(0, 600)}`)
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } }), errs = []
page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)))
await page.route('**/api.open-meteo.com/**', (r) => r.abort())
await page.goto(URL0 + '/?mode=dojo&ui=K&cp=25&seed=7&ir=0&menu=0')
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25 && window.__mix25.jukebox.songs.length > 20, null, { timeout: 180000 })
await page.waitForTimeout(1500)
const ev = (f, a) => page.evaluate(f, a), wait = (ms) => page.waitForTimeout(ms)
await ev(() => { localStorage.setItem('nn-snd', '1'); window.__mix25.forget() })
// three songs guessed, one of them blind
for (const [sid, hint] of [['billiejean', 'b'], ['getlucky', null], ['starboy', 'y']]) { await ev((id) => window.__mix25.jukebox.play(id), oid(sid)); await wait(300); if (hint) await ev((k) => window.__mix25.hint(k), hint); await ev((t) => window.__mix25.guess(t), T(sid)); await wait(300) }
await wait(800)
const jk = await ev(() => JSON.parse(localStorage.getItem('nn-witness') === null ? 'null' : 'null') ?? null)
void jk
// the stand
await ev(() => document.querySelector('#c25mn').click()); await wait(700)
await ev(() => [...document.querySelectorAll('.c25 .sm .smi')].find((e) => /WITNESS/.test(e.textContent))?.click()); await wait(1500)
await ev(() => document.querySelector('[data-wt="stand"]')?.click()); await wait(900)
const st = await ev(() => ({ titles: [...document.querySelectorAll('.wts2 .wtr')].map((e) => e.innerText.replace(/\s+/g, ' ')), pics: [...document.querySelectorAll('.wts2 .wtr img.wti')].filter((i) => i.naturalWidth > 0).length, boards: [...document.querySelectorAll('.wbds [data-bd]')].map((e) => e.dataset.bd) }))
const maestro = st.titles.find((t) => /MAESTRO OF MCCOVEY COVE/.test(t))
say(!!maestro && /: 3 SONGS GUESSED$/.test(maestro) && st.titles.length === 5 && st.pics === 5 && st.titles.filter((t) => /UP FOR GRABS$/.test(t)).length === 4 && st.boards.includes('songs') && st.boards.includes('songsBlind'), '1 the stand: five title rows, each with its pixel picture; THE MAESTRO OF MCCOVEY COVE reads "YOU: 3 SONGS GUESSED"; the rest UP FOR GRABS; the two song boards', st)
const tips = await ev(() => [...document.querySelectorAll('[title]')].map((e) => (e.id || e.className) + '=' + e.getAttribute('title')).slice(0, 8))
say(tips.length === 0, '1b no hover text on anything (titles moved to aria-label)', tips)
await ev(() => document.querySelector('[data-bd="songs"]')?.click()); await wait(600)
const b1 = await ev(() => [...document.querySelectorAll('.wrk .wr')].map((e) => e.innerText.replace(/\s+/g, ' ')))
await ev(() => document.querySelector('[data-bd="songsBlind"]')?.click()); await wait(600)
const b2 = await ev(() => [...document.querySelectorAll('.wrk .wr')].map((e) => e.innerText.replace(/\s+/g, ' ')))
say(b1.length === 1 && / 3$/.test(b1[0]) && b2.length === 1 && / 1$/.test(b2[0]), '2 SONGS GUESSED shows 3 and SONGS GUESSED BLIND shows 1, with no games logged', { b1, b2 })
// the calling card's stickers
await ev(() => document.querySelector('[data-wt="mine"]')?.click()); await wait(700)
await ev(() => document.querySelector('#c25wcard')?.click()); await wait(1200)
const sk = await ev(() => { const t = [...document.querySelectorAll('.stk')]; return { n: t.length, names: t.map((x) => x.getAttribute('aria-label') ?? x.title), blank: t.filter((x) => { const c = x.querySelector('canvas'); if (!c) return true; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n < 8 }).map((x) => x.title) } })
const want = 'FLAME,SKULL,BOLT,BASEBALL,CROSSED BATS,BAT,MITT,SEA LION,KAYAK,NUKE,MONEY BAG,DUNGENESS,SEAGULL,HOT DOG,THE BIRD,JOINT,CABLE CAR,GOLDEN GATE,ATOM,BICYCLE,AK-47,POO,TRANSAMERICA,WAVE,BEER'
say(sk.n === 25 && sk.names.join() === want && sk.blank.length === 0, '3 the calling card picker has his 25 stickers, in his order, each one drawn', sk)
// pick the new ones onto the card: the selected layer becomes each one in turn (ADD makes a new layer; a pick swaps the selected one)
const added = await ev(async () => { const ids = { seagull: 'SEAGULL', finger: 'THE BIRD', joint: 'JOINT', bridge: 'GOLDEN GATE', atom: 'ATOM', ak: 'AK-47', beer: 'BEER' }, miss = []; for (const [id, nm] of Object.entries(ids)) { document.querySelector(`.stk[data-s="${id}"]`)?.click(); await new Promise((r) => setTimeout(r, 150)); const on = document.querySelector('.ly.on')?.innerText ?? ''; if (!on.includes(nm)) miss.push(id + ':' + on.slice(0, 30)) } return miss })
say(added.length === 0, '4 picking each new sticker puts it on the selected layer', added)
say(errs.length === 0, '5 no page errors', errs)
await browser.close()
