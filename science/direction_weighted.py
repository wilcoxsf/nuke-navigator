"""Experiment E22 (GPT brief-5 ranked bet 1): a geometry-aware landing-direction model. The direction model (C5: LightGBM L1 averaged with XGBoost L1, trained on balls that can leave the park, four game-grouped folds)
treats every degree of error alike, but a degree only matters where the fence is steep and the ball is close to it. Here each training ball is weighted
    w = 1 + 2 exp(-|margin_c| / 30 ft) x min(|d fence / d bearing| / 3, 3)
where margin_c is the carry-corrected margin over the fence (E10, game-out-of-fold) and the slope is the fence's slope in feet per degree at the ball's own estimated bearing (the park's five-point profile).
Nothing is peeked at: margin_c and bearing_hat on a training ball come from game-out-of-fold fits, and the weights use no label.
Writes a new table with bearing_hat replaced (the previous one kept as bearing_hat_prev) and fence_hat / margin_hat recomputed; the carry features are STALE after this and must be rebuilt on the new bearing
(carry_features.py --logm <cached labels>), which the chain script does, so the whole pipeline downstream of the direction is refit (GPT's nested-OOF rule).
Reports, old versus new, on validation and test: near-wall bearing MAE and the wall-sensitive error (mean |error| x |fence slope|, in feet) for balls within 40 ft of the fence.
Usage: python direction_weighted.py --data data/derived/bakeoff_features_v10.parquet --out data/derived/bakeoff_features_v22a.parquet [--smoke]. About 60 minutes full; --smoke (3% of rows, few trees) about 2 minutes."""
from __future__ import annotations

import argparse
import os
import time

import lightgbm as lgb
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import GroupKFold

try:
    import psutil
    psutil.Process(os.getpid()).nice(psutil.BELOW_NORMAL_PRIORITY_CLASS)
except Exception:
    pass
from bakeoff_data import DIMS, fence_at
from experiments import HID
from ladder import BASE0, BAT, HIST, PITCH, WX

THREADS = int(os.environ.get("EXP_THREADS", "8"))
F0 = BASE0 + PITCH + HIST + WX + BAT + HID["H1"]["cols"] + HID["H4"]["cols"]
EXTRA = ["vaa", "haa", "plate_x_hand", "ad_sin", "ad_cos"]
NODES = np.array([-45.0, -22.5, 0.0, 22.5, 45.0])


def fence_slope(df, bearing):
    """|d fence / d bearing| in feet per degree at each ball's bearing, from the park's five-point profile (piecewise linear)."""
    d = df[DIMS].to_numpy(dtype=float)
    d = np.where(np.isnan(d), np.nanmean(d, axis=0), d)
    b = np.clip(np.nan_to_num(bearing, nan=0.0), -44.999, 44.999)
    i = np.clip(np.floor((b + 45.0) / 22.5).astype(int), 0, 3)
    ar = np.arange(len(df))
    return np.abs(d[ar, i + 1] - d[ar, i]) / 22.5


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--folds", type=int, default=4)
    ap.add_argument("--smoke", action="store_true")
    a = ap.parse_args()
    t0 = time.time()
    df = pd.read_parquet(a.data)
    if a.smoke:
        df = df.sample(frac=0.03, random_state=1).sort_index().reset_index(drop=True)
    hand = np.where(df.stand_r == 1, 1.0, -1.0).astype("float32")
    df["plate_x_hand"] = (df.plate_x * hand).astype("float32")
    ang = np.deg2rad(df.attack_direction.astype("float32"))
    df["ad_sin"], df["ad_cos"] = np.sin(ang).astype("float32"), np.cos(ang).astype("float32")
    feats = F0 + EXTRA
    tr, va, te = (df.split == "train").to_numpy(), (df.split == "val").to_numpy(), (df.split == "test").to_numpy()
    region = ((df.launch_speed >= 70) & df.launch_angle.between(8, 55)).to_numpy()
    lab = df.bearing.notna().to_numpy()
    y = df.bearing.to_numpy()
    old = df.bearing_hat.to_numpy(np.float32)
    slope = fence_slope(df, old)
    margin = df.margin_c.to_numpy(float)
    w = np.where(np.isfinite(margin), 1.0 + 2.0 * np.exp(-np.abs(margin) / 30.0) * np.minimum(slope / 3.0, 3.0), 1.0)
    print("weights: mean %.2f, 90th percentile %.2f, max %.2f; share of region balls with weight above 2: %.3f" % (w[region].mean(), np.percentile(w[region], 90), w[region].max(), (w[region] > 2).mean()), flush=True)
    fit_rows = np.flatnonzero(tr & region & lab)
    val_rows = va & region & lab
    other = np.flatnonzero(region & ~(tr & lab))
    print(f"fit rows {len(fit_rows):,}, other region rows {len(other):,}", flush=True)
    n_est = 60 if a.smoke else 1600
    big = dict(objective="l1", n_estimators=n_est, learning_rate=0.05 if not a.smoke else 0.2, num_leaves=127 if not a.smoke else 15, min_child_samples=100 if not a.smoke else 20, subsample=0.8, subsample_freq=1, colsample_bytree=0.8,
               n_jobs=THREADS, verbose=-1, random_state=0)
    oof = np.full(len(df), np.nan, np.float32)
    avg = np.zeros(len(df), np.float32)
    cnt = 0
    X = df[feats]
    for k, (a_idx, b_idx) in enumerate(GroupKFold(a.folds).split(fit_rows, groups=df.game_pk.to_numpy()[fit_rows])):
        ia, ib = fit_rows[a_idx], fit_rows[b_idx]
        m1 = lgb.LGBMRegressor(**big)
        m1.fit(X.iloc[ia], y[ia], sample_weight=w[ia], eval_set=[(X[val_rows], y[val_rows])], callbacks=[lgb.early_stopping(60, verbose=False)])
        m2 = xgb.XGBRegressor(tree_method="hist", enable_categorical=True, objective="reg:absoluteerror", n_estimators=n_est, learning_rate=0.06 if not a.smoke else 0.2, max_depth=8 if not a.smoke else 4,
                              min_child_weight=50 if not a.smoke else 5, subsample=0.8, colsample_bytree=0.7, n_jobs=THREADS, early_stopping_rounds=60)
        m2.fit(X.iloc[ia], y[ia], sample_weight=w[ia], eval_set=[(X[val_rows], y[val_rows])], verbose=False)
        oof[ib] = 0.5 * (m1.predict(X.iloc[ib]) + m2.predict(X.iloc[ib]))
        rest = np.flatnonzero(region)
        avg[rest] += 0.5 * (m1.predict(X.iloc[rest]) + m2.predict(X.iloc[rest]))
        cnt += 1
        print(f"fold {k + 1}/{a.folds}: lgb trees {m1.best_iteration_}, xgb trees {m2.best_iteration}, {time.time() - t0:.0f}s", flush=True)
    avg[region] /= cnt
    new = old.copy()
    new[fit_rows] = oof[fit_rows]
    new[other] = avg[other]
    near = df.hit_distance_sc.between(330, 430).to_numpy()
    close = np.isfinite(margin) & (np.abs(margin) < 40)
    for name, base in (("train (out of fold)", tr), ("validation", va), ("test", te)):
        s1 = base & region & lab & near
        s2 = base & region & lab & close
        if s1.sum() == 0 or s2.sum() == 0:
            continue
        print(f"{name}: near-wall (330-430 ft) bearing MAE old {np.abs(old[s1] - y[s1]).mean():.3f} -> new {np.abs(new[s1] - y[s1]).mean():.3f} deg ({int(s1.sum()):,} balls); "
              f"within 40 ft of the fence: wall-sensitive error old {np.mean(np.abs(old[s2] - y[s2]) * slope[s2]):.3f} -> new {np.mean(np.abs(new[s2] - y[s2]) * fence_slope(df, new)[s2]):.3f} ft per ball, bearing MAE old {np.abs(old[s2] - y[s2]).mean():.3f} -> new {np.abs(new[s2] - y[s2]).mean():.3f} ({int(s2.sum()):,} balls)", flush=True)
    df["bearing_hat_prev"] = old
    df["bearing_hat"] = new
    df["fence_hat"] = fence_at(df, new)
    df["margin_hat"] = df.phys_dist - df.fence_hat
    df.drop(columns=["plate_x_hand", "ad_sin", "ad_cos"]).to_parquet(a.out)
    print("wrote", a.out, df.shape, f"{time.time() - t0:.0f}s", flush=True)


if __name__ == "__main__":
    main()
