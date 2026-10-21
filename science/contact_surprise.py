"""Contact surprise: how different was this swing from the one we would have expected?

A swing meeting the ball at the same attack direction can be early for one batter against one pitch and late for another. A first-stage model predicts the
expected swing measurements (attack direction by hand, intercept point, attack angle, bat speed) from the pitch (speed, movement, location, approach angles, type,
count), the batter's hand, and the batter's average swing over his previous 100 balls. The residual (actual minus expected) says how much the swing was driven
by this particular pitch, and is fed to the classifier next to the raw measurements.

Everything is cross-fitted: training-period balls get predictions from models that never saw their game (4 game-grouped folds); other balls get the average of the
fold models. Only balls with bat tracking (2023 on) have residuals; the rest stay missing, as bat tracking is.

Usage: python contact_surprise.py --data data/derived/bakeoff_features_v5.parquet --exp data/derived/exp_features.parquet --out data/derived/bakeoff_features_v5r.parquet
"""
from __future__ import annotations

import argparse
import os
import time

import lightgbm as lgb
import numpy as np
import pandas as pd
import pyarrow.parquet as pq
from sklearn.model_selection import GroupKFold

THREADS = int(os.environ.get("EXP_THREADS", "10"))
SW = ["sw_attack_angle", "sw_attack_dir", "sw_length", "sw_bat_speed", "sw_intercept_x", "sw_intercept_y"]
TARGETS = {"res_ad": "attack_dir_field", "res_ix": "intercept_x_field", "res_iy": "intercept_y", "res_aa": "attack_angle", "res_bs": "bat_speed"}


def main() -> None:
    ap = argparse.ArgumentParser()
    for k in ("data", "exp", "out"):
        ap.add_argument(f"--{k}", required=True)
    a = ap.parse_args()
    t0 = time.time()
    df = pd.read_parquet(a.data)
    ex = pd.read_parquet(a.exp, columns=["game_pk"] + SW)
    assert len(ex) == len(df) and (ex.game_pk.to_numpy() == df.game_pk.to_numpy()).all(), "experiment table rows are not aligned with the modeling table"
    for c in SW:
        df[c] = ex[c].to_numpy(np.float32)
    hand = np.where(df.stand_r == 1, 1.0, -1.0).astype("float32")
    df["plate_x_hand"] = (df.plate_x * hand).astype("float32")
    df["pfx_x_hand"] = (df.pfx_x * hand).astype("float32")
    df["haa_hand"] = (df.haa * hand).astype("float32")
    feats = ["stand_r", "plate_x_hand", "plate_z", "release_speed", "pfx_x_hand", "pfx_z", "vaa", "haa_hand", "pitch_type", "balls", "strikes", "zone", "p_throws"] + SW
    tr = (df.split == "train").to_numpy()
    bt = df.attack_direction.notna().to_numpy()  # bat tracking present
    X = df[feats]
    tr_rows = np.flatnonzero(tr & bt)
    others = np.flatnonzero(bt & ~tr)
    print(f"bat-tracking balls: training {len(tr_rows):,}, others {len(others):,}", flush=True)
    for res_col, tgt in TARGETS.items():
        y = df[tgt].to_numpy(np.float32)
        ok = tr_rows[~np.isnan(y[tr_rows])]
        exp = np.full(len(df), np.nan, np.float32)
        acc = np.zeros(len(df), np.float32)
        n = 0
        for a_idx, b_idx in GroupKFold(4).split(ok, groups=df.game_pk.to_numpy()[ok]):
            m = lgb.LGBMRegressor(n_estimators=500, learning_rate=0.06, num_leaves=63, min_child_samples=100, subsample=0.8, subsample_freq=1, colsample_bytree=0.8,
                                  n_jobs=THREADS, verbose=-1, random_state=0)
            m.fit(X.iloc[ok[a_idx]], y[ok[a_idx]])
            exp[ok[b_idx]] = m.predict(X.iloc[ok[b_idx]])
            acc[others] += m.predict(X.iloc[others])
            n += 1
        exp[others] = acc[others] / n
        df[res_col] = (y - exp).astype(np.float32)
        r2 = 1 - np.nanvar(y[ok] - exp[ok]) / np.nanvar(y[ok])
        print(f"{res_col}: expected-swing model R2 (out of fold) {r2:.3f}; residual sd {np.nanstd(df[res_col]):.3f}  {time.time() - t0:.0f}s", flush=True)
    df.drop(columns=["plate_x_hand", "pfx_x_hand", "haa_hand"] + SW).to_parquet(a.out)
    print("wrote", a.out, f"{time.time() - t0:.0f}s", flush=True)


if __name__ == "__main__":
    main()
