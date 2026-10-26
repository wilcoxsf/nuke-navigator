"""Do the monthly venue offsets of recalibrate.py also help on the independent 2024 forward split (train to 2023-10-01, validation 2024-03-20..05-15, test 2024-05-16..09-30)? Same scheme: before each test month, refit slope, intercept and one ridge-penalised offset per physical venue on the validation rows plus all earlier test months, then predict that month. Variants: global slope and intercept only (roll), venue offsets (venue), and the placebo (venue key shuffled across the games of each month). Paired game-block bootstrap against the raw predictions.
Usage: python science/recal_fwd2024.py --pred data/derived/f_n2_wide/pred_mlp.parquet [--lam 30]"""
import argparse

import numpy as np
import pandas as pd
from scipy.optimize import minimize

ap = argparse.ArgumentParser()
ap.add_argument("--pred", required=True)
ap.add_argument("--lam", type=float, default=30.0)
a = ap.parse_args()
ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
df = pd.read_parquet(ROOT + "data/derived/bakeoff_features_fwd2024.parquet", columns=["rid", "split", "y", "game_date", "margin_hat", "game_pk", "venue_id"]).set_index("rid")
p = pd.read_parquet(a.pred).set_index("rid").p_hr
d = df.join(p, how="inner").dropna(subset=["p_hr"])
d = d[d.split.isin(["val", "test"])].copy()
d["month"] = pd.to_datetime(d.game_date).dt.to_period("M")
d["lg"] = np.log(np.clip(d.p_hr, 1e-6, 1 - 1e-6) / (1 - np.clip(d.p_hr, 1e-6, 1 - 1e-6)))
vi = {v: i for i, v in enumerate(sorted(d.venue_id.astype(int).unique()))}
d["pk"] = d.venue_id.astype(int).map(vi)
P = len(vi)
sig = lambda z: 1 / (1 + np.exp(-z))


def fit(g, lam):
    x, y, k = g.lg.to_numpy(), g.y.to_numpy(), g.pk.to_numpy()

    def f(t):
        z = t[0] * x + t[1] + (t[2:][k] if lam else 0)
        q = sig(z)
        r = q - y
        nll = -(y * np.log(np.clip(q, 1e-12, 1)) + (1 - y) * np.log(np.clip(1 - q, 1e-12, 1))).sum()
        gr = [(r * x).sum(), r.sum()]
        if lam:
            nll += 0.5 * lam * (t[2:] ** 2).sum()
            gr = np.concatenate([gr, np.bincount(k, weights=r, minlength=P) + lam * t[2:]])
        return nll, np.array(gr)
    t0 = np.zeros(2 + (P if lam else 0))
    t0[0] = 1.0
    return minimize(f, t0, jac=True, method="L-BFGS-B").x


def apply(t, g, lam):
    return sig(t[0] * g.lg.to_numpy() + t[1] + (t[2:][g.pk.to_numpy()] if lam else 0))


def run(d, lam):
    te = d[d.split == "test"]
    q = np.zeros(len(te))
    for m in sorted(te.month.unique()):
        hist = d[(d.split == "val") | ((d.split == "test") & (d.month < m))]
        t = fit(hist, lam)
        sel = (te.month == m).to_numpy()
        q[sel] = apply(t, te[sel], lam)
    return q


te = d[d.split == "test"]
y = te.y.to_numpy()
raw = te.p_hr.to_numpy()
out = {"roll (slope+intercept)": run(d, 0), "venue offsets": run(d, a.lam)}
rng = np.random.default_rng(7)
dp = d.copy()
g = dp.groupby(["month", "game_pk"]).pk.first().reset_index()
g["pk"] = g.groupby("month").pk.transform(lambda s: s.sample(frac=1, random_state=int(rng.integers(1e9))).to_numpy())
dp["pk"] = dp.reset_index().merge(g, on=["month", "game_pk"], suffixes=("_o", "")).set_index("rid").pk
out["placebo (shuffled venues)"] = run(dp, a.lam)
near = te.margin_hat.abs().lt(30).to_numpy()
gid = pd.factorize(te.game_pk)[0]
G = gid.max() + 1


def boot(dd, mask=None, n=2000):
    """paired game-block bootstrap of the mean of dd (per-ball squared-error difference)"""
    w = np.ones(len(dd)) if mask is None else mask.astype(float)
    s = np.bincount(gid, weights=dd * w, minlength=G)
    c = np.bincount(gid, weights=w, minlength=G)
    r = np.random.default_rng(3)
    ms = [s[i].sum() / c[i].sum() for i in (r.integers(0, G, G) for _ in range(n))]
    return np.percentile(ms, [2.5, 97.5])


b = lambda q, mk=slice(None): float(((q - y) ** 2)[mk].mean())
print("test balls %d, games %d, raw Brier %.5f (near-wall %.5f)" % (len(te), G, b(raw), b(raw, near)))
for k, q in out.items():
    dd = (q - y) ** 2 - (raw - y) ** 2
    lo, hi = boot(dd)
    nlo, nhi = boot(dd, near)
    print("%-26s %.5f  vs raw %+.5f (95%% %+.5f, %+.5f)   near-wall %+.5f (95%% %+.5f, %+.5f)" % (k, b(q), dd.mean(), lo, hi, dd[near].mean(), nlo, nhi))
