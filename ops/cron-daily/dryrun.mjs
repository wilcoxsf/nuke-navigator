// Local dry run of the nightly job for ONE regular-season date. No Cloudflare involved.
//   node ops/cron-daily/dryrun.mjs 2026-09-20
// Writes scratch/cron_dryrun/<date>.json (the same object the Worker would put in R2) and <date>.requests.json
// (one line per request: url, status, bytes, parse time). One schedule request, then at most 20 game feeds, 1 s apart.
// ALLOW_POSTSEASON is never read here: the dry run cannot open the lockbox.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runDate, lockboxGate, UA } from './src/core.js';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '..', '..', 'scratch', 'cron_dryrun');
const date = process.argv[2];
if (!date) { console.error('usage: node dryrun.mjs YYYY-MM-DD'); process.exit(2); }
const gate = lockboxGate(date, {});
if (!gate.ok) { console.error('refused:', gate.reason); process.exit(3); }

const log = [];
async function get(url) {
  const t0 = Date.now();
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  const text = await r.text();
  const p0 = performance.now();
  let json = null;
  if (r.ok) { try { json = JSON.parse(text); } catch { json = null; } }
  const parseMs = +(performance.now() - p0).toFixed(1);
  const row = { n: log.length + 1, url: url.replace(/\?.*$/, ''), status: r.status, bytes: text.length, parseMs, ms: Date.now() - t0 };
  log.push(row);
  console.log(`request ${row.n}: ${row.status} ${row.url} ${(row.bytes / 1024).toFixed(0)} KB, parse ${parseMs} ms`);
  return { status: r.status, json };
}
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const res = await runDate({ date, env: {}, get, sleep, maxFeeds: 20, delayMs: 1000 });
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, `${date}.requests.json`), JSON.stringify(log, null, 1));
console.log('status:', res.status, res.reason || '', '| requests:', res.requests);
if (res.day) {
  writeFileSync(join(OUT, `${date}.json`), JSON.stringify(res.day));
  const s = res.day.meta.summary;
  console.log(`games ${s.games}, batted balls ${s.balls}, home runs ${s.hr}, skipped games ${res.day.meta.skipped.length}, failed ${res.day.meta.failed.length}, pending ${res.day.meta.pending.length}`);
  console.log('wrote', join(OUT, `${date}.json`));
} else if (res.skippedGames) {
  console.log('skipped:', JSON.stringify(res.skippedGames));
}
