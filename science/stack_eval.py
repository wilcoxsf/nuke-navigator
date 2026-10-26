"""Logistic stack over named component prediction files (fit on the validation period, scored on test), compared against the same stack with one component swapped, with a paired game bootstrap.
Usage: python stack_eval.py --data <features.parquet> --base xgb=<f> phys=<f> ... --swap xgb=<f2> [--out <pred_file for the swapped stack>]
Reports both stacks' Brier (all, near-wall, Oracle) and the paired difference (swapped minus base). Differences under about 0.0002 Brier are noise."""
import argparse

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression

ap = argparse.ArgumentParser()
ap.add_argument("--data", required=True)
ap.add_argument("--base", nargs="+", required=True)
ap.add_argument("--swap", nargs="+", required=True)
ap.add_argument("--out")
a = ap.parse_args()
parse = lambda items: dict(x.split("=", 1) for x in items)
base, swap = parse(a.base), {**parse(a.base), **parse(a.swap)}
df = pd.read_parquet(a.data, columns=["rid", "split", "y", "game_pk", "home_team", "margin_hat"]).set_index("rid")
logit = lambda p: np.log(np.clip(p, 1e-5, 1 - 1e-5) / (1 - np.clip(p, 1e-5, 1 - 1e-5)))


def build(files):
    P = {k: pd.read_parquet(f).set_index("rid").p_hr.reindex(df.index) for k, f in files.items()}
    return P


Pb, Ps = build(base), build(swap)
ok = df.index[df.split.isin(["val", "test"])]
for P in (Pb, Ps):
    for k in P:
        ok = ok.intersection(P[k].dropna().index)
d = df.loc[ok]
va, te = d[d.split == "val"], d[d.split == "test"]


def fit(P):
    X = lambda ix: np.column_stack([logit(P[k].loc[ix].to_numpy()) for k in P])
    clf = LogisticRegression(C=1.0, max_iter=2000).fit(X(va.index), va.y)
    return clf.predict_proba(X(te.index))[:, 1]


pb, ps = fit(Pb), fit(Ps)
if a.out:
    pd.DataFrame({"rid": te.index, "p_hr": ps}).to_parquet(a.out)
yt = te.y.to_numpy()
near = (te.margin_hat.abs() < 15).to_numpy()
oracle = (te.home_team == "SF").to_numpy()
print("stack components:", ", ".join(base), "| swapped:", ", ".join(f"{k}" for k in parse(a.swap)), "| test balls", len(te))
for lab, p in (("base stack", pb), ("swapped stack", ps)):
    b = lambda m: float(((p[m] - yt[m]) ** 2).mean())
    print("  %-14s all %.5f   near-wall %.4f   Oracle %.5f" % (lab, b(np.ones(len(yt), bool)), b(near), b(oracle)))
ug, inv = np.unique(te.game_pk.to_numpy(), return_inverse=True)
for lab, m in (("all", np.ones(len(yt), bool)), ("near-wall", near), ("Oracle", oracle)):
    dd = ((ps - yt) ** 2 - (pb - yt) ** 2) * m
    s, c = np.bincount(inv, dd), np.bincount(inv, m.astype(float))
    r = np.random.default_rng(3)
    bs = [s[q].sum() / max(c[q].sum(), 1) for q in (r.integers(0, len(ug), len(ug)) for _ in range(400))]
    print("  paired %-10s %+0.5f  (95%% %+0.5f, %+0.5f)" % (lab, s.sum() / c.sum(), *np.percentile(bs, [2.5, 97.5])))
