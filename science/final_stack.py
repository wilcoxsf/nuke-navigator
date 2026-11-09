"""A logistic stack over named component prediction files, fitted on the validation period, that writes BOTH validation and test predictions (stack_eval.py writes test only), so the monthly venue offsets of recalibrate.py can use the validation rows as their first history.
Validation predictions are in-sample for the stacker (a handful of weights on 44k balls: a negligible optimism). Usage: python final_stack.py --comp xgb=<f> phys=<f> ... --out <pred_file>"""
import argparse

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression

ap = argparse.ArgumentParser()
ap.add_argument("--comp", nargs="+", required=True)
ap.add_argument("--out", required=True)
a = ap.parse_args()
files = dict(x.split("=", 1) for x in a.comp)
import modelstore as MS  # (9 Nov: NN_D for the production tables; the weights are kept in save mode)
df = pd.read_parquet(MS.D + "bakeoff_features_v5r.parquet", columns=["rid", "split", "y"]).set_index("rid")
logit = lambda p: np.log(np.clip(p, 1e-5, 1 - 1e-5) / (1 - np.clip(p, 1e-5, 1 - 1e-5)))
P = {k: pd.read_parquet(f).set_index("rid").p_hr.reindex(df.index) for k, f in files.items()}
ok = df.index[df.split.isin(["val", "test", "post"])]  # (post: the sealed rows, predicted, never scored here)
for k in P:
    ok = ok.intersection(P[k].dropna().index)
d = df.loc[ok]
X = lambda ix: np.column_stack([logit(P[k].loc[ix].to_numpy()) for k in P])
va = d[d.split == "val"]
clf = MS.fit("stack/" + a.out.replace("\\", "/").split("/")[-1].replace(".parquet", ""), LogisticRegression(C=1.0, max_iter=2000), lambda m: m.fit(X(va.index), va.y))
p = clf.predict_proba(X(d.index))[:, 1]
pd.DataFrame({"rid": d.index, "p_hr": p}).to_parquet(a.out)
te = d.split == "test"
print("components", list(files), "weights", dict(zip(files, np.round(clf.coef_[0], 3))), "test Brier %.5f over %d balls" % (((p[te.to_numpy()] - d.y[te].to_numpy()) ** 2).mean(), te.sum()))
