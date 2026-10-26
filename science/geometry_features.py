"""Experiment E23 (GPT brief-5 ideas 6, 19, 34, 42): the fence's local shape at the ball's estimated bearing, from the park's five-point profile (piecewise linear between -45, -22.5, 0, 22.5, 45 degrees).
New columns on top of v10 (FEATSET v23):
  fence_slope    |d fence / d bearing| in feet per degree (how fast the wall distance changes across the ball's angular uncertainty)
  node_dist      degrees to the nearest of the five fence nodes (the poles, gaps and centre field, where the profile bends)
  slope_jump     |change of slope| at that node, feet per degree (a corner in the fence)
  fence_tilt     angle of the fence relative to a circle around home plate, atan(slope in ft per radian / fence distance), degrees
  margin_normal  margin_c x cos(fence_tilt): the margin measured perpendicular to the fence
Usage: python geometry_features.py --data data/derived/bakeoff_features_v10.parquet --out data/derived/bakeoff_features_v23.parquet. A minute."""
import argparse

import numpy as np
import pandas as pd

from bakeoff_data import DIMS

ap = argparse.ArgumentParser()
ap.add_argument("--data", required=True)
ap.add_argument("--out", required=True)
a = ap.parse_args()
df = pd.read_parquet(a.data)
d = df[DIMS].to_numpy(dtype=float)
d = np.where(np.isnan(d), np.nanmean(d, axis=0), d)
NODES = np.array([-45.0, -22.5, 0.0, 22.5, 45.0])
b = np.clip(np.nan_to_num(df.bearing_hat.to_numpy(float), nan=0.0), -44.999, 44.999)
ar = np.arange(len(df))
i = np.clip(np.floor((b + 45.0) / 22.5).astype(int), 0, 3)
slope = (d[ar, i + 1] - d[ar, i]) / 22.5  # feet per degree on this segment
df["fence_slope"] = np.abs(slope)
k = np.abs(b[:, None] - NODES[None, :]).argmin(axis=1)
df["node_dist"] = np.abs(b - NODES[k])
seg = (d[:, 1:] - d[:, :-1]) / 22.5  # slope of the four segments
left = np.where(k > 0, seg[ar, np.clip(k - 1, 0, 3)], np.nan)
right = np.where(k < 4, seg[ar, np.clip(k, 0, 3)], np.nan)
df["slope_jump"] = np.where(np.isfinite(left) & np.isfinite(right), np.abs(right - left), 0.0)
tilt = np.degrees(np.arctan((slope * 57.29578) / np.maximum(df.fence_hat.to_numpy(float), 100.0)))
df["fence_tilt"] = tilt
df["margin_normal"] = df.margin_c * np.cos(np.radians(tilt))
for c in ("fence_slope", "node_dist", "slope_jump", "fence_tilt", "margin_normal"):
    df.loc[df.bearing_hat.isna(), c] = np.nan
df.to_parquet(a.out)
print("written", a.out, df.shape, "| mean fence slope %.2f ft per degree, mean distance to a node %.1f deg, mean slope jump %.2f" % (df.fence_slope.mean(), df.node_dist.mean(), df.slope_jump.mean()), flush=True)
