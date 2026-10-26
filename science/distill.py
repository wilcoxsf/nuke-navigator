"""Experiment E18: privileged-information distillation. The reconstruct-mode models (which are told the true landing bearing and the fence there) reach Brier 0.0105, the predict-mode models 0.0132. A teacher with
the privileged inputs (true bearing, fence at the true bearing, margin over it) produces, OUT OF FOLD BY GAME on the training rows, a probability for every training ball; the predict-mode student (the v10 feature
set, nothing privileged) is then trained on  alpha x outcome + (1 - alpha) x teacher probability  as a soft label. alpha 1 is the plain model (control). Soft labels carry information a 0/1 outcome cannot (this
ball was a near miss, this one a no-doubter), which is the classic benefit of learning with privileged information.
Leakage rules: teacher probabilities for a training ball come from a model that never saw that ball's game; the student sees the privileged columns never; validation (early stopping, hard labels) and test untouched.
Usage: python distill.py [--folds 5] [--alphas 0.5 0.25]. About 40 minutes (five teacher fits, one student per alpha); lowers its own priority. Output: data/derived/v18_distill/pred_a<alpha>.parquet and science/distill.md."""
import argparse
import os

os.environ.setdefault("FEATSET", "v10")
import numpy as np
import pandas as pd
import xgboost as xgb

import bakeoff as B

try:
    import psutil
    psutil.Process(os.getpid()).nice(psutil.BELOW_NORMAL_PRIORITY_CLASS)
except Exception:
    pass
ap = argparse.ArgumentParser()
ap.add_argument("--folds", type=int, default=5)
ap.add_argument("--alphas", type=float, nargs="+", default=[0.5, 0.25])
a = ap.parse_args()
ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
OUT = ROOT + "data/derived/v18_distill/"
os.makedirs(OUT, exist_ok=True)
out = []


def say(s=""):
    print(s, flush=True)
    out.append(s)


df = pd.read_parquet(ROOT + "data/derived/bakeoff_features_v10.parquet")
for c in B.CATS:
    if c in df.columns:
        df[c] = df[c].astype("category")
feats = [f for f in B.FEATS_PHYS if f in df.columns]
# privileged columns: the true bearing, the fence there (five-point park profile interpolated at the true bearing) and the margin of the carry-corrected distance over it
nodes = [-45, -22.5, 0, 22.5, 45]
dims = df[["dim_left_line", "dim_left_center", "dim_center", "dim_right_center", "dim_right_line"]].to_numpy(float)
bt = df.bearing.to_numpy(float)
fence_true = np.array([np.interp(b, nodes, d) if np.isfinite(b) and np.isfinite(d).all() else np.nan for b, d in zip(bt, dims)])
df["fence_true"] = fence_true
df["margin_true_c"] = df.phys_dist_c - fence_true
df["margin_true_0"] = df.phys_dist - fence_true
priv = ["bearing", "fence_true", "margin_true_c", "margin_true_0"]
tr = (df.split == "train").to_numpy()
va = (df.split == "val").to_numpy()
te = (df.split == "test").to_numpy()
y = df.y.to_numpy(float)
P = dict(tree_method="hist", enable_categorical=True, learning_rate=0.05, max_depth=8, min_child_weight=50, subsample=0.8, colsample_bytree=0.7, reg_lambda=2.0, n_estimators=1500, early_stopping_rounds=60, n_jobs=10, max_bin=256, random_state=0)
say("# Privileged-information distillation (23 Oct 2026): student features %d, privileged %s; train %d, val %d, test %d" % (len(feats), priv, tr.sum(), va.sum(), te.sum()))
fold = (df.game_pk.astype(int) % a.folds).to_numpy()
cache = OUT + "teacher_oof.npy"
if os.path.exists(cache):
    teacher = np.load(cache)
    say("teacher out-of-fold probabilities loaded from %s" % cache)
else:
    teacher = np.full(len(df), np.nan)
    for k in range(a.folds):
        fit = tr & (fold != k)
        pred = tr & (fold == k)
        m = xgb.XGBClassifier(**P, eval_metric="logloss").fit(df.loc[fit, feats + priv], y[fit], eval_set=[(df.loc[va, feats + priv], y[va])], verbose=False)
        teacher[pred] = m.predict_proba(df.loc[pred, feats + priv])[:, 1]
        if k == 0:
            say("  teacher fold 0: %d trees, validation Brier %.5f (it is told the landing bearing)" % (m.best_iteration, float(((m.predict_proba(df.loc[va, feats + priv])[:, 1] - y[va]) ** 2).mean())))
        print("  teacher fold %d of %d done" % (k + 1, a.folds), flush=True)
    np.save(cache, teacher)
ok = tr & np.isfinite(teacher)
say("teacher out-of-fold Brier on training balls %.5f (the plain outcome has Brier %.5f against the base rate)" % (float(((teacher[ok] - y[ok]) ** 2).mean()), float(((y[ok].mean() - y[ok]) ** 2).mean())))
yt = y[te]
res = {}
for alpha in [1.0] + a.alphas:
    soft = alpha * y + (1 - alpha) * np.where(np.isfinite(teacher), teacher, y)
    m = xgb.XGBRegressor(**P, objective="binary:logistic", eval_metric="logloss")  # a regressor with the logistic objective: the sklearn classifier wrapper refuses fractional labels
    # early stopping on the validation slice with hard labels (what we actually want to predict)
    m.fit(df.loc[tr, feats], soft[tr], eval_set=[(df.loc[va, feats], y[va])], verbose=False)
    p = m.predict(df.loc[te, feats])
    res[alpha] = p
    say("  alpha %.2f: %d trees, test Brier %.5f" % (alpha, m.best_iteration, float(((p - yt) ** 2).mean())))
    full = pd.DataFrame({"rid": df.loc[te, "rid"].to_numpy(), "p_hr": p})
    full.to_parquet(OUT + "pred_a%.2f.parquet" % alpha)
open(ROOT + "science/distill.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
