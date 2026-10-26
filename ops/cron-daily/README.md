# cron-daily: nightly batted-ball collector

Status: built and tested locally, NOT deployed, cron trigger commented out, no Cloudflare resources created.
Approved 26 Oct 2026 on two conditions: it stays off until Andrew turns it on, and it skips the 2026 postseason until the lockbox test has been run.

## What it does

Every night it collects the previous day's batted balls (yesterday in America/Los_Angeles) for Blast Bulletin and Daily Dinger. It only collects and stores. Scoring (model odds, "gone at Oracle Park") happens in the browser later.

1. Lockbox gate (no request yet): refuse the date if it is inside the sealed 2026 postseason window (see below).
2. One schedule request: `statsapi.mlb.com/api/v1/schedule?sportId=1&date=YYYY-MM-DD`, trimmed with `fields=` so no scores come back. Keep final regular-season games (`gameType` R). Spring (S) only if `INCLUDE_SPRING="1"`. Exhibition (E) and all-star (A) are always skipped, as are postponed, cancelled, suspended and unfinished games.
3. One live-feed request per kept game: `/api/v1.1/game/{gamePk}/feed/live`, trimmed with `fields=` to about 200-270 KB. Sequential, 1 s apart, at most 20 a date. It stops on 401, 403 or 429 and records the stop. It never retries around a block.
4. It extracts every pitch put in play that carries `hitData` and writes one JSON per date to R2 (`days/YYYY-MM-DD.json`) plus a status line in KV.

The User-Agent is `nuke-navigator-research/0.1 (personal project)`. The worker uses the MLB Stats API only and never touches Baseball Savant.

Re-running a date writes to the same key and replaces each game's balls, so a re-run never duplicates data.

## The postseason lockbox

The 2026 postseason is a sealed evaluation set. Until Andrew runs the one-shot lockbox test, this job must not pull any of those outcomes into the project. Four layers enforce that:

- Date gate, before any request: dates from 2026-09-28 (the day after the scheduled end of the regular season) to 2026-12-31 are refused outright. The worker makes no schedule request and no feed request for them.
- First-postseason marker: if a 2026 schedule ever lists a postseason game (F, D, L, W), the worker skips that entire date, regular-season games included. It also stores the date in KV as `lockbox:first_post_2026`, and every 2026 date on or after it is then refused before any request.
- Type filter, every year: postseason `gameType`s are always skipped.
- Feed check: if a feed reports a postseason game type even though the schedule did not, the worker drops it and keeps nothing.

Only `ALLOW_POSTSEASON="1"` (that exact string) opens the lockbox. The local dry run never reads that variable, so it cannot open the lockbox.

## Files

- `wrangler.toml`: worker config. The cron is commented out and the bindings are placeholders.
- `src/core.js`: shared logic for the lockbox gates, the schedule filter, extraction and the resumable per-date run. It contains no Cloudflare APIs.
- `src/index.js`: the Worker. It has a `scheduled` handler and returns 404 to any HTTP request.
- `dryrun.mjs`: the local run for one date. It writes to `scratch/cron_dryrun/`.
- `test/lockbox.test.mjs`: offline tests. They use fabricated schedules and feeds, fake R2 and KV, and have the network switched off. Run them with `npm test`.

## Storage choice: R2 for days, KV for the index

- R2 (`DAILY`) holds one object per date, about 280 KB for a 15-game day, or roughly 55 MB a season. R2 has no egress fees, generous free reads, and handles objects this size easily. A Pages Function can bind the same bucket and stream a file straight to the browser.
- KV (`INDEX`) holds tiny keys: `day:YYYY-MM-DD` (status, attempts, games, balls, hr), `latest` (newest complete date) and `lockbox:first_post_2026`. These are fast edge lookups for "what is the newest day" without opening the big object. A day object would not belong in KV, because KV's free plan allows only 1,000 writes a day and each read is eventually consistent.
- D1 is not needed. Nothing here queries across days. If season-wide queries ("every 440 ft home run this year") are wanted later, a D1 table can be added next to R2.

## Fitting the free plan

The Workers free plan allows about 10 ms of CPU per invocation. Measured on the dry run, each trimmed feed parses in about 2-3 ms, and the full day object takes a few ms to serialize. So each cron run handles `MAX_FEEDS_PER_RUN = 2` games and saves its progress (the pending list lives in the day object). The cron fires every 5 minutes from 10:00 to 11:55 UTC, which gives up to 24 runs a night. A 15-game night finishes in about 8 runs. Every later run reads one KV key and exits.

`MAX_ATTEMPTS = 30` caps the runs per date, counting runs that the CPU limit killed part-way. If the dashboard shows "exceeded CPU" errors, set `MAX_FEEDS_PER_RUN = "1"`. On Workers Paid ($5/month), set it to `"20"` and one run per night is enough.

Cost on the free tier is $0:

| Service | Free allowance | This job |
|---|---|---|
| Workers | 100k requests/day, 5 cron triggers | 24 invocations/day, 1 trigger, at most 3 subrequests per run |
| R2 | 10 GB storage, 1M writes and 10M reads a month | about 55 MB a season, about 8 writes a day |
| KV | 100k reads and 1k writes a day | about 50 reads and 50 writes a day at most |

## Data format (`days/YYYY-MM-DD.json`)

```
{ meta:    { date, built, updated, complete, pending, done, failed, skipped, stop, requests, runs, summary: {games, balls, hr} },
  players: { "<id>": ["Full Name"] },
  games:   { "<gamePk>": { gm, d, gt, vid, vn, ht, at, temp, wm, wdir, cond, wind, state } },
  balls:   [ { ...one per ball in play... } ] }
```

Ball keys. Where the meaning matches, they mirror `apps/web/public/replay.json` (`science/build_replay.py`).

| key | meaning | source in feed |
|---|---|---|
| gm, d | game_pk (string), date | gamePk, run date |
| ab, i, pid | at-bat index, pitch-event index, playId (uuid) | about.atBatIndex, playEvents[].index, playId |
| b, p | batter id, pitcher id (names in `players`) | matchup.batter/pitcher |
| s, t | bat side, pitch hand | matchup.batSide/pitchHand.code |
| park, vid, ht, at | home team abbreviation, venue id, home team, away team | gameData.teams, gameData.venue |
| tb, in | "Top"/"Bot", inning | about.isTopInning, about.inning |
| bl, sk | balls, strikes before the pitch | playEvents[].count |
| pt, pv, rpm | pitch type, release speed (mph), spin rate | details.type.code, pitchData |
| ev, la, ft | exit velocity, launch angle, total distance (ft) | hitData.launchSpeed/launchAngle/totalDistance |
| cx, cy | hit coordinates (same scale as Statcast hc_x/hc_y) | hitData.coordinates.coordX/coordY |
| bbt, hd, loc | trajectory, hardness, fielder location ("8", "78") | hitData.trajectory/hardness/location |
| ev_, hr | play result (Statcast `events` vocabulary), 1 if home run | result.eventType |
| temp, wm | game temperature (F) and wind mph as posted by MLB | gameData.weather |

Differences from replay.json to keep in mind:

- `temp` and `wm` here are MLB's posted game weather, not the Open-Meteo values the model uses. The wind direction text ("Out To CF") and the condition ("Roof Closed", "Dome") are in `games`.
- There is no `dir` field. The browser can compute the bearing from `cx`, `cy` the usual way: `atan2(cx - 125.42, 198.27 - cy)` in degrees.
- `loc` is a string because the feed uses two-fielder codes like "78".

## What the browser will read (later, not built)

A small Pages Function in the site, for example `apps/web/functions/api/daily/[date].js`, behind the existing token middleware. It would bind the same R2 bucket and KV namespace to the Pages project:

- `GET /api/daily/latest` reads KV `latest`, then returns the R2 object for that date.
- `GET /api/daily/2026-09-20` returns `days/2026-09-20.json`.

It should serve only objects with `meta.complete === true`. Blast Bulletin filters `hr == 1` and near misses (for example `ft >= 370 && !hr`), then scores them with the model in the browser. Daily Dinger picks a few balls from the same file. This step needs a deploy of the site, so it is left for Andrew.

## Local dry run and tests

```
cd ops/cron-daily
npm test                          # offline, no network
node dryrun.mjs 2026-09-20        # 1 schedule + up to 20 feeds, 1 s apart; refuses lockbox dates
```

The output goes to `scratch/cron_dryrun/<date>.json`, with a per-request log in `<date>.requests.json`.

## How Andrew enables it

From `C:\Users\andrewwi\dev\nuke-navigator-new\ops\cron-daily`, logged in to his personal Cloudflare account (`npx wrangler whoami`; `npx wrangler login` if needed):

1. `npm test` (all tests should pass), then `npx wrangler deploy --dry-run` to check that the bundle builds (it uploads nothing).
2. `npx wrangler r2 bucket create nuke-navigator-daily`
3. `npx wrangler kv namespace create INDEX`, then copy the `id` it prints.
4. In `wrangler.toml`, uncomment the `[[r2_buckets]]` block and the `[[kv_namespaces]]` block, and paste the id in place of `PASTE_KV_NAMESPACE_ID_HERE`.
5. In `wrangler.toml`, uncomment the two `[triggers]` lines.
6. Leave `ALLOW_POSTSEASON = "0"`.
7. `npx wrangler deploy`
8. Watch the first night with `npx wrangler tail nuke-navigator-cron-daily`, or check the newest complete date with `npx wrangler kv key get latest --binding INDEX --remote`.

Until the 2026 postseason ends, every night is a lockbox date, so the worker logs "skipped" and makes no requests. The first real data arrives with spring training (if `INCLUDE_SPRING="1"`) or Opening Day 2027.

Other operations:

- Turn it off again: comment out `[triggers]` and run `npx wrangler deploy`, or delete the worker with `npx wrangler delete nuke-navigator-cron-daily`.
- Backfill one date: set `FORCE_DATE = "YYYY-MM-DD"` under `[vars]` and deploy. The next night's runs work on that date. Remove the line afterwards.
- Rebuild a finished date: `npx wrangler kv key delete "day:YYYY-MM-DD" --binding INDEX --remote`, then use `FORCE_DATE`. The rebuild writes over the same R2 object.
- After the lockbox test: set `ALLOW_POSTSEASON = "1"` and deploy. Delete the `day:` keys for any postseason dates you want backfilled (they are marked "skipped"), then run `FORCE_DATE` once per date.

## Known limits

- A suspended game that resumes on a later date is collected on the resume date, with all its balls (including those from the first day) dated to that day.
- A few balls carry `hitData` without speed, angle or distance (2 of 720 on 2026-09-20). Those fields are null.
- The bundle has not been checked with wrangler, because wrangler is not installed locally and `npx` would download it. `npx wrangler deploy --dry-run` is the first thing to run when enabling. The Worker module itself is exercised by the offline tests under node.
