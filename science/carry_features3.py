"""Experiment E16: carry-corrected flight shape. E10 gave the XGBoost the distance at the predicted carry and its margin over the fence; the earlier wall-crossing-height test (v8) used carry 1 and found nothing.
Here the ball is flown at the predicted carry (carry_hat from E10) along the estimated bearing, and we record: the height at the moment its range reaches the estimated fence distance (h_fence_c, NaN if it never gets
there), the height over that park's wall at the estimated bearing (clear_c = h_fence_c - wall height, from parks30.json), the apex (apex_c) and the hang time (hang_c).
New columns on top of v10: h_fence_c, clear_c, apex_c, hang_c.
Usage: python carry_features3.py --data data/derived/bakeoff_features_v10.parquet --out data/derived/bakeoff_features_v16.parquet. About 30 minutes; lowers its own priority."""
import argparse
import json
import os

import numpy as np
import pandas as pd

from flight_fit import FT, MPH, RPM
from savant_xhr_compare import DT, fly_path

try:
    import psutil
    psutil.Process(os.getpid()).nice(psutil.BELOW_NORMAL_PRIORITY_CLASS)
except Exception:
    pass
ap = argparse.ArgumentParser()
ap.add_argument("--data", required=True)
ap.add_argument("--out", required=True)
a = ap.parse_args()
ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
df = pd.read_parquet(a.data)
parks = json.load(open(ROOT + "apps/web/public/parks30.json"))
B = np.array(parks["bearings"])
alias = {"AZ": "ARI", "OAK": "ATH", "CWS": "CHW", "WSN": "WSH"}
byab = {p["abbr"]: p for p in parks["parks"]}
wall = np.full(len(df), np.nan)
for ab, g in df.groupby("home_team"):
    p = byab.get(ab) or byab.get(alias.get(ab, ab))
    if p is None:
        continue
    ix = g.index.to_numpy()
    wall[ix] = np.interp(df.loc[ix, "bearing_hat"].fillna(0), B, p["height"])
use = (df.launch_angle.between(8, 55) & (df.launch_speed >= 60) & df.bearing_hat.notna() & df.carry_hat.notna() & df.fence_hat.notna()).to_numpy()
iu = np.where(use)[0]
su = df.iloc[iu]
hand = np.where(su.stand_r.to_numpy() == 1, 1.0, -1.0)
la, br = su.launch_angle.to_numpy(float), su.bearing_hat.to_numpy(float)
rho = su.air_density.fillna(1.2).to_numpy(float) * np.exp(su.carry_hat.to_numpy(float))
fence = su.fence_hat.to_numpy(float) * FT
out = {k: np.full(len(df), np.nan) for k in ("h_fence_c", "clear_c", "apex_c", "hang_c")}
CH = 4000
hf, ap_, hg = np.full(len(su), np.nan), np.zeros(len(su)), np.zeros(len(su))
for s0 in range(0, len(su), CH):
    sl = slice(s0, s0 + CH)
    R, Z = fly_path(v0=su.launch_speed.to_numpy(float)[sl] * MPH, theta=np.deg2rad(la[sl]), phi=np.deg2rad(br[sl]), w_back=np.maximum(0, -763 + 120 * la[sl]) * RPM,
                    w_side=(-hand[sl] * 864 - 75 * br[sl]) * RPM, rho=rho[sl])
    n = len(R)
    reach = R >= fence[sl][:, None]
    ok = reach.any(axis=1)
    j = reach.argmax(axis=1)
    j0 = np.maximum(j - 1, 0)
    ar = np.arange(n)
    r0, r1, z0, z1 = R[ar, j0], R[ar, j], Z[ar, j0], Z[ar, j]
    f = np.where(r1 > r0, (fence[sl] - r0) / np.maximum(r1 - r0, 1e-6), 1.0)
    h = z0 + f * (z1 - z0)
    hf[sl] = np.where(ok, h / FT, np.nan)
    ap_[sl] = Z.max(axis=1) / FT
    last = R[:, -1:]
    hg[sl] = np.argmax(R >= last - 1e-4, axis=1) * DT
    if (s0 // CH) % 20 == 0:
        print("  flown %d of %d" % (s0, len(su)), flush=True)
out["h_fence_c"][iu] = hf
out["apex_c"][iu] = ap_
out["hang_c"][iu] = hg
out["clear_c"][iu] = hf - wall[iu]
for k, v in out.items():
    df[k] = v
df.to_parquet(a.out)
t = df[df.split == "test"]
print("written", a.out, df.shape, "| test balls with a fence crossing %.3f; home-run rate when clear_c > 0: %.3f, otherwise %.4f" % (t.h_fence_c.notna().mean(), t.y[t.clear_c > 0].mean(), t.y[~(t.clear_c > 0)].mean()), flush=True)
