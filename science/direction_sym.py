"""Left/right reflection symmetry in the direction model (GPT's idea 2).

A left-handed hitter's swing is the mirror image of a right-handed one's, so the two can share one model if everything is expressed in the hitter's own frame.
Here the landing bearing is turned into a pull angle (positive toward the hitter's pull side), every handed input is signed by the hitter (plate_x, pfx_x, haa,
attack direction, intercept x), and one LightGBM plus one XGBoost are trained on both hands together (the C5 recipe otherwise). The pull-angle estimate is turned
back into a field bearing (right-handed hitters pull toward left field, which is negative) and replaces bearing_hat; fence_hat and margin_hat follow.
Out of fold for training balls (4 game-grouped folds), fold-average for the rest, like direction_c5_features.py.

Usage: python direction_sym.py --data data/derived/bakeoff_features_v5r.parquet --out data/derived/bakeoff_features_v7.parquet
"""
from __future__ import annotations

import argparse
import os
import time

import lightgbm as lgb
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import GroupKFold

from bakeoff_data import fence_at
from experiments import HID
from ladder import BASE0, BAT, HIST, PITCH, WX

THREADS = int(os.environ.get("EXP_THREADS", "10"))
F0 = BASE0 + PITCH + HIST + WX + BAT + HID["H1"]["cols"] + HID["H4"]["cols"]
SIGNED = ["plate_x", "pfx_x", "haa", "attack_direction", "intercept_x", "intercept_x_field", "attack_dir_field", "b_pull"]  # columns whose sign flips with the hitter's side


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    t0 = time.time()
    df = pd.read_parquet(a.data)
    s = np.where(df.stand_r == 1, 1.0, -1.0).astype("float32")  # +1 right-handed
    X = df[[c for c in F0 if c in df.columns] + ["vaa"]].copy()
    X["haa"] = df.haa
    for c in SIGNED:
        if c in X.columns:
            X[c] = X[c] * np.where(np.isnan(X[c]), np.nan, 1.0) * (s if c not in ("attack_dir_field", "intercept_x_field", "b_pull") else 1.0)
    # attack_dir_field, intercept_x_field and b_pull are already hitter-relative (field-signed by hand); the raw handed columns now are too
    X["ad_sin"], X["ad_cos"] = np.sin(np.deg2rad(X["attack_direction"])), np.cos(np.deg2rad(X["attack_direction"]))
    feats = list(X.columns)
    pull = (-s * df.bearing).to_numpy(np.float32)  # right-handed hitters pull toward negative bearing: pull = -bearing for them, +bearing for lefties
    tr, va = (df.split == "train").to_numpy(), (df.split == "val").to_numpy()
    region = ((df.launch_speed >= 70) & df.launch_angle.between(8, 55)).to_numpy()
    lab = df.bearing.notna().to_numpy()
    fit_rows = np.flatnonzero(tr & region & lab)
    val_rows = va & region & lab
    other = np.flatnonzero(region & ~(tr & lab))
    big = dict(objective="l1", n_estimators=1600, learning_rate=0.05, num_leaves=127, min_child_samples=100, subsample=0.8, subsample_freq=1, colsample_bytree=0.8,
               n_jobs=THREADS, verbose=-1, random_state=0)
    oof = np.full(len(df), np.nan, np.float32)
    avg = np.zeros(len(df), np.float32)
    allreg = np.flatnonzero(region)
    nf = 0
    for k, (ia, ib) in enumerate(GroupKFold(4).split(fit_rows, groups=df.game_pk.to_numpy()[fit_rows])):
        a_, b_ = fit_rows[ia], fit_rows[ib]
        m1 = lgb.LGBMRegressor(**big)
        m1.fit(X.iloc[a_], pull[a_], eval_set=[(X[val_rows], pull[val_rows])], callbacks=[lgb.early_stopping(60, verbose=False)])
        m2 = xgb.XGBRegressor(tree_method="hist", enable_categorical=True, objective="reg:absoluteerror", n_estimators=1600, learning_rate=0.06, max_depth=8,
                              min_child_weight=50, subsample=0.8, colsample_bytree=0.7, n_jobs=THREADS, early_stopping_rounds=60)
        m2.fit(X.iloc[a_], pull[a_], eval_set=[(X[val_rows], pull[val_rows])], verbose=False)
        oof[b_] = 0.5 * (m1.predict(X.iloc[b_]) + m2.predict(X.iloc[b_]))
        avg[allreg] += 0.5 * (m1.predict(X.iloc[allreg]) + m2.predict(X.iloc[allreg]))
        nf += 1
        print(f"fold {k + 1}/4: lgb {m1.best_iteration_}, xgb {m2.best_iteration}, {time.time() - t0:.0f}s", flush=True)
    avg[allreg] /= nf
    pull_hat = np.full(len(df), np.nan, np.float32)
    pull_hat[other] = avg[other]
    pull_hat[fit_rows] = oof[fit_rows]
    new = df.bearing_hat.to_numpy(np.float32).copy()
    ok = ~np.isnan(pull_hat)
    new[ok] = -s[ok] * pull_hat[ok]
    old = df.bearing_hat.to_numpy(np.float32)
    y = df.bearing.to_numpy()
    near = df.hit_distance_sc.between(330, 430).to_numpy()
    for name, sel in (("train (oof)", tr & region & lab & near), ("validation", va & region & lab & near), ("test", (df.split == "test").to_numpy() & region & lab & near)):
        print(f"{name}: near-wall bearing MAE old {np.abs(old[sel] - y[sel]).mean():.3f} -> symmetric {np.abs(new[sel] - y[sel]).mean():.3f} deg ({int(sel.sum()):,} balls)", flush=True)
    df["bearing_hat_c5"] = old
    df["bearing_hat"] = new
    df["fence_hat"] = fence_at(df, new)
    df["margin_hat"] = df.phys_dist - df.fence_hat
    df.to_parquet(a.out)
    print("wrote", a.out, f"{time.time() - t0:.0f}s", flush=True)


if __name__ == "__main__":
    main()
