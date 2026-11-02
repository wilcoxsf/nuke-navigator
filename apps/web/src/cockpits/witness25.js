// WALLOP WITNESS (the mode: tick the Oracle games you were at, see what you saw) and WITNESS STAND (its leaderboards), 1 Nov 2026, evening. Andrew's picks:
// wins, losses and the margins; THE JINX (your win % against the Giants' own at home, highest and lowest); Giants home runs witnessed; foot-i-tude; altitude in
// Coit Towers and Twin Peaks; the golf game (longest, shortest, closest to your seat); hours at Oracle; extra innings; walk-offs; your guy; the top exit speed.
// Nothing about the Dodgers, nothing about weather, no nemesis. Logging a game asks for your seat, and only within 72 hours of first pitch.
// Data: giants_games.json (science/pull_giants_games.py, the MLB Stats API schedule: one row per home game) and the replay's Oracle home runs (park SF, hr): the
// Giants bat in the bottom half (tb 'Bot'), gm is the game's gamePk. A day key is the date, or date#2 for the second game of a doubleheader (a bare date on a
// doubleheader day counts both). Pure functions here; the page draws them (c25.js) and the Pages Function (functions/api/witness.js) keeps them for the stand.

// heights (Wikipedia, read 1 Nov 2026): Coit Tower "a 210-foot tower"; Twin Peaks "elevation 925 ft" (NAVD88, from Peakbagger)
export const COIT_FT = 210
export const TWIN_PEAKS_FT = 925
export const WINDOW_HOURS = 72
const KEY = /^(\d{4}-\d{2}-\d{2})(?:#([12]))?$/

// the games a day key stands for
export function gamesFor(key, games) {
  const m = KEY.exec(String(key ?? ''))
  if (!m) return []
  const day = games.filter((g) => g.d === m[1])
  return m[2] ? day.filter((g) => g.dh === Number(m[2])) : day
}
// first pitch, in ms: the schedule's time, or 7:05 pm in San Francisco when the game is not in the file yet
export function firstPitch(key, games) {
  const g = gamesFor(key, games)[0]
  if (g?.start) return Date.parse(g.start)
  const m = KEY.exec(String(key ?? ''))
  return m ? Date.parse(m[1] + 'T19:05:00-07:00') : NaN
}
// open from first pitch until 72 hours after it
export function windowOpen(key, games, now = Date.now(), hours = WINDOW_HOURS) {
  const h = (now - firstPitch(key, games)) / 3.6e6
  return h >= 0 && h <= hours
}
export const gameKey = (g) => (g.dh ? `${g.d}#${g.dh}` : g.d)
export const openKeys = (games, now = Date.now()) => games.filter((g) => windowOpen(gameKey(g), games, now)).map(gameKey)

// every count for one person. games: giants_games.json rows; hrs: home runs (anything; the Oracle ones are picked out); entry: { days, seats: { key: { sec, row, seat } } }
// o.season: one season only (the year-end trophies); o.peakFt(ball): the zenith in feet (the engine's flight; altitude is null without it); o.distToSeat(ball, seat):
// feet from where the ball came down to that seat (the golf game's closest; null without it); o.name(batterId): a name for YOUR GUY
export function witnessStats(games, hrs, entry, o = {}) {
  const inSeason = (d) => !o.season || d.slice(0, 4) === String(o.season)
  const keys = [...new Set(entry?.days ?? [])].filter((k) => inSeason(String(k)))
  const seen = new Map() // gamePk -> { game, key }
  for (const k of keys) for (const g of gamesFor(k, games)) seen.set(String(g.pk), { g, key: k })
  const mine = [...seen.values()].map((x) => x.g).sort((a, b) => a.d.localeCompare(b.d) || a.dh - b.dh)
  const oracle = (hrs ?? []).filter((b) => b.park === 'SF' && b.hr && seen.has(String(b.gm)))
  const giants = oracle.filter((b) => b.tb === 'Bot')
  const n = mine.length, wins = mine.filter((g) => g.win).length, losses = n - wins
  const winRuns = mine.filter((g) => g.win).reduce((s, g) => s + g.margin, 0), lossRuns = mine.filter((g) => !g.win).reduce((s, g) => s - g.margin, 0)
  // THE JINX: your win % against the Giants' home win % over the same seasons
  const seasons = new Set(mine.map((g) => g.d.slice(0, 4))), theirs = games.filter((g) => seasons.has(g.d.slice(0, 4)))
  const winPct = n ? wins / n : null, theirPct = theirs.length ? theirs.filter((g) => g.win).length / theirs.length : null
  const feet = (list) => list.reduce((s, b) => s + (b.ft ?? 0), 0)
  const who = (b) => (b ? { ft: b.ft, d: b.d, b: b.b, name: o.name?.(b.b) ?? null, giants: b.tb === 'Bot' } : null)
  const byFt = [...oracle].sort((a, b) => b.ft - a.ft)
  // the golf game's closest: each home run against your seat for that game
  let closest = null
  if (o.distToSeat) for (const b of oracle) {
    const key = seen.get(String(b.gm))?.key, seat = entry?.seats?.[key]
    if (!seat) continue
    const f = o.distToSeat(b, seat)
    if (f != null && Number.isFinite(f) && (!closest || f < closest.away)) closest = { ...who(b), away: Math.round(f), seat }
  }
  let alt = null
  if (o.peakFt && oracle.length) { const ft = oracle.reduce((s, b) => s + (o.peakFt(b) ?? 0), 0); alt = { ft: Math.round(ft), coit: ft / COIT_FT, twinPeaks: ft / TWIN_PEAKS_FT } }
  // YOUR GUY: the batter with the most home runs in front of you, the feet breaking a tie
  const tally = new Map()
  for (const b of giants) { const t = tally.get(b.b) ?? { b: b.b, n: 0, ft: 0 }; t.n++; t.ft += b.ft; tally.set(b.b, t) } // a Giant (1 Nov, night: a visitor came up as YOUR GUY in the playtest)
  const guy = [...tally.values()].sort((a, b) => b.n - a.n || b.ft - a.ft)[0]
  const topEv = [...oracle].sort((a, b) => (b.ev ?? 0) - (a.ev ?? 0))[0]
  const mins = mine.map((g) => g.mins)
  return {
    games: n, wins, losses, winRuns, lossRuns, runDiff: winRuns - lossRuns,
    avgWin: wins ? winRuns / wins : null, avgLoss: losses ? lossRuns / losses : null,
    winPct, theirPct, jinx: winPct != null && theirPct != null ? winPct - theirPct : null,
    giantsHR: giants.length, allHR: oracle.length, footitude: feet(oracle), giantsFeet: feet(giants),
    altitude: alt,
    longest: who(byFt[0]), shortest: who(byFt[byFt.length - 1]), closest,
    hours: n && mins.every((m) => m != null) ? mins.reduce((s, m) => s + m, 0) / 60 : null,
    extra: mine.filter((g) => g.extra).length, walkoffs: mine.filter((g) => g.walkoff).length,
    yourGuy: guy ? { b: guy.b, n: guy.n, ft: guy.ft, name: o.name?.(guy.b) ?? null } : null,
    topEv: topEv?.ev != null ? { mph: Math.round(topEv.ev * 10) / 10, ...who(topEv) } : null,
    seasons: [...seasons].sort(),
  }
}

// WITNESS STAND: one board per count; better 'high' or 'low'; min: games before you go on it (the percentages need a few)
export const BOARDS = [
  { key: 'games', title: 'GAMES', value: (s) => s.games, better: 'high' },
  { key: 'wins', title: 'WINS', value: (s) => s.wins, better: 'high' },
  { key: 'losses', title: 'LOSSES', value: (s) => s.losses, better: 'high' },
  { key: 'winRuns', title: 'WIN MARGIN (RUNS)', value: (s) => s.winRuns, better: 'high' },
  { key: 'lossRuns', title: 'LOSS MARGIN (RUNS)', value: (s) => s.lossRuns, better: 'high' },
  { key: 'jinxHigh', title: 'THE JINX: LUCKIEST', value: (s) => s.jinx, better: 'high', min: 3, pct: true },
  { key: 'jinxLow', title: 'THE JINX: CURSED', value: (s) => s.jinx, better: 'low', min: 3, pct: true },
  { key: 'giantsHR', title: 'GIANTS WALLOPS WITNESSED', value: (s) => s.giantsHR, better: 'high' },
  { key: 'footitude', title: 'FOOT-I-TUDE', value: (s) => s.footitude, better: 'high', unit: 'FT' },
  { key: 'altitude', title: 'ALTITUDE (COIT TOWERS)', value: (s) => s.altitude?.coit ?? null, better: 'high' },
  { key: 'longest', title: 'LONGEST', value: (s) => s.longest?.ft ?? null, better: 'high', unit: 'FT' },
  { key: 'shortest', title: 'SHORTEST', value: (s) => s.shortest?.ft ?? null, better: 'low', unit: 'FT' },
  { key: 'closest', title: 'CLOSEST TO YOUR SEAT', value: (s) => s.closest?.away ?? null, better: 'low', unit: 'FT' },
  { key: 'hours', title: 'HOURS AT ORACLE', value: (s) => s.hours, better: 'high' },
  { key: 'extra', title: 'EXTRA INNINGS', value: (s) => s.extra, better: 'high' },
  { key: 'walkoffs', title: 'WALK-OFFS', value: (s) => s.walkoffs, better: 'high' },
  { key: 'topEv', title: 'TOP EXIT SPEED', value: (s) => s.topEv?.mph ?? null, better: 'high', unit: 'MPH' },
]
// people: [{ name, stats }] -> [{ name, value, rank }], best first; no value (or too few games) and you are off the board; ties share a rank
export function rankBoard(board, people) {
  const on = people.map((p) => ({ name: p.name, id: p.id, value: board.value(p.stats) })).filter((p, i) => p.value != null && Number.isFinite(p.value) && people[i].stats.games >= (board.min ?? 1))
  on.sort((a, b) => (board.better === 'low' ? a.value - b.value : b.value - a.value))
  let rank = 0, prev = null
  return on.map((p, i) => { if (p.value !== prev) { rank = i + 1; prev = p.value } return { ...p, rank } })
}

// the year-end four (Andrew hands them out each season). 1 Nov, night (Andrew: "All of them should be like names of individuals like tycoon, it's a title that you
// receive not a trophy"; 'auspicious' alliterated for the wins, 'curse' or 'jinx' for the losses; THE TATER TYCOON, THE DISTANCE DUKE and THE CURSED COUNT OF CANDLESTICK are his; the wins and losses are my picks of six each, weirder, 1 Nov, later): titles, the first the default, the
// rest the other candidates. title is how it reads on the stand: THE TATER TYCOON: SAM
export const TROPHIES = [
  { key: 'wins', board: 'wins', names: ['THE AUSPICIOUS ADMIRAL OF ALCATRAZ', 'THE AUSPICIOUS AUTARCH OF ALAMO SQUARE', 'THE AUSPICIOUS ALDERMAN OF ANGEL ISLAND', 'THE AUSPICIOUS ARCHON OF AQUATIC PARK', 'THE AUSPICIOUS ARCHMANDRITE', 'THE AUSPICIOUS ATTORNEY GENERAL', 'THE AUSPICIOUS AMIR OF THE ARCADE', 'THE AUSPICIOUS AUDITOR OF AUGURIES', 'THE AUSPICIOUS ASTROLOGER ROYAL', 'THE AUSPICIOUS ADMIRAL OF THE ARCADE'], vox: 'a voxel horseshoe, open end up, in Giants orange on a black plinth, a tiny W flag flying from one heel' },
  { key: 'losses', board: 'losses', names: ['THE CURSED COUNT OF CANDLESTICK'], vox: 'a voxel black cat sitting on a cracked home plate, its tail curled round the plinth, one orange eye' },
  { key: 'giantsHR', board: 'giantsHR', names: ['THE TATER TYCOON'], vox: 'a voxel horseshoe magnet with three orange-and-white baseballs stuck to its poles' },
  { key: 'footitude', board: 'footitude', names: ['THE DISTANCE DUKE'], vox: 'a big hairy voxel foot in a Giants sock, standing on a stack of home plates' },
]

// the store: the Pages Function when it is there (functions/api/witness.js), this browser's localStorage when it is not (local dev, or before the WITNESS binding exists).
// The old WALLOP WITNESS kept a bare list of dates in nn-witness; that is read as your days.
export function witnessStore(o = {}) {
  const base = o.base ?? '', F = o.fetch ?? globalThis.fetch?.bind(globalThis), S = o.storage ?? globalThis.localStorage
  const read = (k, d) => { try { const v = S?.getItem(k); return v == null ? d : JSON.parse(v) } catch { return d } }
  const write = (k, v) => { try { S?.setItem(k, JSON.stringify(v)) } catch {} }
  const local = () => ({ name: read('nn-witness-name', ''), days: read('nn-witness', []), seats: read('nn-witness-seats', {}) })
  const keepLocal = (e) => { write('nn-witness', e.days ?? []); write('nn-witness-seats', e.seats ?? {}); if (e.name != null) write('nn-witness-name', e.name) }
  return {
    local,
    async load() {
      try {
        const r = await F(base + '/api/witness', { credentials: 'same-origin' })
        if (r.ok) { const j = await r.json(); if (j.me) keepLocal(j.me); return { me: j.me ?? local(), all: j.all ?? [], shared: true } }
      } catch {}
      return { me: local(), all: [], shared: false }
    },
    // returns { ok, shared, refused? }: a game outside its 72 hours comes back refused and is not kept
    async save(e) {
      try {
        const r = await F(base + '/api/witness', { method: 'PUT', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(e) })
        if (r.ok) { const j = await r.json(); keepLocal(j.me ?? e); return { ok: true, shared: true, me: j.me } }
        if (r.status === 422 || r.status === 400) { const j = await r.json().catch(() => ({})); return { ok: false, shared: true, refused: j.refused ?? [], error: j.error } }
      } catch {}
      keepLocal(e)
      return { ok: true, shared: false }
    },
  }
}
