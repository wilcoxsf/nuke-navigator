"""Transfer test: does the flight model and spin teacher fitted on college TrackMan work on MLB batted balls?

No MLB data trains the physics. The spin teacher sees only what MLB also has at contact (exit speed, launch angle, pitch
speed, pitch group, handedness). MLB fly balls get each game's air density from Open-Meteo (surface pressure, temperature,
humidity). Baselines are boosted trees trained on MLB, with and without air density.

Target: Statcast projected distance on fly balls (launch angle 15-45, exit speed >= 90). Wind is not modeled here.

Wind comes from Open-Meteo (10 m, direction it blows from) rotated by each park's home-plate-to-center azimuth (MLB StatsAPI,
pull_venues.py), applied as air velocity with one scale factor picked on the training years (10 m wind is not wind at ball height).
The ball's heading is its landing bearing, so this is a reconstruction test, not a prediction test.

Usage: python flight_transfer.py <college_parquet> <params.json> <mlb_bbe> <games> <weather> <venues> <train_end> <test_from> <out.md>
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
    col, pj, mlb, games, wx, venues, tr_end, te_from, out = sys.argv[1:10]
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
    # field-frame wind from Open-Meteo 10 m wind (direction it blows FROM) and the park's home-plate-to-center azimuth
    ven = duckdb.sql(f"SELECT venue_id, azimuth_deg FROM read_parquet('{venues.replace(chr(92), '/')}')").df()
    df = df.merge(ven, on="venue_id", how="left")
    df = df[df.bearing.notna() & df.azimuth_deg.notna() & df.om_wind_mph.notna() & df.om_wind_dir.notna()].reset_index(drop=True)
    toward = np.deg2rad(df.om_wind_dir.to_numpy() + 180 - df.azimuth_deg.to_numpy())
    wms = df.om_wind_mph.to_numpy() * MPH
    df["wind_along"], df["wind_cross"] = wms * np.cos(toward), wms * np.sin(toward)  # m/s, toward center field / toward right field

    mx = df.rename(columns={"launch_speed": "ExitSpeed", "launch_angle": "Angle", "release_speed": "RelSpeed", "stand_r": "side_r"})
    spin = {k: teach[k].predict(mx[X]) for k in teach}
    sim = dict(v0=df.launch_speed.to_numpy() * MPH, theta=np.deg2rad(df.launch_angle.to_numpy()), phi=np.deg2rad(df.bearing.to_numpy()),
               w_back=spin["w_back"], w_side=spin["w_side"], z0=np.full(len(df), 1.0))
    rho = df.air_density.to_numpy()
    tr_mask = (df.game_year <= int(tr_end)).to_numpy()
    wind_rows = []
    for k in (0.0, 0.5, 1.0, 1.5, 2.0):
        d, _, _ = simulate(p, **sim, rho=rho, wind=k * df[["wind_cross", "wind_along"]].to_numpy())
        wind_rows.append((k, d / FT))
        print("wind scale", k, "train MAE", float(np.nanmean(np.abs(d[tr_mask] / FT - df.hit_distance_sc.to_numpy()[tr_mask]))), flush=True)
    best_k = min(wind_rows, key=lambda kd: np.nanmean(np.abs(kd[1][tr_mask] - df.hit_distance_sc.to_numpy()[tr_mask])))[0]
    d_std, _, _ = simulate(p, **sim, rho=np.full(len(df), 1.2))
    df["phys_calm"] = dict(wind_rows)[0.0]
    df["phys_air"] = dict(wind_rows)[best_k]  # air density and wind, wind scale picked on training years
    df["phys_std"] = d_std / FT
    ok = np.isfinite(df.phys_air) & np.isfinite(df.phys_std) & np.isfinite(df.phys_calm)
    df = df[ok].reset_index(drop=True)

    tr = df[df.game_year <= int(tr_end)]
    te = df[df.game_year >= int(te_from)]
    y = te.hit_distance_sc.to_numpy()
    # does the calm-physics miss line up with wind? (positive along = tailwind, expected to add distance)
    res = tr.hit_distance_sc - tr.phys_calm
    diag = []
    for c in ("wind_along", "wind_cross", "om_wind_mph"):
        diag.append(f"{c}: corr with miss {np.corrcoef(tr[c], res)[0, 1]:+.3f}, slope {np.polyfit(tr[c], res, 1)[0]:+.2f} ft per m/s")
    tail, head = res[tr.wind_along > 3], res[tr.wind_along < -3]
    diag.append(f"Mean miss of the calm physics (MLB minus physics): tailwind over 3 m/s {tail.mean():+.1f} ft ({len(tail):,} balls), "
                f"headwind over 3 m/s {head.mean():+.1f} ft ({len(head):,} balls)")
    print("\n".join(diag), flush=True)
    df.drop(columns=["grp"]).to_parquet(out.replace(".md", "_balls.parquet"))
    rows = [(f"Physics (college fit, college spin teacher), air density and wind (scale {best_k})", float(np.mean(np.abs(te.phys_air - y))), float(np.mean(te.phys_air - y))),
            ("Same physics, air density, calm", float(np.mean(np.abs(te.phys_calm - y))), float(np.mean(te.phys_calm - y))),
            ("Same physics, standard air, calm", float(np.mean(np.abs(te.phys_std - y))), float(np.mean(te.phys_std - y)))]
    # one number fitted on MLB: a scale on the physics distance
    s = float(np.median(tr.hit_distance_sc / tr.phys_air))
    rows.append((f"Physics with one MLB scale factor ({s:.3f})", float(np.mean(np.abs(te.phys_air * s - y))), float(np.mean(te.phys_air * s - y))))

    def gbm(cols, extra=None):
        m = lgb.LGBMRegressor(n_estimators=500, learning_rate=0.05, num_leaves=31, min_child_samples=100, verbose=-1, n_jobs=6)
        m.fit(tr[cols], tr.hit_distance_sc if extra is None else tr.hit_distance_sc - tr[extra])
        pr = m.predict(te[cols])
        return pr if extra is None else pr + te[extra].to_numpy()

    base = ["launch_speed", "launch_angle", "stand_r"]
    wxc = ["air_density", "om_temp_f", "elevation_ft", "wind_along", "wind_cross"]
    base_b = base + ["bearing"]
    for name, pr in [("Boosted trees: contact + bearing", gbm(base_b)), ("Boosted trees: contact + bearing + weather and field-frame wind", gbm(base_b + wxc)),
                     ("Physics + boosted-tree correction (contact + bearing + weather and wind)", gbm(base_b + wxc + ["phys_air"], "phys_air"))]:
        rows.append((name, float(np.mean(np.abs(pr - y))), float(np.mean(pr - y))))

    L = ["# College-to-MLB transfer test", "",
         f"MLB fly balls (launch angle 15-45, exit speed 90+ mph, with projected distance): train {len(tr):,} (through {tr_end}), test {len(te):,} ({te_from} on). "
         "Target: Statcast projected distance. Balls need a landing bearing and a park azimuth; heading is the landing bearing.", "",
         "| Model | MAE (ft) | Mean error (ft) |", "|---|---|---|"]
    L += [f"| {n} | {m:.1f} | {b:+.1f} |" for n, m, b in rows]
    L += ["", "Wind diagnostic (training years):", ""] + [f"- {d}" for d in diag]
    open(out, "w", encoding="utf-8").write("\n".join(L) + "\n")
    print("wrote", out, flush=True)


if __name__ == "__main__":
    main()
