"""Robustness audit of a candidate against a baseline (8 Nov 2026): Brier difference by park, month, batter hand, exit-speed and launch-angle bands, predicted margin and
year, with a game-block bootstrap interval per group; calibration slope and intercept and expected calibration error for both. Flags groups where the candidate is
worse with an interval clear of zero.
Usage: python science/audit_blend.py --data <features.parquet> --a <baseline.parquet> --b <candidate.parquet>"""
import argparse

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression

ap = argparse.ArgumentParser()
ap.add_argument("--data", required=True); ap.add_argument("--a", required=True); ap.add_argument("--b", required=True)
ap.add_argument("--boot", type=int, default=400)
a = ap.parse_args()
D = pd.read_parquet(a.data, columns=["rid", "split", "y", "game_date", "game_pk", "venue_id", "margin_hat", "launch_speed", "launch_angle"])
F = pd.read_parquet("C:/Users/andrewwi/dev/nuke-navigator-new/data/derived/bakeoff_features_v39c.parquet", columns=["rid", "stand_r"])
d = D[D.split == "test"].merge(F, on="rid").merge(pd.read_parquet(a.a)[["rid", "p_hr"]].rename(columns={"p_hr": "pa"}), on="rid").merge(pd.read_parquet(a.b)[["rid", "p_hr"]].rename(columns={"p_hr": "pb"}), on="rid")
d["da"] = (d.pa - d.y) ** 2; d["db"] = (d.pb - d.y) ** 2; d["diff"] = d.db - d.da
rng = np.random.default_rng(0)


def ci(sub):
    g = sub.groupby("game_pk")["diff"].agg(["sum", "count"])
    s, c = g["sum"].to_numpy(), g["count"].to_numpy()
    if len(s) < 20: return np.nan, np.nan
    idx = rng.integers(0, len(s), (a.boot, len(s)))
    m = s[idx].sum(1) / c[idx].sum(1)
    return np.percentile(m, 2.5), np.percentile(m, 97.5)


def table(name, key):
    rows = []
    for k, sub in d.groupby(key, observed=True):
        if len(sub) < 2000: continue
        lo, hi = ci(sub)
        rows.append((str(k), len(sub), sub.y.mean(), sub.da.mean(), sub.db.mean(), sub["diff"].mean(), lo, hi, "WORSE" if lo > 0 else ("better" if hi < 0 else "")))
    t = pd.DataFrame(rows, columns=[name, "balls", "hr_rate", "brier_a", "brier_b", "b_minus_a", "lo", "hi", "flag"])
    print("\n== by %s" % name); print(t.to_string(index=False, float_format=lambda x: "%.5f" % x))
    return t


def calib(p, y):
    lg = np.log(np.clip(p, 1e-6, 1 - 1e-6) / (1 - np.clip(p, 1e-6, 1 - 1e-6)))
    m = LogisticRegression(C=1e6, max_iter=1000).fit(lg.reshape(-1, 1), y)
    bins = pd.qcut(p, 20, duplicates="drop")
    e = pd.DataFrame({"p": p, "y": y, "b": bins}).groupby("b", observed=True).agg(p=("p", "mean"), y=("y", "mean"), n=("y", "size"))
    return m.coef_[0][0], m.intercept_[0], (e.n * (e.p - e.y).abs()).sum() / e.n.sum()


print("overall: a %.5f  b %.5f  b-a %+.5f   (%d test balls)" % (d.da.mean(), d.db.mean(), d["diff"].mean(), len(d)))
for nm, col in (("a", d.pa), ("b", d.pb)):
    s, i, e = calib(col.to_numpy(), d.y.to_numpy()); print("calibration %s: slope %.3f intercept %+.3f ECE %.5f" % (nm, s, i, e))
d["month"] = pd.to_datetime(d.game_date).dt.to_period("M").astype(str)
d["year"] = pd.to_datetime(d.game_date).dt.year
d["hand"] = np.where(d.stand_r == 1, "R", "L")
d["ev"] = pd.cut(d.launch_speed, [0, 90, 95, 100, 105, 130])
d["la"] = pd.cut(d.launch_angle, [-90, 15, 22, 28, 34, 40, 90])
d["margin"] = pd.cut(d.margin_hat, [-999, -60, -30, -15, 0, 15, 30, 60, 999])
T = [table("park", "venue_id"), table("month", "month"), table("year", "year"), table("hand", "hand"), table("exit speed", "ev"), table("launch angle", "la"), table("predicted margin", "margin")]
w = sum((t.flag == "WORSE").sum() for t in T); b = sum((t.flag == "better").sum() for t in T)
print("\nsummary: %d groups worse with an interval clear of zero, %d better" % (w, b))
