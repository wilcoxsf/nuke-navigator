"""Calibration audit for one prediction file (rid, p_hr) on the test period: reliability by probability band, logistic calibration slope and intercept (y on logit p; slope 1 and intercept 0 is perfect), expected calibration error,
and the same by season, by wall proximity (predicted margin), and for the busiest parks and Oracle Park. Usage: python calibration_audit.py --pred data/derived/v37_wide/pred_mlp.parquet [--out science/calibration_audit.md]"""
import argparse

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression

ap = argparse.ArgumentParser()
ap.add_argument("--pred", required=True)
ap.add_argument("--out", default="")
a = ap.parse_args()
ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
df = pd.read_parquet(ROOT + "data/derived/bakeoff_features_v5r.parquet", columns=["rid", "split", "y", "home_team", "game_year", "margin_hat", "game_date"]).set_index("rid")
p = pd.read_parquet(a.pred).set_index("rid").p_hr
d = df.join(p, how="inner")
d = d[d.split == "test"].dropna(subset=["p_hr"])
lg = lambda q: np.log(np.clip(q, 1e-6, 1 - 1e-6) / (1 - np.clip(q, 1e-6, 1 - 1e-6)))
out = ["# Calibration audit: %s (test balls %d, home runs %d)" % (a.pred.split("/")[-2], len(d), int(d.y.sum())), ""]


def line(name, g):
    if len(g) < 500 or g.y.sum() < 20:
        return
    clf = LogisticRegression(C=1e6, max_iter=1000).fit(lg(g.p_hr.to_numpy())[:, None], g.y)
    out.append("| %s | %d | %.4f | %.4f | %.3f | %.3f | %.5f |" % (name, len(g), g.y.mean(), g.p_hr.mean(), clf.coef_[0, 0], clf.intercept_[0], ((g.p_hr - g.y) ** 2).mean()))


out += ["| group | balls | actual HR rate | mean predicted | slope | intercept | Brier |", "|---|---|---|---|---|---|---|"]
line("all test", d)
for yr, g in d.groupby("game_year"):
    line("season %d" % yr, g)
d["half"] = np.where(pd.to_datetime(d.game_date) < "2026-01-01", "2025-06 to 2025-09", "2026")
for h, g in d.groupby("half"):
    line("period " + h, g)
line("near wall (margin within 15 ft)", d[d.margin_hat.abs() < 15])
line("far from wall", d[d.margin_hat.abs() >= 15])
line("Oracle Park (SF home)", d[d.home_team == "SF"])
for t, g in sorted(d.groupby("home_team"), key=lambda kv: -len(kv[1]))[:8]:
    line("home " + t, g)
out += ["", "Reliability by predicted-probability band (test):", "", "| band | balls | mean predicted | actual rate | home runs |", "|---|---|---|---|---|"]
edges = [0, 0.001, 0.003, 0.01, 0.03, 0.06, 0.1, 0.2, 0.35, 0.5, 0.7, 0.9, 1.0001]
ece = 0.0
for lo, hi in zip(edges[:-1], edges[1:]):
    g = d[(d.p_hr >= lo) & (d.p_hr < hi)]
    if len(g) == 0:
        continue
    ece += len(g) / len(d) * abs(g.p_hr.mean() - g.y.mean())
    out.append("| %.3f to %.3f | %d | %.4f | %.4f | %d |" % (lo, min(hi, 1), len(g), g.p_hr.mean(), g.y.mean(), int(g.y.sum())))
out.append("")
out.append("Expected calibration error over these bands: %.5f" % ece)
txt = "\n".join(out)
print(txt)
if a.out:
    open(a.out, "w", encoding="utf-8").write(txt + "\n")
