"""Shared feature table for the model bake-off, built once so every entrant sees identical rows and identical splits.

Split (by game date): train before 2025-03-01, validation 2025-03-01 to 2025-05-31, test 2025-06-01 on. Every year is in training;
bat-tracking columns are simply missing before 2023, which the tree models and the neural nets handle explicitly.

Derived columns, all from legal inputs (contact, bat tracking, pitch, weather, park):
  bearing_hat  out-of-fold launch-direction estimate (landing bearing is used only as its label)
  phys_dist, phys_hang  distance and hang time from the college-fitted flight model with spin predicted by the college teacher
                        (exit speed, launch angle, pitch speed, pitch group, handedness), game air density, calm wind
  fence_hat, margin_hat  fence distance at bearing_hat (linear in angle between the park's five fence dimensions) and phys_dist minus it
Leaky helpers for the reconstruct scoreboard only: fence_true, margin_true (use the real landing bearing).

Usage: python bakeoff_data.py --bbe ... --games ... --weather ... --college ... --params ... --out data/derived/bakeoff_features.parquet
"""
from __future__ import annotations

import argparse
import json
import time

import duckdb
import lightgbm as lgb
import numpy as np
import pandas as pd

from flight_fit import MPH, FT, prep, simulate
from flight_transfer import GROUP, GRP_DTYPE, TM_GROUP, X as TEACH_X
from ladder import BASE0, BAT, HIST, PITCH, WX, add_bearing_hat, load

VAL_START, TEST_START = pd.Timestamp("2025-03-01"), pd.Timestamp("2025-06-01")
ANGLES = [-45.0, -22.5, 0.0, 22.5, 45.0]
DIMS = ["dim_left_line", "dim_left_center", "dim_center", "dim_right_center", "dim_right_line"]


def college_teacher(col: str, sign: int):
    tm = duckdb.sql(f"SELECT * FROM read_parquet('{col}')").df()
    tm = tm.dropna(subset=["HitSpinRate", "HitSpinAxis", "ExitSpeed", "Angle", "RelSpeed"]).copy()
    tm = tm[tm.ExitSpeed.between(60, 125) & tm.Angle.between(10, 55) & tm.HitSpinRate.between(500, 6000)].reset_index(drop=True)
    tm["side_r"] = (tm.BatterSide == "Right").astype(float)
    tm["grp"] = tm.TaggedPitchType.map(TM_GROUP).fillna("other").astype(str).astype(GRP_DTYPE)
    truth = prep(tm.assign(Direction=0.0), sign)
    return {k: lgb.LGBMRegressor(n_estimators=300, learning_rate=0.06, num_leaves=31, min_child_samples=50, subsample=0.8, subsample_freq=1,
                                 colsample_bytree=0.8, verbose=-1, n_jobs=8).fit(tm[TEACH_X], truth[k]) for k in ("w_back", "w_side")}


def fence_at(df: pd.DataFrame, bearing: np.ndarray) -> np.ndarray:
    d = df[DIMS].to_numpy(dtype=float)
    d = np.where(np.isnan(d), np.nanmean(d, axis=0), d)
    b = np.clip(bearing, -45, 45)
    out = np.empty(len(df))
    for i in range(len(df)):
        out[i] = np.interp(b[i], ANGLES, d[i])
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    for k in ("games", "college", "params", "out"):
        ap.add_argument(f"--{k}", required=True)
    for k in ("bbe", "weather", "exp"):
        ap.add_argument(f"--{k}", default="")
    a = ap.parse_args()
    t0 = time.time()
    g = lambda p: p.replace("\\", "/")

    if a.exp:  # v2: start from the round-2 experiment table (all engineered features already in it)
        df = pd.read_parquet(g(a.exp)).drop(columns=["pool"])
    else:
        df = load(g(a.bbe), g(a.games), g(a.weather))
    dims = duckdb.sql(f"SELECT DISTINCT ON (game_pk) game_pk, {', '.join(DIMS)} FROM read_parquet('{g(a.games)}') ORDER BY game_pk, official_date DESC").df()
    df = df.merge(dims, on="game_pk", how="left").reset_index(drop=True)
    df["rid"] = np.arange(len(df))
    df["split"] = np.where(df.game_date < VAL_START, "train", np.where(df.game_date < TEST_START, "val", "test"))
    print("rows", len(df), df.split.value_counts().to_dict(), f"{time.time() - t0:.0f}s", flush=True)

    tr = (df.split == "train").to_numpy()
    bh_feats = BASE0 + PITCH + HIST + WX + BAT
    if a.exp:
        from experiments import HID
        bh_feats = bh_feats + HID["H1"]["cols"] + HID["H4"]["cols"]
    notes = add_bearing_hat(df, tr, [(df.split == "val").to_numpy(), (df.split == "test").to_numpy()], bh_feats)
    print("bearing_hat:", {k: round(float(v), 3) for k, v in notes.items()}, f"{time.time() - t0:.0f}s", flush=True)

    cfg = json.load(open(a.params))
    p, sign = np.array(cfg["params"]), cfg["sign"]
    teach = college_teacher(g(a.college), sign)
    can = ((df.launch_speed >= 70) & df.launch_angle.between(8, 55) & df.release_speed.notna()).to_numpy()
    idx = np.flatnonzero(can)
    df["phys_dist"], df["phys_hang"] = np.nan, np.nan
    rho_fill = float(df.air_density.median())
    for s in range(0, len(idx), 100_000):
        ii = idx[s:s + 100_000]
        sub = df.iloc[ii]
        mx = pd.DataFrame({"ExitSpeed": sub.launch_speed.to_numpy(), "Angle": sub.launch_angle.to_numpy(), "RelSpeed": sub.release_speed.to_numpy(),
                           "side_r": sub.stand_r.to_numpy(),
                           "grp": pd.Categorical(sub.pitch_type.astype(str).map(GROUP).fillna("other").astype(str), dtype=GRP_DTYPE)})
        spin = {k: teach[k].predict(mx) for k in teach}
        d, h, _ = simulate(p, v0=mx.ExitSpeed.to_numpy() * MPH, theta=np.deg2rad(mx.Angle.to_numpy()), phi=np.zeros(len(ii)),
                           w_back=spin["w_back"], w_side=spin["w_side"], z0=np.full(len(ii), 1.0), dt=0.02,
                           rho=sub.air_density.fillna(rho_fill).to_numpy())
        df.iloc[ii, df.columns.get_loc("phys_dist")] = d / FT
        df.iloc[ii, df.columns.get_loc("phys_hang")] = h
        print(f"physics {s + len(ii):,}/{len(idx):,} {time.time() - t0:.0f}s", flush=True)

    df["park_lf"], df["park_cf"], df["park_rf"] = df.dim_left_line, df.dim_center, df.dim_right_line
    df["fence_hat"] = fence_at(df, df.bearing_hat.to_numpy())
    df["margin_hat"] = df.phys_dist - df.fence_hat
    df["fence_true"] = fence_at(df, df.bearing.fillna(df.bearing_hat).to_numpy())
    df["margin_true"] = df.phys_dist - df.fence_true
    df.to_parquet(g(a.out))
    print("wrote", a.out, len(df), "rows", f"{time.time() - t0:.0f}s", flush=True)


if __name__ == "__main__":
    main()
