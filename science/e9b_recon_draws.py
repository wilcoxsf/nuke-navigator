"""E9b: do the reconstruct-mode carry draws (saved by e9_draws_in_stack.py) add to the dedicated reconstruct-mode models (XGBoost and LightGBM trained WITH the true landing bearing and fence distance)?
Same logistic stack on validation, scored on test, paired game bootstrap. Output: science/e9b_recon_draws.md."""
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
out = []


def say(s=""):
    print(s, flush=True)
    out.append(s)


df = pd.read_parquet(ROOT + "data/derived/bakeoff_features_v5r.parquet", columns=["rid", "split", "y", "game_pk", "home_team", "margin_hat"])
df = df[df.split.isin(["val", "test"])].set_index("rid")
dr = pd.read_parquet(ROOT + "data/derived/e9_draws.parquet").set_index("rid")
df["dB"] = dr.dB.reindex(df.index)
for k in ("xgb", "lgbm"):
    df[k] = pd.read_parquet(ROOT + f"data/derived/bakeoff_recon/pred_{k}.parquet").set_index("rid").p_hr.reindex(df.index)
df = df.dropna(subset=["xgb", "lgbm", "dB"])
logit = lambda p: np.log(np.clip(p, 1e-5, 1 - 1e-5) / (1 - np.clip(p, 1e-5, 1 - 1e-5)))
va, te = df[df.split == "val"], df[df.split == "test"]


def mat(f, draws):
    cols = [logit(f.xgb), logit(f.lgbm)] + ([logit(np.clip(f.dB, 0.002, 0.998)), f.dB.to_numpy()] if draws else [])
    return np.column_stack(cols)


def fp(draws):
    return LogisticRegression(C=1.0, max_iter=2000).fit(mat(va, draws), va.y).predict_proba(mat(te, draws))[:, 1]


yt = te.y.to_numpy()
near = (te.margin_hat.abs() < 15).to_numpy()
oracle = (te.home_team == "SF").to_numpy()
res = {"recon xgb alone": te.xgb.to_numpy(), "recon lgbm alone": te.lgbm.to_numpy(), "recon stack (xgb + lgbm)": fp(False), "recon stack + draws": fp(True), "draws alone": te.dB.to_numpy()}
say("# Reconstruct-mode models with and without carry draws (22 Oct 2026); test balls %d" % len(te))
for k, p in res.items():
    b = lambda m: float(((p[m] - yt[m]) ** 2).mean())
    say("  %-28s all %.5f   near-wall %.4f   Oracle %.5f" % (k, b(np.ones(len(yt), bool)), b(near), b(oracle)))
ug, inv = np.unique(te.game_pk.to_numpy(), return_inverse=True)


def paired(pa, pb, label, m):
    d = ((pb - yt) ** 2 - (pa - yt) ** 2) * m
    s, c = np.bincount(inv, d), np.bincount(inv, m.astype(float))
    r = np.random.default_rng(3)
    bs = [s[p].sum() / max(c[p].sum(), 1) for p in (r.integers(0, len(ug), len(ug)) for _ in range(400))]
    say("  %-40s %+0.5f  (95%% %+0.5f, %+0.5f)" % (label, s.sum() / c.sum(), *np.percentile(bs, [2.5, 97.5])))


say("\n## Paired: recon stack + draws minus recon stack (negative = draws help)")
for lab, m in (("all", np.ones(len(yt), bool)), ("near-wall", near), ("Oracle", oracle)):
    paired(res["recon stack (xgb + lgbm)"], res["recon stack + draws"], lab, m)
open(ROOT + "science/e9b_recon_draws.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
