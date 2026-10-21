"""Venue field orientation (azimuth of home plate to center field) from the official MLB StatsAPI, one request.

Wind needs it: Open-Meteo gives compass wind direction, and the flight model needs wind along and across the field axis.

Usage: python pull_venues.py <games.parquet> <out.parquet>
"""
from __future__ import annotations

import sys

import duckdb
import requests

UA = "nuke-navigator-research/0.1 (personal project)"


def main() -> None:
    games, out = sys.argv[1].replace("\\", "/"), sys.argv[2].replace("\\", "/")
    ids = duckdb.sql(f"SELECT DISTINCT venue_id FROM read_parquet('{games}') ORDER BY 1").df().venue_id.astype(int).tolist()
    print(len(ids), "venues", flush=True)
    r = requests.get("https://statsapi.mlb.com/api/v1/venues", params={"venueIds": ",".join(map(str, ids)), "hydrate": "location"},
                     headers={"User-Agent": UA}, timeout=90)
    if r.status_code != 200:
        raise SystemExit(f"HTTP {r.status_code}: stopping")
    rows = []
    for v in r.json().get("venues", []):
        loc = v.get("location", {})
        rows.append((v["id"], v.get("name"), loc.get("azimuthAngle"), loc.get("elevation")))
    con = duckdb.connect()
    con.sql("CREATE TABLE v (venue_id INTEGER, venue_name VARCHAR, azimuth_deg DOUBLE, elevation_ft DOUBLE)")
    con.executemany("INSERT INTO v VALUES (?, ?, ?, ?)", rows)
    con.sql(f"COPY v TO '{out}' (FORMAT parquet)")
    print(con.sql("SELECT * FROM v ORDER BY venue_id").df().to_string(), flush=True)


if __name__ == "__main__":
    main()
