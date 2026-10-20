"""Does physics plus a boosted-tree correction beat either alone, with spin that a Predicted model could actually have?

Spin for TRAINING rows comes from out-of-fold teachers (grouped by game file) so the correction model sees the same
kind of spin error at train and test time. Direction is the true launch direction here (college corpus); see
flight_fit_results.md for the cost of removing it.

Usage: python flight_hybrid.py <trackman_college_bbe.parquet> <flight_fit_results_params.json> <out.md>
"""
from __future__ import annotations

import json
import sys

import duckdb
import lightgbm as lgb
import numpy as np
from sklearn.model_selection import GroupKFold

from flight_fit import FT, prep, simulate

TEACH_X = ["ExitSpeed", "Angle", "Direction", "RelSpeed", "PlateLocHeight", "PlateLocSide", "VertApprAngle", "side_r", "pt"]


def teacher():
    return lgb.LGBMRegressor(n_estimators=300, learning_rate=0.06, num_leaves=31, min_child_samples=50, subsample=0.8,
                             subsample_freq=1, colsample_bytree=0.8, verbose=-1, n_jobs=6)


def main() -> None:
    src, pj, out = sys.argv[1].replace("\\", "/"), sys.argv[2], sys.argv[3]
    cfg = json.load(open(pj))
    p, sign = np.array(cfg["params"]), cfg["sign"]
    df = duckdb.sql(f"SELECT * FROM read_parquet('{src}')").df()
    df = df.dropna(subset=["HitSpinRate", "HitSpinAxis", "Direction", "Bearing", "Distance", "HangTime", "ExitSpeed", "Angle"]).copy()
    df = df[(df.ExitSpeed.between(60, 125)) & (df.Angle.between(10, 55)) & (df.HitSpinRate.between(500, 6000)) & (df.Distance.between(180, 440))
            & (df.HangTime.between(1.5, 8))].reset_index(drop=True)
    df["side_r"] = (df.BatterSide == "Right").astype(float)
    df["pt"] = df.TaggedPitchType.astype("category")
    rng = np.random.default_rng(0)
    files = df["file"].unique()
    test_files = set(rng.choice(files, size=int(len(files) * 0.2), replace=False))  # same split as flight_fit.py
    te = df[df.file.isin(test_files)].reset_index(drop=True)
    tr = df[~df.file.isin(test_files)].reset_index(drop=True)
    truth_tr, truth_te = prep(tr, sign), prep(te, sign)

    spin_tr = {k: np.zeros(len(tr)) for k in ("w_back", "w_side")}
    for a, b in GroupKFold(5).split(tr, groups=tr["file"]):
        for k in spin_tr:
            m = teacher().fit(tr.iloc[a][TEACH_X], truth_tr[k][a])
            spin_tr[k][b] = m.predict(tr.iloc[b][TEACH_X])
    spin_te = {}
    for k in spin_tr:
        spin_te[k] = teacher().fit(tr[TEACH_X], truth_tr[k]).predict(te[TEACH_X])

    def phys(rows, truth, spin):
        d = dict(truth)
        d["w_back"], d["w_side"] = spin["w_back"], spin["w_side"]
        dist, hang, brg = simulate(p, **d)
        return dist / FT, hang, brg

    d_tr, h_tr, b_tr = phys(tr, truth_tr, spin_tr)
    d_te, h_te, b_te = phys(te, truth_te, spin_te)
    ok_tr, ok_te = np.isfinite(d_tr), np.isfinite(d_te)

    cols = ["ExitSpeed", "Angle", "Direction", "side_r", "RelSpeed", "PlateLocHeight", "PlateLocSide", "pt"]
    rows = []
    for tgt, ptr, pte, name, unit in [("Distance", d_tr, d_te, "Distance", "ft"), ("HangTime", h_tr, h_te, "Hang time", "s")]:
        Xtr, Xte = tr[cols].assign(phys=ptr)[ok_tr], te[cols].assign(phys=pte)[ok_te]
        m = lgb.LGBMRegressor(n_estimators=400, learning_rate=0.04, num_leaves=15, min_child_samples=100, subsample=0.8, subsample_freq=1,
                              verbose=-1, n_jobs=6)
        m.fit(Xtr, tr[tgt][ok_tr] - ptr[ok_tr])
        corrected = pte[ok_te] + m.predict(Xte)
        y = te[tgt][ok_te].to_numpy()
        plain = lgb.LGBMRegressor(n_estimators=500, learning_rate=0.05, num_leaves=31, min_child_samples=50, verbose=-1, n_jobs=6)
        plain.fit(tr[cols], tr[tgt])
        rows.append((name, unit, float(np.mean(np.abs(pte[ok_te] - y))), float(np.mean(np.abs(corrected - y))),
                     float(np.mean(np.abs(plain.predict(te[cols])[ok_te] - y)))))

    L = ["# Physics plus correction", "",
         f"{len(tr):,} training and {len(te):,} held-out college TrackMan fly balls. Spin comes from teachers that see contact and pitch details only; "
         "training spin is out-of-fold.", "",
         "| Target | Physics alone (predicted spin) | Physics + boosted-tree correction | Boosted trees alone |", "|---|---|---|---|"]
    for name, unit, a, b, c in rows:
        f = 1 if unit == "ft" else 2
        L.append(f"| {name} MAE ({unit}) | {a:.{f}f} | {b:.{f}f} | {c:.{f}f} |")
    open(out, "w", encoding="utf-8").write("\n".join(L) + "\n")
    print("wrote", out)


if __name__ == "__main__":
    main()
