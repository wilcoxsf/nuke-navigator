"""Game-day weather from the MLB Stats API (official, free): schedule?hydrate=weather returns per game the condition, temperature and a STADIUM-RELATIVE wind text ('9 mph, Out To RF', 'L To R', 'In From CF', 'None'), and 'Roof Closed'.
andrew-web-research rules: official API, identified User-Agent, one request per second, 14-day windows (about 300 calls for 2015 to the end of the 2026 regular season, no postseason so the lockbox stays untouched), stop on the first 401/403/429 or repeated error, nothing scheduled.
Output: data/derived/game_weather_raw.parquet (gamePk, date, venue id, condition, temp, wind text). Usage: python science/pull_game_weather.py [--max-calls 400]"""
import argparse
import datetime as dt
import json
import time
import urllib.error
import urllib.request

import pandas as pd

ap = argparse.ArgumentParser()
ap.add_argument("--max-calls", type=int, default=400)
a = ap.parse_args()
UA = "nuke-navigator-research/0.1 (personal project)"
ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
rows, calls = [], 0
start = dt.date(2015, 3, 25)
end = dt.date(2026, 9, 27)
cur = start
OUT = ROOT + "data/derived/game_weather_raw.parquet"
try:  # resume: the file holds what earlier runs fetched (a connection reset stopped the first run at 2017-08-09)
    old = pd.read_parquet(OUT)
    rows = old.to_dict("records")
    cur = max(start, pd.to_datetime(old.date).max().date() + dt.timedelta(days=1))
    print("resuming from", cur, "with", len(rows), "games already held")
except Exception:
    pass
while cur <= end and calls < a.max_calls:
    stop = min(cur + dt.timedelta(days=13), end)
    url = f"https://statsapi.mlb.com/api/v1/schedule?sportId=1&gameType=R&startDate={cur}&endDate={stop}&hydrate=weather"
    d, err = None, None
    for wait in (0, 6, 20):  # a dropped connection gets two polite retries; an HTTP error status (401/403/429/5xx) stops everything at once
        time.sleep(wait)
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=40) as r:
                d = json.load(r)
            break
        except urllib.error.HTTPError as e:
            err = "HTTP %s" % e.code
            break
        except Exception as e:
            err = str(e)
    if d is None:
        print("stopping at", cur, "after", err)
        break
    calls += 1
    for day in d.get("dates", []):
        for g in day.get("games", []):
            w = g.get("weather") or {}
            rows.append({"game_pk": g.get("gamePk"), "date": day.get("date"), "venue_id": (g.get("venue") or {}).get("id"), "condition": w.get("condition"), "temp": w.get("temp"), "wind": w.get("wind")})
    if calls % 20 == 0:
        print("calls", calls, "through", stop, "games", len(rows), flush=True)
    cur = stop + dt.timedelta(days=1)
    time.sleep(1.0)
df = pd.DataFrame(rows)
df.to_parquet(OUT)
print("calls", calls, "games", len(df), "with wind text", int(df.wind.notna().sum()), "through", cur)
print(df.wind.value_counts().head(12).to_string())
print(df.condition.value_counts().head(10).to_string())
