"""Unify the per-season Savant pulls into one typed batted-ball table.

All sources are the raw per-season parquets written by pull_statcast.py (full 119-column Savant schema, all text).
Optionally the older Drive parquet (38 columns) can be added for years you have not re-pulled.

Usage: python build_dataset.py <out_parquet> <raw_dir> [<raw_dir> ...] [--drive <drive_parquet>]
"""
from __future__ import annotations

import sys
from pathlib import Path

import duckdb

args = sys.argv[1:]
drive_pq = None
if "--drive" in args:
    i = args.index("--drive")
    drive_pq = Path(args[i + 1])
    del args[i : i + 2]
out = Path(args[0])
raw_dirs = [Path(a) for a in args[1:]]
out.parent.mkdir(parents=True, exist_ok=True)
con = duckdb.connect()
con.sql("SET threads TO 3")  # leave the laptop usable while this runs

# column -> SQL type
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
    "pitch_type": "VARCHAR", "release_speed": "DOUBLE", "release_spin_rate": "DOUBLE", "spin_axis": "DOUBLE",
    "effective_speed": "DOUBLE", "release_extension": "DOUBLE", "plate_x": "DOUBLE", "plate_z": "DOUBLE",
    "pfx_x": "DOUBLE", "pfx_z": "DOUBLE", "zone": "INTEGER", "balls": "INTEGER", "strikes": "INTEGER",
    "delta_home_win_exp": "DOUBLE", "delta_run_exp": "DOUBLE",
    "home_score": "INTEGER", "away_score": "INTEGER", "outs_when_up": "INTEGER",
    # round-2 columns: contact point, pitch trajectory and release, arm angle, context
    "intercept_ball_minus_batter_pos_x_inches": "DOUBLE", "intercept_ball_minus_batter_pos_y_inches": "DOUBLE",
    "release_pos_x": "DOUBLE", "release_pos_y": "DOUBLE", "release_pos_z": "DOUBLE",
    "vx0": "DOUBLE", "vy0": "DOUBLE", "vz0": "DOUBLE", "ax": "DOUBLE", "ay": "DOUBLE", "az": "DOUBLE",
    "sz_top": "DOUBLE", "sz_bot": "DOUBLE", "arm_angle": "DOUBLE",
    "api_break_z_with_gravity": "DOUBLE", "api_break_x_arm": "DOUBLE", "api_break_x_batter_in": "DOUBLE",
    "age_bat": "DOUBLE", "age_pit": "DOUBLE", "n_thruorder_pitcher": "INTEGER", "n_priorpa_thisgame_player_at_bat": "INTEGER",
    "pitcher_days_since_prev_game": "INTEGER", "batter_days_since_prev_game": "INTEGER",
    "bat_score": "INTEGER", "fld_score": "INTEGER", "on_1b": "BIGINT", "on_2b": "BIGINT", "on_3b": "BIGINT",
    "if_fielding_alignment": "VARCHAR", "of_fielding_alignment": "VARCHAR",
}


def select_from(source_sql: str, label: str) -> str:
    have = {r[0] for r in con.sql(f"DESCRIBE SELECT * FROM {source_sql}").fetchall()}
    cols = []
    for c, t in WANT.items():
        cols.append(f"TRY_CAST({c} AS {t}) AS {c}" if c in have else f"CAST(NULL AS {t}) AS {c}")
    return f"SELECT CAST(game_date AS DATE) AS game_date, {', '.join(cols)}, '{label}' AS src FROM {source_sql}"


parts = [select_from(f"read_parquet('{(d / 'statcast_bbe_*_raw.parquet').as_posix()}')", d.name) for d in raw_dirs]
if drive_pq:
    parts.append(select_from(f"read_parquet('{drive_pq.as_posix()}')", "drive_2020_2026"))
con.sql("CREATE TABLE bbe AS " + " UNION ALL BY NAME ".join(f"({p})" for p in parts))
con.sql("""
CREATE TABLE bbe2 AS
SELECT *, year(game_date) AS game_year, (year(game_date) >= 2020) AS hawkeye, (events = 'home_run') AS is_home_run
FROM (SELECT *, row_number() OVER (PARTITION BY game_pk, at_bat_number, pitch_number ORDER BY src) AS rn FROM bbe)
WHERE rn = 1 AND (type = 'X' OR type IS NULL)
""")
con.sql(f"COPY (SELECT * EXCLUDE (rn) FROM bbe2 ORDER BY game_date, game_pk, at_bat_number, pitch_number) TO '{out.as_posix()}' (FORMAT parquet)")
print(con.sql("""
SELECT game_year AS yr, count(*) AS rows,
       round(100.0 * avg(CASE WHEN is_home_run THEN 1 ELSE 0 END), 2) AS hr_pct,
       round(100.0 * avg(CASE WHEN launch_speed IS NULL THEN 1 ELSE 0 END), 1) AS null_ev_pct,
       round(100.0 * avg(CASE WHEN pitch_type IS NULL THEN 1 ELSE 0 END), 1) AS null_pitch_pct,
       round(100.0 * avg(CASE WHEN bat_speed IS NULL THEN 1 ELSE 0 END), 1) AS null_bat_speed_pct
FROM bbe2 GROUP BY 1 ORDER BY 1
""").df().to_string(index=False))
print("total rows:", con.sql("SELECT count(*) FROM bbe2").fetchone()[0], "->", out)
