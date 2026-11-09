"""Experiment E19 (GPT brief-5 idea 1, the E10 forensic ablation): is E10's gain the PHYSICS (inverting the flight sandbox to a carry multiplier, flying the ball at the predicted carry, margin over the fence) or just
the SUPERVISION (a game-out-of-fold model of the projected distance from legal inputs)? Same inputs, same folds, same downstream XGBoost; only the construction differs:
  E10:  carry_hat -> phys_dist_c (flight at that carry) -> margin_c
  E19:  dist_hat = out-of-fold LightGBM of hit_distance_sc on the SAME legal inputs; direct_margin = dist_hat - fence_hat
New columns on top of v5r (not v10): dist_hat, direct_margin (FEATSET v19). Compare v19 against v5r (what distance supervision alone buys) and against v10 (what the physics adds beyond it).
Usage: python direct_distance.py --data data/derived/bakeoff_features_v5r.parquet --out data/derived/bakeoff_features_v19.parquet. About 10 minutes; lowers its own priority."""
import argparse
import os

import lightgbm as lgb
import numpy as np
import pandas as pd

try:
    import psutil
    psutil.Process(os.getpid()).nice(psutil.BELOW_NORMAL_PRIORITY_CLASS)
except Exception:
    pass
ap = argparse.ArgumentParser()
ap.add_argument("--data", required=True)
ap.add_argument("--out", required=True)
a = ap.parse_args()
df = pd.read_parquet(a.data)
df["stand_r"] = df.stand_r.astype(float)
df["p_throws_r"] = (df.p_throws == "R").astype(float)
# the same legal inputs the E10 carry model sees
F = ["launch_speed", "launch_angle", "stand_r", "bearing_hat", "om_temp_f", "om_rh", "om_pressure_hpa", "om_wind_u", "om_wind_v", "release_speed", "release_spin_rate", "spin_axis", "pfx_x", "pfx_z",
     "plate_x", "plate_z", "vaa", "bat_speed", "attack_angle", "swing_path_tilt", "swing_length", "p_throws_r"]
lab = (df.hit_distance_sc.between(150, 480) & df.launch_angle.between(8, 55) & df.launch_speed.between(70, 125) & df.bearing.between(-44, 44)).to_numpy()  # exactly the rows E10 labeled
is_test = df.split.isin(["test", "post"]).to_numpy().copy()  # (9 Nov: and the sealed rows)
fold = (df.game_pk.astype(int) % 4).to_numpy().copy()
fold[is_test] = -1
has = lab & ~is_test
P = dict(n_estimators=300, learning_rate=0.05, num_leaves=31, min_child_samples=100, subsample=0.8, subsample_freq=1, colsample_bytree=0.8, verbose=-1, n_jobs=3)
pred = np.zeros(len(df))
models = []
for f in range(4):
    trn = has & (fold != f)
    from modelstore import fit as sfit
    m = sfit(f"dist_hat/fold{f}", lgb.LGBMRegressor(**P), lambda m: m.fit(df.loc[trn, F], df.hit_distance_sc[trn]))
    models.append(m)
    rows = fold == f
    pred[rows] = m.predict(df.loc[rows, F])
    print("  fold %d fitted on %d balls" % (f, trn.sum()), flush=True)
pred[is_test] = np.mean([m.predict(df.loc[is_test, F]) for m in models], axis=0)
ok = has & np.isfinite(pred)
d = df.hit_distance_sc.to_numpy(float)
print("distance model out-of-fold MAE on labeled train/val balls: %.2f ft, R2 %.4f" % (np.abs(d[ok] - pred[ok]).mean(), 1 - np.sum((d[ok] - pred[ok]) ** 2) / np.sum((d[ok] - d[ok].mean()) ** 2)), flush=True)
use = (df.launch_angle.between(8, 55) & (df.launch_speed >= 60) & df.bearing_hat.notna()).to_numpy()
df["dist_hat"] = np.where(use, pred, np.nan)
df["direct_margin"] = df.dist_hat - df.fence_hat
df.to_parquet(a.out)
print("written", a.out, df.shape, flush=True)
