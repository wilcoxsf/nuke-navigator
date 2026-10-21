"""Park-reported game weather (condition, temperature, wind speed and direction relative to the field) for Giants games,
from the official MLB StatsAPI schedule with hydrate=weather. One request per season, a pause between calls, stops on any non-200.

Wind text looks like "9 mph, Out To CF" or "25 mph, L To R". It is converted to a field-frame vector: along = toward center field,
cross = toward right field, in m/s. Directions are quantized (center, the two corners, and across the field), so the angle is approximate.

Usage: python pull_sf_wind.py <out.parquet> <first_year> <last_year>
"""
from __future__ import annotations

import re
import sys
import time

import duckdb
import numpy as np
import pandas as pd
import requests

UA = "nuke-navigator-research/0.1 (personal project)"
MPH = 0.44704
# angle the wind blows TOWARD, clockwise from center field (positive = toward right field)
TOWARD = {"out to cf": 0, "out to rf": 30, "out to lf": -30, "in from cf": 180, "in from lf": 150, "in from rf": -150,
          "l to r": 90, "r to l": -90}


def parse(text: str | None):
    if not text:
        return np.nan, np.nan, np.nan
    m = re.match(r"\s*(\d+)\s*mph\s*,\s*(.+?)\s*$", text)
    if not m:
        return 0.0, np.nan, np.nan  # "None", "Calm", unparseable: no usable direction
    speed, where = int(m.group(1)) * MPH, m.group(2).lower()
    th = TOWARD.get(where)
    if th is None:
        return speed, np.nan, np.nan
    return speed, speed * np.cos(np.deg2rad(th)), speed * np.sin(np.deg2rad(th))


def main() -> None:
    out, y0, y1 = sys.argv[1].replace("\\", "/"), int(sys.argv[2]), int(sys.argv[3])
    rows = []
    for y in range(y0, y1 + 1):
        r = requests.get("https://statsapi.mlb.com/api/v1/schedule",
                         params={"sportId": 1, "teamId": 137, "startDate": f"{y}-03-01", "endDate": f"{y}-11-15", "hydrate": "weather",
                                 "gameType": "R,F,D,L,W"}, headers={"User-Agent": UA}, timeout=90)
        if r.status_code != 200:
            raise SystemExit(f"{y}: HTTP {r.status_code}, stopping")
        n = 0
        for d in r.json().get("dates", []):
            for g in d["games"]:
                w = g.get("weather") or {}
                speed, along, cross = parse(w.get("wind"))
                rows.append((g["gamePk"], g["officialDate"], g["venue"]["id"], w.get("condition"), w.get("temp"), w.get("wind"), speed, along, cross))
                n += 1
        print(y, n, "games", flush=True)
        time.sleep(3)
    df = pd.DataFrame(rows, columns=["game_pk", "official_date", "venue_id", "condition", "temp_f", "wind_text", "pw_speed_ms", "pw_along", "pw_cross"])
    df["temp_f"] = pd.to_numeric(df.temp_f, errors="coerce")
    con = duckdb.connect()
    con.register("df", df)
    con.sql(f"COPY df TO '{out}' (FORMAT parquet)")
    print(df[df.venue_id == 2395].wind_text.str.replace(r"^\d+ mph, ", "", regex=True).value_counts().head(12).to_string())


if __name__ == "__main__":
    main()
