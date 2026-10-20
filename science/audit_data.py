"""Print row counts and null rates per year for a Statcast batted-ball parquet.

Usage: python audit_data.py <parquet path>
"""
import sys

import duckdb

path = sys.argv[1].replace("\\", "/")
cols = {r[0] for r in duckdb.sql(f"DESCRIBE SELECT * FROM read_parquet('{path}')").fetchall()}
want = [c for c in ["launch_speed", "launch_angle", "hit_distance_sc", "hc_x", "stand", "bat_speed", "attack_angle"] if c in cols]
year = "game_year" if "game_year" in cols else "year(CAST(game_date AS DATE))"
sel = ", ".join(f"round(100.0 * avg(CASE WHEN {c} IS NULL OR CAST({c} AS VARCHAR) = '' THEN 1 ELSE 0 END), 1) AS null_{c}" for c in want)
hr = "round(100.0 * avg(CAST(is_home_run AS DOUBLE)), 2) AS hr_pct," if "is_home_run" in cols else ""
print(duckdb.sql(f"SELECT {year} AS yr, count(*) AS rows, {hr} {sel} FROM read_parquet('{path}') GROUP BY 1 ORDER BY 1").df().to_string(index=False))
