"""Boundary-aware direction: instead of one number for where the ball will go, nine probabilities for which sector of the field it lands in.

A 3 degree miss near a short foul-line wall changes the outcome; the same miss toward deep center does not. A multi-class LightGBM predicts the landing-bearing
sector (edges -35, -25, -15, -5, 5, 15, 25, 35 degrees) for balls that can leave the park (exit speed 70+, launch angle 8 to 55), with the C5 inputs. Out of
fold for training-period balls (4 game-grouped folds), fold-average for every other ball. The nine probabilities and their entropy are added to the table.

Usage: python direction_sectors.py --data data/derived/bakeoff_features_v5r.parquet --out data/derived/bakeoff_features_v6.parquet
"""
from __future__ import annotations

import argparse
import os
import time

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold

from experiments import HID
from ladder import BASE0, BAT, HIST, PITCH, WX

THREADS = int(os.environ.get("EXP_THREADS", "10"))
F0 = BASE0 + PITCH + HIST + WX + BAT + HID["H1"]["cols"] + HID["H4"]["cols"]
EDGES = [-35, -25, -15, -5, 5, 15, 25, 35]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    t0 = time.time()
    df = pd.read_parquet(a.data)
    hand = np.where(df.stand_r == 1, 1.0, -1.0).astype("float32")
    df["plate_x_hand"] = (df.plate_x * hand).astype("float32")
    ang = np.deg2rad(df.attack_direction.astype("float32"))
    df["ad_sin"], df["ad_cos"] = np.sin(ang).astype("float32"), np.cos(ang).astype("float32")
    feats = F0 + ["vaa", "haa", "plate_x_hand", "ad_sin", "ad_cos"]
    tr, va = (df.split == "train").to_numpy(), (df.split == "val").to_numpy()
    region = ((df.launch_speed >= 70) & df.launch_angle.between(8, 55)).to_numpy()
    lab = df.bearing.notna().to_numpy()
    cls = np.digitize(df.bearing.fillna(0).to_numpy(), EDGES)
    fit_rows = np.flatnonzero(tr & region & lab)
    val_rows = np.flatnonzero(va & region & lab)
    allreg = np.flatnonzero(region)
    X = df[feats]
    K = len(EDGES) + 1
    oof = np.full((len(df), K), np.nan, np.float32)
    avg = np.zeros((len(df), K), np.float32)
    nf = 0
    for k, (ia, ib) in enumerate(GroupKFold(4).split(fit_rows, groups=df.game_pk.to_numpy()[fit_rows])):
        m = lgb.LGBMClassifier(objective="multiclass", n_estimators=600, learning_rate=0.08, num_leaves=63, min_child_samples=200, subsample=0.8, subsample_freq=1,
                               colsample_bytree=0.8, n_jobs=THREADS, verbose=-1, random_state=0)
        m.fit(X.iloc[fit_rows[ia]], cls[fit_rows[ia]], eval_set=[(X.iloc[val_rows], cls[val_rows])], callbacks=[lgb.early_stopping(40, verbose=False)])
        oof[fit_rows[ib]] = m.predict_proba(X.iloc[fit_rows[ib]])
        avg[allreg] += m.predict_proba(X.iloc[allreg])
        nf += 1
        print(f"fold {k + 1}/4: {m.best_iteration_} trees, {time.time() - t0:.0f}s", flush=True)
    avg[allreg] /= nf
    P = np.full((len(df), K), np.nan, np.float32)
    P[allreg] = avg[allreg]
    P[fit_rows] = oof[fit_rows]
    for j in range(K):
        df[f"sec_{j}"] = P[:, j]
    df["sec_ent"] = -(np.nan_to_num(P) * np.log(np.clip(np.nan_to_num(P, nan=1.0 / K), 1e-6, 1))).sum(1)
    df.loc[~region, "sec_ent"] = np.nan
    te = (df.split == "test").to_numpy() & region & lab
    acc = (P[te].argmax(1) == cls[te]).mean()
    ll = -np.log(np.clip(P[te][np.arange(te.sum()), cls[te]], 1e-6, 1)).mean()
    print(f"test sector accuracy {acc:.3f}, log loss {ll:.3f} (uniform would be {np.log(K):.3f})", flush=True)
    df.drop(columns=["plate_x_hand", "ad_sin", "ad_cos"]).to_parquet(a.out)
    print("wrote", a.out, f"{time.time() - t0:.0f}s", flush=True)


if __name__ == "__main__":
    main()
