"""GPT brief 7, layer 2: does a second, finer offset level help on top of the per-venue monthly offset? Same prequential scheme as recalibrate.py (refit every test month on validation plus all earlier test months, nothing later),
logit(p_final) = a * logit(p) + b + venue offset (ridge L1) + group offset (ridge L2), the group being venue x one of:
  hand    the batter's side (60 groups)   sector  the PREDICTED bearing third (pull side / middle / opposite side, from the legal bearing_hat and the batter's side; 90 groups)   year   venue x calendar year (a venue that drifts between seasons)
Only legal, pre-event quantities define a group (never the true landing bearing). Usage: python science/recal_sector.py --pred data/derived/e49a_wide/pred_mlp.parquet"""
import argparse

import numpy as np
import pandas as pd
from scipy.optimize import minimize

ap = argparse.ArgumentParser()
ap.add_argument("--pred", required=True)
ap.add_argument("--l1", type=float, default=30.0)
ap.add_argument("--l2", default="30,100")
a = ap.parse_args()
ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
df = pd.read_parquet(ROOT + "data/derived/bakeoff_features_v5r.parquet", columns=["rid", "split", "y", "venue_id", "game_date"]).set_index("rid")
ex = pd.read_parquet(ROOT + "data/derived/bakeoff_features_v37.parquet", columns=["rid", "bearing_hat", "stand_r"]).set_index("rid")
p = pd.read_parquet(a.pred).set_index("rid").p_hr
d = df.join(ex).join(p, how="inner").dropna(subset=["p_hr"])
d = d[d.split.isin(["val", "test"])].copy()
d["month"] = pd.to_datetime(d.game_date).dt.to_period("M")
d["lg"] = np.log(np.clip(d.p_hr, 1e-6, 1 - 1e-6) / (1 - np.clip(d.p_hr, 1e-6, 1 - 1e-6)))
d["v"] = d.venue_id.astype(int)
vi = {v: i for i, v in enumerate(sorted(d.v.unique()))}
d["k1"] = d.v.map(vi)
# pull-positive predicted bearing: bearing_hat is negative toward left field; a right-hander pulls left
pull = np.where(d.stand_r == 1, -d.bearing_hat, d.bearing_hat)
d["sector"] = np.select([pull > 12, pull < -12], [0, 2], 1)  # 0 pull, 1 middle, 2 opposite
d["year"] = pd.to_datetime(d.game_date).dt.year
sig = lambda z: 1 / (1 + np.exp(-z))


def fit(g, key2, n2, l2):
    x, y, k1 = g.lg.to_numpy(), g.y.to_numpy(), g.k1.to_numpy()
    P = len(vi)
    k2 = g[key2].to_numpy() if key2 else np.zeros(len(g), int)

    def f(t):
        z = t[0] * x + t[1] + t[2:2 + P][k1] + (t[2 + P:][k2] if key2 else 0)
        q = sig(z)
        r = q - y
        nll = -(y * np.log(np.clip(q, 1e-12, 1)) + (1 - y) * np.log(np.clip(1 - q, 1e-12, 1))).sum() + 0.5 * a.l1 * (t[2:2 + P] ** 2).sum()
        gr = [(r * x).sum(), r.sum()]
        gr = np.concatenate([gr, np.bincount(k1, weights=r, minlength=P) + a.l1 * t[2:2 + P]])
        if key2:
            nll += 0.5 * l2 * (t[2 + P:] ** 2).sum()
            gr = np.concatenate([gr, np.bincount(k2, weights=r, minlength=n2) + l2 * t[2 + P:]])
        return nll, gr
    t0 = np.zeros(2 + P + (n2 if key2 else 0))
    t0[0] = 1
    return minimize(f, t0, jac=True, method="L-BFGS-B").x


def apply(t, g, key2):
    P = len(vi)
    z = t[0] * g.lg.to_numpy() + t[1] + t[2:2 + P][g.k1.to_numpy()] + (t[2 + P:][g[key2].to_numpy()] if key2 else 0)
    return sig(z)


te = d[d.split == "test"]
months = sorted(te.month.unique())
y = te.y.to_numpy()
brier = lambda q: float(((q - y) ** 2).mean())
print("raw %.5f" % brier(te.p_hr.to_numpy()))
variants = [("venue only", None, 0, 0.0)]
d["hand"] = d.k1 * 2 + d.stand_r.fillna(0).astype(int)
d["sec"] = d.k1 * 3 + d.sector
yrs = sorted(d.year.unique())
d["yr"] = d.k1 * len(yrs) + d.year.map({y_: i for i, y_ in enumerate(yrs)})
te = d[d.split == "test"]
for l2 in [float(s) for s in a.l2.split(",")]:
    variants += [("venue x hand  (L2 %g)" % l2, "hand", 2 * len(vi), l2), ("venue x sector (L2 %g)" % l2, "sec", 3 * len(vi), l2), ("venue x year  (L2 %g)" % l2, "yr", len(yrs) * len(vi), l2)]
for name, key2, n2, l2 in variants:
    q = np.zeros(len(te))
    for m in months:
        hist = d[(d.split == "val") | ((d.split == "test") & (d.month < m))]
        t = fit(hist, key2, n2, l2)
        sel = (te.month == m).to_numpy()
        q[sel] = apply(t, te[sel], key2)
    print("%-28s %.5f   vs raw %+.5f" % (name, brier(q), brier(q) - brier(te.p_hr.to_numpy())))
