"""Experiment E24 (GPT brief-5 idea 13): disagreement between the physics and the data as a local trust feature. After E19 each ball has dist_hat (game-out-of-fold distance model on the same legal inputs)
and E10 gives phys_dist_c (the flight at the predicted carry). Where they disagree the ball is unusual in a way the physics or the data model is missing. New columns on top of v10 (FEATSET v24):
  dist_hat, direct_margin (from E19), dist_disagree = dist_hat - phys_dist_c, margin_disagree = direct_margin - margin_c.
Usage: python disagree_features.py --v10 data/derived/bakeoff_features_v10.parquet --v19 data/derived/bakeoff_features_v19.parquet --out data/derived/bakeoff_features_v24.parquet. A minute."""
import argparse

import pandas as pd

ap = argparse.ArgumentParser()
ap.add_argument("--v10", required=True)
ap.add_argument("--v19", required=True)
ap.add_argument("--out", required=True)
a = ap.parse_args()
df = pd.read_parquet(a.v10)
x = pd.read_parquet(a.v19, columns=["rid", "dist_hat", "direct_margin"])
assert len(x) == len(df) and (x.rid.to_numpy() == df.rid.to_numpy()).all(), "the two tables must be the same rows in the same order"
df["dist_hat"] = x.dist_hat.to_numpy()
df["direct_margin"] = x.direct_margin.to_numpy()
df["dist_disagree"] = df.dist_hat - df.phys_dist_c
df["margin_disagree"] = df.direct_margin - df.margin_c
df.to_parquet(a.out)
print("written", a.out, df.shape, "| mean |dist_disagree| %.1f ft, 90th percentile %.1f ft" % (df.dist_disagree.abs().mean(), df.dist_disagree.abs().quantile(0.9)), flush=True)
