"""v42 = v39b + the park's recent home-run miss, as a MODEL INPUT (25 Oct 2026). The monthly park offset on the finished net bought -0.00016 (near the wall -0.00095), and a placebo that shuffled the venue keys bought only -0.00003, so the signal is a persistent per-venue miss.
Here the same quantity goes to the trees: for every ball, over the same venue's balls from STRICTLY EARLIER days only, the shrunk log-odds miss of the out-of-fold net (mlp_p)
  pk_hr_a120 / pk_hr_a365   sum(y - p) / (sum p(1-p) + LAM)  over the previous 120 / 365 days at that physical venue (a one-step ridge Newton estimate of the offset)
  pk_hr_e120               sum p(1-p) over the previous 120 days, how much evidence stands behind the offset (0 for a new venue)
The venue is the physical venue id (Sutter Health Park, Steinbrenner Field and neutral-site games get their own), not the team. mlp_p is out-of-fold by game, so a training ball's feature is built from earlier balls' out-of-fold predictions exactly as a test ball's is.
Usage: python science/build_park_resid.py --base data/derived/bakeoff_features_v39b.parquet --out data/derived/bakeoff_features_v42.parquet"""
import argparse

import numpy as np
import pandas as pd

ap = argparse.ArgumentParser()
ap.add_argument("--base", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--lam", type=float, default=150.0)
a = ap.parse_args()
df = pd.read_parquet(a.base)
p = df.mlp_p.clip(1e-6, 1 - 1e-6).to_numpy()
y = df.y.to_numpy()
day = pd.to_datetime(df.game_date).dt.normalize()
tab = pd.DataFrame({"v": df.venue_id.astype("int64").to_numpy(), "d": day.to_numpy(), "r": y - p, "w": p * (1 - p)})
daily = tab.groupby(["v", "d"]).agg(r=("r", "sum"), w=("w", "sum")).reset_index()
res = {}
for W in (120, 365):
    parts = []
    for v, g in daily.groupby("v"):
        s = g.set_index("d")[["r", "w"]].resample("1D").sum()
        roll = s.rolling(W, min_periods=1).sum().shift(1).fillna(0.0)  # the sums over the previous W days, today excluded
        roll["v"] = v
        parts.append(roll.reset_index())
    res[W] = pd.concat(parts).rename(columns={"r": "r%d" % W, "w": "w%d" % W})
key = pd.DataFrame({"v": tab.v, "d": tab.d})
for W in (120, 365):
    m = key.merge(res[W], on=["v", "d"], how="left")
    df["pk_hr_a%d" % W] = (m["r%d" % W] / (m["w%d" % W] + a.lam)).to_numpy().astype("float32")
    if W == 120:
        df["pk_hr_e120"] = m["w120"].to_numpy().astype("float32")
print(df[["pk_hr_a120", "pk_hr_a365", "pk_hr_e120"]].describe().T.round(3).to_string())
t = df[df.split == "test"]
print("correlation with the ball's own outcome minus prediction (test): a120 %.4f, a365 %.4f" % (np.corrcoef(t.pk_hr_a120, t.y - t.mlp_p)[0, 1], np.corrcoef(t.pk_hr_a365, t.y - t.mlp_p)[0, 1]))
df.to_parquet(a.out)
print("written", a.out, df.shape)
