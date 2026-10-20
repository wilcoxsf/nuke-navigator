"""What the college TrackMan corpus can teach us about the two things public Statcast lacks.

1. Batted-ball spin: how it relates to launch angle, which axis convention gives physical sign coherence
   (sidespin should curve the ball: landing bearing minus launch direction), and how well spin can be predicted
   from information a Predicted model would have at contact.
2. Launch direction: how far the landing bearing drifts from the true launch direction.

Research only (the source repo is unlicensed): inputs and outputs stay in data/ and science/.
Usage: python trackman_teacher.py <trackman_college_bbe.parquet> <out.md>
"""
from __future__ import annotations

import sys

import duckdb
import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import GroupKFold

src, out = sys.argv[1].replace("\\", "/"), sys.argv[2]
df = duckdb.sql(f"SELECT * FROM read_parquet('{src}')").df()
L = [f"# College TrackMan teacher analysis", "", f"Batted balls loaded: {len(df):,}.", ""]

has = df.dropna(subset=["HitSpinRate", "HitSpinAxis", "Direction", "Bearing", "Distance"]).copy()
has = has[(has.ExitSpeed >= 40) & (has.HitSpinRate.between(0, 6000))]
L.append(f"With measured spin, true direction, landing bearing and distance: {len(has):,}. "
         f"Leagues: {df['League'].value_counts().head(6).to_dict()}.")
L += ["", f"Mean exit speed {has.ExitSpeed.mean():.1f} mph; mean spin {has.HitSpinRate.mean():.0f} rpm; "
      f"median distance {has.Distance.median():.0f} ft.", ""]

# 1a. spin versus launch angle
bins = pd.cut(has.Angle, [-90, -10, 0, 10, 20, 30, 40, 50, 90])
t = has.groupby(bins, observed=True).agg(n=("HitSpinRate", "size"), spin=("HitSpinRate", "mean"), dist=("Distance", "mean"))
L += ["## Spin by launch angle", "", "| Launch angle | n | mean spin (rpm) | mean distance (ft) |", "|---|---|---|---|"]
for k, r in t.iterrows():
    L.append(f"| {k} | {int(r.n):,} | {r.spin:.0f} | {r.dist:.0f} |")

# 1b. axis convention: which component curves the ball?
has["curve"] = has["Bearing"] - has["Direction"]  # positive = ball ends up further toward +Bearing than it started
rad = np.deg2rad(has.HitSpinAxis)
cands = {"rate*sin(axis)": has.HitSpinRate * np.sin(rad), "rate*cos(axis)": has.HitSpinRate * np.cos(rad)}
fly = has[(has.Distance > 150) & (has.Angle.between(10, 50))]
L += ["", "## Spin-axis convention check (fly balls over 150 ft)", "",
      "Correlation between each spin component and the curve (landing bearing minus launch direction):", ""]
for k, v in cands.items():
    c = np.corrcoef(v.loc[fly.index], fly["curve"])[0, 1]
    L.append(f"- {k}: {c:+.3f}")
has["sidespin"] = (has.HitSpinRate * np.sin(rad))
has["backspin"] = (has.HitSpinRate * -np.cos(rad))
L.append(f"- Backspin-like component (rate * -cos(axis)) mean {has.backspin.mean():.0f} rpm, sidespin-like (rate * sin(axis)) mean {has.sidespin.mean():.0f} rpm")

# 1c. can spin be predicted from contact-legal information?
feat = ["ExitSpeed", "Angle", "Direction", "RelSpeed", "PlateLocHeight", "PlateLocSide", "VertApprAngle", "HorzApprAngle"]
d2 = has.copy()
d2["side_r"] = (d2.BatterSide == "Right").astype(float)
d2["pt"] = d2.TaggedPitchType.astype("category")
X_cols = feat + ["side_r", "pt"]
groups = d2["file"]
res = {}
for target in ["HitSpinRate", "backspin", "sidespin"]:
    pred = np.full(len(d2), np.nan)
    for a, b in GroupKFold(5).split(d2, groups=groups):
        m = lgb.LGBMRegressor(n_estimators=300, learning_rate=0.05, num_leaves=31, min_child_samples=50, subsample=0.8,
                              subsample_freq=1, colsample_bytree=0.8, verbose=-1, n_jobs=6)
        m.fit(d2.iloc[a][X_cols], d2.iloc[a][target])
        pred[b] = m.predict(d2.iloc[b][X_cols])
    res[target] = (r2_score(d2[target], pred), mean_absolute_error(d2[target], pred), mean_absolute_error(d2[target], np.full(len(d2), d2[target].mean())))
L += ["", "## Predicting spin from contact and pitch details (5-fold by game file)", "", "| Target | R2 | MAE (rpm) | MAE of a constant |", "|---|---|---|---|"]
for k, (r2, mae, base) in res.items():
    L.append(f"| {k} | {r2:.3f} | {mae:.0f} | {base:.0f} |")

# 2. launch direction versus landing bearing
drift = (has["Bearing"] - has["Direction"]).abs()
L += ["", "## Landing bearing versus true launch direction", "",
      f"Median |bearing - direction| {drift.median():.2f} degrees, 95th percentile {drift.quantile(0.95):.2f}, over {len(has):,} balls "
      f"({(has.Distance > 150).sum():,} beyond 150 ft)."]
pred = np.full(len(d2), np.nan)
dir_cols = ["Bearing", "Angle", "ExitSpeed", "Distance", "side_r"]
for a, b in GroupKFold(5).split(d2, groups=groups):
    m = lgb.LGBMRegressor(n_estimators=300, learning_rate=0.05, num_leaves=31, min_child_samples=50, verbose=-1, n_jobs=6)
    m.fit(d2.iloc[a][dir_cols], d2.iloc[a]["Direction"] - d2.iloc[a]["Bearing"])
    pred[b] = m.predict(d2.iloc[b][dir_cols]) + d2.iloc[b]["Bearing"]
err = (d2["Direction"] - pred).abs()
L.append(f"A model that corrects the bearing using angle, speed, distance and handedness cuts the median error to {err.median():.2f} degrees "
         f"(95th percentile {err.quantile(0.95):.2f}).")
open(out, "w", encoding="utf-8").write("\n".join(L) + "\n")
print("\n".join(L))
