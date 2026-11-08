"""A last monthly intercept on the finished prediction (8 Nov 2026): actual home runs ran about 3 percent above the blend in 10 of 11 test months. Before each test
month, one logit shift c is fit (maximum likelihood, ridge toward 0 with strength --ridge) on the prediction's own errors in every EARLIER test month, then
applied to the month. The first test month gets no shift. Optionally a slope too (--slope).
Usage: python science/final_intercept.py --data <features.parquet> --pred <pred.parquet> --out <pred_out.parquet> [--ridge 200] [--slope]"""
import argparse

import numpy as np
import pandas as pd
from scipy.optimize import minimize

ap = argparse.ArgumentParser()
ap.add_argument("--data", required=True); ap.add_argument("--pred", required=True); ap.add_argument("--out", required=True)
ap.add_argument("--ridge", type=float, default=200.0); ap.add_argument("--slope", action="store_true")
a = ap.parse_args()
d = pd.read_parquet(a.data, columns=["rid", "split", "y", "game_date"])
d = d[d.split == "test"].merge(pd.read_parquet(a.pred)[["rid", "p_hr"]], on="rid")
d["m"] = pd.to_datetime(d.game_date).dt.to_period("M")
lg = np.log(np.clip(d.p_hr, 1e-6, 1 - 1e-6) / (1 - np.clip(d.p_hr, 1e-6, 1 - 1e-6))).to_numpy()
y = d.y.to_numpy().astype(float)
out = np.empty(len(d))
shifts = []
for m in sorted(d.m.unique()):
    tr = (d.m < m).to_numpy(); te = (d.m == m).to_numpy()
    if tr.sum() < 5000:
        out[te] = lg[te]; shifts.append((str(m), 0.0, 1.0)); continue
    def nll(w):
        s = w[1] if a.slope else 1.0
        z = s * lg[tr] + w[0]
        return (np.logaddexp(0, z) - y[tr] * z).sum() + a.ridge * (w[0] ** 2 + (a.slope * (s - 1) ** 2))
    w = minimize(nll, np.array([0.0, 1.0]), method="L-BFGS-B").x
    s = w[1] if a.slope else 1.0
    out[te] = s * lg[te] + w[0]; shifts.append((str(m), round(w[0], 3), round(s, 3)))
p = 1 / (1 + np.exp(-out))
pd.DataFrame({"rid": d.rid.to_numpy(), "p_hr": p}).to_parquet(a.out)
print("shifts by month:", shifts)
print("Brier before %.5f after %.5f (%+.5f); mean pred %.4f -> %.4f, actual %.4f" % (((d.p_hr - y) ** 2).mean(), ((p - y) ** 2).mean(), ((p - y) ** 2).mean() - ((d.p_hr - y) ** 2).mean(), d.p_hr.mean(), p.mean(), y.mean()))
