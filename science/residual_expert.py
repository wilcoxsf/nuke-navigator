"""Experiment E27 (GPT brief-5 idea 4): a local residual expert. The base is the v16 XGBoost three-seed average (trained on 2015 to 2024; its validation and test predictions are genuinely out of sample).
A small LightGBM learns the base's residual (y - p) on the VALIDATION slice only (44,503 balls, spring 2025) from: the base logit, the carry-corrected margin, the fence slope, the distance to a fence node, air density, hand,
exit speed, launch angle, carry_hat and phys_dist_c. The correction is shrunk: p_new = clip(p + lambda x clip(r_hat, -0.15, 0.15)). lambda is chosen by 4-fold game-grouped cross-validation INSIDE the validation slice
(never on test); the test slice then scores every lambda for reporting, paired by game against the base. Kill rule (GPT): no reproducible gain of at least 0.0001.
Usage: python residual_expert.py [--table data/derived/bakeoff_features_v23.parquet]. A minute; output science/residual_expert.md."""
import argparse

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
ap = argparse.ArgumentParser()
ap.add_argument("--table", default=ROOT + "data/derived/bakeoff_features_v23.parquet")
ap.add_argument("--base", default=ROOT + "data/derived/v17_avg/pred_xgb.parquet")
a = ap.parse_args()
out = []


def say(s=""):
    print(s, flush=True)
    out.append(s)


G = ["p_logit", "margin_c", "fence_slope", "node_dist", "air_density", "stand_r", "launch_speed", "launch_angle", "carry_hat", "phys_dist_c"]
df = pd.read_parquet(a.table, columns=["rid", "split", "y", "game_pk", "home_team", "margin_hat", "margin_c", "fence_slope", "node_dist", "air_density", "stand_r", "launch_speed", "launch_angle", "carry_hat", "phys_dist_c"]).set_index("rid")
p = pd.read_parquet(a.base).set_index("rid").p_hr
df["p"] = p.reindex(df.index)
df = df[df.split.isin(["val", "test"]) & df.p.notna()].copy()
df["stand_r"] = df.stand_r.astype(float)
df["p_logit"] = np.log(np.clip(df.p, 1e-5, 1 - 1e-5) / (1 - np.clip(df.p, 1e-5, 1 - 1e-5)))
va, te = df[df.split == "val"], df[df.split == "test"]
P = dict(n_estimators=120, learning_rate=0.03, num_leaves=7, min_child_samples=300, subsample=0.8, subsample_freq=1, colsample_bytree=0.8, reg_lambda=20.0, verbose=-1, n_jobs=3)
LAMS = (0.0, 0.25, 0.5, 1.0)
cv = {l: np.zeros(len(va)) for l in LAMS}
for tri, tei in GroupKFold(4).split(va, groups=va.game_pk):
    m = lgb.LGBMRegressor(**P).fit(va.iloc[tri][G], (va.y - va.p).iloc[tri])
    r = np.clip(m.predict(va.iloc[tei][G]), -0.15, 0.15)
    for l in LAMS:
        cv[l][tei] = np.clip(va.p.iloc[tei] + l * r, 1e-5, 1 - 1e-5)
say("# Local residual expert on the v16 XGBoost three-seed average (23 Oct 2026)")
say("\n## Cross-validation inside the validation slice (4 folds by game, %d balls): Brier by lambda" % len(va))
yv = va.y.to_numpy()
for l in LAMS:
    say("  lambda %.2f: %.5f" % (l, float(((cv[l] - yv) ** 2).mean())))
best = min(LAMS, key=lambda l: float(((cv[l] - yv) ** 2).mean()))
say("chosen lambda (on validation only): %.2f" % best)
m = lgb.LGBMRegressor(**P).fit(va[G], va.y - va.p)
rt = np.clip(m.predict(te[G]), -0.15, 0.15)
yt = te.y.to_numpy()
near = (te.margin_hat.abs() < 15).to_numpy()
oracle = (te.home_team == "SF").to_numpy()
ug, inv = np.unique(te.game_pk.to_numpy(), return_inverse=True)
say("\n## Test slice (%d balls; near-wall %d; Oracle %d), paired by game against the base" % (len(te), near.sum(), oracle.sum()))
for l in LAMS:
    pn = np.clip(te.p.to_numpy() + l * rt, 1e-5, 1 - 1e-5)
    b = lambda mk: float(((pn[mk] - yt[mk]) ** 2).mean())
    allm = np.ones(len(yt), bool)
    parts = []
    for lab, mk in (("all", allm), ("near-wall", near), ("Oracle", oracle)):
        dd = ((pn - yt) ** 2 - (te.p.to_numpy() - yt) ** 2) * mk
        s, c = np.bincount(inv, dd), np.bincount(inv, mk.astype(float))
        r = np.random.default_rng(3)
        bs = [s[q].sum() / max(c[q].sum(), 1) for q in (r.integers(0, len(ug), len(ug)) for _ in range(300))]
        parts.append("%s %+.5f (%+.5f, %+.5f)" % (lab, s.sum() / c.sum(), *np.percentile(bs, [2.5, 97.5])))
    say("  lambda %.2f: Brier %.5f  | paired vs base: %s%s" % (l, b(allm), "; ".join(parts), "  <- chosen on validation" if l == best else ""))
say("\nreading: only the lambda chosen on validation counts; a gain must reach 0.0001 with an interval clear of zero, otherwise the expert is dropped.")
open(ROOT + "science/residual_expert.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
