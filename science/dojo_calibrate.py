"""Calibrate the browser sandbox's flight model against real MLB fly balls.

The sandbox uses a fixed set of aerodynamics and the wood-bat spin prior (backspin -763 + 120 x launch angle rpm; sidespin -849 x hand - 94 x
direction rpm) with no per-ball corrections. This script simulates real fly balls (exit speed 85+, launch angle 10-50, from 2023-03-01) with the
same recipe and finds the drag and lift scale factors that make the average miss against Statcast projected distance zero.

Usage: python dojo_calibrate.py --mlb data/derived/exp_features.parquet --params science/flight_fit_results_params.json
"""
import argparse
import json

import numpy as np
import pandas as pd

from flight_fit import FT, MPH, RPM, simulate

ap = argparse.ArgumentParser()
ap.add_argument("--mlb", required=True)
ap.add_argument("--params", required=True)
a = ap.parse_args()
df = pd.read_parquet(a.mlb.replace("\\", "/"), columns=["pool", "launch_speed", "launch_angle", "hit_distance_sc", "air_density", "bearing", "stand_r"])
df = df[(df.pool != "early") & (df.launch_speed >= 85) & df.launch_angle.between(10, 50) & df.hit_distance_sc.notna() & df.bearing.between(-45, 45) & df.air_density.notna()]
df = df.sample(30000, random_state=0).reset_index(drop=True)
print("balls", len(df), "mean projected distance", round(df.hit_distance_sc.mean(), 1), "ft", flush=True)
hand = np.where(df.stand_r == 1, 1.0, -1.0)
wb = np.maximum(0, -763 + 120 * df.launch_angle.to_numpy()) * RPM
ws = (-hand * 849 - 94 * df.bearing.to_numpy()) * RPM
base = dict(v0=df.launch_speed.to_numpy() * MPH, theta=np.deg2rad(df.launch_angle.to_numpy()), phi=np.deg2rad(df.bearing.to_numpy()), w_back=wb, w_side=ws,
            z0=np.full(len(df), 1.0), dt=0.02, rho=df.air_density.to_numpy())
y = df.hit_distance_sc.to_numpy()
fams = {"college fit": [0.358, 0.1757, 1.5148, 3.0925], "physics-net fit (what the page used)": [0.3728, 0.1492, 1.0512, 2.5479]}
res = []
for fam, p in fams.items():
    for kd in (0.9, 1.0, 1.1):
        for kl in (0.9, 1.0, 1.15, 1.3, 1.45):
            d, _, _ = simulate(np.array([p[0] * kd, p[1] * kd, p[2] * kl, p[3]]), **base)
            e = d / FT - y
            res.append((fam, kd, kl, float(np.nanmean(e)), float(np.nanmean(np.abs(e)))))
            print(fam, kd, kl, "mean error %.1f ft, MAE %.1f ft" % (res[-1][3], res[-1][4]), flush=True)
best = min(res, key=lambda r: r[4])
print("BEST by MAE:", best)
zero = min(res, key=lambda r: abs(r[3]))
print("closest to zero mean error:", zero)
