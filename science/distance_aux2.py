"""Experiment E30: distance supervision, stronger and sharper. E19 showed the gain comes from feeding the classifier a game-out-of-fold prediction of the projected distance. The E19 model was small (300 trees, 22 inputs).
Here four distance models are fitted out of fold by game on the FULL v5r feature set (69 legal inputs: contact, swing, pitch, weather, history, park, estimated bearing) and given to the classifier:
  dist_hat2   LightGBM (700 trees, 63 leaves) on every ball with a projected distance
  dist_reg    the same, trained only on balls that can leave the park (launch angle 15 to 50, exit speed 85+), so its capacity goes where the fences are
  dist_q10, dist_q90   quantile versions of the region model (the spread of the distance the ball might reach)
and the margins of each over the estimated fence distance. New columns on top of v19 (FEATSET v30): dist_hat2, dist_reg, dist_q10, dist_q90, margin2, margin_reg, margin_q10, margin_q90.
Usage: python distance_aux2.py --data data/derived/bakeoff_features_v19.parquet --out data/derived/bakeoff_features_v30.parquet [--smoke]. About 40 minutes; --smoke (3% of rows) about 2 minutes."""
import argparse
import os

os.environ["FEATSET"] = "v5r"
import lightgbm as lgb
import numpy as np
import pandas as pd

import bakeoff as B

try:
    import psutil
    psutil.Process(os.getpid()).nice(psutil.BELOW_NORMAL_PRIORITY_CLASS)
except Exception:
    pass
ap = argparse.ArgumentParser()
ap.add_argument("--data", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--smoke", action="store_true")
a = ap.parse_args()
df = pd.read_parquet(a.data)
if a.smoke:
    df = df.sample(frac=0.03, random_state=1).sort_index().reset_index(drop=True)
for c in B.CATS:
    if c in df.columns:
        df[c] = df[c].astype("category")
feats = [f for f in B.FEATS_PHYS if f in df.columns]
d = df.hit_distance_sc.to_numpy(float)
lab = (df.hit_distance_sc.between(150, 480) & df.launch_angle.between(8, 55) & df.launch_speed.between(70, 125) & df.bearing.between(-44, 44)).to_numpy()
reg = lab & df.launch_angle.between(15, 50).to_numpy() & (df.launch_speed >= 85).to_numpy()
is_test = df.split.isin(["test", "post"]).to_numpy()  # (9 Nov: and the sealed rows)
fold = (df.game_pk.astype(int) % 4).to_numpy().copy()
fold[is_test] = -1
big = dict(n_estimators=50 if a.smoke else 700, learning_rate=0.1 if a.smoke else 0.05, num_leaves=15 if a.smoke else 63, min_child_samples=30 if a.smoke else 100, subsample=0.8, subsample_freq=1, colsample_bytree=0.8, verbose=-1, n_jobs=6)
jobs = {"dist_hat2": (lab, dict(objective="regression")), "dist_reg": (reg, dict(objective="regression")),
        "dist_q10": (reg, dict(objective="quantile", alpha=0.10)), "dist_q90": (reg, dict(objective="quantile", alpha=0.90))}
use = (df.launch_angle.between(8, 55) & (df.launch_speed >= 60) & df.bearing_hat.notna()).to_numpy()
for name, (mask, extra) in jobs.items():
    pred = np.full(len(df), np.nan)
    models = []
    for f in range(4):
        trn = mask & ~is_test & (fold != f)
        from modelstore import fit as sfit
        m = sfit(f"aux2/{name}_fold{f}", lgb.LGBMRegressor(**big, **extra), lambda m: m.fit(df.loc[trn, feats], d[trn]))
        models.append(m)
        rows = (fold == f) & use
        pred[rows] = m.predict(df.loc[rows, feats])
    rows = is_test & use
    pred[rows] = np.mean([m.predict(df.loc[rows, feats]) for m in models], axis=0)
    ok = mask & ~is_test & np.isfinite(pred)
    print("%-10s out-of-fold MAE %.2f ft on %d labeled balls%s" % (name, np.abs(d[ok] - pred[ok]).mean(), ok.sum(), "" if "q" not in name else "; share below the prediction %.3f" % np.mean(d[ok] < pred[ok])), flush=True)
    df[name] = pred
df["margin2"] = df.dist_hat2 - df.fence_hat
df["margin_reg"] = df.dist_reg - df.fence_hat
df["margin_q10"] = df.dist_q10 - df.fence_hat
df["margin_q90"] = df.dist_q90 - df.fence_hat
df.to_parquet(a.out)
print("written", a.out, df.shape, flush=True)
