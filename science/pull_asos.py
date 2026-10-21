"""Airport wind observations (routine METAR/ASOS) from the Iowa Environmental Mesonet archive's documented request API.

One request per station for the whole period, honoring the site's robots.txt crawl delay (120 s) between requests, stops on any
non-200. Raw CSV is kept as-is. Used to test whether real station wind explains the distance miss that grid wind (Open-Meteo) cannot.

Usage: python pull_asos.py <out_dir> <first_year> <station> [<station> ...]
"""
from __future__ import annotations

import sys
import time
from datetime import date
from pathlib import Path

import requests

URL = "https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py"
UA = "nuke-navigator-research/0.1 (personal project)"
DELAY = 120


def main() -> None:
    out, first, stations = Path(sys.argv[1]), int(sys.argv[2]), sys.argv[3:]
    out.mkdir(parents=True, exist_ok=True)
    today = date.today()
    for i, st in enumerate(stations):
        dest = out / f"{st}_{first}_{today.year}.csv"
        if dest.exists():
            print(st, "already pulled", flush=True)
            continue
        if i:
            time.sleep(DELAY)
        params = [("station", st), ("data", "sknt"), ("data", "drct"), ("data", "gust"), ("data", "tmpf"), ("data", "relh"),
                  ("year1", first), ("month1", 1), ("day1", 1), ("year2", today.year), ("month2", today.month), ("day2", today.day),
                  ("tz", "Etc/UTC"), ("format", "onlycomma"), ("latlon", "no"), ("missing", "M"), ("trace", "T"), ("direct", "no"),
                  ("report_type", 3), ("report_type", 4)]
        r = requests.get(URL, params=params, headers={"User-Agent": UA}, timeout=300)
        if r.status_code != 200:
            raise SystemExit(f"{st}: HTTP {r.status_code}, stopping")
        dest.write_text(r.text, encoding="utf-8")
        print(st, len(r.text.splitlines()) - 1, "rows ->", dest, flush=True)


if __name__ == "__main__":
    main()
