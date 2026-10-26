"""Experiment E13: standardize the E10 margin. The carry table gives the spread of log carry for a ball's exit speed and launch angle, the carry dataset gives the sensitivity of distance to log carry (J, about a
fixed share of the distance), so margin_c over fence_hat can be expressed in units of the ball's own carry uncertainty: margin_z = margin_c / (|J| x sd), and a closed-form clearance probability p_clear = Phi(margin_z).
New columns on top of v10: carry_sd, margin_z, p_clear. (The E9 draws did not add to the stack; this gives the same physics to the XGBoost as features.)
Usage: python carry_features2.py --data data/derived/bakeoff_features_v10.parquet --out data/derived/bakeoff_features_v13.parquet. A minute or two."""
import argparse
import json

import numpy as np
import pandas as pd
from scipy.interpolate import RegularGridInterpolator
from scipy.special import ndtr

ap = argparse.ArgumentParser()
ap.add_argument("--data", required=True)
ap.add_argument("--out", required=True)
a = ap.parse_args()
ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
T = json.load(open(ROOT + "apps/web/public/carry_table.json"))
ev_nodes = T["ev0"] + T["de"] * np.arange(len(T["mean"]))
la_nodes = T["la0"] + T["dl"] * np.arange(len(T["mean"][0]))
sd_f = RegularGridInterpolator((ev_nodes, la_nodes), np.array(T["sd"]), bounds_error=False, fill_value=None)
cd = pd.read_parquet(ROOT + "data/derived/carry_dataset.parquet", columns=["J", "sim0"])
k = float(np.median(np.abs(cd.J) / cd.sim0))  # |J| as a share of the distance
print("median |J| / distance in the carry dataset: %.3f" % k, flush=True)
df = pd.read_parquet(a.data)
pts = np.column_stack([np.clip(df.launch_speed.fillna(80).to_numpy(float), ev_nodes[0], ev_nodes[-1]), np.clip(df.launch_angle.fillna(20).to_numpy(float), la_nodes[0], la_nodes[-1])])
df["carry_sd"] = sd_f(pts)
den = k * df.phys_dist_c * df.carry_sd
df["margin_z"] = (df.margin_c / den).clip(-12, 12)
df["p_clear"] = ndtr(df.margin_z)
df.loc[df.phys_dist_c.isna(), ["carry_sd", "margin_z", "p_clear"]] = np.nan
df.to_parquet(a.out)
t = df[df.split == "test"]
print("written", a.out, df.shape, "| test: share with p_clear above 0.5 = %.3f, home-run rate there %.3f, below 0.5 %.4f" % ((t.p_clear > 0.5).mean(), t.y[t.p_clear > 0.5].mean(), t.y[t.p_clear <= 0.5].mean()), flush=True)
