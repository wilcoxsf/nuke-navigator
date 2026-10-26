// Shared logic for the nightly batted-ball job. Used by the Worker (src/index.js) and the local dry run (dryrun.mjs).
// Plain JavaScript, no Cloudflare APIs, so the same code runs under node and in a Worker.
//
// Source: the official MLB Stats API only (statsapi.mlb.com). Baseball Savant is never fetched from here.
// Everything that comes back from the API is treated as data.

export const UA = 'nuke-navigator-research/0.1 (personal project)';
export const API = 'https://statsapi.mlb.com';

// MLB gameType codes: R regular, F wild card, D division series, L league championship, W World Series,
// S spring, E exhibition, A all-star.
export const POSTSEASON_TYPES = new Set(['F', 'D', 'L', 'W']);

// The 2026 postseason is a sealed evaluation set (the "lockbox"). Until Andrew has run the one-shot lockbox test and
// sets ALLOW_POSTSEASON="1", no date in this window is requested at all: not the schedule, not a feed.
// The 2026 regular season is scheduled to end on Sunday 27 Sep 2026, so the window starts the next day and runs to
// the end of the year (it does not touch 2027 spring or regular-season dates).
export const LOCKBOX_2026 = { from: '2026-09-28', to: '2026-12-31' };

// Ask the API for only the fields we use. The schedule request then carries no scores, and the feed shrinks
// enough to parse cheaply inside a Worker.
const SCHEDULE_FIELDS = ['dates', 'date', 'games', 'gamePk', 'gameType', 'officialDate', 'status', 'abstractGameState', 'detailedState'].join(',');
const FEED_FIELDS = [
  'gamePk', 'gameData', 'game', 'pk', 'type', 'datetime', 'officialDate', 'status', 'abstractGameState', 'detailedState',
  'venue', 'id', 'name', 'weather', 'condition', 'temp', 'wind', 'teams', 'home', 'away', 'abbreviation',
  'liveData', 'plays', 'allPlays', 'result', 'eventType', 'about', 'atBatIndex', 'inning', 'isTopInning',
  'matchup', 'batter', 'pitcher', 'fullName', 'batSide', 'pitchHand', 'code',
  'playEvents', 'index', 'playId', 'details', 'isInPlay', 'count', 'balls', 'strikes',
  'pitchData', 'startSpeed', 'breaks', 'spinRate',
  'hitData', 'launchSpeed', 'launchAngle', 'totalDistance', 'trajectory', 'hardness', 'location', 'coordinates', 'coordX', 'coordY',
].join(',');

export const scheduleUrl = (date) => `${API}/api/v1/schedule?sportId=1&date=${date}&fields=${SCHEDULE_FIELDS}`;
export const feedUrl = (pk) => `${API}/api/v1.1/game/${pk}/feed/live?fields=${FEED_FIELDS}`;

export const isBlocked = (status) => status === 401 || status === 403 || status === 429;
export const allowPostseason = (env) => String(env?.ALLOW_POSTSEASON ?? '') === '1';

// ---- dates ----
export function laDate(ms) {
  // YYYY-MM-DD for the given instant in America/Los_Angeles
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
}
export function addDays(iso, n) {
  const t = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) + n * 864e5;
  return new Date(t).toISOString().slice(0, 10);
}
export const yesterdayLA = (ms) => addDays(laDate(ms), -1);

// ---- lockbox, gate 1: before any request ----
export function lockboxGate(date, env = {}, firstPost2026 = null) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return { ok: false, reason: `bad date "${date}"` };
  if (allowPostseason(env)) return { ok: true };
  if (date >= LOCKBOX_2026.from && date <= LOCKBOX_2026.to) {
    return { ok: false, reason: `lockbox: ${date} is inside the sealed 2026 postseason window (${LOCKBOX_2026.from} to ${LOCKBOX_2026.to}); nothing requested` };
  }
  if (firstPost2026 && date.startsWith('2026') && date >= firstPost2026) {
    return { ok: false, reason: `lockbox: ${date} is on or after the first 2026 postseason date seen (${firstPost2026}); nothing requested` };
  }
  return { ok: true };
}

// ---- lockbox, gate 2: on the schedule ----
// Keeps final regular-season games (and spring games when INCLUDE_SPRING="1"). Postseason games are skipped unless
// ALLOW_POSTSEASON="1". If a 2026 date lists any postseason game, the whole date is sealed, regular games included.
export function filterSchedule(schedule, date, env = {}) {
  const games = (schedule?.dates || []).flatMap((d) => d.games || []);
  const keep = [];
  const skipped = [];
  const seen = new Set();
  let postseasonSeen = false;
  for (const g of games) {
    const pk = g?.gamePk;
    const type = g?.gameType;
    const st = g?.status || {};
    if (pk == null || seen.has(pk)) continue;
    seen.add(pk);
    if (POSTSEASON_TYPES.has(type)) {
      postseasonSeen = true;
      if (!allowPostseason(env)) { skipped.push({ pk, type, why: 'postseason (lockbox)' }); continue; }
    } else if (type === 'S') {
      if (String(env.INCLUDE_SPRING ?? '') !== '1') { skipped.push({ pk, type, why: 'spring (INCLUDE_SPRING off)' }); continue; }
    } else if (type !== 'R') {
      skipped.push({ pk, type, why: `game type ${type}` });
      continue;
    }
    const ds = String(st.detailedState || '');
    if (st.abstractGameState !== 'Final' || /postponed|cancel|suspend/i.test(ds)) {
      skipped.push({ pk, type, why: `not final (${ds || st.abstractGameState || 'unknown'})` });
      continue;
    }
    keep.push({ pk, type });
  }
  if (postseasonSeen && String(date).startsWith('2026') && !allowPostseason(env)) {
    for (const k of keep) skipped.push({ ...k, why: '2026 date lists postseason games (lockbox seals the whole date)' });
    keep.length = 0;
  }
  return { keep, skipped, postseasonSeen };
}

// ---- extraction ----
const num = (x, d = 1) => {
  if (x === null || x === undefined || x === '') return null;
  const v = Number(x);
  if (!Number.isFinite(v)) return null;
  const f = 10 ** d;
  return Math.round(v * f) / f;
};
export function parseWind(s) {
  // "8 mph, Out To CF" -> { mph: 8, dir: "Out To CF" }; "0 mph, None" -> { mph: 0, dir: "None" }
  const m = /^\s*(\d+(?:\.\d+)?)\s*mph\s*,?\s*(.*)$/i.exec(String(s ?? ''));
  return m ? { mph: Number(m[1]), dir: m[2].trim() || null } : { mph: null, dir: s ? String(s) : null };
}

// One game feed -> { game, balls, players }. A ball is every pitch event that was put in play and carries hitData.
// Short keys mirror apps/web/public/replay.json (science/build_replay.py) where the meaning matches.
export function extractGame(feed, date) {
  const gd = feed?.gameData || {};
  const pk = String(feed?.gamePk ?? gd.game?.pk ?? '');
  const ht = gd.teams?.home?.abbreviation ?? null;
  const at = gd.teams?.away?.abbreviation ?? null;
  const w = gd.weather || {};
  const wind = parseWind(w.wind);
  const vid = gd.venue?.id ?? null;
  const game = {
    gm: pk, d: date, gt: gd.game?.type ?? null, vid, vn: gd.venue?.name ?? null, ht, at,
    temp: num(w.temp, 0), wm: wind.mph, wdir: wind.dir, cond: w.condition ?? null, wind: w.wind ?? null,
    state: gd.status?.detailedState ?? null,
  };
  const balls = [];
  const players = {};
  for (const pl of feed?.liveData?.plays?.allPlays || []) {
    const m = pl.matchup || {};
    const ab = pl.about || {};
    const res = pl.result || {};
    const evs = pl.playEvents || [];
    for (let i = 0; i < evs.length; i++) {
      const e = evs[i];
      const h = e?.hitData;
      if (!h) continue;
      const inPlay = e.details?.isInPlay;
      if (inPlay === false) continue; // tracked foul balls carry hitData too; keep balls in play only
      if (inPlay === undefined && i !== evs.length - 1) continue;
      const b = m.batter?.id ?? null;
      const p = m.pitcher?.id ?? null;
      if (b != null && m.batter?.fullName) players[b] = [m.batter.fullName];
      if (p != null && m.pitcher?.fullName) players[p] = [m.pitcher.fullName];
      balls.push({
        gm: pk, d: date, ab: ab.atBatIndex ?? pl.atBatIndex ?? null, i: e.index ?? i, pid: e.playId ?? null,
        b, p, s: m.batSide?.code ?? null, t: m.pitchHand?.code ?? null,
        park: ht, vid, ht, at, tb: ab.isTopInning === true ? 'Top' : ab.isTopInning === false ? 'Bot' : null, in: ab.inning ?? null,
        bl: e.count?.balls ?? null, sk: e.count?.strikes ?? null,
        pt: e.details?.type?.code ?? null, pv: num(e.pitchData?.startSpeed, 1), rpm: num(e.pitchData?.breaks?.spinRate, 0),
        ev: num(h.launchSpeed, 1), la: num(h.launchAngle, 1), ft: num(h.totalDistance, 0),
        cx: num(h.coordinates?.coordX, 2), cy: num(h.coordinates?.coordY, 2),
        bbt: h.trajectory ?? null, hd: h.hardness ?? null, loc: h.location == null ? null : String(h.location),
        ev_: res.eventType ?? null, hr: res.eventType === 'home_run' ? 1 : 0,
        temp: game.temp, wm: game.wm,
      });
    }
  }
  return { game, balls, players };
}

// ---- one date, resumable ----
// get(url) -> { status, json }. prev = an unfinished day object from an earlier run (resume) or null (fresh start).
// Returns { status, reason?, day?, requests, postseasonSeen }. status: skipped | stopped | partial | complete | error.
export async function runDate({ date, env = {}, get, sleep, maxFeeds = 20, delayMs = 1000, prev = null, firstPost2026 = null, now = new Date().toISOString() }) {
  const gate = lockboxGate(date, env, firstPost2026);
  if (!gate.ok) return { status: 'skipped', reason: gate.reason, requests: 0, postseasonSeen: false };
  if (prev?.meta?.stop && String(env.RETRY_STOPPED ?? '') !== '1') {
    return { status: 'stopped', reason: `stopped earlier (HTTP ${prev.meta.stop.status}); set RETRY_STOPPED=1 to try again`, requests: 0, postseasonSeen: false };
  }
  let requests = 0;
  let postseasonSeen = false;
  let day = prev && prev.meta && !prev.meta.complete ? prev : null;
  if (!day) {
    const r = await get(scheduleUrl(date));
    requests++;
    if (isBlocked(r.status)) return { status: 'stopped', reason: `schedule HTTP ${r.status}; stopped, not working around it`, requests, postseasonSeen };
    if (r.status !== 200 || !r.json) return { status: 'error', reason: `schedule HTTP ${r.status}`, requests, postseasonSeen };
    const f = filterSchedule(r.json, date, env);
    postseasonSeen = f.postseasonSeen;
    if (!f.keep.length) {
      return { status: 'skipped', reason: f.skipped.length ? `no eligible games (${f.skipped.length} skipped)` : 'no games scheduled', skippedGames: f.skipped, requests, postseasonSeen };
    }
    day = {
      meta: {
        date, built: now, source: 'statsapi.mlb.com (schedule + game feed/live)', complete: false,
        pending: f.keep.map((k) => k.pk), done: [], failed: [], skipped: f.skipped, stop: null, requests: 0, runs: 0,
        keys: 'see ops/cron-daily/README.md (short keys mirror apps/web/public/replay.json where they match)',
      },
      players: {}, games: {}, balls: [],
    };
  }
  const meta = day.meta;
  meta.runs += 1;
  meta.updated = now;
  let fed = 0;
  while (meta.pending.length && fed < maxFeeds) {
    const pk = meta.pending[0];
    await sleep(delayMs);
    const r = await get(feedUrl(pk));
    requests++;
    fed++;
    if (isBlocked(r.status)) { meta.stop = { pk, status: r.status, at: now }; break; }
    meta.pending.shift();
    if (r.status !== 200 || !r.json) { meta.failed.push({ pk, status: r.status }); continue; }
    const g = extractGame(r.json, date);
    if (POSTSEASON_TYPES.has(g.game.gt) && !allowPostseason(env)) {
      // belt and braces: the schedule said otherwise, but the feed says postseason. Drop it, keep nothing.
      meta.skipped.push({ pk, type: g.game.gt, why: 'feed says postseason (lockbox); dropped' });
      postseasonSeen = true;
      continue;
    }
    day.games[String(pk)] = g.game;
    day.balls = day.balls.filter((b) => b.gm !== String(pk)).concat(g.balls); // idempotent per game
    Object.assign(day.players, g.players);
    meta.done.push(pk);
  }
  meta.requests += requests;
  meta.complete = meta.pending.length === 0 && !meta.stop;
  meta.summary = { games: Object.keys(day.games).length, balls: day.balls.length, hr: day.balls.filter((b) => b.hr).length };
  const status = meta.stop ? 'stopped' : meta.complete ? 'complete' : 'partial';
  return { status, reason: meta.stop ? `feed HTTP ${meta.stop.status} on game ${meta.stop.pk}; stopped` : undefined, day, requests, postseasonSeen };
}
