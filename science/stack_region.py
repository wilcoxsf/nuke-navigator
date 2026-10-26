"""E47 (GPT brief-6 ideas 20 and 'calibration by region'): does a stacker that is fitted separately for balls the model itself puts near the fence (legal predicted margin, margin_hat within +-20 ft) beat one global logistic stacker?
Both are fit on the validation period only, scored on test, paired by game. Components are given as name=file like stack_eval.py. A shrunken version blends the two regional weight vectors with the global one (shrink 0.5).
Usage: python stack_region.py --data <v5r features> --comps xgb=<f> lgb=<f> ... [--band 20]"""
import argparse

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression

ap = argparse.ArgumentParser()
ap.add_argument("--data", required=True)
ap.add_argument("--comps", nargs="+", required=True)
ap.add_argument("--band", type=float, default=20.0)
a = ap.parse_args()
comps = dict(x.split("=", 1) for x in a.comps)
df = pd.read_parquet(a.data, columns=["rid", "split", "y", "game_pk", "home_team", "margin_hat"]).set_index("rid")
logit = lambda p: np.log(np.clip(p, 1e-5, 1 - 1e-5) / (1 - np.clip(p, 1e-5, 1 - 1e-5)))
P = {k: pd.read_parquet(f).set_index("rid").p_hr.reindex(df.index) for k, f in comps.items()}
ok = df.index[df.split.isin(["val", "test"])]
for k in P:
    ok = ok.intersection(P[k].dropna().index)
d = df.loc[ok]
va, te = d[d.split == "val"], d[d.split == "test"]
X = lambda ix: np.column_stack([logit(P[k].loc[ix].to_numpy()) for k in P])
Xv, Xt = X(va.index), X(te.index)
gl = LogisticRegression(C=1.0, max_iter=2000).fit(Xv, va.y)
p_glob = gl.predict_proba(Xt)[:, 1]
nv, nt = (va.margin_hat.abs() < a.band).to_numpy(), (te.margin_hat.abs() < a.band).to_numpy()
print("near-fence balls (predicted margin within %.0f ft): val %d of %d, test %d of %d" % (a.band, nv.sum(), len(nv), nt.sum(), len(nt)))
p_reg = p_glob.copy()
p_shr = p_glob.copy()
for lab, mv, mt in (("near", nv, nt), ("far", ~nv, ~nt)):
    m = LogisticRegression(C=1.0, max_iter=2000).fit(Xv[mv], va.y.to_numpy()[mv])
    p_reg[mt] = m.predict_proba(Xt[mt])[:, 1]
    coef = 0.5 * m.coef_ + 0.5 * gl.coef_
    icp = 0.5 * m.intercept_ + 0.5 * gl.intercept_
    p_shr[mt] = 1 / (1 + np.exp(-(Xt[mt] @ coef.ravel() + icp)))
    print(lab, "weights", dict(zip(P, np.round(m.coef_.ravel(), 2))))
yt = te.y.to_numpy()
near = (te.margin_hat.abs() < 15).to_numpy()
oracle = (te.home_team == "SF").to_numpy()
ug, inv = np.unique(te.game_pk.to_numpy(), return_inverse=True)
for lab, p in (("global", p_glob), ("regional", p_reg), ("regional shrunk", p_shr)):
    b = lambda m: float(((p[m] - yt[m]) ** 2).mean())
    print("  %-16s all %.5f   near-wall %.4f   Oracle %.5f" % (lab, b(np.ones(len(yt), bool)), b(near), b(oracle)))
for lab, p in (("regional", p_reg), ("regional shrunk", p_shr)):
    for nm, m in (("all", np.ones(len(yt), bool)), ("near-wall", near), ("Oracle", oracle)):
        dd = ((p - yt) ** 2 - (p_glob - yt) ** 2) * m
        s, c = np.bincount(inv, dd), np.bincount(inv, m.astype(float))
        r = np.random.default_rng(3)
        bs = [s[q].sum() / max(c[q].sum(), 1) for q in (r.integers(0, len(ug), len(ug)) for _ in range(400))]
        print("  paired %-16s %-10s %+0.5f  (95%% %+0.5f, %+0.5f)" % (lab, nm, s.sum() / c.sum(), *np.percentile(bs, [2.5, 97.5])))
