// Offline tests: fabricated schedules and feeds only. No network (global fetch is replaced with a thrower).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterSchedule, lockboxGate, runDate, yesterdayLA, extractGame, parseWind } from '../src/core.js';
import { job } from '../src/index.js';

globalThis.fetch = () => { throw new Error('network is off in tests'); };
const nosleep = async () => {};
const final = { abstractGameState: 'Final', detailedState: 'Final' };
const g = (gamePk, gameType, status = final) => ({ gamePk, gameType, status });

// a fabricated schedule with every game type
const mixed = {
  dates: [{
    date: 'x', games: [
      g(1, 'R'), g(2, 'R', { abstractGameState: 'Final', detailedState: 'Postponed' }), g(3, 'R', { abstractGameState: 'Live', detailedState: 'In Progress' }),
      g(4, 'S'), g(5, 'E'), g(6, 'A'), g(7, 'F'), g(8, 'D'), g(9, 'L'), g(10, 'W'), g(1, 'R'),
    ],
  }],
};

test('regular-season date outside 2026: postseason games skipped, final R kept, others skipped with reasons', () => {
  const f = filterSchedule(mixed, '2025-10-01', {});
  assert.deepEqual(f.keep.map((k) => k.pk), [1]);
  assert.equal(f.postseasonSeen, true);
  const why = Object.fromEntries(f.skipped.map((s) => [s.pk, s.why]));
  for (const pk of [7, 8, 9, 10]) assert.match(why[pk], /postseason \(lockbox\)/);
  assert.match(why[2], /Postponed/); assert.match(why[3], /not final/);
  assert.match(why[4], /spring/); assert.match(why[5], /type E/); assert.match(why[6], /type A/);
});

test('a 2026 date whose schedule lists any postseason game is sealed entirely, R games included', () => {
  const f = filterSchedule(mixed, '2026-09-27', {});
  assert.equal(f.keep.length, 0);
  assert.ok(f.skipped.some((s) => s.pk === 1 && /seals the whole date/.test(s.why)));
});

test('ALLOW_POSTSEASON="1" lets postseason through; INCLUDE_SPRING="1" adds spring', () => {
  const f = filterSchedule(mixed, '2026-10-20', { ALLOW_POSTSEASON: '1', INCLUDE_SPRING: '1' });
  assert.deepEqual(f.keep.map((k) => k.pk).sort((a, b) => a - b), [1, 4, 7, 8, 9, 10]);
  assert.equal(filterSchedule(mixed, '2025-10-01', { ALLOW_POSTSEASON: 'true' }).keep.length, 1, 'only the exact string "1" unlocks');
});

test('gate 1 (before any request): 2026 postseason window and dates after the first postseason date are refused', () => {
  assert.equal(lockboxGate('2026-09-20', {}).ok, true);
  assert.equal(lockboxGate('2026-09-27', {}).ok, true);
  for (const d of ['2026-09-28', '2026-10-25', '2026-11-04', '2026-12-31']) assert.equal(lockboxGate(d, {}).ok, false, d);
  assert.equal(lockboxGate('2026-09-26', {}, '2026-09-26').ok, false);
  assert.equal(lockboxGate('2026-09-25', {}, '2026-09-26').ok, true);
  assert.equal(lockboxGate('2027-04-01', {}).ok, true);
  assert.equal(lockboxGate('2026-10-25', { ALLOW_POSTSEASON: '1' }).ok, true);
  assert.equal(lockboxGate('not-a-date', {}).ok, false);
});

test('runDate on a sealed date makes zero requests', async () => {
  let calls = 0;
  const res = await runDate({ date: '2026-10-25', get: async () => { calls++; return { status: 200, json: mixed }; }, sleep: nosleep });
  assert.equal(res.status, 'skipped'); assert.equal(calls, 0); assert.equal(res.requests, 0);
});

test('runDate on a 2026 schedule that turns out to list postseason games: 1 schedule request, no feeds', async () => {
  const urls = [];
  const res = await runDate({ date: '2026-09-26', get: async (u) => { urls.push(u); return { status: 200, json: mixed }; }, sleep: nosleep });
  assert.equal(res.status, 'skipped'); assert.equal(urls.length, 1); assert.match(urls[0], /\/schedule\?/); assert.equal(res.postseasonSeen, true);
});

test('runDate drops a feed that says postseason even if the schedule said R', async () => {
  const sched = { dates: [{ games: [g(11, 'R')] }] };
  const feed = { gamePk: 11, gameData: { game: { type: 'W' } }, liveData: { plays: { allPlays: [] } } };
  const res = await runDate({ date: '2025-09-20', sleep: nosleep, get: async (u) => ({ status: 200, json: u.includes('schedule') ? sched : feed }) });
  assert.equal(res.day.balls.length, 0); assert.equal(Object.keys(res.day.games).length, 0);
  assert.ok(res.day.meta.skipped.some((s) => s.pk === 11 && /feed says postseason/.test(s.why)));
});

test('stops on 401/403/429 and records the stop', async () => {
  for (const code of [401, 403, 429]) {
    const sched = { dates: [{ games: [g(21, 'R'), g(22, 'R')] }] };
    let n = 0;
    const res = await runDate({ date: '2025-09-20', sleep: nosleep, get: async (u) => { n++; return u.includes('schedule') ? { status: 200, json: sched } : { status: code, json: null }; } });
    assert.equal(res.status, 'stopped'); assert.equal(res.day.meta.stop.status, code); assert.equal(n, 2, 'no request after the block');
  }
});

test('yesterday in Los Angeles', () => {
  assert.equal(yesterdayLA(Date.parse('2026-09-21T10:00:00Z')), '2026-09-20'); // 3 am PDT on the 21st
  assert.equal(yesterdayLA(Date.parse('2026-09-21T06:00:00Z')), '2026-09-19'); // still the 20th in LA
  assert.equal(parseWind('8 mph, Out To CF').mph, 8);
});

// fabricated feed with a home run, a tracked foul, and a groundout
const feedFor = (pk) => ({
  gamePk: pk,
  gameData: { game: { pk, type: 'R' }, venue: { id: 2395, name: 'Oracle Park' }, teams: { home: { abbreviation: 'SF' }, away: { abbreviation: 'LAD' } }, weather: { condition: 'Clear', temp: '61', wind: '12 mph, In From CF' } },
  liveData: { plays: { allPlays: [
    { about: { atBatIndex: 0, inning: 1, isTopInning: true }, result: { eventType: 'home_run' }, matchup: { batter: { id: 1, fullName: 'A Batter' }, pitcher: { id: 2, fullName: 'P Pitcher' }, batSide: { code: 'L' }, pitchHand: { code: 'R' } },
      playEvents: [
        { index: 0, details: { isInPlay: false, type: { code: 'FF' } }, hitData: { launchSpeed: 99 } },
        { index: 1, playId: 'u1', details: { isInPlay: true, type: { code: 'SL' } }, count: { balls: 1, strikes: 1 }, pitchData: { startSpeed: 86.4, breaks: { spinRate: 2450 } }, hitData: { launchSpeed: 104.2, launchAngle: 28, totalDistance: 412, trajectory: 'fly_ball', hardness: 'hard', location: '8', coordinates: { coordX: 120.5, coordY: 30.2 } } },
      ] },
    { about: { atBatIndex: 1, inning: 1, isTopInning: true }, result: { eventType: 'field_out' }, matchup: { batter: { id: 3, fullName: 'C Batter' }, pitcher: { id: 2, fullName: 'P Pitcher' }, batSide: { code: 'R' }, pitchHand: { code: 'R' } },
      playEvents: [{ index: 0, details: { isInPlay: true, type: { code: 'FF' } }, hitData: { launchSpeed: 80, launchAngle: -5, totalDistance: 20, trajectory: 'ground_ball', hardness: 'soft', location: '6', coordinates: { coordX: 110, coordY: 160 } } }] },
  ] } },
});

test('extractGame: in-play balls only, short keys, weather', () => {
  const { game, balls, players } = extractGame(feedFor(31), '2025-09-20');
  assert.equal(balls.length, 2);
  assert.equal(game.temp, 61); assert.equal(game.wm, 12); assert.equal(game.wdir, 'In From CF'); assert.equal(game.vn, 'Oracle Park');
  const hr = balls[0];
  assert.deepEqual([hr.ev, hr.la, hr.ft, hr.cx, hr.cy, hr.hr, hr.ev_, hr.tb, hr.s, hr.t, hr.pt, hr.loc, hr.bbt, hr.hd], [104.2, 28, 412, 120.5, 30.2, 1, 'home_run', 'Top', 'L', 'R', 'SL', '8', 'fly_ball', 'hard']);
  assert.deepEqual(players[1], ['A Batter']);
});

// fake R2 and KV for the Worker path
function fakeEnv(vars = {}) {
  const r2 = new Map(); const kv = new Map();
  return {
    ...vars, r2, kv,
    DAILY: { get: async (k) => (r2.has(k) ? { json: async () => JSON.parse(r2.get(k)) } : null), put: async (k, v) => { r2.set(k, v); } },
    INDEX: { get: async (k, t) => (kv.has(k) ? (t === 'json' ? JSON.parse(kv.get(k)) : kv.get(k)) : null), put: async (k, v) => { kv.set(k, v); } },
  };
}

test('Worker job: builds a day over several runs, then leaves it alone; lockbox date makes no request', async () => {
  const sched = { dates: [{ games: [g(41, 'R'), g(42, 'R'), g(43, 'R'), g(44, 'P')] }] };
  const env = fakeEnv({ MAX_FEEDS_PER_RUN: '2' });
  const urls = [];
  const get = async (u) => { urls.push(u); return { status: 200, json: u.includes('schedule') ? sched : feedFor(Number(u.match(/game\/(\d+)/)[1])) }; };
  const t = Date.parse('2025-09-21T10:00:00Z');
  const a = await job(env, t, { get, sleep: nosleep });
  assert.equal(a.status, 'partial'); assert.equal(urls.length, 3);
  const b = await job(env, t, { get, sleep: nosleep });
  assert.equal(b.status, 'complete'); assert.equal(urls.length, 4, 'resumed without refetching the schedule');
  const c = await job(env, t, { get, sleep: nosleep });
  assert.equal(c.status, 'complete'); assert.equal(urls.length, 4, 'finished date: no requests');
  const day = JSON.parse(env.r2.get('days/2025-09-20.json'));
  assert.equal(day.balls.length, 6); assert.equal(day.meta.summary.hr, 3); assert.equal(env.kv.get('latest'), '2025-09-20');

  const env2 = fakeEnv();
  const n0 = urls.length;
  const d = await job(env2, Date.parse('2026-10-26T10:00:00Z'), { get, sleep: nosleep });
  assert.equal(d.status, 'skipped'); assert.equal(urls.length, n0); assert.equal(env2.r2.size, 0);
  assert.match(d.reason, /lockbox/);
});

test('Worker job without bindings does nothing', async () => {
  const r = await job({}, Date.now(), { get: async () => { throw new Error('should not fetch'); }, sleep: nosleep });
  assert.equal(r.status, 'unbound');
});
