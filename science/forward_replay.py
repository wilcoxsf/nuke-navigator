"""Experiment E20 (GPT brief-5 idea 11 and the 'independent forward slice' audit): does the E10 carry-feature gain hold on a forward slice that none of the E10-to-E18 decisions ever looked at?
Everything is re-cut in time: train through 2023-12-31, validation 2024-03-20 to 2024-05-15 (early stopping), test 2024-05-16 to 2024-09-30; 2025 and 2026 are dropped entirely. The carry model is refit on
pre-2024 balls ONLY (game-out-of-fold within them) and predicts the 2024 balls, so no later season informs the carry feature of a 2024 ball. Then XGBoost on the v5r features (control) and on v10
(v5r + the four carry features) are compared, paired by game, on the 2024 test slice.
Caveat (stated plainly): bearing_hat and the contact-surprise residuals already in v5r were fitted earlier on the full history, so a little later-season information sits in those columns for BOTH arms;
the carry columns are the only thing that differs, so the paired difference is still a fair test of them.
Usage: python forward_replay.py  (reuses the carry labels saved by carry_features.py). About 25 minutes; lowers its own priority. Output: data/derived/bakeoff_features_fwd2024.parquet"""
import os

import lightgbm as lgb
import numpy as np
import pandas as pd

from carry_features import flown  # flight at a given carry multiplier

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
df = pd.read_parquet(ROOT + "data/derived/bakeoff_features_v5r.parquet")
logm = np.load(ROOT + "data/derived/bakeoff_features_v10.parquet.logm.npy")
assert len(logm) == len(df)
d = pd.to_datetime(df.game_date)
split = np.full(len(df), "drop", dtype=object)
split[(d <= "2023-12-31").to_numpy()] = "train"
split[((d >= "2024-03-20") & (d <= "2024-05-15")).to_numpy()] = "val"
split[((d >= "2024-05-16") & (d <= "2024-09-30")).to_numpy()] = "test"
df["split"] = split
df["logm"] = logm
keep = split != "drop"
df, logm = df[keep].reset_index(drop=True), logm[keep]
print("train %d val %d test %d" % tuple((df.split == s).sum() for s in ("train", "val", "test")), flush=True)
df["air_density"] = df.air_density.fillna(1.2)
df["stand_r"] = df.stand_r.astype(float)
df["p_throws_r"] = (df.p_throws == "R").astype(float)
F = ["launch_speed", "launch_angle", "stand_r", "bearing_hat", "om_temp_f", "om_rh", "om_pressure_hpa", "om_wind_u", "om_wind_v", "release_speed", "release_spin_rate", "spin_axis", "pfx_x", "pfx_z",
     "plate_x", "plate_z", "vaa", "bat_speed", "attack_angle", "swing_path_tilt", "swing_length", "p_throws_r"]
P = dict(n_estimators=300, learning_rate=0.05, num_leaves=31, min_child_samples=100, subsample=0.8, subsample_freq=1, colsample_bytree=0.8, verbose=-1, n_jobs=3)
is_tr = (df.split == "train").to_numpy()
fold = (df.game_pk.astype(int) % 4).to_numpy().copy()
fold[~is_tr] = -1
has = np.isfinite(df.logm.to_numpy()) & is_tr
pred = np.zeros(len(df))
models = []
for f in range(4):
    trn = has & (fold != f)
    m = lgb.LGBMRegressor(**P).fit(df.loc[trn, F], df.logm[trn])
    models.append(m)
    pred[fold == f] = m.predict(df.loc[fold == f, F])
    print("  carry fold %d fitted on %d pre-2024 balls" % (f, trn.sum()), flush=True)
pred[~is_tr] = np.mean([m.predict(df.loc[~is_tr, F]) for m in models], axis=0)
ok = has & np.isfinite(pred)
print("carry model (pre-2024 fit) out-of-fold R2 on pre-2024 balls: %.4f" % (1 - np.sum((df.logm[ok] - pred[ok]) ** 2) / np.sum((df.logm[ok] - df.logm[ok].mean()) ** 2)), flush=True)
hold = ~is_tr & np.isfinite(df.logm.to_numpy())
print("   and on the 2024 held-out balls it never saw: R2 %.4f" % (1 - np.sum((df.logm[hold] - pred[hold]) ** 2) / np.sum((df.logm[hold] - df.logm[hold].mean()) ** 2)), flush=True)
df["carry_hat"] = pred
use = (df.launch_angle.between(8, 55) & (df.launch_speed >= 60) & df.bearing_hat.notna()).to_numpy()
iu = np.where(use)[0]
su = df.iloc[iu]
hand = np.where(su.stand_r.to_numpy() == 1, 1.0, -1.0)
dist = flown(su, su.bearing_hat.to_numpy(float), np.exp(pred[iu]), su.air_density.to_numpy(float), hand)
col = np.full(len(df), np.nan)
col[iu] = dist
df["phys_dist_c"] = col
df["margin_c"] = df.phys_dist_c - df.fence_hat
df["carry_vs_prior"] = np.exp(df.carry_hat) - 1.0
df.loc[~use, ["carry_hat", "carry_vs_prior"]] = np.nan
df.to_parquet(ROOT + "data/derived/bakeoff_features_fwd2024.parquet")
print("written fwd2024", df.shape, flush=True)
