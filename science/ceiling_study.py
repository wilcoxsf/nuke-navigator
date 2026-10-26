"""E52: benchmark and headroom study (the 'is it the best?' audit, 24 Oct 2026). Same test balls, XGBoost every time (depth 6, lr 0.08, early stopped on validation; half the train rows so 16 fits finish in about an hour), so rows compare with each other, not with the production numbers.
PART 1, benchmarks of the kind MLB itself publishes (expected home runs from exit speed, launch angle, spray angle and the park):
  EL      exit speed + launch angle + the five fence distances                (no direction at all)
  ELW     EL + temperature, pressure, wind
  SPRAY   EL + the TRUE landing bearing (spray angle, known only after landing) + the fence distance at that bearing   <- what a public 'xHR' uses; NOT available when predicting
  SPRAYW  SPRAY + weather
  LEGAL   our legal v19 feature set (71 columns: swing, pitch, history, estimated bearing, distance model...)
PART 2, the value of better knowledge (ORACLE experiments, diagnostics not models): LEGAL plus a noisy copy of the truth,
  bearing: true bearing + N(0, sigma_b) degrees with sigma_b in 0, 4, 8, 12; distance: observed projected distance + N(0, sigma_d) feet with sigma_d in 0, 8, 16, 32; both together at (0,0), (4,8), (8,16).
  Each adds the noisy value, the fence at the noisy bearing, and the margin. Our legal estimates have bearing error about 6.7 degrees near the wall and distance error about 14 ft, so (8,16) is roughly 'what we have, as a sensor'.
Output: science/ceiling_study.md. Usage: FEATSET=v19 python ceiling_study.py"""
import os
import time

os.environ.setdefault("FEATSET", "v19")
import numpy as np
import pandas as pd
import xgboost as xgb

import bakeoff as B

try:
    import psutil
    psutil.Process(os.getpid()).nice(psutil.BELOW_NORMAL_PRIORITY_CLASS)
except Exception:
    pass
ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
t0 = time.time()
df = pd.read_parquet(ROOT + "data/derived/bakeoff_features_v19.parquet")
tr = (df.split == "train").to_numpy() & (np.random.default_rng(0).random(len(df)) < 0.5)
va, te = (df.split == "val").to_numpy(), (df.split == "test").to_numpy()
y = df.y.to_numpy()
DIMS = ["dim_left_line", "dim_left_center", "dim_center", "dim_right_center", "dim_right_line"]
D = df[DIMS].to_numpy(float)
D = np.where(np.isnan(D), np.nanmean(D, axis=0), D)


def fence(bearing):
    b = np.clip(np.nan_to_num(bearing, nan=0.0), -45, 45) + 45
    i = np.clip((b // 22.5).astype(int), 0, 3)
    t = (b - 22.5 * i) / 22.5
    r = np.arange(len(b))
    return D[r, i] * (1 - t) + D[r, i + 1] * t


rng = np.random.default_rng(7)
bt = df.bearing.to_numpy(float)
dt = df.hit_distance_sc.to_numpy(float)
nb, nd = rng.standard_normal(len(df)), rng.standard_normal(len(df))
legal = list(B.FEATS_PHYS)
B.assert_clean(legal, job="ceiling_study")
WX = ["om_temp_f", "om_pressure_hpa", "om_wind_u", "om_wind_v"]
base = ["launch_speed", "launch_angle"] + DIMS
extra = {}
rows = []


def fit(name, X, note=""):
    p = dict(tree_method="hist", enable_categorical=True, learning_rate=0.08, max_depth=6, n_estimators=1200, early_stopping_rounds=40, n_jobs=6, max_bin=128, random_state=0, subsample=0.8, colsample_bytree=0.8)
    clf = xgb.XGBClassifier(**p, eval_metric="logloss")
    clf.fit(X[tr], y[tr], eval_set=[(X[va], y[va])], verbose=False)
    pr = clf.predict_proba(X[te])[:, 1]
    yt = y[te]
    near = (df.margin_hat.abs() < 15).to_numpy()[te]
    orc = (df.home_team == "SF").to_numpy()[te]
    b = lambda m: float(((pr[m] - yt[m]) ** 2).mean())
    all_ = np.ones(len(yt), bool)
    rows.append((name, note, b(all_), b(near), b(orc), clf.best_iteration))
    print("%-22s all %.5f  near-wall %.4f  Oracle %.5f  trees %d  (%.0f min)" % (name, rows[-1][2], rows[-1][3], rows[-1][4], clf.best_iteration, (time.time() - t0) / 60), flush=True)


def frame(cols, add=None):
    X = df[cols].copy()
    if add:
        for k, v in add.items():
            X[k] = v
    return X


# part 1
fit("EL", frame(base), "exit speed, launch angle, five fence distances")
fit("ELW", frame(base + WX), "plus temperature, pressure, wind")
tb = bt
fit("SPRAY", frame(base, {"true_bearing": tb, "fence_at_true": fence(tb)}), "plus TRUE spray angle (after landing)")
fit("SPRAYW", frame(base + WX, {"true_bearing": tb, "fence_at_true": fence(tb)}), "SPRAY plus weather")
fit("LEGAL", frame(legal), "our legal features (71)")
# part 2: noisy oracles on top of the legal set
for sb in (0, 4, 8, 12):
    ob = bt + sb * nb
    fit("LEGAL+bearing s=%d" % sb, frame(legal, {"ob": ob, "ofence": fence(ob)}), "legal + true bearing with %d deg noise" % sb)
for sd in (0, 8, 16, 32):
    od = dt + sd * nd
    fit("LEGAL+dist s=%d" % sd, frame(legal, {"od": od, "omargin": od - df.fence_hat.to_numpy()}), "legal + observed distance with %d ft noise" % sd)
for sb, sd in ((0, 0), (4, 8), (8, 16)):
    ob, od = bt + sb * nb, dt + sd * nd
    fit("LEGAL+both %d/%d" % (sb, sd), frame(legal, {"ob": ob, "ofence": fence(ob), "od": od, "omargin": od - fence(ob)}), "legal + true bearing (%d deg noise) and distance (%d ft noise)" % (sb, sd))
# context: how good are our own estimates, as errors?
t_ = te & np.isfinite(bt) & np.isfinite(df.bearing_hat.to_numpy(float))
be = np.abs(bt[t_] - df.bearing_hat.to_numpy(float)[t_])
d_ = te & np.isfinite(dt) & np.isfinite(df.dist_hat.to_numpy(float))
de = np.abs(dt[d_] - df.dist_hat.to_numpy(float)[d_])
out = ["# Benchmark and headroom study (24 Oct 2026; XGBoost, half the train rows, one seed; compare rows with each other only)", "",
       "Our legal estimates on test: bearing_hat error median %.1f deg (mean %.1f), dist_hat error median %.1f ft (mean %.1f)." % (np.median(be), be.mean(), np.median(de), de.mean()), "",
       "| model | what it knows | test Brier all | near-wall (predicted margin within 15 ft) | Oracle Park | trees |", "|---|---|---|---|---|---|"]
for r in rows:
    out.append("| %s | %s | %.5f | %.4f | %.5f | %d |" % r)
out.append("")
out.append("constant-rate Brier on test: %.5f" % (y[te].mean() * (1 - y[te].mean())))
open(ROOT + "science/ceiling_study.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
print("written science/ceiling_study.md", "%.0f min" % ((time.time() - t0) / 60))
