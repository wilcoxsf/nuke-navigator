// Nightly batted-ball collector for Nuke Navigator (Cloudflare Worker, cron only).
// Each run works on "yesterday" in America/Los_Angeles: schedule -> final regular-season games -> live feeds ->
// one compact JSON per date in R2 (days/YYYY-MM-DD.json) plus a small status index in KV.
// A day is built over several short cron runs (MAX_FEEDS_PER_RUN feeds each) so each run stays inside the
// free-plan CPU budget; later runs resume from the pending list saved in the day object.
// The 2026 postseason is sealed (see core.js lockboxGate / filterSchedule and README.md).
import { runDate, yesterdayLA, UA } from './core.js';

async function httpGet(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!r.ok) {
    try { await r.body?.cancel(); } catch { /* ignore */ }
    return { status: r.status, json: null };
  }
  return { status: r.status, json: await r.json() };
}
const realSleep = (ms) => new Promise((res) => setTimeout(res, ms));

// deps lets the offline test swap in a fake fetch and a zero sleep
export async function job(env, scheduledTime, deps = {}) {
  const get = deps.get || httpGet;
  const sleep = deps.sleep || realSleep;
  if (!env.DAILY || !env.INDEX) {
    console.log('cron-daily: R2 binding DAILY or KV binding INDEX missing; nothing done (see README.md)');
    return { status: 'unbound' };
  }
  const date = env.FORCE_DATE || yesterdayLA(scheduledTime ?? Date.now());
  const now = new Date(scheduledTime ?? Date.now()).toISOString();
  const key = `days/${date}.json`;
  const idx = await env.INDEX.get(`day:${date}`, 'json');
  if (idx && ['complete', 'skipped', 'stopped'].includes(idx.status)) return idx; // finished for this date

  // count attempts before doing any work, so a run killed mid-way (CPU limit) still counts and a date cannot loop forever
  const attempts = (idx?.attempts || 0) + 1;
  const maxAttempts = Number(env.MAX_ATTEMPTS || 30);
  if (attempts > maxAttempts) {
    const s = { ...idx, date, status: 'stopped', reason: `gave up after ${maxAttempts} runs`, updated: now };
    await env.INDEX.put(`day:${date}`, JSON.stringify(s));
    return s;
  }
  await env.INDEX.put(`day:${date}`, JSON.stringify({ ...(idx || { date, status: 'started' }), attempts, updated: now }));

  const firstPost2026 = await env.INDEX.get('lockbox:first_post_2026');
  let prev = null;
  if (idx?.status === 'partial') {
    const obj = await env.DAILY.get(key);
    prev = obj ? await obj.json() : null;
  }
  const res = await runDate({
    date, env, get, sleep, prev, firstPost2026, now,
    maxFeeds: Math.max(1, Math.min(20, Number(env.MAX_FEEDS_PER_RUN || 2))),
    delayMs: Number(env.DELAY_MS || 1000),
  });

  if (res.postseasonSeen && date.startsWith('2026') && !firstPost2026) {
    await env.INDEX.put('lockbox:first_post_2026', date);
  }
  if (res.day) {
    await env.DAILY.put(key, JSON.stringify(res.day), { httpMetadata: { contentType: 'application/json' } });
  }
  const summary = { date, status: res.status, reason: res.reason ?? null, updated: now, attempts, requests: res.requests, ...(res.day ? res.day.meta.summary : {}) };
  await env.INDEX.put(`day:${date}`, JSON.stringify(summary));
  if (res.status === 'complete') {
    const latest = await env.INDEX.get('latest');
    if (!latest || date > latest) await env.INDEX.put('latest', date);
  }
  console.log('cron-daily', JSON.stringify(summary));
  return summary;
}

export default {
  async scheduled(controller, env, ctx) {
    await job(env, controller.scheduledTime);
  },
  // No public HTTP surface: the browser will read the data through the Pages site (see README.md).
  async fetch() {
    return new Response('not found', { status: 404 });
  },
};
