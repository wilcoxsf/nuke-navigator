// Lifecycle checks for Study 25 (6 Nov, from GPT's brutal red team): a landing moment from the last flight never touches the next ball, and the MOMENTS menu
// cancels what it scheduled when it is closed or a tab changes. No screenshots: state is read from the page.
// Usage: node tools/test_study25_life.mjs [base url]
import { chromium } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:5195'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
let fails = 0
const check = (name, ok, extra = '') => { if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : extra) }
const errs = []
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 })
page.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')))
await page.route('**/api.open-meteo.com/**', (r) => r.abort())
await page.goto(`${base}/?mode=dojo&ui=K&cp=25&seed=7&ir=0&menu=0`)
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 180000 })
await page.waitForTimeout(2000)
const until = async (fn, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn)) return true; await page.waitForTimeout(200) } return false }
const landed = () => until(() => !!(window.__cp.anim?.() && window.__cp.anim().exploded))

// ---- 1. a moment from the last flight never hides the next ball ----
{
  await page.evaluate(() => { window.__mix25.lab('MO', 10) }) // CLAW MACHINE (10 since 6 Nov, when three went): it hides the engine ball at its grab, 1.15 s in
  await page.evaluate(() => window.__mix25.ball((b) => b.hr && b.park === 'SF' && b.ft > 390 && b.ft < 430 && b.dir < -10))
  await page.keyboard.press('Space'); await landed()
  await page.waitForTimeout(150)
  await page.keyboard.press('Space') // a re-hit straight away, while the claw is still coming down
  let hidden = 0, samples = 0
  const t0 = Date.now()
  while (Date.now() - t0 < 4500) { const r = await page.evaluate(() => ({ fly: !!(window.__cp.anim?.() && !window.__cp.anim().exploded), vis: !!window.__cp.ballMesh?.()?.visible })); if (r.fly) { samples++; if (!r.vis) hidden++ } await page.waitForTimeout(150) }
  check('a re-hit while the last landing moment plays: the new ball is never hidden mid-flight', samples > 0 && hidden === 0, JSON.stringify({ samples, hidden }))
  await page.evaluate(() => window.__mix25.lab('MO', 1))
}
// ---- 2. the MOMENTS menu cancels what it scheduled ----
{
  await landed(); await page.waitForTimeout(800)
  const live = () => page.evaluate(() => window.__mix25.moments.shown())
  await page.click('#c25mm'); await page.waitForTimeout(300)
  await page.click('.mmenu .mi[data-mm="pinata"]'); await page.waitForTimeout(60)
  await page.click('.mmenu [data-mm="x"]'); await page.waitForTimeout(1200)
  check('MOMENTS: a moment picked and closed at once never plays', (await live()) === 0, JSON.stringify({ live: await live() }))
  await page.click('#c25mm'); await page.waitForTimeout(300)
  await page.click('.mmenu .mi[data-mm="all"]'); await page.waitForTimeout(900)
  await page.click('#c25tabs [data-tab="whatif"]'); await page.waitForTimeout(6500)
  check('MOMENTS: PLAY ALL stops when the tab changes (nothing still playing 6 s later)', (await live()) === 0, JSON.stringify({ live: await live() }))
}
// ---- 3. (7 Nov, red team 4.7) Escape closes MOMENTS and ends what it was playing, as the X does ----
{
  await page.click('#c25tabs [data-tab="replay"]').catch(() => {}); await page.waitForTimeout(800)
  if (!(await page.evaluate(() => document.querySelector('.mmenu')?.classList.contains('on')))) { await page.click('#c25mm'); await page.waitForTimeout(300) } // (the PLAY ALL check before may leave it open)
  await page.click('.mmenu .mi[data-mm="hand"]')
  await until(() => window.__mix25.moments.shown() > 0, 8000)
  const playing = await page.evaluate(() => window.__mix25.moments.shown())
  await page.keyboard.press('Escape'); await page.waitForTimeout(400)
  check('MOMENTS: Escape closes the menu and ends the moment playing', playing > 0 && (await page.evaluate(() => window.__mix25.moments.shown())) === 0, JSON.stringify({ playing }))
}
// ---- 4. (red team 4.1) MAKE YOUR CALLING CARD opens the editor when WALLOP WITNESS opened on YOUR GAMES by itself (a logged game), with no tab clicked first ----
{
  // (the same page, reloaded with a logged game: a second page starves on the software renderer)
  const p2 = page
  await p2.evaluate(() => { try { localStorage.setItem('nn-witness', JSON.stringify(['2025-07-04'])) } catch {} })
  await p2.reload()
  await p2.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 180000, polling: 500 })
  await p2.waitForTimeout(1500)
  await p2.click('#c25tabs [data-tab="witness"]')
  await p2.waitForFunction(() => !!document.querySelector('#c25wcard'), null, { timeout: 30000, polling: 250 }).catch(() => {})
  const onMine = await p2.evaluate(() => document.querySelector('[data-wt="mine"]')?.classList.contains('on'))
  await p2.click('#c25wcard'); await p2.waitForTimeout(800)
  const ed = await p2.evaluate(() => ({ editor: !!document.querySelector('.wcd canvas'), save: [...document.querySelectorAll('.wcd .bt')].some((b) => b.textContent === 'SAVE') }))
  check('WALLOP WITNESS: MAKE YOUR CALLING CARD opens the editor straight from YOUR GAMES (no tab clicked first)', onMine === true && ed.editor && ed.save, JSON.stringify({ onMine, ...ed }))
  await p2.evaluate(() => document.activeElement?.blur?.()); await p2.keyboard.press('5'); await p2.waitForTimeout(600)
  check('WALLOP WITNESS: a tab key with the calling card open (focus outside it) leaves the card being made', await p2.evaluate(() => !!document.querySelector('.wcd canvas')))
  await p2.click('#c25cl').catch(() => {}); await p2.waitForTimeout(500) // (close the window, so the tabs are free)
}
// ---- 4b. (9 Nov) THE WALL IT WENT OVER, the pole bell, the bat flip, the focus trap ----
{
  await page.evaluate(() => window.__mix25.ball((b) => b.hr && b.park === 'COL')); await page.waitForTimeout(1500)
  const aw = await page.evaluate(() => window.__mix25.awayWall())
  check('an away home run in DEJA-VU draws the wall of the park it was hit in, and where this flight crossed it, the clearance hidden until it is hit', aw && /Coors/.test(aw.venue) && aw.cross && aw.cross.wallFt > 320 && aw.cross.wallFt < 430 && aw.shown === false, JSON.stringify(aw))
  await page.evaluate(() => { window.__f0 = window.__mix25.fires() }); await page.click('#c25nk') // (the swing button: Space would press whatever button has the focus)
  await until(() => window.__mix25.fires() > window.__f0, 30000); await until(() => !!(window.__cp.anim?.() && window.__cp.anim().exploded), 30000); await page.waitForTimeout(800) // (the new swing's landing, not the last one's)
  check('after the swing, the clearance over that wall is up', (await page.evaluate(() => window.__mix25.awayWall()?.shown)) === true)
  const old = await page.evaluate(() => { const i = window.__mix25.ball((b) => b.hr && b.park === 'ATH' && String(b.d).startsWith('2024')); return i < 0 ? 'none' : window.__mix25.awayWall() }); await page.waitForTimeout(800)
  check('a 2024 Athletics home run gets the Coliseum, the wall that stood that season', old === 'none' || /Coliseum/.test(old?.venue ?? ''), JSON.stringify(old))
  const bal = await page.evaluate(() => { const i = window.__mix25.ball((b) => b.hr && b.park === 'BAL' && String(b.d).startsWith('2024')); return i < 0 ? 'none' : window.__mix25.awayWall() }); await page.waitForTimeout(800)
  check('a 2024 Orioles home run (the fence that moved) still draws Camden Yards and finds where it crossed', bal === 'none' || (/Camden/.test(bal?.venue ?? '') && bal.cross?.wallFt > 300), JSON.stringify(bal))
  await page.evaluate(() => window.__mix25.ball((b) => b.hr && b.park === 'SF')); await page.waitForTimeout(800)
  check('an Oracle home run has no away wall', (await page.evaluate(() => window.__mix25.awayWall())) === null)
  // (10 Nov) the clearance tag in words: a real Oracle ball says what happened, a what-if near the wall gives the odds
  const ww = await page.evaluate(() => { const M = window.__mix25; return { real: M.wallWords({ kind: 'WALL', short: 1 }), p0: M.pOut(0, 'SF'), pFar: M.pOut(-20, 'SF'), pCol: M.pOut(0, 'COL'), pAll: M.pOut(0, 'none'), lastWords: M.wallWords({ kind: 'GONE', clearBy: 30 }) } })
  check('a real Oracle home run the flight puts just short says it just went over, with no number', ww.real?.[0] === "JUST OVER ORACLE'S WALL" && ww.real?.[1] === null && /CLEARED ORACLE'S WALL BY/.test(ww.lastWords?.[0] ?? ''), JSON.stringify(ww))
  check('the wall odds: at Oracle a ball level with the top goes out about 8 in 10, 20 ft short almost never; Coors has its own odds (level is under 3 in 10), the pooled odds under half', ww.p0 > 0.75 && ww.p0 < 0.9 && ww.pFar < 0.01 && ww.pCol < 0.3 && ww.pAll > 0.3 && ww.pAll < 0.5, JSON.stringify(ww))
  await page.evaluate(() => window.__mix25.ball((b) => b.hr && b.park === 'COL')); await page.waitForTimeout(800)
  const wi = await page.evaluate(() => { const M = window.__mix25; return { near: M.wallWords({ kind: 'WALL', short: 2 }), over: M.wallWords({ kind: 'GONE', clearBy: 12 }), short: M.wallWords({ kind: 'WALL', short: 15 }) } })
  check('an away ball flown at Oracle is a what-if: 2 ft short gives the odds it still goes, well over or well short gives none', /SHORT OF THE TOP BY · \d IN 10 STILL GO/.test(wi.near?.[0] ?? '') && wi.near?.[1] === '2 FT' && wi.over?.[0] === "CLEARED ORACLE'S WALL BY" && wi.short?.[0] === 'SHORT OF THE TOP BY' && wi.short?.[1] === '15 FT', JSON.stringify(wi))
  const rg = await page.evaluate(() => { const P = window.__mix25.poles(); if (!P) return 'no poles'; const top = P.poles()[1].top; return { rang: P.ring(top), on: P.ringing() } })
  const quiet = await until(() => !window.__mix25.poles().ringing(), 15000) // (2.4 s of its own; it stops on a drawn frame)
  check('a ball off the pole rings it, and the ringing dies away', rg.rang === true && rg.on === true && quiet, JSON.stringify(rg))
  const bf = await page.evaluate(() => { const B = window.__mix25.batFlip(); return { f: B.flip(1, 0), on: B.flying() } })
  const gone = await until(() => !window.__mix25.batFlip().flying(), 15000) // (about 4.6 s of its own; headless Edge draws few frames)
  check('the bat flip goes up, lands and is gone again', bf.f && bf.on && gone, JSON.stringify(bf))
  await page.evaluate(() => window.__mix25.openMod('witness')); await page.waitForTimeout(1200)
  const n = await page.evaluate(() => window.__mix25.modFocusables())
  const inside = () => page.evaluate(() => !!document.activeElement?.closest('#c25m'))
  let out = 0
  for (let i = 0; i < n + 3; i++) { await page.keyboard.press('Tab'); if (!(await inside())) out++ }
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Shift+Tab'); if (!(await inside())) out++ }
  check('the focus trap: Tab and Shift+Tab go round the open window and never out of it', n > 2 && out === 0, JSON.stringify({ n, out }))
  await page.keyboard.press('Escape'); await page.waitForTimeout(600)
}
// ---- 4c. (9 Nov, later) THE SONGS: his picks, whole, loaded; a shuffled bag deals every one before any repeats ----
{
  const r = await page.evaluate(() => { const S = window.__mix25.jukebox.songs.map((x) => x.id), n = S.length, d = []; for (let i = 0; i < n * 3; i++) d.push(window.__mix25.nextSong()); const c = S.map((id) => d.filter((x) => x === id).length); return { n, min: Math.min(...c), max: Math.max(...c), twice: d.filter((x, i) => i && x === d[i - 1]).length, len: window.__mix25.jukebox.length('getlucky') } }) // (three bags' worth: the home runs before this may have started one)
  check('the songs are his picks, whole (54 with the walk-off song), dealt off a shuffled bag: every one before any comes a third time, never twice running', r.n >= 54 && r.min >= 2 && r.max <= 4 && r.twice === 0 && r.len > 120, JSON.stringify(r))
  // (10 Nov) the songs are the background music: one is always on once the page has had a click, the ambient bed (bay, gulls, ferry) is off, the Star Wars track is out
  const on = await until(() => !!window.__mix25.jukebox.playing(), 8000)
  const bg = await page.evaluate(() => ({ playing: window.__mix25.jukebox.playing(), bed: window.__nnSoundStats().amb, imperial: window.__mix25.jukebox.songs.some((x) => /imperial/i.test(x.id + x.name)) }))
  check('a song plays in the background (no home run needed), with no ambient bed, and no Imperial March in the shuffle', on && !!bg.playing && bg.bed === false && bg.imperial === false, JSON.stringify(bg))
  await page.evaluate(() => window.__mix25.jukebox.stop()); const next = await until(() => !!window.__mix25.jukebox.playing(), 8000)
  check('when a song ends the next one starts on its own', next, JSON.stringify(await page.evaluate(() => window.__mix25.jukebox.playing())))
  // (10 Nov, later) SKIP and JUKEBOX in the header
  const s0 = await page.evaluate(() => window.__mix25.jukebox.playing())
  await page.click('#c25sk'); await page.waitForTimeout(900)
  const s1 = await page.evaluate(() => window.__mix25.jukebox.playing())
  check('SKIP plays a different song straight away', !!s1 && s1 !== s0, JSON.stringify({ s0, s1 }))
  await page.click('#c25jk'); await page.waitForTimeout(900)
  const jk = await page.evaluate(() => { const rows = [...document.querySelectorAll('#c25mb [data-song]')]; return { n: rows.length, on: rows.find((r) => r.classList.contains('on'))?.dataset.song ?? null, pick: rows.find((r) => !r.classList.contains('on'))?.dataset.song } })
  await page.click(`#c25mb [data-song="${jk.pick}"]`); await page.waitForTimeout(900)
  const s2 = await page.evaluate(() => ({ playing: window.__mix25.jukebox.playing(), on: document.querySelector('#c25mb .jk.on')?.dataset.song ?? null }))
  check('JUKEBOX lists every song with the one playing marked, and a click plays that one', jk.n >= 60 && jk.on === s1 && s2.playing === jk.pick && s2.on === jk.pick, JSON.stringify({ jk, s2 }))
  await page.keyboard.press('Escape'); await page.waitForTimeout(600)
  // (10 Nov, later) the menu's gags: twelve, no mock game, and not one letter drawn in any frame of any of them
  const gg = await page.evaluate(() => {
    const M = window.__mix25.menu, c = document.querySelector('.c25 .sm canvas.ins2'), cx = c.getContext('2d'), ft = cx.fillText.bind(cx); let words = 0, blank = 0
    cx.fillText = (...a) => { words++; return ft(...a) }
    for (const k of M.scenes) for (const t of [0.5, 2, 3.5, 5, 7]) { M.scene(k, t); const d = cx.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 64) if (d[i]) n++; if (!n) blank++ }
    cx.fillText = ft
    return { n: M.scenes.length, inning: M.scenes.includes('inning'), words, blank, h: c.height, keys: M.scenes.join() }
  })
  check('the menu strip is the twelve gags (no mock game), taller, with no text drawn in any of them', gg.n === 12 && !gg.inning && gg.words === 0 && gg.blank === 0 && gg.h === 120, JSON.stringify(gg))
  // (10 Nov) WHERE? WHO? BOMB BINDER and the three under them sit under the histograms, not over the park
  await page.evaluate(() => window.__mix25.setMode('replay')); await page.waitForTimeout(1500)
  const cn = await page.evaluate(() => { const bw = document.querySelector('#c25ch .bw').getBoundingClientRect(), hi = document.querySelector('#c25hi').getBoundingClientRect(), pk = document.querySelector('#c25h').getBoundingClientRect(); return { fit: window.__mix25.cornerFit(), inside: bw.left >= hi.left - 1 && bw.right <= hi.right + 1 && bw.bottom <= hi.bottom + 1, offPark: bw.left >= pk.right - 1, n: document.querySelectorAll('#c25ch .bw .bt.bwb').length } })
  check('the corner buttons sit in the space under the histograms, off the park', cn.fit === true && cn.inside && cn.offPark && cn.n >= 6, JSON.stringify(cn))
}
// ---- 4d. (9 Nov) BAD LUCK (the mirror and the ladder) plays from the MOMENTS menu; THE ROLL-UP is on the board ----
{
  if (!(await page.evaluate(() => document.querySelector('.mmenu')?.classList.contains('on')))) { await page.click('#c25mm'); await page.waitForTimeout(300) }
  await page.click('.mmenu .mi[data-mm="mirror"]'); await page.waitForTimeout(900)
  const mr = await page.evaluate(() => ({ last: window.__mix25.moments.log().slice(-1)[0], up: window.__mix25.moments.shown() }))
  check('BAD LUCK: the mirror and the ladder go up from the MOMENTS menu', mr.last === 'mirror' && mr.up >= 2, JSON.stringify(mr))
  await page.click('.mmenu [data-mm="x"]').catch(() => {}); await page.waitForTimeout(600)
  const ru = await page.evaluate(() => { const L = window.__mix25.life; const d = L.dur('rollup'); return { has: L.names().includes('rollup'), lit: [0.15, 0.5, 0.85].map((f) => L.peek('rollup', d * f, {}).lit) } })
  check('THE ROLL-UP is one of the board gags and draws all the way through', ru.has && ru.lit.every((v) => v >= 12), JSON.stringify(ru))
}
// ---- 5. (red team 4.3) ALL / AT ORACLE / AWAY: the landing puffs and rings go when they finish; nothing piles up in the map ----
{
  await page.click('#c25tabs [data-tab="blast"]')
  await page.waitForFunction(() => !!document.querySelector('#c25hmw'), null, { timeout: 120000, polling: 500 })
  await page.waitForTimeout(800); await page.click('#c25hmw'); await page.waitForTimeout(400); await page.keyboard.type('FLORES', { delay: 30 }); await page.keyboard.press('Enter')
  await until(() => (window.__mix25.heat()?.bombCounts?.()?.all ?? 0) > 0, 240000)
  await page.waitForTimeout(12000)
  const kids = () => page.evaluate(() => window.__nn.scene.children.find((x) => x.userData?.drops?.length)?.children.length ?? -1)
  const k0 = await kids()
  for (const w of ['home', 'away', 'all', 'home', 'all']) { await page.click(`[data-ha="${w}"]`).catch(() => {}); await page.waitForTimeout(9000) }
  const k1 = await kids()
  check('BLAST RADIUS: switching ALL / AT ORACLE / AWAY five times leaves no pile of landing effects in the map', k0 > 0 && k1 <= k0 + 2, JSON.stringify({ k0, k1 }))
}
check('no page errors', errs.length === 0, errs.slice(0, 3).join(' || '))
await browser.close()
console.log(fails ? `${fails} FAILED` : 'ALL PASS')
process.exit(fails ? 1 : 0)
