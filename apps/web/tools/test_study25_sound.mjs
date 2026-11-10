// Study 25 sound pass test (sound25.js, sfx25.js). Nothing is listened to: every sound is logged (window.__nnSoundLog) and recipes are rendered offline
// (window.__nnSoundRender) to check they make a sound of sane loudness and length. Checks: nothing plays before the first gesture; the bed starts after it;
// every name the board gags, the happenings and the wind will call resolves to a recipe and plays without an error; unknown names fall back without throwing;
// a swing logs the crack, the whoosh, the landing and the crowd in that order; S mutes everything (no new audio nodes, the master at zero, the bed stopped);
// the mixer levels survive a reload; 777 plays the Seventh Inning Stretch.
// Usage: node tools/test_study25_sound.mjs [base url]
import { chromium } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:5174'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
let fails = 0
const check = (name, ok, extra = '') => { if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : extra) }
const errs = []
const ctx = await browser.newContext({ viewport: { width: 1440, height: 820 } })
const page = await ctx.newPage()
page.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')))
await page.route('**/api.open-meteo.com/**', (r) => r.abort())
const load = async () => {
  await page.goto(`${base}/?mode=dojo&ui=K&cp=25&seed=7&menu=0&ir=0`)
  await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25 && window.__nnSound, null, { timeout: 180000 })
  await page.waitForTimeout(1500)
}
await page.addInitScript(() => { if (!sessionStorage.getItem('snd-test')) { sessionStorage.setItem('snd-test', '1'); localStorage.removeItem('nn-snd'); localStorage.removeItem('nn-snd-mix') } })
await load()

// ---- before any gesture: nothing plays ----
{
  const r = await page.evaluate(() => { const s0 = window.__nnSoundStats(); window.__nnSound('anvil'); const last = window.__nnSoundLog.at(-1); return { s0, last } })
  check('nothing before the first gesture', !r.s0.gestured && r.s0.state === 'none' && r.last?.skipped, JSON.stringify(r))
}
await page.keyboard.press('Shift')
await page.waitForTimeout(400)
{
  const s = await page.evaluate(() => window.__nnSoundStats())
  check('the first key unlocks it: context running, and no ambient bed (10 Nov: the songs are the background)', s.gestured && s.state === 'running' && !s.amb, JSON.stringify(s))
}

// ---- every name the other pieces call ----
const GAGS = ['anvil', 'dynamite', 'bonk', 'runover', 'sealsnack', 'leave', 'bipped', 'catapult', 'piano', 'guillotine', 'chipper', 'alcatraz', 'tshirt', 'steamroller', 'birds', 'quake', 'kisscam']
const BEATS = ['drop', 'hit', 'land', 'fire', 'smash', 'grind', 'scream', 'dies', 'swarm', 'peck', 'eaten', 'rumble', 'crack', 'swallow', 'cut', 'fuse', 'boom', 'splat', 'flatten', 'hang', 'roll', 'lock', 'toss', 'gulp', 'alarm', 'stuck', 'honk', 'shove', 'boo', 'kiss', 'drip', 'rise', 'fling']
const NAMED = ['gag-anvil-drop', 'gag-anvil-hit', 'gag-piano-drop', 'gag-piano-land', 'gag-chipper-grind', 'gag-guillotine-drop', 'gag-cannon-fire', 'gag-bipped-smash', 'gag-birds-swarm', 'gag-quake-rumble',
  'happen-seal-bark', 'happen-seal-bob', 'happen-mole-peek', 'happen-serpent-rise', 'happen-startup-founded', 'happen-ipo-gong', 'happen-ipo-ticker', 'happen-evict-couch', 'happen-robotaxi-honk', 'happen-jets-flyover',
  'happen-escapee-paddle', 'happen-gull-fries', 'happen-cablecar-bell', 'happen-splash-sign-flip', 'happen-machine-walk', 'happen-whale-breach', 'happen-blimp', 'happen-ferry-horn', 'wind-gust']
const EXPECT = { 'gag-anvil-drop': 'whistle-fall', 'gag-anvil-hit': 'anvil', 'gag-piano-land': 'piano-crash', 'gag-chipper-grind': 'chipper', 'gag-guillotine-drop': 'guillotine', 'gag-cannon-fire': 'cannon', 'gag-bipped-smash': 'bipped', 'gag-birds-swarm': 'flock', 'gag-quake-rumble': 'rumble', 'happen-seal-bark': 'bark', 'happen-cablecar-bell': 'bell', 'happen-robotaxi-honk': 'honk', 'happen-jets-flyover': 'jets', 'wind-gust': 'gust', 'happen-ipo-gong': 'gong', 'happen-machine-walk': 'steps' }
{
  const all = [...NAMED, ...GAGS.flatMap((g) => BEATS.map((b) => `gag-${g}-${b}`))]
  const r = await page.evaluate((all) => {
    const n0 = window.__nnSoundLog.at(-1)?.i ?? -1, res = {}, at = window.__cp.toWorld([0, 120, 10])
    for (const n of all) res[n] = window.__nnSound(n, { at, vol: 0.2 })
    const log = window.__nnSoundLog.filter((e) => e.i > n0)
    return { res, errs: log.filter((e) => e.err).map((e) => e.n + ': ' + e.err), blips: Object.entries(res).filter(([, r]) => r === 'blip').map(([n]) => n) }
  }, all)
  check(`${all.length} gag, happening and wind names play without an error`, r.errs.length === 0, r.errs.slice(0, 5).join('; '))
  const named = NAMED.filter((n) => r.res[n] === 'blip')
  check('every anticipated name has a real sound (no fallback blip)', named.length === 0, named.join(', '))
  check('gag beats mostly find a sound', r.blips.length < all.length * 0.05, `${r.blips.length} blips: ${r.blips.slice(0, 8).join(', ')}`)
  const wrong = Object.entries(EXPECT).filter(([n, want]) => r.res[n] !== want).map(([n, want]) => `${n} -> ${r.res[n]} (wanted ${want})`)
  check('the beat word decides (a drop whistles down, a hit lands with what fell)', wrong.length === 0, wrong.join('; '))
  const odd = await page.evaluate(() => { const out = []; for (const n of [undefined, null, '', '???', 'gag-', 'happen--', 42, 'totally-unknown-thing']) { try { out.push(window.__nnSound(n)) } catch (e) { out.push('THREW ' + e.message) } } return out })
  check('unknown names fall back to a blip without throwing', odd.every((x) => x === 'blip'), odd.join(','))
}
await page.waitForTimeout(1500)

// ---- every recipe, rendered offline: it makes a sound, of a sane loudness and length ----
{
  const r = await page.evaluate(async () => {
    const bad = [], N = window.__nnSoundNames()
    for (const n of N) { try { const x = await window.__nnSoundRender(n, { ev: 115, size: 1 }, 6); if (!(x.peak > 0.003 && x.peak < 2.5 && x.dur > 0.015)) /* (10 Nov: the Geiger tick is a 20 ms click by design) */ bad.push(`${n} peak ${x.peak.toFixed(4)} dur ${x.dur.toFixed(2)}`) } catch (e) { bad.push(n + ' threw ' + e.message) } }
    const crack = await window.__nnSoundRender('crack', { ev: 95 }), crack112 = await window.__nnSoundRender('crack', { ev: 114 })
    return { n: N.length, bad, crack, crack112 }
  })
  check(`all ${r.n} recipes render a sound of sane loudness and length`, r.bad.length === 0, r.bad.slice(0, 8).join('; '))
  check('a 112 mph crack is bigger than a 95 mph one', r.crack112.peak > r.crack.peak && r.crack112.dur > r.crack.dur, JSON.stringify([r.crack, r.crack112]))
}

// ---- a swing: crack, whoosh, landing, crowd ----
{
  await page.evaluate(() => { window.__sndMark = window.__nnSoundLog.at(-1)?.i ?? -1; Object.assign(window.__cp.state, { ev: 108, la: 28, dir: 0 }); window.__cp.update() })
  await page.keyboard.press('Space')
  await page.waitForFunction(() => window.__nnSoundLog.some((e) => e.i > window.__sndMark && e.n === 'land'), null, { timeout: 40000 }).catch(() => {})
  await page.waitForTimeout(1500)
  const seq = await page.evaluate(() => window.__nnSoundLog.filter((e) => e.i > window.__sndMark).map((e) => e.n + (e.r && e.r !== e.n ? ':' + e.r : '')))
  const idx = (re) => seq.findIndex((x) => re.test(x))
  const iC = idx(/^crack/), iW = idx(/^whoosh/), iL = idx(/^land/), iR = seq.findIndex((x, i) => i > iC && /^(roar|cheer|groan|aww)/.test(x))
  check('a swing: the crack, the whoosh, then the crowd, then the landing logged', iC >= 0 && iW > iC && iR > iW && iL > iW, seq.join(' > '))
}

// ---- S mutes everything ----
{
  await page.keyboard.press('s')
  await page.waitForTimeout(500)
  const r = await page.evaluate(async () => {
    const s0 = window.__nnSoundStats()
    for (const n of ['anvil', 'roar', 'gag-chipper-grind', 'happen-jets-flyover']) window.__nnSound(n)
    const s1 = window.__nnSoundStats()
    return { s0, s1, muted: window.__nnSoundLog.slice(-4).every((e) => e.muted) }
  })
  check('S mutes: master at zero, the bed stopped, nothing new made', !r.s0.on && r.s0.master < 0.02 && !r.s0.amb && r.s1.made === r.s0.made && r.muted, JSON.stringify(r))
  await page.keyboard.press('Space')
  await page.waitForTimeout(3500)
  const m = await page.evaluate((m0) => window.__nnSoundStats().made - m0, r.s0.made)
  check('a muted swing makes no audio at all', m === 0, `${m} nodes`)
  await page.keyboard.press('s')
  await page.waitForTimeout(400)
  const s2 = await page.evaluate(() => window.__nnSoundStats())
  check('S again: back on (still no bed)', s2.on && !s2.amb && s2.master > 0.5, JSON.stringify(s2))
}

// ---- the easter egg ----
{
  for (const k of ['7', '7', '7']) await page.keyboard.press(k)
  await page.waitForTimeout(1200)
  const r = await page.evaluate(() => ({ egg: window.__nnSoundLog.some((e) => e.n === 'egg' && e.r === 'stretch'), song: window.__mix25 ? null : null }))
  check('777 plays the Seventh Inning Stretch', r.egg, JSON.stringify(r))
}

// ---- the mixer lives in the JUKEBOX window, and its levels survive a reload ----
{
  await page.keyboard.press('j')
  await page.waitForTimeout(600)
  const has = await page.evaluate(() => document.querySelectorAll('#c25mb [data-snd]').length)
  check('the jukebox window has the four sound levels', has === 4, String(has))
  await page.evaluate(() => { const x = document.querySelector('#c25mb [data-snd="music"]'); x.value = '30'; x.dispatchEvent(new Event('input', { bubbles: true })); const y = document.querySelector('#c25mb [data-snd="amb"]'); y.value = '15'; y.dispatchEvent(new Event('input', { bubbles: true })) })
  const lv = await page.evaluate(() => window.__nnSoundStats().levels)
  check('moving a slider sets that level', Math.abs(lv.music - 0.3) < 1e-6 && Math.abs(lv.amb - 0.15) < 1e-6, JSON.stringify(lv))
  const box = await page.evaluate(() => { const r = (el) => el.getBoundingClientRect(); const rows = [...document.querySelectorAll('#c25mb .snd .r')].map(r); const m = r(document.querySelector('#c25mb')); return rows.filter((x) => x.right > m.right + 1 || x.left < m.left - 1).length })
  check('the mixer rows stay inside the window', box === 0, String(box))
  await load()
  const lv2 = await page.evaluate(() => window.__nnSoundStats().levels)
  check('the levels survive a reload', Math.abs(lv2.music - 0.3) < 1e-6 && Math.abs(lv2.amb - 0.15) < 1e-6, JSON.stringify(lv2))
}

check('no page errors', errs.length === 0, errs.slice(0, 4).join('\n'))
await browser.close()
console.log(fails ? `${fails} FAILED` : 'ALL PASS')
process.exit(fails ? 1 : 0)
