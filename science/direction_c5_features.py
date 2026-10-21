"""Propagates the T2 direction recipe (C5: a larger LightGBM averaged with XGBoost, trained on balls that can leave the park, with approach angles, plate location
by hand and attack-direction trig) into the modeling table, done properly out of fold.

direction_lab.py scored C5 but never fed it to the classifiers, and its predictions for training rows were in-sample, so they could not be used as a feature.
Here the landing bearing (a label only) is predicted for every ball like this:
  region balls (exit speed 70+, launch angle 8 to 55) with a known bearing in the training period: 4 game-grouped folds, each held-out fold predicted by models
      fitted on the other three (out-of-fold);
  every other region ball (validation, test, training balls with no bearing): the average of the four fold models;
  non-region balls keep the old bearing_hat (they cannot be home runs).
bearing_hat is replaced, and fence_hat and margin_hat are recomputed from it. Output is a new table (v5) for the same bake-off.

Usage: python direction_c5_features.py --data data/derived/bakeoff_features_v3.parquet --out data/derived/bakeoff_features_v5.parquet
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

from bakeoff_data import DIMS, fence_at
from experiments import HID
from ladder import BASE0, BAT, HIST, PITCH, WX

THREADS = int(os.environ.get("EXP_THREADS", "10"))
F0 = BASE0 + PITCH + HIST + WX + BAT + HID["H1"]["cols"] + HID["H4"]["cols"]
EXTRA = ["vaa", "haa", "plate_x_hand", "ad_sin", "ad_cos"]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--folds", type=int, default=4)
    a = ap.parse_args()
    t0 = time.time()
    df = pd.read_parquet(a.data)
    hand = np.where(df.stand_r == 1, 1.0, -1.0).astype("float32")
    df["plate_x_hand"] = (df.plate_x * hand).astype("float32")
    ang = np.deg2rad(df.attack_direction.astype("float32"))
    df["ad_sin"], df["ad_cos"] = np.sin(ang).astype("float32"), np.cos(ang).astype("float32")
    feats = F0 + EXTRA
    tr, va, te = (df.split == "train").to_numpy(), (df.split == "val").to_numpy(), (df.split == "test").to_numpy()
    region = ((df.launch_speed >= 70) & df.launch_angle.between(8, 55)).to_numpy()
    lab = df.bearing.notna().to_numpy()
    y = df.bearing.to_numpy()
    fit_rows = np.flatnonzero(tr & region & lab)
    val_rows = va & region & lab
    other = np.flatnonzero(region & ~(tr & lab))  # everything in the region that is not a labeled training row
    print(f"fit rows {len(fit_rows):,}, other region rows {len(other):,}", flush=True)

    big = dict(objective="l1", n_estimators=1600, learning_rate=0.05, num_leaves=127, min_child_samples=100, subsample=0.8, subsample_freq=1, colsample_bytree=0.8,
               n_jobs=THREADS, verbose=-1, random_state=0)
    oof = np.full(len(df), np.nan, np.float32)
    avg = np.zeros(len(df), np.float32)
    cnt = 0
    X = df[feats]
    for k, (a_idx, b_idx) in enumerate(GroupKFold(a.folds).split(fit_rows, groups=df.game_pk.to_numpy()[fit_rows])):
        ia, ib = fit_rows[a_idx], fit_rows[b_idx]
        m1 = lgb.LGBMRegressor(**big)
        m1.fit(X.iloc[ia], y[ia], eval_set=[(X[val_rows], y[val_rows])], callbacks=[lgb.early_stopping(60, verbose=False)])
        m2 = xgb.XGBRegressor(tree_method="hist", enable_categorical=True, objective="reg:absoluteerror", n_estimators=1600, learning_rate=0.06, max_depth=8,
                              min_child_weight=50, subsample=0.8, colsample_bytree=0.7, n_jobs=THREADS, early_stopping_rounds=60)
        m2.fit(X.iloc[ia], y[ia], eval_set=[(X[val_rows], y[val_rows])], verbose=False)
        oof[ib] = 0.5 * (m1.predict(X.iloc[ib]) + m2.predict(X.iloc[ib]))
        # everything that is not in this fold's training part gets the fold model too (averaged at the end)
        rest = np.flatnonzero(region)
        p = 0.5 * (m1.predict(X.iloc[rest]) + m2.predict(X.iloc[rest]))
        avg[rest] += p
        cnt += 1
        print(f"fold {k + 1}/{a.folds}: lgb trees {m1.best_iteration_}, xgb trees {m2.best_iteration}, {time.time() - t0:.0f}s", flush=True)
    avg[region] /= cnt
    new = df.bearing_hat.to_numpy(np.float32).copy()
    new[fit_rows] = oof[fit_rows]
    new[other] = avg[other]
    old = df.bearing_hat.to_numpy(np.float32)
    near = df.hit_distance_sc.between(330, 430).to_numpy()
    for name, sel in (("train (out of fold)", tr & region & lab & near), ("validation", va & region & lab & near), ("test", te & region & lab & near)):
        print(f"{name}: near-wall bearing MAE old {np.abs(old[sel] - y[sel]).mean():.3f} -> new {np.abs(new[sel] - y[sel]).mean():.3f} deg ({int(sel.sum()):,} balls)", flush=True)
    df["bearing_hat_old"] = old
    df["bearing_hat"] = new
    df["fence_hat"] = fence_at(df, new)
    df["margin_hat"] = df.phys_dist - df.fence_hat
    df.drop(columns=["plate_x_hand", "ad_sin", "ad_cos"]).to_parquet(a.out)
    print("wrote", a.out, f"{time.time() - t0:.0f}s", flush=True)


if __name__ == "__main__":
    main()
