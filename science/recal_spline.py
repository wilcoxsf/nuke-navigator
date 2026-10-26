"""Does a flexible calibration curve beat the single slope? The audit said the net is overconfident for predicted 0.5 to 0.9. Same prequential monthly scheme as recalibrate.py, with logit(p_final) = b + a0 * lg + sum_j a_j * relu(lg - knot_j) (a piecewise-linear curve on the logit, knots at -5, -4, -3, -2, -1, 0, 1, 2) + the venue offset (ridge 30).
Variants: slope only; curve; curve with a ridge on the knot slopes (so the curve bends only where the evidence is). Usage: python science/recal_spline.py --pred data/derived/e49a_wide/pred_mlp.parquet"""
import argparse

import numpy as np
import pandas as pd
from scipy.optimize import minimize

ap = argparse.ArgumentParser()
ap.add_argument("--pred", required=True)
a = ap.parse_args()
ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
df = pd.read_parquet(ROOT + "data/derived/bakeoff_features_v5r.parquet", columns=["rid", "split", "y", "venue_id", "game_date"]).set_index("rid")
p = pd.read_parquet(a.pred).set_index("rid").p_hr
d = df.join(p, how="inner").dropna(subset=["p_hr"])
d = d[d.split.isin(["val", "test"])].copy()
d["month"] = pd.to_datetime(d.game_date).dt.to_period("M")
d["lg"] = np.log(np.clip(d.p_hr, 1e-6, 1 - 1e-6) / (1 - np.clip(d.p_hr, 1e-6, 1 - 1e-6)))
vi = {v: i for i, v in enumerate(sorted(d.venue_id.astype(int).unique()))}
d["k"] = d.venue_id.astype(int).map(vi)
KN = np.array([-5, -4, -3, -2, -1, 0, 1, 2.0])
sig = lambda z: 1 / (1 + np.exp(-z))
P = len(vi)


def basis(lg, nk):
    return np.column_stack([lg] + [np.maximum(lg - k, 0) for k in KN[:nk]])


def fit(g, nk, lam_k, lam_v=30.0):
    B, y, k = basis(g.lg.to_numpy(), nk), g.y.to_numpy(), g.k.to_numpy()
    m = B.shape[1]

    def f(t):
        z = B @ t[:m] + t[m] + t[m + 1:][k]
        q = sig(z)
        r = q - y
        nll = -(y * np.log(np.clip(q, 1e-12, 1)) + (1 - y) * np.log(np.clip(1 - q, 1e-12, 1))).sum() + 0.5 * lam_v * (t[m + 1:] ** 2).sum() + 0.5 * lam_k * (t[1:m] ** 2).sum()
        gr = np.concatenate([B.T @ r + np.r_[0, lam_k * t[1:m]], [r.sum()], np.bincount(k, weights=r, minlength=P) + lam_v * t[m + 1:]])
        return nll, gr
    t0 = np.zeros(m + 1 + P)
    t0[0] = 1
    return minimize(f, t0, jac=True, method="L-BFGS-B").x


def apply(t, g, nk):
    B = basis(g.lg.to_numpy(), nk)
    m = B.shape[1]
    return sig(B @ t[:m] + t[m] + t[m + 1:][g.k.to_numpy()])


te = d[d.split == "test"]
months = sorted(te.month.unique())
y = te.y.to_numpy()
brier = lambda q: float(((q - y) ** 2).mean())
print("raw %.5f" % brier(te.p_hr.to_numpy()))
for name, nk, lam_k in [("slope + venue", 0, 0.0), ("curve (8 knots) + venue", 8, 0.0), ("curve, ridge 200 on slopes", 8, 200.0), ("curve, ridge 1000 on slopes", 8, 1000.0), ("curve (4 knots: -2..1) ridge 200", 4, 200.0)]:
    if name.startswith("curve (4"):
        KN = np.array([-2, -1, 0, 1.0])
    q = np.zeros(len(te))
    for mth in months:
        hist = d[(d.split == "val") | ((d.split == "test") & (d.month < mth))]
        t = fit(hist, nk, lam_k)
        sel = (te.month == mth).to_numpy()
        q[sel] = apply(t, te[sel], nk)
    print("%-34s %.5f   vs raw %+.5f" % (name, brier(q), brier(q) - brier(te.p_hr.to_numpy())))
