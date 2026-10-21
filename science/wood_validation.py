"""T8: does the college-trained (aluminum bat) spin teacher transfer to wood-bat professional and summer-league balls?

Zero-fit: teachers are trained on the college corpus only and scored on the Cape Cod League (wood, summer collegiate) and Frontier League
(wood, independent pro) batted balls that have measured spin. Baseline is GPT's frozen linear prior from the legacy repo (it uses the true launch
direction). Rows:
  GPT linear prior (uses direction)
  teacher with direction (like for like with the prior)
  teachers without direction (what an MLB prediction has): current inputs, + approach angles and plate location, + incoming pitch spin
A cross-calibration check fits a straight-line correction on one league and applies it to the other, to see whether a simple wood-bat fix transfers.
Wood-bat data is used for validation only and is never redistributed or committed.

Usage: python wood_validation.py --college ... --cape ... --frontier ... --params ... --out science/wood_validation.md
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd

from flight_fit import RPM, prep
from flight_transfer import GRP_DTYPE, TM_GROUP

BASE = ["ExitSpeed", "Angle", "RelSpeed", "side_r", "grp"]
APPR, PLATE, PSPIN = ["VertApprAngle", "HorzApprAngle"], ["PlateLocHeight", "PlateLocSide"], ["SpinRate", "SpinAxis"]
TEACHERS = {"teacher, current inputs (no direction)": BASE, "teacher + approach angles + plate location": BASE + APPR + PLATE,
            "teacher + approach + plate + incoming pitch spin": BASE + APPR + PLATE + PSPIN, "teacher WITH launch direction (like the prior)": BASE + ["Direction"]}
ALL_X = sorted(set(BASE + APPR + PLATE + PSPIN + ["Direction"]) - {"grp", "side_r"})


def fit(X):
    return lambda y, d: lgb.LGBMRegressor(n_estimators=300, learning_rate=0.06, num_leaves=31, min_child_samples=50, subsample=0.8, subsample_freq=1,
                                          colsample_bytree=0.8, verbose=-1, n_jobs=4).fit(d[X], y)


def clean(df):
    df = df.dropna(subset=["HitSpinRate", "HitSpinAxis", "BatterSide"] + ALL_X).copy()
    # |Direction| <= 55 matches GPT's frozen domain; the linear prior has a direction term that is only valid for fair-territory balls
    df = df[df.ExitSpeed.between(60, 125) & df.Angle.between(10, 55) & df.HitSpinRate.between(500, 6000) & (df.Direction.abs() <= 55)].reset_index(drop=True)
    df["side_r"] = df.BatterSide.astype(str).str.lower().str.startswith("r").astype(float)
    df["grp"] = pd.Categorical(df.TaggedPitchType.map(TM_GROUP).fillna("other").astype(str), dtype=GRP_DTYPE)
    return df


def stats(t, p):
    t, p = np.asarray(t) / RPM, np.asarray(p) / RPM  # rad/s to rpm
    return dict(r=np.corrcoef(t, p)[0, 1], r2=1 - ((t - p) ** 2).sum() / ((t - t.mean()) ** 2).sum(), mae=np.abs(t - p).mean(), bias=np.median(p - t))


def main() -> None:
    ap = argparse.ArgumentParser()
    for k in ("college", "cape", "frontier", "params", "out"):
        ap.add_argument(f"--{k}", required=True)
    a = ap.parse_args()
    g = lambda p: p.replace("\\", "/")
    sign = json.load(open(a.params))["sign"]
    col = clean(pd.read_parquet(g(a.college)))
    sets = {"Cape Cod League": clean(pd.read_parquet(g(a.cape))), "Frontier League": clean(pd.read_parquet(g(a.frontier)))}
    tcol = prep(col.assign(Direction=col.Direction.fillna(0.0)), sign)
    print(f"college {len(col):,}; " + "; ".join(f"{k} {len(v):,}" for k, v in sets.items()), flush=True)
    models = {n: (fit(X)(tcol["w_back"], col), fit(X)(tcol["w_side"], col)) for n, X in TEACHERS.items()}
    L = ["# T8: wood-bat spin validation (zero-fit)", "",
         "Teachers are trained on the college corpus only (aluminum bats). Test sets: " + "; ".join(f"{k} {len(v):,} batted balls with complete spin and pitch data" for k, v in sets.items()) +
         ". Domain: exit speed 60-125 mph, launch angle 10-55 degrees, spin 500-6000 rpm. Backspin and sidespin in rpm; bias is median predicted minus measured.", ""]
    resid = {}
    for sname, d in sets.items():
        truth = prep(d.assign(Direction=d.Direction.fillna(0.0)), sign)
        hand = np.where(d.side_r == 1, 1.0, -1.0)
        prior_b = (-763.0 + 120.0 * d.Angle + 21.0 * d.Direction * hand) * RPM
        prior_s = (-hand * 849.0 - 94.0 * d.Direction) * RPM
        L += [f"## {sname} ({len(d):,} balls)", "", "| Predictor | Backspin r | Backspin R2 | Backspin MAE | Backspin bias | Sidespin r | Sidespin R2 | Sidespin MAE | Sidespin bias |", "|---|---|---|---|---|---|---|---|---|"]
        rows = {"GPT linear prior (uses direction)": (prior_b, prior_s)}
        for n, (mb, ms) in models.items():
            X = TEACHERS[n]
            rows[n] = (mb.predict(d[X]), ms.predict(d[X]))
        for n, (pb, ps) in rows.items():
            sb, ss = stats(truth["w_back"], pb), stats(truth["w_side"], ps)
            L.append(f"| {n} | {sb['r']:.3f} | {sb['r2']:.3f} | {sb['mae']:.0f} | {sb['bias']:+.0f} | {ss['r']:.3f} | {ss['r2']:.3f} | {ss['mae']:.0f} | {ss['bias']:+.0f} |")
        L.append("")
        resid[sname] = (d, truth, rows)

    # cross-calibration of the best direction-free teacher: a straight-line correction fitted on one league, applied to the other
    best = "teacher + approach angles + plate location"
    L += ["## Does a simple wood-bat correction transfer between leagues?", "",
          f"Straight-line correction (measured = a + b x prediction) for `{best}`, fitted on one league and applied to the other. MAE in rpm before and after.", "",
          "| Fitted on | Applied to | Backspin MAE before | after | Sidespin MAE before | after |", "|---|---|---|---|---|---|"]
    names = list(resid)
    for src, dst in [(names[0], names[1]), (names[1], names[0])]:
        out = []
        for comp, idx in (("w_back", 0), ("w_side", 1)):
            ds, ts, rs = resid[src]
            dd, td, rd = resid[dst]
            ps, pd_ = rs[best][idx] / RPM, rd[best][idx] / RPM
            b, a0 = np.polyfit(ps, ts[comp] / RPM, 1)
            before = np.abs(td[comp] / RPM - pd_).mean()
            after = np.abs(td[comp] / RPM - (a0 + b * pd_)).mean()
            out += [before, after]
        L.append(f"| {src} | {dst} | {out[0]:.0f} | {out[1]:.0f} | {out[2]:.0f} | {out[3]:.0f} |")
    Path(a.out).write_text("\n".join(L) + "\n", encoding="utf-8")
    print("\n".join(L))


if __name__ == "__main__":
    main()
