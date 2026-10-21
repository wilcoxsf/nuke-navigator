"""Experiment table for the round-2 feature sweep (experiments.py).

Starts from ladder.load (park, weather, pitch, rolling batter and pitcher history) and adds:
  pitch approach     vaa, haa, plate_speed (from the fitted pitch trajectory at the plate), plate_z_rel (height inside the batter's zone)
  contact point      intercept_x, intercept_y, intercept_x_field (signed by hand), intercept_dist
  contact quality    dyn_loft (launch angle minus attack angle), attack_dir_field, ev_over_pitch, squared_up, swing_speed_per_len,
                     ev_minus_bat, bat_minus_pitch
  swing history      sw_* : the batter's mean swing metrics over his previous 100 balls in play (smooths single-swing noise)
  long history       b_*_500 / p_*_500 : 500-ball windows
  context            score_diff, runners_on, days_since_2015, park_year
Every added column is in the leakage registry (features.py). `pool` marks screening rows (2023-03-01 to 2025-05-31), test rows
(2025-06-01 on, untouched by screening) and early rows.

Usage: python exp_data.py --bbe ... --games ... --weather ... --out data/derived/exp_features.parquet
"""
from __future__ import annotations

import argparse
import time

import duckdb
import numpy as np
import pandas as pd

from ladder import load

SCREEN_START, TEST_START = pd.Timestamp("2023-03-01"), pd.Timestamp("2025-06-01")
IX, IY = "intercept_ball_minus_batter_pos_x_inches", "intercept_ball_minus_batter_pos_y_inches"


def add_engineered(df: pd.DataFrame) -> None:
    # pitch trajectory: Statcast coordinates, feet and feet per second, y0 = 50 ft, plate front at 17/12 ft
    a, b, c = 0.5 * df.ay, df.vy0, 50.0 - 17.0 / 12.0
    disc = b * b - 4 * a * c
    t = (-b - np.sqrt(disc.where(disc >= 0))) / (2 * a)
    vx, vy, vz = df.vx0 + df.ax * t, df.vy0 + df.ay * t, df.vz0 + df.az * t
    df["vaa"] = np.degrees(np.arctan2(vz, -vy))
    df["haa"] = np.degrees(np.arctan2(vx, -vy))
    df["plate_speed"] = np.sqrt(vx**2 + vy**2 + vz**2) * 0.681818
    df["plate_z_rel"] = (df.plate_z - df.sz_bot) / (df.sz_top - df.sz_bot)
    df["score_diff"] = df.bat_score - df.fld_score
    df["runners_on"] = df.on_1b.notna() * 1 + df.on_2b.notna() * 2 + df.on_3b.notna() * 4
    df["days_since_2015"] = (df.game_date - pd.Timestamp("2015-01-01")).dt.days.astype(float)
    df["park_year"] = (df.home_team.astype(str) + "_" + df.game_year.astype(int).astype(str)).astype("category")
    for c_ in ("if_fielding_alignment", "of_fielding_alignment"):
        df[c_] = df[c_].astype("category")

    df["intercept_x"], df["intercept_y"] = df[IX], df[IY]
    df["intercept_x_field"] = df[IX] * np.where(df.stand_r == 1, 1.0, -1.0)
    df["intercept_dist"] = np.hypot(df[IX], df[IY])
    df["dyn_loft"] = df.launch_angle - df.attack_angle
    df["attack_dir_field"] = df.attack_direction * np.where(df.stand_r == 1, 1.0, -1.0)
    df["ev_over_pitch"] = df.launch_speed / df.release_speed
    # Savant's squared-up definition: exit speed over the most it could be for this pitch and bat speed (constants approximate;
    # the trees rescale them)
    df["squared_up"] = df.launch_speed / (1.23 * df.release_speed + 0.2116 * df.bat_speed)
    df["swing_speed_per_len"] = df.bat_speed / df.swing_length
    df["ev_minus_bat"] = df.launch_speed - df.bat_speed
    df["bat_minus_pitch"] = df.bat_speed - df.release_speed


def add_rolling(df: pd.DataFrame) -> None:
    slim = df[["rid", "batter", "pitcher", "game_date", "game_pk", "at_bat_number", "attack_angle", "attack_dir_field", "swing_length", "bat_speed",
               "intercept_x", "intercept_y", "launch_speed", "is_home_run"]].copy()
    slim["is_home_run"] = slim.is_home_run.astype(float)
    con = duckdb.connect()
    con.sql("SET threads TO 3")
    con.register("d", slim)
    order = "ORDER BY game_date, game_pk, at_bat_number"
    out = con.sql(f"""
        SELECT rid,
          avg(attack_angle) OVER bs AS sw_attack_angle, avg(attack_dir_field) OVER bs AS sw_attack_dir, avg(swing_length) OVER bs AS sw_length,
          avg(bat_speed) OVER bs AS sw_bat_speed, avg(intercept_x) OVER bs AS sw_intercept_x, avg(intercept_y) OVER bs AS sw_intercept_y,
          avg(launch_speed) OVER b5 AS b_ev_500, avg(CASE WHEN launch_speed >= 95 THEN 1.0 ELSE 0.0 END) OVER b5 AS b_hard_500,
          avg(is_home_run) OVER b5 AS b_hr_500, avg(launch_speed) OVER p5 AS p_ev_500, avg(is_home_run) OVER p5 AS p_hr_500
        FROM d
        WINDOW bs AS (PARTITION BY batter {order} ROWS BETWEEN 100 PRECEDING AND 1 PRECEDING),
               b5 AS (PARTITION BY batter {order} ROWS BETWEEN 500 PRECEDING AND 1 PRECEDING),
               p5 AS (PARTITION BY pitcher {order} ROWS BETWEEN 500 PRECEDING AND 1 PRECEDING)
    """).df()
    out = out.set_index("rid").loc[df.rid.to_numpy()]
    for c in out.columns:
        df[c] = out[c].to_numpy()


def main() -> None:
    ap = argparse.ArgumentParser()
    for k in ("bbe", "games", "weather", "out"):
        ap.add_argument(f"--{k}", required=True)
    ap.add_argument("--limit-year", type=int, default=0, help="keep only rows from this year on (quick tests)")
    a = ap.parse_args()
    t0 = time.time()
    g = lambda p: p.replace("\\", "/")
    df = load(g(a.bbe), g(a.games), g(a.weather))
    # park geometry from the schedule's venue field info (fence distances at the left line, center and right line)
    dims = duckdb.sql(f"SELECT DISTINCT ON (game_pk) game_pk, dim_left_line, dim_center, dim_right_line FROM read_parquet('{g(a.games)}') "
                      "ORDER BY game_pk, official_date DESC").df()
    df = df.merge(dims, on="game_pk", how="left")
    df["park_lf"], df["park_cf"], df["park_rf"] = df.dim_left_line, df.dim_center, df.dim_right_line
    if a.limit_year:
        df = df[df.game_year >= a.limit_year]
    df = df.sort_values(["game_date", "game_pk", "at_bat_number", "pitch_number"], kind="stable").reset_index(drop=True)
    df["rid"] = np.arange(len(df))
    print("loaded", len(df), f"{time.time() - t0:.0f}s", flush=True)
    add_engineered(df)
    add_rolling(df)
    df["pool"] = np.where(df.game_date >= TEST_START, "test", np.where(df.game_date >= SCREEN_START, "screen", "early"))
    df.to_parquet(g(a.out))
    print("pools:", df.pool.value_counts().to_dict(), f"{time.time() - t0:.0f}s", flush=True)
    new = ["vaa", "haa", "plate_speed", "plate_z_rel", "intercept_x", "intercept_dist", "dyn_loft", "attack_dir_field", "squared_up", "sw_attack_angle",
           "sw_intercept_x", "b_hr_500", "arm_angle", "score_diff", "runners_on"]
    print(df.loc[df.pool != "early", new].describe().T[["count", "mean", "std", "min", "max"]].round(2).to_string())
    print("wrote", a.out, f"{time.time() - t0:.0f}s", flush=True)


if __name__ == "__main__":
    main()
