// WALLOP WITNESS and WITNESS STAND without a browser (1 Nov 2026): the counts on a small made-up season, the 72-hour window, the leaderboards, the store's
// fallback to the browser, and the Pages Function (functions/api/witness.js) against a fake KV. Then, if the real files are there, the counts for every game.
// Usage: node tools/test_witness25.mjs
import { readFileSync, existsSync } from 'node:fs'
import { witnessStats, windowOpen, firstPitch, gamesFor, openKeys, BOARDS, rankBoard, TROPHIES, witnessStore, COIT_FT, TWIN_PEAKS_FT } from '../src/cockpits/witness25.js'
import { onRequest } from '../functions/api/witness.js'

let fails = 0
const check = (name, ok, extra = '') => { if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : extra) }

// ---- a made-up season: five games, one a doubleheader ----
const G = [
  { d: '2025-04-01', pk: 1, opp: 'SD', sf: 5, opp_r: 2, win: true, margin: 3, inn: 9, extra: false, walkoff: false, start: '2025-04-02T02:15:00Z', dh: 0, mins: 160 },
  { d: '2025-04-02', pk: 2, opp: 'SD', sf: 3, opp_r: 4, win: false, margin: -1, inn: 11, extra: true, walkoff: false, start: '2025-04-03T01:45:00Z', dh: 0, mins: 200 },
  { d: '2025-04-05', pk: 3, opp: 'AZ', sf: 6, opp_r: 5, win: true, margin: 1, inn: 10, extra: true, walkoff: true, start: '2025-04-05T20:05:00Z', dh: 1, mins: 190 },
  { d: '2025-04-05', pk: 4, opp: 'AZ', sf: 0, opp_r: 7, win: false, margin: -7, inn: 9, extra: false, walkoff: false, start: '2025-04-06T00:10:00Z', dh: 2, mins: 150 },
  { d: '2025-04-08', pk: 5, opp: 'COL', sf: 2, opp_r: 1, win: true, margin: 1, inn: 9, extra: false, walkoff: false, start: '2025-04-09T01:45:00Z', dh: 0, mins: 155 },
]
const H = [
  { park: 'SF', hr: 1, gm: '1', d: '2025-04-01', b: 10, ft: 420, ev: 108.2, tb: 'Bot' },
  { park: 'SF', hr: 1, gm: '1', d: '2025-04-01', b: 20, ft: 360, ev: 99.1, tb: 'Top' },
  { park: 'SF', hr: 1, gm: '3', d: '2025-04-05', b: 10, ft: 401, ev: 104.0, tb: 'Bot' },
  { park: 'SF', hr: 1, gm: '4', d: '2025-04-05', b: 30, ft: 455, ev: 112.5, tb: 'Top' },
  { park: 'SF', hr: 1, gm: '5', d: '2025-04-08', b: 10, ft: 380, ev: 101.0, tb: 'Bot' },
  { park: 'NYY', hr: 1, gm: '1', d: '2025-04-01', b: 99, ft: 500, ev: 120, tb: 'Bot' }, // not Oracle: never counted
  { park: 'SF', hr: 0, gm: '1', d: '2025-04-01', b: 98, ft: 410, ev: 110, tb: 'Bot' }, // not a home run
]
const names = { 10: 'BUSTER', 20: 'TONY', 30: 'ZAC' }
const e1 = { days: ['2025-04-01', '2025-04-05#1', '2025-04-02'], seats: { '2025-04-01': { sec: '140', row: '10', seat: '5' } } }
const s1 = witnessStats(G, H, e1, { name: (b) => names[b], peakFt: (b) => b.ft / 4, distToSeat: (b) => (b.ft === 420 ? 37.6 : b.ft === 360 ? 12.2 : null) })
check('counts: 3 games, 2 wins, 1 loss, margins 4 and 1, 2 extra-inning games, 1 walk-off', s1.games === 3 && s1.wins === 2 && s1.losses === 1 && s1.winRuns === 4 && s1.lossRuns === 1 && s1.runDiff === 3 && s1.extra === 2 && s1.walkoffs === 1, JSON.stringify(s1))
check('home runs: only Oracle home runs at those games; the Giants bat in the bottom', s1.allHR === 3 && s1.giantsHR === 2 && s1.footitude === 1181 && s1.giantsFeet === 821, JSON.stringify(s1))
check('THE JINX: 67% against the Giants 60% over the season', Math.abs(s1.winPct - 2 / 3) < 1e-9 && Math.abs(s1.theirPct - 0.6) < 1e-9 && Math.abs(s1.jinx - 0.07) < 1e-9 /* (11 Nov: the gap as shown, 67 - 60 = +7, GPT round 2, 18) */, JSON.stringify([s1.winPct, s1.theirPct, s1.jinx]))
check('golf: longest 420, shortest 360, closest to the seat 12 ft (the one a seat was given for)', s1.longest.ft === 420 && s1.shortest.ft === 360 && s1.closest?.away === 12 && s1.closest.ft === 360, JSON.stringify([s1.longest, s1.shortest, s1.closest]))
check(`altitude in Coit Towers (${COIT_FT} ft) and Twin Peaks (${TWIN_PEAKS_FT} ft)`, s1.altitude.ft === 295 && Math.abs(s1.altitude.coit - 1181 / 4 / 210) < 1e-9, JSON.stringify(s1.altitude))
check('hours at Oracle: 9 hours 10 minutes; YOUR GUY Buster (2); top exit speed 108.2', Math.abs(s1.hours - 550 / 60) < 1e-9 && s1.yourGuy.name === 'BUSTER' && s1.yourGuy.n === 2 && s1.topEv.mph === 108.2, JSON.stringify([s1.hours, s1.yourGuy, s1.topEv]))
const s2 = witnessStats(G, H, { days: ['2025-04-05'] })
check('a bare date on a doubleheader day counts both games; no durations function, no altitude; no seat, no closest', s2.games === 2 && s2.allHR === 2 && s2.altitude === null && s2.closest === null, JSON.stringify(s2))
check('hours stay empty while any game has no length', witnessStats(G.map((g) => ({ ...g, mins: g.pk === 2 ? null : g.mins })), H, e1).hours === null)
check('one season only (the trophies)', witnessStats(G, H, { days: ['2025-04-01', '2024-09-01'] }, { season: 2025 }).games === 1)
check('nothing about the Dodgers or the weather in the counts', !Object.keys(s1).some((k) => /dodg|lad|temp|wind|weather|nemesis|birth/i.test(k)))

// ---- the 72-hour window ----
const fp = firstPitch('2025-04-05#2', G)
check('first pitch from the schedule (game 2 of the doubleheader)', fp === Date.parse('2025-04-06T00:10:00Z'))
check('first pitch for a game not in the file: 7:05 pm in San Francisco', firstPitch('2027-04-01', G) === Date.parse('2027-04-01T19:05:00-07:00'))
check('open at first pitch, at 71 hours, shut at 73 hours and before first pitch', windowOpen('2025-04-08', G, fp) === false && windowOpen('2025-04-05#2', G, fp) && windowOpen('2025-04-05#2', G, fp + 71 * 3.6e6) && !windowOpen('2025-04-05#2', G, fp + 73 * 3.6e6) && !windowOpen('2025-04-05#2', G, fp - 60e3))
check('open keys a day after game 2 of the doubleheader', JSON.stringify(openKeys(G, fp + 24 * 3.6e6)) === JSON.stringify(['2025-04-05#1', '2025-04-05#2']), JSON.stringify(openKeys(G, fp + 24 * 3.6e6)))
check('gamesFor: date#1, date#2, a bad key', gamesFor('2025-04-05#1', G)[0].pk === 3 && gamesFor('2025-04-05#2', G)[0].pk === 4 && gamesFor('nope', G).length === 0)

// ---- the boards ----
const people = [{ id: 'a', name: 'ANDREW', stats: s1 }, { id: 'b', name: 'SAM', stats: witnessStats(G, H, { days: ['2025-04-05#2', '2025-04-08'] }) }, { id: 'c', name: 'JO', stats: witnessStats(G, H, { days: ['2025-04-01', '2025-04-02', '2025-04-05#1', '2025-04-08'] }) }]
const b = (k) => rankBoard(BOARDS.find((x) => x.key === k), people)
check('GIANTS WALLOPS WITNESSED ranks most first', b('giantsHR')[0].name === 'JO' && b('giantsHR')[0].value === 3, JSON.stringify(b('giantsHR')))
check('SHORTEST ranks the least first (golf)', b('shortest')[0].value === 360, JSON.stringify(b('shortest')))
check('THE JINX needs three games: two people on it, luckiest and cursed reversed', b('jinxHigh').length === 2 && b('jinxLow')[0].name === b('jinxHigh').at(-1).name, JSON.stringify(b('jinxHigh')))
check('CLOSEST TO YOUR SEAT: only people who gave a seat and a way to measure', b('closest').length === 1 && b('closest')[0].name === 'ANDREW')
check('the season titles (THE TATER TYCOON his, the wins five candidates, 11 Nov: THE MAESTRO OF MCCOVEY COVE with two others), no Dodger board', TROPHIES.length === 5 && TROPHIES.find((t) => t.key === 'songs')?.names[0] === 'THE MAESTRO OF MCCOVEY COVE' && TROPHIES.every((t) => (t.key === 'wins' ? t.names.length >= 5 : t.key === 'songs' ? t.names.length === 3 : t.names.length === 1) && /^THE /.test(t.names[0]) && BOARDS.some((x) => x.key === t.board)) && TROPHIES.find((t) => t.key === 'giantsHR').names[0] === 'THE TATER TYCOON' && !BOARDS.some((x) => /DODG/.test(x.title)))

// ---- the store: the browser when the function is not there ----
const mem = new Map(), storage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) }
mem.set('nn-witness', JSON.stringify(['2025-04-01'])) // the old WALLOP WITNESS's list of dates
const st404 = witnessStore({ storage, fetch: async () => new Response('{}', { status: 404 }) })
const l0 = await st404.load()
check('no function: the old list of dates is your days, nothing shared', !l0.shared && l0.me.days[0] === '2025-04-01' && l0.all.length === 0, JSON.stringify(l0))
const sv0 = await st404.save({ name: 'ANDREW', days: ['2025-04-01', '2025-04-02'], seats: {} })
check('no function: saving keeps it in the browser', sv0.ok && !sv0.shared && JSON.parse(mem.get('nn-witness')).length === 2)

// ---- the Pages Function against a fake KV ----
const kv = () => { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v) }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }) } }
const TOKENS = kv(), WITNESS = kv()
const T1 = 'tokenAAAAAAAAAAAAAAAA1', T2 = 'tokenBBBBBBBBBBBBBBBB2'
await TOKENS.put(T1, JSON.stringify({ name: 'Andrew Wilcox' })); await TOKENS.put(T2, JSON.stringify({ name: 'Sam' }))
const GAMES = { games: G }
const env = { TOKENS, WITNESS, ASSETS: { fetch: async () => new Response(JSON.stringify(GAMES)) } }
const call = (token, method = 'GET', body) => onRequest({ env, request: new Request('https://nn.example/api/witness', { method, headers: { Cookie: `nn_t=${token}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }) })
const realNow = Date.now
const at = (ms) => { Date.now = () => ms }
at(Date.parse('2025-04-02T05:00:00Z')) // three hours after game 1's first pitch
let r = await call(T1)
let j = await r.json()
check('GET with a token and nothing saved: an empty entry named from the invite', r.status === 200 && j.me.name === 'ANDREW' && j.me.days.length === 0 && j.all.length === 0, JSON.stringify(j))
r = await call(T1, 'PUT', { name: 'Andrew!!<script>', days: ['2025-04-01'], seats: { '2025-04-01': { sec: '140', row: '10', seat: '5' } } })
j = await r.json()
check('PUT inside the 72 hours saves it; the name is cleaned and capped', r.status === 200 && j.me.days[0] === '2025-04-01' && j.me.name === 'ANDREWSCRIPT', JSON.stringify(j))
r = await call(T1, 'PUT', { days: ['2025-04-01', '2025-04-08'] })
j = await r.json()
check('PUT with a game whose window has not opened is refused (422) and names it', r.status === 422 && j.refused.join() === '2025-04-08', JSON.stringify(j))
at(Date.parse('2025-04-10T05:00:00Z')) // game 1 is now days old
r = await call(T1, 'PUT', { name: 'ANDREW', days: ['2025-04-01', '2025-04-08'], seats: { '2025-04-01': { sec: '140', row: '10', seat: '5' } } })
j = await r.json()
check('a game already saved stays after its window shuts; the new one inside its window is added', r.status === 200 && j.me.days.join() === '2025-04-01,2025-04-08', JSON.stringify(j))
r = await call(T1, 'PUT', { name: 'ANDREW', days: ['2025-04-08', '2025-04-02'] })
check('adding an old game is refused', r.status === 422 && (await r.json()).refused.join() === '2025-04-02')
r = await call(T1, 'PUT', { name: 'ANDREW', days: ['2025-04-08'] })
check('taking a game away is allowed whenever', r.status === 200 && (await r.json()).me.days.join() === '2025-04-08')
r = await call(T2, 'PUT', { days: ['2025-04-08'], seats: { '2025-04-08': { sec: '301', row: '22', seat: '9' } } })
check('a second friend saves', r.status === 200)
// (11 Nov) the guessing jukebox's record rides along: good song ids kept, anything odd dropped, and everyone's shows on the stand
r = await call(T2, 'PUT', { days: ['2025-04-08'], seats: { '2025-04-08': { sec: '301', row: '22', seat: '9' } }, jk: { k0123456789: [Date.parse('2025-04-09T20:00:00Z'), 3, 1, 0], kabcdefabcd: [Date.parse('2025-04-09T21:00:00Z'), 1, 0, 0], billiejean: [Date.parse('2025-04-09'), 1, 0, 0], kffffffffff: [Date.parse('2031-01-01'), 1, 0, 0], k1111111111: ['soon', 'x'] } })
j = await r.json()
check('the jukebox record keeps only real song ids with sane times and counts', r.status === 200 && Object.keys(j.me.jk ?? {}).sort().join() === 'k0123456789,kabcdefabcd' && j.me.jk.k0123456789.join() === [Date.parse('2025-04-09T20:00:00Z'), 3, 1, 0].join(), JSON.stringify(j.me.jk))
r = await call(T1)
j = await r.json()
check('every friend’s jukebox record comes back with the stand, and counts on the SONGS boards', (() => { const f = j.all.find((p) => Object.keys(p.jk ?? {}).length === 2); if (!f) return false; const st = witnessStats([], [], f, {}); return st.songs === 2 && st.songsBlind === 1 })(), JSON.stringify(j.all.map((p) => p.jk)))
const sam = j.all.find((p) => p.name === 'SAM')
check('GET: everyone, with only a name, days and seat sections (no row, no seat, no token); you are marked', j.all.length === 2 && sam && sam.seats['2025-04-08'].sec === '301' && sam.seats['2025-04-08'].row === undefined && !JSON.stringify(j).includes(T1) && !JSON.stringify(j).includes(T2) && j.all.filter((p) => p.me).length === 1, JSON.stringify(j))
check('KV keys are hashes, never the tokens', [...WITNESS.m.keys()].every((k) => /^w:[0-9a-f]{24}$/.test(k)))
r = await call('notarealtokenatall12345')
check('an unknown token gets 403', r.status === 403)
r = await call(T1, 'PUT', { days: ['not-a-date'] })
check('a bad day is refused (400)', r.status === 400)
r = await onRequest({ env: { TOKENS }, request: new Request('https://nn.example/api/witness', { headers: { Cookie: `nn_t=${T1}` } }) })
check('no WITNESS binding yet: 404, so the page keeps it in the browser', r.status === 404)
// the function and the page agree on the window, hour by hour round a first pitch
const fpw = firstPitch('2025-04-05#1', G)
let agree = true
for (let h = -2; h <= 75; h += 0.5) { at(fpw + h * 3.6e6); const ok = (await call(T2, 'PUT', { days: ['2025-04-08', '2025-04-05#1'] })).status === 200; if (ok !== windowOpen('2025-04-05#1', G, fpw + h * 3.6e6)) agree = false; await call(T2, 'PUT', { days: ['2025-04-08'] }) }
check('the function and witness25.js agree on the 72 hours', agree)
Date.now = realNow

// ---- the real files, if they are here: every game and every Oracle home run ----
const gp = new URL('../public/giants_games.json', import.meta.url), rp = new URL('../public/replay.json', import.meta.url)
if (existsSync(gp) && existsSync(rp)) {
  const games = JSON.parse(readFileSync(gp, 'utf8')).games, R = JSON.parse(readFileSync(rp, 'utf8'))
  const days = [...new Set(games.map((g) => g.d))]
  const all = witnessStats(games, R.balls, { days }, { name: (b) => R.players[b]?.[0] })
  console.log('INFO every home game:', JSON.stringify({ games: all.games, wins: all.wins, winPct: all.winPct?.toFixed(3), allHR: all.allHR, giantsHR: all.giantsHR, footitude: all.footitude, extra: all.extra, walkoffs: all.walkoffs, longest: all.longest, shortest: all.shortest, guy: all.yourGuy, topEv: all.topEv }))
  const sfHR = R.balls.filter((x) => x.park === 'SF' && x.hr).length
  check('real data: every Oracle home run belongs to a game in the schedule', all.allHR === sfHR, `${all.allHR} of ${sfHR}`)
  check('real data: 324 home games 2023 to 2026, each a win or a loss', all.games === games.length && all.wins + all.losses === all.games)
}
console.log(fails ? `${fails} FAILED` : 'ALL PASS')
process.exit(fails ? 1 : 0)
