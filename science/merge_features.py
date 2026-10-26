"""Combines the winning feature blocks into one table: v37 = v36 (v19 direct distance + the E30 distance models + the E36 bat-era distance) plus the E35 drift columns (lg_carry14, lg_n14, pk_carry30, pk_n30).
Usage: python merge_features.py --base data/derived/bakeoff_features_v36.parquet --drift data/derived/bakeoff_features_v35.parquet --out data/derived/bakeoff_features_v37.parquet. A minute."""
import argparse

import pandas as pd

ap = argparse.ArgumentParser()
ap.add_argument("--base", required=True)
ap.add_argument("--drift", required=True)
ap.add_argument("--out", required=True)
a = ap.parse_args()
df = pd.read_parquet(a.base)
d = pd.read_parquet(a.drift, columns=["rid", "lg_carry14", "lg_n14", "pk_carry30", "pk_n30"])
assert len(d) == len(df) and (d.rid.to_numpy() == df.rid.to_numpy()).all(), "the tables must be the same rows in the same order"
for c in ("lg_carry14", "lg_n14", "pk_carry30", "pk_n30"):
    df[c] = d[c].to_numpy()
df.to_parquet(a.out)
print("written", a.out, df.shape)
