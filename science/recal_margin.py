"""Is the per-venue miss a flat shift in log-odds (what recalibrate.py fits) or a shift of the effective fence, which matters only near the wall? The new-venue diagnosis (Sutter, Steinbrenner) says the miss sits at negative margins, so each venue gets a second term:
  logit(p_final) = a * logit(p) + b + c_v + d_v * m,   m = clip(margin_hat, -60, 60) / 30   (margin_hat: the physics estimate of distance minus the fence at the estimated bearing, in feet)
d_v > 0 means the venue's balls clear more easily than the model thinks as the margin grows; c_v alone is the flat offset. Ridge 30 on both sets, prequential monthly refits as in recalibrate.py.
Variants: c_v only; d_v only; both; both with a near-wall window instead of the clipped line, w = exp(-(margin/25)^2) (a bump at the wall). Usage: python science/recal_margin.py --pred data/derived/e49a_wide/pred_mlp.parquet"""
import argparse

import numpy as np
import pandas as pd
from scipy.optimize import minimize

ap = argparse.ArgumentParser()
ap.add_argument("--pred", required=True)
ap.add_argument("--lam", type=float, default=30.0)
a = ap.parse_args()
ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
df = pd.read_parquet(ROOT + "data/derived/bakeoff_features_v5r.parquet", columns=["rid", "split", "y", "venue_id", "game_date", "margin_hat"]).set_index("rid")
p = pd.read_parquet(a.pred).set_index("rid").p_hr
d = df.join(p, how="inner").dropna(subset=["p_hr"])
d = d[d.split.isin(["val", "test"])].copy()
d["month"] = pd.to_datetime(d.game_date).dt.to_period("M")
d["lg"] = np.log(np.clip(d.p_hr, 1e-6, 1 - 1e-6) / (1 - np.clip(d.p_hr, 1e-6, 1 - 1e-6)))
vi = {v: i for i, v in enumerate(sorted(d.venue_id.astype(int).unique()))}
d["k"] = d.venue_id.astype(int).map(vi)
m = d.margin_hat.fillna(0).to_numpy()
d["m_line"] = np.clip(m, -60, 60) / 30.0
d["m_bump"] = np.exp(-((m / 25.0) ** 2))
sig = lambda z: 1 / (1 + np.exp(-z))
P = len(vi)


def fit(g, use_c, col):
    x, y, k = g.lg.to_numpy(), g.y.to_numpy(), g.k.to_numpy()
    w = g[col].to_numpy() if col else np.zeros(len(g))

    def f(t):
        z = t[0] * x + t[1] + (t[2:2 + P][k] if use_c else 0) + (t[2 + P:][k] * w if col else 0)
        q = sig(z)
        r = q - y
        nll = -(y * np.log(np.clip(q, 1e-12, 1)) + (1 - y) * np.log(np.clip(1 - q, 1e-12, 1))).sum() + 0.5 * a.lam * ((t[2:] ** 2).sum())
        gc = np.bincount(k, weights=r, minlength=P) if use_c else np.zeros(P)
        gd = np.bincount(k, weights=r * w, minlength=P) if col else np.zeros(P)
        gr = np.concatenate([[(r * x).sum(), r.sum()], gc + a.lam * t[2:2 + P], gd + a.lam * t[2 + P:]])
        return nll, gr
    t0 = np.zeros(2 + 2 * P)
    t0[0] = 1
    return minimize(f, t0, jac=True, method="L-BFGS-B").x


def apply(t, g, use_c, col):
    z = t[0] * g.lg.to_numpy() + t[1] + (t[2:2 + P][g.k.to_numpy()] if use_c else 0) + (t[2 + P:][g.k.to_numpy()] * g[col].to_numpy() if col else 0)
    return sig(z)


te = d[d.split == "test"]
months = sorted(te.month.unique())
y = te.y.to_numpy()
near = te.margin_hat.abs().lt(30).to_numpy()
brier = lambda q, mk=None: float(((q - y) ** 2)[mk if mk is not None else slice(None)].mean())
raw = te.p_hr.to_numpy()
print("raw %.5f (near-wall %.5f)" % (brier(raw), brier(raw, near)))
for name, use_c, col in [("c_v only (flat offset)", True, None), ("d_v only (margin slope)", False, "m_line"), ("c_v + d_v (line)", True, "m_line"), ("d_v bump at the wall", False, "m_bump"), ("c_v + d_v bump", True, "m_bump")]:
    q = np.zeros(len(te))
    for mth in months:
        hist = d[(d.split == "val") | ((d.split == "test") & (d.month < mth))]
        t = fit(hist, use_c, col)
        sel = (te.month == mth).to_numpy()
        q[sel] = apply(t, te[sel], use_c, col)
    print("%-26s %.5f  vs raw %+.5f   near-wall %.5f (%+.5f)" % (name, brier(q), brier(q) - brier(raw), brier(q, near), brier(q, near) - brier(raw, near)))
