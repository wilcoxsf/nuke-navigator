"""Transfer test: does the flight model and spin teacher fitted on college TrackMan work on MLB batted balls?

No MLB data trains the physics. The spin teacher sees only what MLB also has at contact (exit speed, launch angle, pitch
speed, pitch group, handedness). MLB fly balls get each game's air density from Open-Meteo (surface pressure, temperature,
humidity). Baselines are boosted trees trained on MLB, with and without air density.

Target: Statcast projected distance on fly balls (launch angle 15-45, exit speed >= 90). Wind is not modeled here.

Usage: python flight_transfer.py <college_parquet> <params.json> <mlb_bbe> <games> <weather> <train_end> <test_from> <out.md>
"""
from __future__ import annotations

import json
import sys

import duckdb
import lightgbm as lgb
import numpy as np
import pandas as pd

from flight_fit import FT, MPH, RPM, prep, simulate
from ladder import load

GROUP = {"FF": "fast", "FA": "fast", "SI": "sinker", "FC": "cutter", "SL": "slider", "ST": "slider", "SV": "slider", "CU": "curve",
         "KC": "curve", "CS": "curve", "CH": "change", "FS": "split", "FO": "split", "KN": "knuckle"}
TM_GROUP = {"FastBall": "fast", "Fastball": "fast", "FourSeamFastBall": "fast", "OneSeamFastBall": "sinker", "TwoSeamFastBall": "sinker",
            "Sinker": "sinker", "Cutter": "cutter", "Slider": "slider", "Sweeper": "slider", "Curveball": "curve", "ChangeUp": "change",
            "Changeup": "change", "Splitter": "split", "Knuckleball": "knuckle"}
CATS = ["fast", "sinker", "cutter", "slider", "curve", "change", "split", "knuckle", "other"]
GRP_DTYPE = pd.CategoricalDtype(CATS)
X = ["ExitSpeed", "Angle", "RelSpeed", "side_r", "grp"]


def main() -> None:
    col, pj, mlb, games, wx, tr_end, te_from, out = sys.argv[1:9]
    cfg = json.load(open(pj))
    p, sign = np.array(cfg["params"]), cfg["sign"]

    tm = duckdb.sql(f"SELECT * FROM read_parquet('{col.replace(chr(92), '/')}')").df()
    tm = tm.dropna(subset=["HitSpinRate", "HitSpinAxis", "ExitSpeed", "Angle", "RelSpeed"]).copy()
    tm = tm[tm.ExitSpeed.between(60, 125) & tm.Angle.between(10, 55) & tm.HitSpinRate.between(500, 6000)].reset_index(drop=True)
    tm["side_r"] = (tm.BatterSide == "Right").astype(float)
    tm["grp"] = tm.TaggedPitchType.map(TM_GROUP).fillna("other").astype(str).astype(GRP_DTYPE)
    truth = prep(tm.assign(Direction=0.0), sign)
    teach = {k: lgb.LGBMRegressor(n_estimators=300, learning_rate=0.06, num_leaves=31, min_child_samples=50, subsample=0.8, subsample_freq=1,
                                  colsample_bytree=0.8, verbose=-1, n_jobs=6).fit(tm[X], truth[k]) for k in ("w_back", "w_side")}

    df = load(mlb.replace("\\", "/"), games.replace("\\", "/"), wx.replace("\\", "/"))
    df = df[df.launch_angle.between(15, 45) & (df.launch_speed >= 90) & df.hit_distance_sc.notna() & df.release_speed.notna()
            & df.air_density.notna()].reset_index(drop=True)
    df["grp"] = df.pitch_type.astype(str).map(GROUP).fillna("other").astype(GRP_DTYPE)
    mx = df.rename(columns={"launch_speed": "ExitSpeed", "launch_angle": "Angle", "release_speed": "RelSpeed", "stand_r": "side_r"})
    spin = {k: teach[k].predict(mx[X]) for k in teach}
    sim = dict(v0=df.launch_speed.to_numpy() * MPH, theta=np.deg2rad(df.launch_angle.to_numpy()), phi=np.zeros(len(df)),
               w_back=spin["w_back"], w_side=spin["w_side"], z0=np.full(len(df), 1.0))
    d_air, hang, _ = simulate(p, **sim, rho=df.air_density.to_numpy())
    d_std, _, _ = simulate(p, **sim, rho=np.full(len(df), 1.2))
    df["phys_air"], df["phys_std"], df["hang"] = d_air / FT, d_std / FT, hang
    ok = np.isfinite(df.phys_air) & np.isfinite(df.phys_std)
    df = df[ok].reset_index(drop=True)

    tr = df[df.game_year <= int(tr_end)]
    te = df[df.game_year >= int(te_from)]
    y = te.hit_distance_sc.to_numpy()
    rows = [("Physics (college fit, college spin teacher), air density from weather", float(np.mean(np.abs(te.phys_air - y))), float(np.mean(te.phys_air - y))),
            ("Same physics, standard air everywhere", float(np.mean(np.abs(te.phys_std - y))), float(np.mean(te.phys_std - y)))]
    # one number fitted on MLB: a scale on the physics distance
    s = float(np.median(tr.hit_distance_sc / tr.phys_air))
    rows.append((f"Physics with one MLB scale factor ({s:.3f})", float(np.mean(np.abs(te.phys_air * s - y))), float(np.mean(te.phys_air * s - y))))

    def gbm(cols, extra=None):
        m = lgb.LGBMRegressor(n_estimators=500, learning_rate=0.05, num_leaves=31, min_child_samples=100, verbose=-1, n_jobs=6)
        m.fit(tr[cols], tr.hit_distance_sc if extra is None else tr.hit_distance_sc - tr[extra])
        pr = m.predict(te[cols])
        return pr if extra is None else pr + te[extra].to_numpy()

    base = ["launch_speed", "launch_angle", "stand_r"]
    wxc = ["air_density", "om_temp_f", "om_wind_u", "om_wind_v", "elevation_ft"]
    for name, pr in [("Boosted trees: contact only", gbm(base)), ("Boosted trees: contact + weather", gbm(base + wxc)),
                     ("Physics + boosted-tree correction (contact + weather)", gbm(base + wxc + ["phys_air"], "phys_air"))]:
        rows.append((name, float(np.mean(np.abs(pr - y))), float(np.mean(pr - y))))

    L = ["# College-to-MLB transfer test", "",
         f"MLB fly balls (launch angle 15-45, exit speed 90+ mph, with projected distance): train {len(tr):,} (through {tr_end}), test {len(te):,} ({te_from} on). "
         "Target: Statcast projected distance. Wind is not in the physics.", "",
         "| Model | MAE (ft) | Mean error (ft) |", "|---|---|---|"]
    L += [f"| {n} | {m:.1f} | {b:+.1f} |" for n, m, b in rows]
    open(out, "w", encoding="utf-8").write("\n".join(L) + "\n")
    print("wrote", out, flush=True)


if __name__ == "__main__":
    main()
