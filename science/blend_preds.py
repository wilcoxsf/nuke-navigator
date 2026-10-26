"""Logit-average two prediction files (validation and test rows) into one, so paired.py can score the blend against a baseline.
Usage: python blend_preds.py --data <features.parquet> --a <pred_a.parquet> --b <pred_b.parquet> --out <pred_blend.parquet> [--wb 0.5]"""
import argparse

import numpy as np
import pandas as pd

ap = argparse.ArgumentParser()
for k in ("data", "a", "b", "out"):
    ap.add_argument(f"--{k}", required=True)
ap.add_argument("--wb", type=float, default=0.5)
a = ap.parse_args()
A = pd.read_parquet(a.a).set_index("rid").p_hr
B = pd.read_parquet(a.b).set_index("rid").p_hr
ix = A.index.intersection(B.index)
lg = lambda p: np.log(np.clip(p, 1e-6, 1 - 1e-6) / (1 - np.clip(p, 1e-6, 1 - 1e-6)))
z = (1 - a.wb) * lg(A.loc[ix].to_numpy()) + a.wb * lg(B.loc[ix].to_numpy())
pd.DataFrame({"rid": ix, "p_hr": 1 / (1 + np.exp(-z))}).to_parquet(a.out)
print("blended", len(ix), "rows, weight on b", a.wb)
