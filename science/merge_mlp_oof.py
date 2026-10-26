"""Adds the out-of-fold multi-task MLP head outputs (mlp_oof.parquet from mlp_aux2.py --oof) to a feature table: v38 = v19 + mlp_p, mlp_d, mlp_b, mlp_hx, mlp_hy, mlp_rv, mlp_bb0..3.
Train rows carry the out-of-fold value (the net that predicted a ball never saw its game), val and test rows the average of the fold nets. Usage: python merge_mlp_oof.py --base v19.parquet --oof mlp_oof.parquet --out v38.parquet."""
import argparse

import pandas as pd

ap = argparse.ArgumentParser()
ap.add_argument("--base", required=True)
ap.add_argument("--oof", required=True)
ap.add_argument("--out", required=True)
a = ap.parse_args()
df = pd.read_parquet(a.base)
o = pd.read_parquet(a.oof).set_index("rid").reindex(df.rid)
cols = [c for c in o.columns if c.startswith("mlp_")]
for c in cols:
    df[c] = o[c].to_numpy()
print("missing per column:", {c: int(df[c].isna().sum()) for c in cols[:3]}, "of", len(df))
df.to_parquet(a.out)
print("written", a.out, df.shape)
