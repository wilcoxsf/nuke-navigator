"""League distributions for the 'where this ball lands' histograms: counts per bin for every 2023-2025 fair ball in play and for the home-run subset, for exit speed,
launch angle, direction, projected distance, and hang time. Hang time is not in the Statcast pull, so it is modeled: a 30k sample is flown with the page's physics and
spin prior (savant_xhr_compare.fly_path) and labeled that way in the UI. Writes apps/web/public/dists.json (aggregated counts only).
"""
import json

import numpy as np
import pandas as pd

from flight_fit import MPH, RPM
from savant_xhr_compare import DT, ROOT, fly_path

df = pd.read_parquet(ROOT + "data/derived/exp_features.parquet",
                     columns=["game_year", "type", "launch_speed", "launch_angle", "bearing", "hit_distance_sc", "air_density", "stand_r", "y"])
df = df[(df.game_year >= 2023) & (df.type == "X") & df.launch_speed.notna() & df.launch_angle.notna() & df.bearing.between(-45, 45)].reset_index(drop=True)
print("balls in play 2023-2025:", len(df), "HR:", int(df.y.sum()), flush=True)

out = {"n": int(len(df)), "n_hr": int(df.y.sum()), "years": "2023-2025", "metrics": {}}


def hist(name, vals, lo, hi, step, modeled=False, hr=None):
    edges = np.arange(lo, hi + step * 0.5, step)
    ok = ~np.isnan(vals)
    a, _ = np.histogram(vals[ok], edges)
    h, _ = np.histogram(vals[ok & hr], edges)
    out["metrics"][name] = {"lo": lo, "hi": hi, "step": step, "all": a.tolist(), "hr": h.tolist(), "modeled": modeled, "n": int(ok.sum())}
    print(name, "bins", len(a), "n", int(ok.sum()), flush=True)


y = df.y.to_numpy() == 1
hist("ev", df.launch_speed.to_numpy(float), 40, 120, 2, hr=y)
hist("la", df.launch_angle.to_numpy(float), -40, 70, 2.5, hr=y)
hist("dir", df.bearing.to_numpy(float), -45, 45, 2.5, hr=y)
hist("dist", df.hit_distance_sc.to_numpy(float), 0, 500, 10, hr=y)
# fly balls only (launch angle 15 and up): a 390-ft fly ball should be ranked against fly balls, not against grounders
fb = df.launch_angle.to_numpy(float) >= 15
hist("dist_fb", np.where(fb, df.hit_distance_sc.to_numpy(float), np.nan), 100, 500, 10, hr=y)
# exit speed by launch angle: how many balls and how many home runs in each cell (the 'barrel map')
ev_, la_ = df.launch_speed.to_numpy(float), df.launch_angle.to_numpy(float)
eb, lb = np.arange(60, 121.25, 1.25), np.arange(-20, 62.5, 5)
Ha, _, _ = np.histogram2d(ev_, la_, [eb, lb])
Hh, _, _ = np.histogram2d(ev_[y], la_[y], [eb, lb])
out["evla"] = {"ev0": 60, "evstep": 1.25, "la0": -20, "lastep": 5, "all": Ha.astype(int).tolist(), "hr": Hh.astype(int).tolist()}
print("evla grid", Ha.shape, flush=True)

s = df.sample(30000, random_state=3).reset_index(drop=True)
hand = np.where(s.stand_r == 1, 1.0, -1.0)
la, br = s.launch_angle.to_numpy(float), s.bearing.to_numpy(float)
hang = np.zeros(len(s))
CH = 5000
for a in range(0, len(s), CH):
    sl = slice(a, a + CH)
    R, _ = fly_path(s.launch_speed.to_numpy(float)[sl] * MPH, np.deg2rad(la[sl]), np.deg2rad(br[sl]), np.maximum(0, -763 + 120 * la[sl]) * RPM,
                    (-hand[sl] * 864 - 75 * br[sl]) * RPM, np.nan_to_num(s.air_density.to_numpy(float)[sl], nan=1.2))
    last = R[:, -1:]
    idx = np.argmax(R >= last - 1e-4, axis=1)
    hang[sl] = idx * DT
hist("hang", hang, 0, 8, 0.25, modeled=True, hr=s.y.to_numpy() == 1)
json.dump(out, open(ROOT + "apps/web/public/dists.json", "w"), separators=(",", ":"))
print("written apps/web/public/dists.json")
