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
// (11 Nov, Andrew: "yes to 3") the beta opens in the off-season, so any 2026 home game already played can be logged until Opening Day 2027 (25 Mar, the first
// game in giants_schedule.json); after that it is 72 hours again. functions/api/witness.js has the same rule (tools/test_witness25.mjs checks they agree)
export const BACKFILL = { season: '2026', until: Date.parse('2027-03-25T07:00:00Z') }
// open from first pitch until 72 hours after it (or, in the back-fill, any time after first pitch)
export function windowOpen(key, games, now = Date.now(), hours = WINDOW_HOURS) {
  const h = (now - firstPitch(key, games)) / 3.6e6
  if (h >= 0 && String(key).startsWith(BACKFILL.season) && now < BACKFILL.until) return true
  return h >= 0 && h <= hours
}
// (11 Nov, Andrew: "let's have people be able to log what they have tickets to as well so you could meet up with your buddies") a ticket is a home game still to
// come (giants_schedule.json), kept by its day key; the stand shows who else has the same game
export const ticketOpen = (key, sched, now = Date.now()) => { const g = gamesFor(key, sched)[0]; return !!g && Date.parse(g.start) > now - 6 * 3.6e6 }
export const gameKey = (g) => (g.dh ? `${g.d}#${g.dh}` : g.d)
export const openKeys = (games, now = Date.now()) => games.filter((g) => windowOpen(gameKey(g), games, now)).map(gameKey)

// every count for one person. games: giants_games.json rows; hrs: home runs (anything; the Oracle ones are picked out); entry: { days, seats: { key: { sec, row, seat } } }
// o.season: one season only (the year-end trophies); o.peakFt(ball): the zenith in feet (the engine's flight; altitude is null without it); o.distToSeat(ball, seat):
// feet from where the ball came down to that seat (the golf game's closest; null without it); o.name(batterId): a name for YOUR GUY
// (11 Nov, Andrew: "we should have a winner for most songs guessed on the jukebox for witness stand as well") the guessing jukebox's record, as the stand keeps it:
// { opaque song id: [when guessed (ms), guesses it took, blanks hint 0/1, year hint 0/1] }; jkPack turns this browser's jukebox (c25.js, 'nn-jk-1') into it and
// merges what the stand already has (another device), keeping the earlier guess of each song
export function jkPack(mine, had = {}) {
  const out = {}
  for (const [id, v] of Object.entries(had ?? {})) if (/^k[0-9a-f]{10}$/.test(id) && Array.isArray(v)) out[id] = v
  for (const [id, u] of Object.entries(mine?.u ?? {})) { if (!/^k[0-9a-f]{10}$/.test(id) || !u) continue; const v = [Math.round(u.at ?? 0), Math.max(1, Math.round(u.n ?? 1)), u.hb ? 1 : 0, u.hy ? 1 : 0, u.pf ?? '']; if (!out[id] || v[0] < out[id][0]) out[id] = v } // (the fifth: the proof of the guess, which the stand checks; GPT-proofing, 11 Nov)
  return out
}
export function witnessStats(games, hrs, entry, o = {}) {
  const inSeason = (d) => !o.season || d.slice(0, 4) === String(o.season)
  /* (GPT red team round 2, 8: the year a song was guessed in San Francisco, not in UTC; a guess on 31 Dec at 8 PM is that year's) */
  const sfYear = (t) => Number(new Date(t).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric' }))
  const jk = Object.values(entry?.jk ?? {}).filter((v) => Array.isArray(v) && Number(v[0]) > 0 && (!o.season || sfYear(v[0]) === Number(o.season)))
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
    winPct, theirPct, jinx: winPct != null && theirPct != null ? (Math.round(winPct * 100) - Math.round(theirPct * 100)) / 100 : null, // (GPT round 2, 18: the gap between the two percentages as shown, so 67% against 33% is +34)
    giantsHR: giants.length, allHR: oracle.length, footitude: feet(oracle), giantsFeet: feet(giants),
    altitude: alt,
    longest: who(byFt[0]), shortest: who(byFt[byFt.length - 1]), closest,
    hours: n && mins.every((m) => m != null) ? mins.reduce((s, m) => s + m, 0) / 60 : null,
    extra: mine.filter((g) => g.extra).length, walkoffs: mine.filter((g) => g.walkoff).length,
    yourGuy: guy ? { b: guy.b, n: guy.n, ft: guy.ft, name: o.name?.(guy.b) ?? null } : null,
    topEv: topEv?.ev != null ? { mph: Math.round(topEv.ev * 10) / 10, ...who(topEv) } : null,
    seasons: [...seasons].sort(),
    songs: jk.length, songsBlind: jk.filter((v) => !v[2] && !v[3]).length,
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
  // (11 Nov) the guessing jukebox: no games needed to be on these two
  { key: 'songs', title: 'SONGS GUESSED', value: (s) => s.songs || null, better: 'high', min: 0 },
  { key: 'songsBlind', title: 'SONGS GUESSED BLIND', value: (s) => s.songsBlind || null, better: 'high', min: 0 },
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
// (11 Nov, later: his picks from title-art.html: C BOW TIE AND CIGAR, B THE OLD SALT, A THE COUNT, A BATON UP; the Duke a blue devil measuring, hands high and low ("I want everything to look like a person"); 16 x 16)
// (11 Nov, Andrew: "each one to have its own row and have like a fun little pixel graphic to go with it and then it should say the user, their number and what the
// number is"): each title's picture ('#', '+', '*' in its colors, '.' clear) and the words after the number (one, many)
export const TITLE_ART = {
  wins: { pal: {'a': '#f4f1e8', 'b': '#ffc21a', 'c': '#22315e', 'd': '#16120e', 'e': '#e9b48c', 'f': '#b97a52', 'g': '#cfd3da', 'h': '#8a8f99', 'i': '#6b4426'}, rows: ['................', '....aaaaaaaa....', '..aaaaaaaaaaaa..', '.aaaaaabbaaaaaa.', '.aaaaaaaaaaaaaa.', '..cccccccccccc..', '...ddeeeeeedd...', '....eeeeeeee....', '...eeedeeedee...', '...eeeeefeeee...', '...egggggggge...', '...gggggggggg..h', '...gggggggiii.i.', '...gggggggggiii.', '...gggggggggg...', '.....gggggg.....'], say: ['WIN', 'WINS'] },
  losses: { pal: {'a': '#16120e', 'b': '#a77be0', 'c': '#ffc21a', 'd': '#e4002b', 'e': '#3a3f47', 'f': '#f4f1e8'}, rows: ['................', '.....aaaaaa.....', '....aaaaaaaa....', '...aaaabbaaaa...', '...aabbbbbcaa...', '....bbbbbcbc....', '....bbabcbabc...', '....bbbbbcbc....', '....bbbbbbcb....', 'd....baaaaa....d', 'dd.eeebfbfeee.dd', 'edde........edde', 'eedde......eddee', 'eeeddddddddddeee', 'eeeeeeeeeeeeeeee', 'eeeeeeeeeeeeeeee'], say: ['LOSS', 'LOSSES'] },
  giantsHR: { pal: {'a': '#c8914f', 'b': '#ffc21a', 'c': '#8a8f99', 'd': '#f4f1e8', 'e': '#16120e', 'f': '#8e5f2e', 'g': '#e4002b', 'h': '#9c0019'}, rows: ['................', '................', '................', '......aaa.......', '....aaaaaaa.....', '...abbbaaaaa..c.', '..abdabbaaaaa...', '.aabaeabaeaaaa.c', '.aabbabbaaaaaa..', '.aafbbbaaaaafac.', '.aaaaaaaaaaaaa..', '..aaaffffdddddg.', '...afaaaaaaa....', '....aaaaaaaf....', '....ggaagg......', '....gghhgg......'], say: ['GIANTS HOME RUN SEEN', 'GIANTS HOME RUNS SEEN'] },
  footitude: { pal: {'a': '#f4f1e8', 'b': '#5c8dff', 'c': '#12276e', 'd': '#2250d6', 'e': '#f2bc40', 'f': '#e4002b'}, rows: ['................', '.aaab...c....c..', '...bd...c.d.c...', '..a..d..ddddd...', '......d.ddddd...', '..a...dddeded...', '.......dddddd...', '..a.....dccc....', '.........dddd...', '..a......dbdd...', '.........dddd...', '..a....ddddddd..', '.....dd..d..dddf', '..abd....d..d.d.', '.aaab...d....df.', '........d....d..'], say: ['FT OF HOME RUNS', 'FT OF HOME RUNS'] },
  songs: { pal: {'a': '#f4f1e8', 'b': '#cfd3da', 'c': '#e9b48c', 'd': '#16120e', 'e': '#e4002b'}, rows: ['...............a', '....bbbbbb....a.', '...bbccccbb..aa.', '...bccccccb..a..', '....cccccc..a...', '.c..ccdcdc..d...', '.d..cccccc.d....', '..d..cccc.dd....', '...dddeeddd.....', '....ddaadd......', '....ddaadd......', '....ddaadd......', '....ddaadd......', '....dddddd......', '....dddddd......', '....dd..dd......'], say: ['SONG GUESSED', 'SONGS GUESSED'] },
}
export const TROPHIES = [
  { key: 'wins', board: 'wins', names: ['THE AUSPICIOUS ADMIRAL OF ALCATRAZ', 'THE AUSPICIOUS AUTARCH OF ALAMO SQUARE', 'THE AUSPICIOUS ALDERMAN OF ANGEL ISLAND', 'THE AUSPICIOUS ARCHON OF AQUATIC PARK', 'THE AUSPICIOUS ARCHMANDRITE', 'THE AUSPICIOUS ATTORNEY GENERAL', 'THE AUSPICIOUS AMIR OF THE ARCADE', 'THE AUSPICIOUS AUDITOR OF AUGURIES', 'THE AUSPICIOUS ASTROLOGER ROYAL', 'THE AUSPICIOUS ADMIRAL OF THE ARCADE'], vox: 'a voxel horseshoe, open end up, in Giants orange on a black plinth, a tiny W flag flying from one heel' },
  { key: 'losses', board: 'losses', names: ['THE CURSED COUNT OF CANDLESTICK'], vox: 'a voxel black cat sitting on a cracked home plate, its tail curled round the plinth, one orange eye' },
  { key: 'giantsHR', board: 'giantsHR', names: ['THE TATER TYCOON'], vox: 'a voxel horseshoe magnet with three orange-and-white baseballs stuck to its poles' },
  { key: 'songs', board: 'songs', names: ['THE MAESTRO OF MCCOVEY COVE', 'THE JUKEBOX JUSTICE', 'THE BARD OF THE BLEACHERS'], vox: 'a voxel jukebox glowing Giants orange, a baseball spinning on it like a record' }, // (11 Nov: the first name is how it reads; the others are the options)
  { key: 'footitude', board: 'footitude', names: ['THE DISTANCE DUKE'], vox: 'a big hairy voxel foot in a Giants sock, standing on a stack of home plates' },
]

// the store: the Pages Function when it is there (functions/api/witness.js), this browser's localStorage when it is not (local dev, or before the WITNESS binding exists).
// The old WALLOP WITNESS kept a bare list of dates in nn-witness; that is read as your days.
export function witnessStore(o = {}) {
  const base = o.base ?? '', F = o.fetch ?? globalThis.fetch?.bind(globalThis), S = o.storage ?? globalThis.localStorage
  const read = (k, d) => { try { const v = S?.getItem(k); return v == null ? d : JSON.parse(v) } catch { return d } }
  const write = (k, v) => { try { S?.setItem(k, JSON.stringify(v)) } catch {} }
  // (2 Nov, night) and the calling card: a gamer tag (its case kept) and an emblem (emblem25.js, encoded)
  const local = () => ({ name: read('nn-witness-name', ''), tag: read('nn-witness-tag', ''), emblem: read('nn-witness-emblem', ''), days: read('nn-witness', []), seats: read('nn-witness-seats', {}), tickets: read('nn-witness-tickets', []), jk: jkPack(read('nn-jk-1', {})) })
  const keepLocal = (e) => { write('nn-witness', e.days ?? []); if (e.tickets) write('nn-witness-tickets', e.tickets); write('nn-witness-seats', e.seats ?? {}); if (e.name != null) write('nn-witness-name', e.name); if (e.tag != null) write('nn-witness-tag', e.tag); if (e.emblem != null) write('nn-witness-emblem', e.emblem) }
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
