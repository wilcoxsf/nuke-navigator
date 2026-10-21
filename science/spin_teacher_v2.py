"""T1: does a better-informed spin teacher improve MLB fly-ball distance through the physics model?

The college-trained teacher currently sees exit speed, launch angle, pitch speed, pitch group and handedness. MLB now also has approach angles
(computed from the pitch trajectory), plate location and the incoming pitch's spin, all of which the college data has too. This script
  A. measures out-of-fold spin accuracy in the college data for each input set (grouped by game file), with contact position added only as
     an upper-bound diagnostic because MLB's intercept is a different quantity;
  B. fits each teacher on all college balls and runs the zero-fit physics model on MLB fly balls (exit speed 90+, launch angle 15-45, from
     2023-03-01), reporting distance error against Statcast projected distance, paired by game against the current teacher.
Sign and unit conventions are checked before use: each feature is aligned between TrackMan and Statcast by the sign of its correlation with
batter and pitcher handedness, and the incoming-spin axis by pitch-group medians.

Usage: python spin_teacher_v2.py --college data/derived/trackman_college_bbe.parquet --mlb data/derived/exp_features.parquet --params science/flight_fit_results_params.json --out science/spin_teacher_v2.md
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold

from flight_fit import FT, MPH, RPM, prep, simulate
from flight_transfer import GROUP, GRP_DTYPE, TM_GROUP

BASE = ["ExitSpeed", "Angle", "RelSpeed", "side_r", "grp"]
APPR, PLATE, PSPIN = ["VertApprAngle", "HorzApprAngle"], ["PlateLocHeight", "PlateLocSide"], ["SpinRate", "SpinAxis"]
VARIANTS = {"V0 current (contact, pitch speed, group, hand)": [], "V1 + approach angles": APPR, "V2 + plate location": PLATE,
            "V3 + approach angles + plate location": APPR + PLATE, "V4 + incoming pitch spin": PSPIN, "V5 all three": APPR + PLATE + PSPIN}
UPPER = ["ContactPositionX", "ContactPositionY", "ContactPositionZ"]


def teacher():
    return lgb.LGBMRegressor(n_estimators=300, learning_rate=0.06, num_leaves=31, min_child_samples=50, subsample=0.8, subsample_freq=1,
                             colsample_bytree=0.8, verbose=-1, n_jobs=6)


def main() -> None:
    ap = argparse.ArgumentParser()
    for k in ("college", "mlb", "params", "out"):
        ap.add_argument(f"--{k}", required=True)
    a = ap.parse_args()
    g = lambda p: p.replace("\\", "/")
    cfg = json.load(open(a.params))
    p, sign = np.array(cfg["params"]), cfg["sign"]

    tm = pd.read_parquet(g(a.college))
    tm = tm.dropna(subset=["HitSpinRate", "HitSpinAxis", "ExitSpeed", "Angle", "RelSpeed"]).copy()
    tm = tm[tm.ExitSpeed.between(60, 125) & tm.Angle.between(10, 55) & tm.HitSpinRate.between(500, 6000)].reset_index(drop=True)
    tm["side_r"] = (tm.BatterSide == "Right").astype(float)
    tm["grp"] = pd.Categorical(tm.TaggedPitchType.map(TM_GROUP).fillna("other").astype(str), dtype=GRP_DTYPE)
    tm["pitch_r"] = (tm.PitcherThrows == "Right").astype(float)
    truth = prep(tm.assign(Direction=0.0), sign)
    print(f"college balls with spin: {len(tm):,}", flush=True)

    cols = ["game_pk", "game_date", "pool", "launch_speed", "launch_angle", "release_speed", "stand_r", "pitch_type", "p_throws", "vaa", "haa", "plate_x", "plate_z",
            "release_spin_rate", "spin_axis", "hit_distance_sc", "air_density"]
    ml = pd.read_parquet(g(a.mlb), columns=cols)
    ml = ml[(ml.pool != "early") & (ml.launch_speed >= 90) & ml.launch_angle.between(15, 45) & ml.hit_distance_sc.notna() & ml.release_speed.notna() & ml.vaa.notna()].reset_index(drop=True)
    ml["pitch_r"] = (ml.p_throws.astype(str) == "R").astype(float)
    ml["grp"] = pd.Categorical(ml.pitch_type.astype(str).map(GROUP).fillna("other").astype(str), dtype=GRP_DTYPE)
    print(f"MLB fly balls for the physics test: {len(ml):,}", flush=True)

    notes = []

    def align(tm_col, ml_col, by_tm, by_ml):
        ct, cm = np.corrcoef(tm[tm_col].fillna(tm[tm_col].mean()), tm[by_tm])[0, 1], np.corrcoef(ml[ml_col].fillna(ml[ml_col].mean()), ml[by_ml])[0, 1]
        s = 1.0 if np.sign(ct) == np.sign(cm) else -1.0
        notes.append(f"{ml_col} vs {tm_col}: corr with {by_tm} {ct:+.3f} (TrackMan) and {cm:+.3f} (Statcast), sign {s:+.0f}")
        return s

    s_plate = align("PlateLocSide", "plate_x", "side_r", "stand_r")
    s_haa = align("HorzApprAngle", "haa", "pitch_r", "pitch_r")
    ax_t = tm.groupby("grp", observed=True).SpinAxis.median()
    ml["spin_axis_f"] = ml.spin_axis
    ax_m = ml.groupby("grp", observed=True).spin_axis_f.median()
    both = ax_t.index.intersection(ax_m.index)
    ax_gap = float(np.nanmedian(np.abs(((ax_t[both] - ax_m[both] + 180) % 360) - 180)))
    notes.append(f"incoming spin axis: median gap between pitch-group medians {ax_gap:.0f} degrees")
    use_pitch_spin = ax_gap < 25
    mlf = pd.DataFrame({"ExitSpeed": ml.launch_speed.to_numpy(), "Angle": ml.launch_angle.to_numpy(), "RelSpeed": ml.release_speed.to_numpy(), "side_r": ml.stand_r.to_numpy(),
                        "grp": ml.grp, "VertApprAngle": ml.vaa.to_numpy(), "HorzApprAngle": s_haa * ml.haa.to_numpy(), "PlateLocHeight": ml.plate_z.to_numpy(),
                        "PlateLocSide": s_plate * ml.plate_x.to_numpy(), "SpinRate": ml.release_spin_rate.to_numpy(), "SpinAxis": ml.spin_axis.to_numpy()})

    rows = []
    groups = tm["file"]
    sim_base = dict(v0=ml.launch_speed.to_numpy() * MPH, theta=np.deg2rad(ml.launch_angle.to_numpy()), phi=np.zeros(len(ml)), w_side=np.zeros(len(ml)), z0=np.full(len(ml), 1.0))
    rho = ml.air_density.fillna(ml.air_density.median()).to_numpy()
    y = ml.hit_distance_sc.to_numpy()
    ug, gi = np.unique(ml.game_pk.to_numpy(), return_inverse=True)
    boots = np.random.default_rng(0).multinomial(len(ug), np.ones(len(ug)) / len(ug), size=400).astype(float)
    base_err = None
    for name, extra in list(VARIANTS.items()) + [("diagnostic: + contact position (college only)", PLATE + APPR + UPPER)]:
        if set(extra) & set(PSPIN) and not use_pitch_spin:
            continue
        X = BASE + extra
        oof_b, oof_s = np.zeros(len(tm)), np.zeros(len(tm))
        for tr, te in GroupKFold(5).split(tm, groups=groups):
            oof_b[te] = teacher().fit(tm.iloc[tr][X], truth["w_back"][tr]).predict(tm.iloc[te][X])
            oof_s[te] = teacher().fit(tm.iloc[tr][X], truth["w_side"][tr]).predict(tm.iloc[te][X])
        r2 = lambda t, q: 1 - ((t - q) ** 2).sum() / ((t - t.mean()) ** 2).sum()
        row = {"name": name, "r2_back": r2(truth["w_back"], oof_b), "r2_side": r2(truth["w_side"], oof_s),
               "mae_back": np.abs(truth["w_back"] - oof_b).mean() / RPM, "mae_side": np.abs(truth["w_side"] - oof_s).mean() / RPM}
        if not set(extra) & set(UPPER):
            wb = teacher().fit(tm[X], truth["w_back"]).predict(mlf[X])
            ws = teacher().fit(tm[X], truth["w_side"]).predict(mlf[X])
            d, _, _ = simulate(p, **sim_base, w_back=wb, rho=rho)
            err = np.where(np.isfinite(d), d / FT - y, np.nan)
            row["mae"], row["bias"] = np.nanmean(np.abs(err)), np.nanmean(err)
            ae = np.abs(err)
            if base_err is None:
                base_err = ae
            else:
                ok = np.isfinite(ae) & np.isfinite(base_err)
                s = np.bincount(gi[ok], weights=(ae - base_err)[ok], minlength=len(ug))
                n = np.bincount(gi[ok], minlength=len(ug)).astype(float)
                dd = (boots @ s) / np.maximum(boots @ n, 1)
                row["d"], row["lo"], row["hi"] = np.nanmean((ae - base_err)[ok]), np.percentile(dd, 2.5), np.percentile(dd, 97.5)
        rows.append(row)
        print(row, flush=True)

    L = ["# T1: spin teacher with better inputs", "", f"College balls with measured spin: {len(tm):,}. MLB fly balls (exit speed 90+, launch angle 15-45, 2023-03-01 on): {len(ml):,}.", "",
         "Convention checks: " + "; ".join(notes) + ("; incoming spin axis used" if use_pitch_spin else "; incoming spin axis NOT used (conventions disagree)"), "",
         "Spin accuracy is out of fold by game file in the college data. MLB distance is the zero-fit physics model (backspin only, game air density, no wind) against Statcast projected distance.", "",
         "| Teacher inputs | Backspin R2 | Sidespin R2 | Backspin MAE (rpm) | Sidespin MAE (rpm) | MLB distance MAE (ft) | Bias (ft) | Change vs current (95% interval) |", "|---|---|---|---|---|---|---|---|"]
    for r in rows:
        mae = f"{r['mae']:.2f}" if "mae" in r else ""
        bias = f"{r['bias']:+.2f}" if "bias" in r else ""
        dd = f"{r['d']:+.2f} ({r['lo']:+.2f}, {r['hi']:+.2f})" if "d" in r else ""
        L.append(f"| {r['name']} | {r['r2_back']:.3f} | {r['r2_side']:.3f} | {r['mae_back']:.0f} | {r['mae_side']:.0f} | {mae} | {bias} | {dd} |")
    Path(a.out).write_text("\n".join(L) + "\n", encoding="utf-8")
    print("\n".join(L))


if __name__ == "__main__":
    main()
