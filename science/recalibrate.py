"""Recalibrate a finished model's home-run probabilities without touching the model (25 Oct 2026). Calibration audit of the wide net: slope 0.934, Oakland under-predicted, Colorado over-predicted, 2025 over-predicted by about 5.5 percent.
Only data that exists strictly before a test ball may fit its correction, so the correction is what the live product could do:
  static    Platt scaling (a * logit p + b) fitted on the validation rows (2025-03-18 to 2025-05-31) only
  roll      the same, refitted at the start of every test month on validation plus all earlier test months
  roll_park the rolling fit plus one ridge-shrunk offset per home park (penalty LAM), so a park that runs hot or cold is learned only as fast as its evidence allows
Writes one prediction file per variant (rid, p_hr; test rows) under data/derived/recal_<name>/ for paired.py, and prints Brier by variant.
Usage: python recalibrate.py --pred data/derived/e49a_wide/pred_mlp.parquet --tag wide [--lam 100]"""
import argparse
import os

import numpy as np
import pandas as pd
from scipy.optimize import minimize

ap = argparse.ArgumentParser()
ap.add_argument("--pred", required=True)
ap.add_argument("--tag", required=True)
ap.add_argument("--lams", default="30,100,300")
ap.add_argument("--key", default="team", choices=["team", "venue", "placebo"], help="what the park offset is keyed by: home team, physical venue id, or the placebo (the venue key shuffled across the games of each month)")
ap.add_argument("--near", default="30", help="ridge for the extra park-by-near-wall offsets (variant roll_park_near); empty skips")
a = ap.parse_args()
ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
df = pd.read_parquet(ROOT + "data/derived/bakeoff_features_v5r.parquet", columns=["rid", "split", "y", "home_team", "game_date", "margin_hat", "game_pk", "venue_id"]).set_index("rid")
p = pd.read_parquet(a.pred).set_index("rid").p_hr
d = df.join(p, how="inner").dropna(subset=["p_hr"])
d = d[d.split.isin(["val", "test"])].copy()
d["month"] = pd.to_datetime(d.game_date).dt.to_period("M")
d["park"] = d.home_team.astype(str) if a.key == "team" else d.venue_id.astype(int).astype(str)
if a.key == "placebo":  # same month, same set of games, but each game carries another game's venue: any gain left is global adaptation, not a persistent venue signal
    rng = np.random.default_rng(7)
    g = d.groupby(["month", "game_pk"]).park.first().reset_index()
    g["park"] = g.groupby("month").park.transform(lambda s: s.sample(frac=1, random_state=int(rng.integers(1e9))).to_numpy())
    d["park"] = d.reset_index().merge(g, on=["month", "game_pk"], suffixes=("_o", "")).set_index("rid").park
parks = sorted(d.park.unique())
pi = {k: i for i, k in enumerate(parks)}
d["pk"] = d.park.map(pi).to_numpy()
d["nw"] = (d.margin_hat.abs() < 30).astype(float)  # within 30 ft of the fence by the legal estimate
d["lg"] = np.log(np.clip(d.p_hr, 1e-6, 1 - 1e-6) / (1 - np.clip(d.p_hr, 1e-6, 1 - 1e-6)))
sig = lambda z: 1 / (1 + np.exp(-z))


def fit(g, lam, near=False):
    x, y, k, nw = g.lg.to_numpy(), g.y.to_numpy(), g.pk.to_numpy(), g.nw.to_numpy()
    P = len(parks) if lam else 0

    def f(t):
        z = t[0] * x + t[1] + (t[2:2 + P][k] if P else 0) + (t[2 + P:][k] * nw if near else 0)
        q = sig(z)
        nll = -(y * np.log(np.clip(q, 1e-12, 1)) + (1 - y) * np.log(np.clip(1 - q, 1e-12, 1))).sum()
        r = q - y
        gr = [(r * x).sum(), r.sum()]
        if P:
            gr = np.concatenate([gr, np.bincount(k, weights=r, minlength=P) + lam * t[2:2 + P]])
            nll += 0.5 * lam * (t[2:2 + P] ** 2).sum()
        if near:
            gr = np.concatenate([gr, np.bincount(k, weights=r * nw, minlength=P) + lam * t[2 + P:]])
            nll += 0.5 * lam * (t[2 + P:] ** 2).sum()
        return nll, np.array(gr)
    t0 = np.zeros(2 + P + (P if near else 0))
    t0[0] = 1.0
    return minimize(f, t0, jac=True, method="L-BFGS-B").x


def apply(t, g, lam, near=False):
    P = len(parks) if lam else 0
    z = t[0] * g.lg.to_numpy() + t[1] + (t[2:2 + P][g.pk.to_numpy()] if lam else 0) + (t[2 + P:][g.pk.to_numpy()] * g.nw.to_numpy() if near else 0)
    return sig(z)


val, te = d[d.split == "val"], d[d.split == "test"].copy()
out = {"raw": te.p_hr.to_numpy()}
t = fit(val, 0)
print("static Platt on validation: slope %.3f intercept %+.3f" % (t[0], t[1]))
out["static"] = apply(t, te, 0)
months = sorted(te.month.unique())
for name, lam in [("roll", 0)] + [("roll_park_%s" % s, float(s)) for s in a.lams.split(",")]:
    q = np.zeros(len(te))
    for m in months:
        hist = d[(d.split == "val") | ((d.split == "test") & (d.month < m))]
        t = fit(hist, lam)
        sel = (te.month == m).to_numpy()
        q[sel] = apply(t, te[sel], lam)
    out[name] = q
    print("%s: last-month fit slope %.3f intercept %+.3f" % (name, t[0], t[1]))
if a.near:
    lam = float(a.near)
    q = np.zeros(len(te))
    for m in months:
        hist = d[(d.split == "val") | ((d.split == "test") & (d.month < m))]
        t = fit(hist, lam, True)
        sel = (te.month == m).to_numpy()
        q[sel] = apply(t, te[sel], lam, True)
    out["roll_park_near_%s" % a.near] = q
y = te.y.to_numpy()
print("%-18s %-9s %s" % ("variant", "Brier", "vs raw"))
base = ((out["raw"] - y) ** 2).mean()
for k, v in out.items():
    b = ((v - y) ** 2).mean()
    print("%-18s %.5f   %+.5f" % (k, b, b - base))
    if k != "raw":
        os.makedirs(ROOT + "data/derived/recal_%s_%s" % (a.tag, k), exist_ok=True)
        pd.DataFrame({"rid": te.index.to_numpy(), "p_hr": v}).to_parquet(ROOT + "data/derived/recal_%s_%s/pred_recal.parquet" % (a.tag, k))
