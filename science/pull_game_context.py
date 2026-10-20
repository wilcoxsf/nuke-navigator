"""Game context from public official APIs: MLB schedule (venue, coordinates, roof, fence distances, start time)
and Open-Meteo's historical weather archive (hourly temperature, humidity, pressure, wind) at each stadium.

Polite and bounded: one request at a time, a pause between calls, stops on any 429. Raw responses are cached.

Usage: python pull_game_context.py <out_dir> <first_year> <last_year>
Outputs: games.parquet (one row per game) and game_weather.parquet (weather averaged over the game window).
"""
from __future__ import annotations

import json
import math
import sys
import time
from pathlib import Path

import duckdb
import requests

SCHEDULE = "https://statsapi.mlb.com/api/v1/schedule"
OPEN_METEO = "https://archive-api.open-meteo.com/v1/archive"
UA = "nuke-navigator-research/0.1 (personal project)"
HOURLY = "temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation"
session = requests.Session()
session.headers["User-Agent"] = UA


def get(url: str, params: dict, cache: Path, pause: float) -> dict:
    if cache.exists():
        return json.loads(cache.read_text(encoding="utf-8"))
    for attempt, wait in enumerate([0, 20, 60]):
        time.sleep(wait)
        r = session.get(url, params=params, timeout=90)
        if r.status_code == 429:
            raise SystemExit(f"429 from {url}: stopping, no workaround")
        if r.status_code == 200:
            cache.write_text(r.text, encoding="utf-8")
            time.sleep(pause)
            return r.json()
        print(f"  HTTP {r.status_code} (attempt {attempt + 1}) {url}")
    raise SystemExit(f"giving up on {url} {params}")


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def main() -> None:
    out = Path(sys.argv[1])
    y0, y1 = int(sys.argv[2]), int(sys.argv[3])
    (out / "cache" / "schedule").mkdir(parents=True, exist_ok=True)
    (out / "cache" / "weather").mkdir(parents=True, exist_ok=True)

    games = []
    for year in range(y0, y1 + 1):
        j = get(SCHEDULE, {"sportId": 1, "season": year, "gameType": "R", "hydrate": "venue(location,fieldInfo)"},
                out / "cache" / "schedule" / f"{year}.json", 1.0)
        for block in j.get("dates", []):
            for g in block.get("games", []):
                if g.get("status", {}).get("abstractGameState") != "Final":
                    continue
                v = g.get("venue", {})
                loc = v.get("location", {})
                coords = loc.get("defaultCoordinates", {})
                fi = v.get("fieldInfo", {})
                games.append({
                    "game_pk": g["gamePk"], "game_year": year, "official_date": g.get("officialDate", block["date"]),
                    "start_utc": g.get("gameDate"), "day_night": g.get("dayNight"),
                    "home_team_id": g["teams"]["home"]["team"]["id"], "home_team_name": g["teams"]["home"]["team"]["name"],
                    "venue_id": v.get("id"), "venue_name": v.get("name"),
                    "lat": num(coords.get("latitude")), "lon": num(coords.get("longitude")), "elevation_ft": num(loc.get("elevation")),
                    "roof": fi.get("roofType"), "turf": fi.get("turfType"),
                    "dim_left_line": num(fi.get("leftLine")), "dim_left_center": num(fi.get("leftCenter")),
                    "dim_center": num(fi.get("center")), "dim_right_center": num(fi.get("rightCenter")),
                    "dim_right_line": num(fi.get("rightLine")),
                })
        print(f"{year}: {sum(1 for x in games if x['game_year'] == year)} final games", flush=True)

    con = duckdb.connect()
    con.register("g_df", __import__("pandas").DataFrame(games))
    con.sql("CREATE TABLE games AS SELECT * FROM g_df")
    con.sql(f"COPY games TO '{(out / 'games.parquet').as_posix()}' (FORMAT parquet)")
    n_missing = con.sql("SELECT count(*) FROM games WHERE lat IS NULL").fetchone()[0]
    print(f"games: {len(games)}; without coordinates: {n_missing}")

    # one weather request per venue and year that has games
    todo = con.sql("""SELECT venue_id, any_value(lat) AS lat, any_value(lon) AS lon, game_year,
                             min(official_date) AS d0, max(official_date) AS d1
                      FROM games WHERE lat IS NOT NULL GROUP BY venue_id, game_year ORDER BY 1, 4""").fetchall()
    print(f"weather requests needed: {len(todo)}", flush=True)
    rows = []
    for i, (vid, lat, lon, year, d0, d1) in enumerate(todo):
        j = get(OPEN_METEO, {"latitude": round(lat, 4), "longitude": round(lon, 4), "start_date": str(d0), "end_date": str(d1),
                             "hourly": HOURLY, "wind_speed_unit": "mph", "temperature_unit": "fahrenheit", "timezone": "UTC"},
                out / "cache" / "weather" / f"{vid}_{year}.json", 1.2)
        h = j["hourly"]
        for k, t in enumerate(h["time"]):
            rows.append((vid, t, h["temperature_2m"][k], h["relative_humidity_2m"][k], h["surface_pressure"][k],
                         h["wind_speed_10m"][k], h["wind_direction_10m"][k], h["wind_gusts_10m"][k], h["precipitation"][k],
                         j.get("elevation")))
        if (i + 1) % 25 == 0:
            print(f"  weather {i + 1}/{len(todo)}", flush=True)
    con.sql("""CREATE TABLE hourly (venue_id INTEGER, ts VARCHAR, temp_f DOUBLE, rh DOUBLE, pressure_hpa DOUBLE,
                                   wind_mph DOUBLE, wind_dir DOUBLE, gust_mph DOUBLE, precip_mm DOUBLE, model_elev_m DOUBLE)""")
    con.executemany("INSERT INTO hourly VALUES (?,?,?,?,?,?,?,?,?,?)", rows)
    con.sql("""
    CREATE TABLE game_weather AS
    WITH w AS (
      SELECT g.game_pk,
             avg(h.temp_f) AS om_temp_f, avg(h.rh) AS om_rh, avg(h.pressure_hpa) AS om_pressure_hpa,
             avg(h.wind_mph * -sin(radians(h.wind_dir))) AS om_wind_u, avg(h.wind_mph * -cos(radians(h.wind_dir))) AS om_wind_v,
             avg(h.wind_mph) AS om_wind_mph, max(h.gust_mph) AS om_gust_mph, sum(h.precip_mm) AS om_precip_mm,
             any_value(h.model_elev_m) AS om_model_elev_m
      FROM games g JOIN hourly h ON h.venue_id = g.venue_id
        AND CAST(replace(h.ts, 'T', ' ') || ':00' AS TIMESTAMP)
            BETWEEN date_trunc('hour', CAST(replace(replace(g.start_utc, 'T', ' '), 'Z', '') AS TIMESTAMP))
                AND date_trunc('hour', CAST(replace(replace(g.start_utc, 'T', ' '), 'Z', '') AS TIMESTAMP)) + INTERVAL 3 HOUR
      GROUP BY g.game_pk)
    SELECT *, (degrees(atan2(-om_wind_u, -om_wind_v)) + 360) % 360 AS om_wind_dir FROM w""")
    con.sql(f"COPY game_weather TO '{(out / 'game_weather.parquet').as_posix()}' (FORMAT parquet)")
    print(con.sql("SELECT count(*) AS games_with_weather, round(avg(om_temp_f),1) AS mean_temp_f, round(avg(om_wind_mph),1) AS mean_wind_mph FROM game_weather").fetchall())
    print(con.sql("""SELECT g.venue_name, round(avg(w.om_temp_f),1) AS temp_f, round(avg(w.om_wind_mph),1) AS wind, count(*) AS n
                     FROM games g JOIN game_weather w USING (game_pk) WHERE g.venue_name LIKE '%Oracle%' OR g.venue_name LIKE '%Coors%' GROUP BY 1""").fetchall())


if __name__ == "__main__":
    main()
