"""Experiment E36: a distance model specialized to the bat-tracking era. Swing features lift the explained variance of carry a lot (0.28 to 0.40, E-series), but the all-years distance model of E19/E30 sees them only on 2023-07-14 onward and shares its trees with seven older seasons.
Here a LightGBM is fitted only on balls WITH bat tracking (out of fold by game, same rules as E30) and given only to balls with bat tracking (NaN elsewhere): dist_bat and margin_bat = dist_bat - fence_hat. New columns on top of v30 (FEATSET v36).
Usage: python distance_bat.py --data data/derived/bakeoff_features_v30.parquet --out data/derived/bakeoff_features_v36.parquet [--smoke]. About 10 minutes."""
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
feats = [f for f in B.FEATS_PHYS if f in df.columns and not f.startswith(("dist_", "margin2", "margin_reg", "margin_q", "direct_margin"))]
d = df.hit_distance_sc.to_numpy(float)
bat = df.bat_speed.notna().to_numpy()
lab = (df.hit_distance_sc.between(150, 480) & df.launch_angle.between(8, 55) & df.launch_speed.between(70, 125) & df.bearing.between(-44, 44)).to_numpy() & bat
is_test = df.split.isin(["test", "post"]).to_numpy()  # (9 Nov: and the sealed rows)
fold = (df.game_pk.astype(int) % 4).to_numpy().copy()
fold[is_test] = -1
use = (df.launch_angle.between(8, 55) & (df.launch_speed >= 60) & df.bearing_hat.notna()).to_numpy() & bat
big = dict(n_estimators=40 if a.smoke else 600, learning_rate=0.1 if a.smoke else 0.05, num_leaves=15 if a.smoke else 63, min_child_samples=30 if a.smoke else 80, subsample=0.8, subsample_freq=1, colsample_bytree=0.8, verbose=-1, n_jobs=6)
pred = np.full(len(df), np.nan)
models = []
for f in range(4):
    trn = lab & ~is_test & (fold != f)
    from modelstore import fit as sfit
    m = sfit(f"dist_bat/fold{f}", lgb.LGBMRegressor(**big), lambda m: m.fit(df.loc[trn, feats], d[trn]))
    models.append(m)
    rows = (fold == f) & use
    pred[rows] = m.predict(df.loc[rows, feats])
rows = is_test & use
pred[rows] = np.mean([m.predict(df.loc[rows, feats]) for m in models], axis=0)
okk = lab & ~is_test & np.isfinite(pred)
print("bat-era distance model: out-of-fold MAE %.2f ft on %d labeled balls with bat tracking (the all-years model scored %.2f ft on balls of every era)" % (np.abs(d[okk] - pred[okk]).mean(), okk.sum(), np.abs(d[okk] - df.dist_hat2.to_numpy()[okk]).mean() if "dist_hat2" in df.columns else float("nan")), flush=True)
df["dist_bat"] = pred
df["margin_bat"] = df.dist_bat - df.fence_hat
df.to_parquet(a.out)
print("written", a.out, df.shape, flush=True)
