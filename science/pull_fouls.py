"""Foul-ball pull from Baseball Savant's search CSV, one request per game day, same polite pattern as pull_statcast.py.

Foul balls carry exit speed, launch angle, bat tracking, the contact-point intercept and a projected distance, but no landing
coordinates. The 12 Sep 2026 probe returned 784 fouls from 15 games. Raw CSVs are kept as downloaded; stops on any 403 or 429;
resumable (days with a file are skipped); 3 s between requests; honest user agent.

Usage: python pull_fouls.py <out_dir> <games.parquet> <first_year> <last_year>
Output: <out_dir>/raw/<date>.csv per game day, and <out_dir>/fouls_<first>_<last>.parquet when finished.
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

import duckdb
import requests

from pull_statcast import SAVANT, UA, savant_params


def main() -> None:
    out, games, y0, y1 = Path(sys.argv[1]), sys.argv[2].replace("\\", "/"), int(sys.argv[3]), int(sys.argv[4])
    raw = out / "raw"
    raw.mkdir(parents=True, exist_ok=True)
    days = [r[0] for r in duckdb.sql(f"SELECT DISTINCT CAST(official_date AS VARCHAR) FROM read_parquet('{games}') "
                                     f"WHERE game_year BETWEEN {y0} AND {y1} ORDER BY 1").fetchall()]
    todo = [d for d in days if not (raw / f"{d}.csv").exists()]
    print(f"{len(days)} game days, {len(todo)} to fetch", flush=True)
    s = requests.Session()
    s.headers["User-Agent"] = UA
    made = 0
    for d in todo:
        p = savant_params(d, int(d[:4]))
        p["hfPR"] = "foul|"
        for attempt, wait in enumerate([0, 20, 60]):
            time.sleep(wait)
            r = s.get(SAVANT, params=p, timeout=120)
            if r.status_code in (403, 429):
                raise SystemExit(f"{r.status_code} on {d}: stopping, no workaround")
            if r.status_code == 200:
                break
            print(f"  HTTP {r.status_code} on {d} (attempt {attempt + 1})", flush=True)
        else:
            raise SystemExit(f"giving up on {d}")
        (raw / f"{d}.csv").write_bytes(r.content)
        made += 1
        if made % 25 == 0:
            print(f"{made}/{len(todo)} fetched, last {d}, {len(r.content):,} bytes", flush=True)
        time.sleep(3)
    con = duckdb.connect()
    con.sql(f"COPY (SELECT * FROM read_csv('{(raw / '*.csv').as_posix()}', union_by_name=true, sample_size=-1, ignore_errors=true)) "
            f"TO '{(out / f'fouls_{y0}_{y1}.parquet').as_posix()}' (FORMAT parquet)")
    print("finished; rows:", con.sql(f"SELECT count(*) FROM read_parquet('{(out / f'fouls_{y0}_{y1}.parquet').as_posix()}')").fetchone()[0], flush=True)


if __name__ == "__main__":
    main()
