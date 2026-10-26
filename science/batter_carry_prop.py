"""Experiment E26 (GPT brief-5 idea 15): does a batter carry the ball farther than his contact explains, repeatably (a spin skill that aggregate home-run rates would blur)? For each labeled ball the residual
r = carry label (log, from the cached E10 labels) minus carry_hat (E10, game-out-of-fold) measures how much farther or shorter he drove it than the model expected. For every ball the feature is the shrunk mean of r over
the batter's EARLIER games only (strictly before this ball's date, so nothing from the ball's own game or later is used), with shrinkage constant 40 balls:
  bc_prop = sum r / (n + 40), bc_n = number of earlier labeled balls.
New columns on top of v10 (FEATSET v26): bc_prop, bc_n. The batter ID comes from exp_features.parquet (same rows, same rid; verified identical).
Usage: python batter_carry_prop.py --data data/derived/bakeoff_features_v10.parquet --out data/derived/bakeoff_features_v26.parquet. A minute or two."""
import argparse

import numpy as np
import pandas as pd

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
ap = argparse.ArgumentParser()
ap.add_argument("--data", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--k", type=float, default=40.0)
a = ap.parse_args()
df = pd.read_parquet(a.data)
b = pd.read_parquet(ROOT + "data/derived/exp_features.parquet", columns=["rid", "batter"]).set_index("rid").batter
df["batter"] = b.reindex(df.rid).to_numpy()
logm = np.load(ROOT + "data/derived/bakeoff_features_v10.parquet.logm.npy")
assert len(logm) == len(df)
r = logm - df.carry_hat.to_numpy()
ok = np.isfinite(r)
t = pd.DataFrame({"batter": df.batter.to_numpy(), "date": pd.to_datetime(df.game_date).to_numpy(), "r": np.where(ok, r, 0.0), "n": ok.astype(float)})
g = t.groupby(["batter", "date"], sort=True)[["r", "n"]].sum().reset_index()
g["cr"] = g.groupby("batter")["r"].cumsum() - g["r"]  # strictly earlier dates only
g["cn"] = g.groupby("batter")["n"].cumsum() - g["n"]
m = t[["batter", "date"]].merge(g[["batter", "date", "cr", "cn"]], on=["batter", "date"], how="left")
df["bc_prop"] = (m.cr / (m.cn + a.k)).to_numpy()
df["bc_n"] = m.cn.to_numpy()
df = df.drop(columns=["batter"])
df.to_parquet(a.out)
mask = ((df.split == "test") & (df.bc_n >= 100)).to_numpy() & np.isfinite(r)
print("written", a.out, df.shape, "| test balls with 100+ earlier labeled balls and a label: %d, bc_prop sd %.4f, correlation of bc_prop with that ball's own carry residual %.3f" % (mask.sum(), df.bc_prop[mask].std(), np.corrcoef(df.bc_prop[mask], r[mask])[0, 1]), flush=True)
