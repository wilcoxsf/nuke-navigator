"""Experiment E21 (GPT brief-5 idea 12): heteroscedastic direction uncertainty as features. E13 standardized the margin by the carry uncertainty only; but near a fence the direction error often dominates.
A game-out-of-fold LightGBM predicts the size of this ball's bearing error, |true bearing - bearing_hat| (a label used only as a training target), from legal inputs, bearing_hat and the E10 margin. Then:
  sigma_b       predicted absolute bearing error (degrees)
  dir_unc_ft    sigma_b x |fence slope| (feet per degree at bearing_hat): the distance-equivalent wall uncertainty coming from the direction
  margin_z2     margin_c / sqrt(dir_unc_ft^2 + (0.37 x phys_dist_c x carry_sd)^2): the margin in units of the combined direction and carry uncertainty
Usage: python sigma_bearing_features.py --data data/derived/bakeoff_features_v10.parquet --out data/derived/bakeoff_features_v21.parquet [--smoke]. About 10 minutes; --smoke about 1 minute."""
import argparse
import json
import os

import lightgbm as lgb
import numpy as np
import pandas as pd
from scipy.interpolate import RegularGridInterpolator

from direction_weighted import F0, EXTRA, fence_slope

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
ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
df = pd.read_parquet(a.data)
if a.smoke:
    df = df.sample(frac=0.03, random_state=1).sort_index().reset_index(drop=True)
hand = np.where(df.stand_r == 1, 1.0, -1.0).astype("float32")
df["plate_x_hand"] = (df.plate_x * hand).astype("float32")
ang = np.deg2rad(df.attack_direction.astype("float32"))
df["ad_sin"], df["ad_cos"] = np.sin(ang).astype("float32"), np.cos(ang).astype("float32")
F = F0 + EXTRA + ["bearing_hat", "margin_c", "phys_dist_c", "carry_hat"]
region = ((df.launch_speed >= 70) & df.launch_angle.between(8, 55)).to_numpy()
tr = (df.split == "train").to_numpy()
is_test = ~tr
lab = df.bearing.notna().to_numpy()
err = np.abs(df.bearing.to_numpy(float) - df.bearing_hat.to_numpy(float))
fit = tr & region & lab & np.isfinite(err)
fold = (df.game_pk.astype(int) % 4).to_numpy().copy()
P = dict(objective="regression", n_estimators=40 if a.smoke else 400, learning_rate=0.1 if a.smoke else 0.05, num_leaves=15 if a.smoke else 63, min_child_samples=20 if a.smoke else 200, subsample=0.8, subsample_freq=1, colsample_bytree=0.8, verbose=-1, n_jobs=6)
pred = np.full(len(df), np.nan)
models = []
for k in range(4):
    trn = fit & (fold != k)
    m = lgb.LGBMRegressor(**P).fit(df.loc[trn, F], err[trn])
    models.append(m)
    rows = tr & region & (fold == k)
    pred[rows] = m.predict(df.loc[rows, F])
    print("  fold %d fitted on %d balls" % (k, trn.sum()), flush=True)
rows = is_test & region
pred[rows] = np.mean([m.predict(df.loc[rows, F]) for m in models], axis=0)
ok = fit & np.isfinite(pred)
print("sigma model out-of-fold: mean predicted %.2f deg, mean actual abs error %.2f deg, correlation %.3f (%d balls)" % (pred[ok].mean(), err[ok].mean(), np.corrcoef(pred[ok], err[ok])[0, 1], ok.sum()), flush=True)
df["sigma_b"] = pred
slope = fence_slope(df, df.bearing_hat.to_numpy(float))
df["dir_unc_ft"] = df.sigma_b * slope
T = json.load(open(ROOT + "apps/web/public/carry_table.json"))
evn = T["ev0"] + T["de"] * np.arange(len(T["mean"]))
lan = T["la0"] + T["dl"] * np.arange(len(T["mean"][0]))
sd_f = RegularGridInterpolator((evn, lan), np.array(T["sd"]), bounds_error=False, fill_value=None)
carry_sd = sd_f(np.column_stack([np.clip(df.launch_speed.fillna(80).to_numpy(float), evn[0], evn[-1]), np.clip(df.launch_angle.fillna(20).to_numpy(float), lan[0], lan[-1])]))
den = np.sqrt(df.dir_unc_ft ** 2 + (0.37 * df.phys_dist_c * carry_sd) ** 2)
df["margin_z2"] = (df.margin_c / den).clip(-12, 12)
df = df.drop(columns=["plate_x_hand", "ad_sin", "ad_cos"])
df.to_parquet(a.out)
t = df[(df.split == "test") & df.margin_z2.notna()]
print("written", a.out, df.shape, "| test balls |margin_z2| < 1: %.3f of flyers, home-run rate there %.3f" % ((t.margin_z2.abs() < 1).mean(), t.y[t.margin_z2.abs() < 1].mean()), flush=True)
