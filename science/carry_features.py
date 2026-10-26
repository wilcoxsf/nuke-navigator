"""Experiment E10: carry-corrected physics features for the production classifier (learning-curve idea: physics priors are a sample-efficiency lever; the curve is not flat).
Step 1: carry label (air-density multiplier that makes the page's physics reproduce Statcast's projected distance) for every ball in play with a distance, 2015 to 2026.
Step 2: a LightGBM model of log carry from predict-legal inputs only (exit speed, launch angle, hand, ESTIMATED bearing, weather, pitch, and bat tracking where it exists). Out of fold by game for train and
        validation rows (game_pk mod 4), average of the four fold models for test rows, so no ball's own label ever informs its own feature.
Step 3: physics distance at the predicted carry along the estimated bearing, and its margin over the estimated fence distance.
New columns: carry_hat, phys_dist_c, margin_c, carry_vs_prior (exp(carry_hat) - 1).
Usage: python carry_features.py --data data/derived/bakeoff_features_v5r.parquet --out data/derived/bakeoff_features_v10.parquet
Heavy (about 25 minutes); lowers its own priority."""
from __future__ import annotations

import argparse
import os

import lightgbm as lgb
import numpy as np
import pandas as pd

from flight_fit import FT, MPH, RPM
from savant_xhr_compare import fly_path

try:
    import psutil
    psutil.Process(os.getpid()).nice(psutil.BELOW_NORMAL_PRIORITY_CLASS)
except Exception:
    pass

CH = 4000


def flown(frame, bearing, mult, rho0, hand):
    la = frame.launch_angle.to_numpy(float)
    base = dict(v0=frame.launch_speed.to_numpy(float) * MPH, theta=np.deg2rad(la), phi=np.deg2rad(bearing), w_back=np.maximum(0, -763 + 120 * la) * RPM, w_side=(-hand * 864 - 75 * bearing) * RPM)
    n = len(frame)
    d = np.zeros(n)
    for s in range(0, n, CH):
        sl = slice(s, s + CH)
        R, _ = fly_path(rho=rho0[sl] * mult[sl], **{k: v[sl] for k, v in base.items()})
        d[sl] = R[:, -1] / FT
    return d


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--logm", help="cached carry labels (.npy) to skip the 30-minute bisection; labels use the true bearing so they stay valid when bearing_hat changes")
    a = ap.parse_args()
    df = pd.read_parquet(a.data)
    df["air_density"] = df.air_density.fillna(1.2)
    hand_all = np.where(df.stand_r.to_numpy() == 1, 1.0, -1.0)
    # step 1: labels
    lab = (df.hit_distance_sc.between(150, 480) & df.launch_angle.between(8, 55) & df.launch_speed.between(70, 125) & df.bearing.between(-44, 44)).to_numpy()
    ix = np.where(lab)[0]
    sub = df.iloc[ix]
    h, rho0, target, br = hand_all[ix], sub.air_density.to_numpy(float), sub.hit_distance_sc.to_numpy(float), sub.bearing.to_numpy(float)
    n = len(sub)
    print("carry labels for %d balls" % n, flush=True)
    lo, hi = np.full(n, 0.2), np.full(n, 1.8)
    for k in range(0 if a.logm else 11):
        mid = 0.5 * (lo + hi)
        too_far = flown(sub, br, mid, rho0, h) > target
        lo, hi = np.where(too_far, mid, lo), np.where(too_far, hi, mid)
        print("  carry pass", k + 1, flush=True)
    logm = np.full(len(df), np.nan)
    logm[ix] = np.log(0.5 * (lo + hi))
    if a.logm:
        logm = np.load(a.logm)
        assert len(logm) == len(df), "cached labels do not match this table"
    df["logm"] = logm
    np.save(a.out + ".logm.npy", logm)  # keep the 30-minute label pass if a later step fails
    # step 2: out-of-fold carry model
    F = ["launch_speed", "launch_angle", "stand_r", "bearing_hat", "om_temp_f", "om_rh", "om_pressure_hpa", "om_wind_u", "om_wind_v", "release_speed", "release_spin_rate", "spin_axis", "pfx_x", "pfx_z",
         "plate_x", "plate_z", "vaa", "bat_speed", "attack_angle", "swing_path_tilt", "swing_length", "p_throws_r"]
    df["p_throws_r"] = (df.p_throws == "R").astype(float)
    df["stand_r"] = df.stand_r.astype(float)
    P = dict(n_estimators=300, learning_rate=0.05, num_leaves=31, min_child_samples=100, subsample=0.8, subsample_freq=1, colsample_bytree=0.8, verbose=-1, n_jobs=3)
    fold = (df.game_pk.astype(int) % 4).to_numpy().copy()  # a copy: pandas hands back a read-only view
    is_test = (df.split == "test").to_numpy().copy()
    fold[is_test] = -1
    has = np.isfinite(df.logm.to_numpy()) & ~is_test
    pred = np.zeros(len(df))
    models = []
    for f in range(4):
        trn = has & (fold != f)
        m = lgb.LGBMRegressor(**P).fit(df.loc[trn, F], df.logm[trn])
        models.append(m)
        rows = fold == f
        pred[rows] = m.predict(df.loc[rows, F])
        print("  carry fold %d fitted on %d balls" % (f, trn.sum()), flush=True)
    pred[is_test] = np.mean([m.predict(df.loc[is_test, F]) for m in models], axis=0)
    ok = has & np.isfinite(pred)
    print("carry model out-of-fold R2 on labeled train/val balls: %.4f" % (1 - np.sum((df.logm[ok] - pred[ok]) ** 2) / np.sum((df.logm[ok] - df.logm[ok].mean()) ** 2)), flush=True)
    df["carry_hat"] = pred
    # step 3: physics distance at the predicted carry along the estimated bearing
    use = (df.launch_angle.between(8, 55) & (df.launch_speed >= 60) & df.bearing_hat.notna()).to_numpy()
    iu = np.where(use)[0]
    su = df.iloc[iu]
    d = flown(su, su.bearing_hat.to_numpy(float), np.exp(pred[iu]), su.air_density.to_numpy(float), hand_all[iu])
    col = np.full(len(df), np.nan)
    col[iu] = d
    df["phys_dist_c"] = col
    df["margin_c"] = df.phys_dist_c - df.fence_hat
    df["carry_vs_prior"] = np.exp(df.carry_hat) - 1.0
    df.loc[~use, ["carry_hat", "carry_vs_prior"]] = np.nan
    df.to_parquet(a.out)
    print("written", a.out, df.shape, flush=True)


if __name__ == "__main__":
    main()
