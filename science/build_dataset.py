"""Unify the per-season Savant pulls into one typed batted-ball table.

Sources:
  - data/raw/statcast/statcast_bbe_<year>_raw.parquet   (2015-2019, full 119-column schema, all text)
  - the Drive parquet statcast_bbe_2020_2026.parquet     (38 columns, already typed)
Columns missing from a source become NULL. `hawkeye` marks the tracking system (Hawk-Eye from 2020).

Usage: python build_dataset.py <raw_statcast_dir> <drive_parquet> <out_parquet>
"""
from __future__ import annotations

import sys
from pathlib import Path

import duckdb

raw_dir, drive_pq, out = (Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]))
out.parent.mkdir(parents=True, exist_ok=True)
con = duckdb.connect()

# column -> SQL type; text columns use VARCHAR
WANT = {
    "game_pk": "BIGINT", "at_bat_number": "INTEGER", "pitch_number": "INTEGER",
    "home_team": "VARCHAR", "away_team": "VARCHAR", "batter": "BIGINT", "pitcher": "BIGINT",
    "stand": "VARCHAR", "p_throws": "VARCHAR", "inning": "INTEGER", "inning_topbot": "VARCHAR",
    "events": "VARCHAR", "description": "VARCHAR", "type": "VARCHAR", "bb_type": "VARCHAR",
    "hit_location": "INTEGER", "hc_x": "DOUBLE", "hc_y": "DOUBLE", "hit_distance_sc": "DOUBLE",
    "launch_speed": "DOUBLE", "launch_angle": "DOUBLE", "launch_speed_angle": "DOUBLE",
    "estimated_ba_using_speedangle": "DOUBLE", "estimated_woba_using_speedangle": "DOUBLE",
    "estimated_slg_using_speedangle": "DOUBLE",
    "bat_speed": "DOUBLE", "swing_length": "DOUBLE", "attack_angle": "DOUBLE", "attack_direction": "DOUBLE",
    "swing_path_tilt": "DOUBLE",
    "pitch_type": "VARCHAR", "release_speed": "DOUBLE", "release_spin_rate": "DOUBLE",
    "plate_x": "DOUBLE", "plate_z": "DOUBLE",
    "delta_home_win_exp": "DOUBLE", "delta_run_exp": "DOUBLE",
    "home_score": "INTEGER", "away_score": "INTEGER", "outs_when_up": "INTEGER",
}


def select_from(source_sql: str, label: str) -> str:
    have = {r[0] for r in con.sql(f"DESCRIBE SELECT * FROM {source_sql}").fetchall()}
    cols = []
    for c, t in WANT.items():
        if c in have:
            cols.append(f"TRY_CAST({c} AS {t}) AS {c}")
        else:
            cols.append(f"CAST(NULL AS {t}) AS {c}")
    return (f"SELECT CAST(game_date AS DATE) AS game_date, {', '.join(cols)}, '{label}' AS src "
            f"FROM {source_sql}")


raw_glob = (raw_dir / "statcast_bbe_*_raw.parquet").as_posix()
parts = [
    select_from(f"read_parquet('{raw_glob}')", "savant_2015_2019"),
    select_from(f"read_parquet('{drive_pq.as_posix()}')", "drive_2020_2026"),
]
con.sql("CREATE TABLE bbe AS " + " UNION ALL BY NAME ".join(f"({p})" for p in parts))
con.sql("""
CREATE TABLE bbe2 AS
SELECT *, year(game_date) AS game_year, (year(game_date) >= 2020) AS hawkeye,
       (events = 'home_run') AS is_home_run
FROM (SELECT *, row_number() OVER (PARTITION BY game_pk, at_bat_number, pitch_number ORDER BY src) AS rn FROM bbe)
WHERE rn = 1 AND (type = 'X' OR type IS NULL)
""")
con.sql(f"COPY (SELECT * EXCLUDE (rn) FROM bbe2 ORDER BY game_date, game_pk, at_bat_number, pitch_number) TO '{out.as_posix()}' (FORMAT parquet)")
print(con.sql("""
SELECT game_year AS yr, count(*) AS rows,
       round(100.0 * avg(CASE WHEN is_home_run THEN 1 ELSE 0 END), 2) AS hr_pct,
       round(100.0 * avg(CASE WHEN launch_speed IS NULL THEN 1 ELSE 0 END), 1) AS null_ev_pct,
       round(avg(launch_speed), 2) AS mean_ev, round(avg(launch_angle), 2) AS mean_la,
       round(100.0 * avg(CASE WHEN pitch_type IS NULL THEN 1 ELSE 0 END), 0) AS null_pitch_pct
FROM bbe2 GROUP BY 1 ORDER BY 1
""").df().to_string(index=False))
print("total rows:", con.sql("SELECT count(*) FROM bbe2").fetchone()[0], "->", out)
