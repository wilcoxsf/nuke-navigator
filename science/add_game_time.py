"""Adds the time of day each replay ball was hit, as the park's own local clock time, to apps/web/public/replay.json as "tm" ("19:42") and "tz" (the park's time zone), for the
clock over Oracle's scoreboard in DINGER DEJA-VU (29 Oct, Andrew: the clock should show the right time).
Statcast has no pitch timestamps, so this is an estimate: the game's scheduled first pitch (data/raw/game_context/games.parquet, from the MLB schedule) plus 2.08 minutes per
plate appearance before this one (Savant's at_bat_number; 2023 to 2025 games under the pitch clock ran about 2 h 38 min for about 76 plate appearances, breaks included),
plus 4 minutes for the anthem-to-first-pitch gap. Good to about a quarter of an hour. No network calls. Run after build_replay.py."""
import datetime as dt
import json
from zoneinfo import ZoneInfo

import duckdb

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
RAW = ROOT + "data/raw/statcast_2020_2026/statcast_bbe_{y}_raw.parquet"
P = ROOT + "apps/web/public/replay.json"
TZ = {"SF": "America/Los_Angeles", "LAD": "America/Los_Angeles", "SD": "America/Los_Angeles", "LAA": "America/Los_Angeles", "SEA": "America/Los_Angeles", "ATH": "America/Los_Angeles",
      "OAK": "America/Los_Angeles", "AZ": "America/Phoenix", "ARI": "America/Phoenix", "COL": "America/Denver", "TEX": "America/Chicago", "HOU": "America/Chicago", "KC": "America/Chicago",
      "STL": "America/Chicago", "CHC": "America/Chicago", "CWS": "America/Chicago", "MIL": "America/Chicago", "MIN": "America/Chicago", "ATL": "America/New_York", "MIA": "America/New_York",
      "NYM": "America/New_York", "NYY": "America/New_York", "PHI": "America/New_York", "WSH": "America/New_York", "PIT": "America/New_York", "CIN": "America/New_York",
      "BOS": "America/New_York", "BAL": "America/New_York", "TB": "America/New_York", "TOR": "America/Toronto", "CLE": "America/New_York", "DET": "America/Detroit"}
MIN_PER_PA, PRE = 2.08, 4.0

R = json.load(open(P, encoding="utf-8"))
balls = R["balls"]
c = duckdb.connect()
start = {str(g): s for g, s in c.sql(f"SELECT game_pk, start_utc FROM read_parquet('{ROOT}data/raw/game_context/games.parquet')").fetchall()}
src = " UNION ALL ".join(
    f"SELECT game_pk, batter, pitcher, inning, inning_topbot, pitch_number, at_bat_number FROM read_parquet('{RAW.format(y=y)}')" for y in (2023, 2024, 2025, 2026))
ab = {}
for g, b, p, i, tb, pn, n in c.sql(src).fetchall():
    ab.setdefault((str(g), str(b), str(p), str(i), tb, str(pn)), set()).add(int(n))
num = lambda v: str(int(float(v))) if v is not None else None
hit = miss = 0
for x in balls:
    s = start.get(num(x.get("gm")))
    k = (num(x.get("gm")), num(x.get("b")), num(x.get("p")), num(x.get("in")), x.get("tb"), num(x.get("pn")))
    n = ab.get(k)
    if not s or not n or len(n) != 1:
        miss += 1
        continue
    t0 = dt.datetime.fromisoformat(s.replace("Z", "+00:00"))
    tz = TZ.get(x.get("park"), "America/Los_Angeles")
    t = (t0 + dt.timedelta(minutes=PRE + MIN_PER_PA * (next(iter(n)) - 1))).astimezone(ZoneInfo(tz))
    x["tm"], x["tz"] = t.strftime("%H:%M"), tz
    hit += 1
json.dump(R, open(P, "w", encoding="utf-8"), separators=(",", ":"))
print("balls", len(balls), "timed", hit, "no match", miss)
