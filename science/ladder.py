"""Information ladder: how much does each source of legal information improve home-run and distance prediction?

Rungs (each adds to the previous):
  L0 contact: exit speed, launch angle, handedness, park, tracking system
  L1 + weather: Open-Meteo temperature, humidity, pressure, wind, air density, elevation, roof
  L2 + pitch: type, speed, spin, location, movement, count
  L3 + history: batter and pitcher rolling form (previous 100/200 batted balls), including pull tendency
  L4 + direction: bearing_hat, a launch-direction estimate distilled from legal features (out-of-fold)
References (LEAKY, never allowed in a Predicted model; they show the ceiling for reconstructing a ball that already landed):
  R1 L4 + true landing bearing    R2 R1 + projected distance
Bat tracking (2023 on) is tested separately on a late-2024 to 2025 split.

Usage: python ladder.py --bbe <parquet> --games <parquet> --weather <parquet> --out ladder_results.md
"""
from __future__ import annotations

import argparse
import datetime as dt
import json

import duckdb
import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.metrics import brier_score_loss, log_loss, mean_absolute_error, roc_auc_score
from sklearn.model_selection import GroupKFold

from features import assert_clean

BASE0 = ["launch_speed", "launch_angle", "stand_r", "home_team", "hawkeye"]
WX = ["om_temp_f", "om_rh", "om_pressure_hpa", "air_density", "om_wind_u", "om_wind_v", "om_wind_mph", "om_gust_mph",
      "om_precip_mm", "elevation_ft", "roof", "turf"]
PITCH = ["pitch_type", "release_speed", "release_spin_rate", "spin_axis", "effective_speed", "release_extension",
         "plate_x", "plate_z", "pfx_x", "pfx_z", "p_throws", "balls", "strikes", "zone"]
HIST = ["b_ev", "b_la", "b_hr", "b_hard", "b_pull", "b_n", "p_ev", "p_hr"]
BAT = ["bat_speed", "swing_length", "attack_angle", "attack_direction", "swing_path_tilt", "b_bat_speed"]
CATS = ["home_team", "roof", "turf", "pitch_type", "p_throws"]

SQL = """
WITH g AS (
  SELECT DISTINCT ON (game_pk) game_pk, venue_id, elevation_ft, roof, turf
  FROM read_parquet('{games}') ORDER BY game_pk, official_date DESC),
base AS (
  SELECT b.*, g.venue_id, g.elevation_ft, g.roof, g.turf,
         w.om_temp_f, w.om_rh, w.om_pressure_hpa, w.om_wind_u, w.om_wind_v, w.om_wind_mph, w.om_gust_mph, w.om_precip_mm,
         CASE WHEN b.hc_x IS NOT NULL AND b.hc_y IS NOT NULL THEN degrees(atan2(b.hc_x - 125.42, 198.27 - b.hc_y)) END AS bearing
  FROM read_parquet('{bbe}') b
  LEFT JOIN g USING (game_pk)
  LEFT JOIN read_parquet('{weather}') w USING (game_pk)
  WHERE b.launch_speed IS NOT NULL AND b.launch_angle IS NOT NULL AND b.stand IN ('L', 'R') AND b.is_home_run IS NOT NULL),
base2 AS (SELECT *, CASE WHEN stand = 'R' THEN -bearing ELSE bearing END AS pull_angle FROM base)
SELECT *,
  avg(launch_speed) OVER bw AS b_ev, avg(launch_angle) OVER bw AS b_la,
  avg(CASE WHEN is_home_run THEN 1.0 ELSE 0.0 END) OVER bw AS b_hr,
  avg(CASE WHEN launch_speed >= 95 THEN 1.0 ELSE 0.0 END) OVER bw AS b_hard,
  avg(pull_angle) OVER bw AS b_pull, count(*) OVER bw AS b_n, avg(bat_speed) OVER bw AS b_bat_speed,
  avg(launch_speed) OVER pw AS p_ev, avg(CASE WHEN is_home_run THEN 1.0 ELSE 0.0 END) OVER pw AS p_hr
FROM base2
WINDOW bw AS (PARTITION BY batter ORDER BY game_date, game_pk, at_bat_number ROWS BETWEEN 100 PRECEDING AND 1 PRECEDING),
       pw AS (PARTITION BY pitcher ORDER BY game_date, game_pk, at_bat_number ROWS BETWEEN 200 PRECEDING AND 1 PRECEDING)
"""


def load(bbe: str, games: str, weather: str) -> pd.DataFrame:
    df = duckdb.sql(SQL.format(bbe=bbe, games=games, weather=weather)).df()
    df["stand_r"] = (df["stand"] == "R").astype(float)
    df["hawkeye"] = df["hawkeye"].astype(float)
    df["y"] = df["is_home_run"].astype(float)
    t = (df["om_temp_f"] - 32) * 5 / 9
    tk = t + 273.15
    pv = df["om_rh"] / 100 * 6.1078 * 10 ** (7.5 * t / (t + 237.3))  # vapour pressure, hPa
    df["air_density"] = ((df["om_pressure_hpa"] - pv) * 100 / (287.058 * tk) + pv * 100 / (461.495 * tk))
    for c in CATS:
        df[c] = df[c].astype("category")
    return df


def metrics(y, p) -> dict:
    p = np.clip(p, 1e-6, 1 - 1e-6)
    return {"brier": float(brier_score_loss(y, p)), "logloss": float(log_loss(y, p)), "auc": float(roc_auc_score(y, p))}


def check(feats: list[str], reference: bool = False) -> None:
    if not reference:
        assert_clean(feats, job="ladder")


def fit_clf(tr, va, feats, seed=0):
    mono = [1 if f == "launch_speed" else 0 for f in feats]
    m = lgb.LGBMClassifier(n_estimators=700, learning_rate=0.07, num_leaves=63, min_child_samples=200, subsample=0.8,
                           subsample_freq=1, colsample_bytree=0.8, reg_lambda=2.0, monotone_constraints=mono,
                           n_jobs=10, random_state=seed, verbose=-1)
    m.fit(tr[feats], tr["y"], eval_set=[(va[feats], va["y"])], callbacks=[lgb.early_stopping(40, verbose=False)])
    return m


def fit_reg(tr, va, feats, target, seed=0):
    m = lgb.LGBMRegressor(n_estimators=700, learning_rate=0.07, num_leaves=63, min_child_samples=200, subsample=0.8,
                          subsample_freq=1, colsample_bytree=0.8, reg_lambda=2.0, n_jobs=10, random_state=seed, verbose=-1)
    m.fit(tr[feats], tr[target], eval_set=[(va[feats], va[target])], callbacks=[lgb.early_stopping(40, verbose=False)])
    return m


def add_bearing_hat(df, tr_mask, other_masks, feats):
    """Out-of-fold launch-direction estimate from legal features. Target (landing bearing) is used only as a label."""
    check(feats)
    df["bearing_hat"] = np.nan
    ok = df["bearing"].notna()
    tr = df[tr_mask & ok]
    oof = np.full(len(tr), np.nan)
    models = []
    for k, (a, b) in enumerate(GroupKFold(5).split(tr, groups=tr["game_pk"])):
        m = lgb.LGBMRegressor(n_estimators=400, learning_rate=0.08, num_leaves=63, min_child_samples=200, subsample=0.8,
                              subsample_freq=1, colsample_bytree=0.8, n_jobs=10, random_state=k, verbose=-1)
        m.fit(tr.iloc[a][feats], tr.iloc[a]["bearing"])
        oof[b] = m.predict(tr.iloc[b][feats])
        models.append(m)
    df.loc[tr.index, "bearing_hat"] = oof
    rest = ~tr_mask
    df.loc[rest, "bearing_hat"] = np.mean([m.predict(df.loc[rest, feats]) for m in models], axis=0)
    te = other_masks[-1] & ok
    err = mean_absolute_error(df.loc[te, "bearing"], df.loc[te, "bearing_hat"])
    base = mean_absolute_error(df.loc[te, "bearing"], np.full(te.sum(), df.loc[tr_mask & ok, "bearing"].mean()))
    sd = df.loc[te, "bearing"].std()
    r2 = 1 - ((df.loc[te, "bearing"] - df.loc[te, "bearing_hat"]) ** 2).mean() / sd**2
    return {"bearing_mae_deg": err, "bearing_mae_constant_deg": base, "bearing_r2": r2}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--bbe", required=True)
    ap.add_argument("--games", required=True)
    ap.add_argument("--weather", required=True)
    ap.add_argument("--out", default="ladder_results.md")
    ap.add_argument("--train-end", type=int, default=2023)
    ap.add_argument("--val-year", type=int, default=2024)
    ap.add_argument("--test-from", type=int, default=2025)
    ap.add_argument("--sample", type=float, default=1.0, help="fraction of training rows (for quick tests)")
    a = ap.parse_args()

    df = load(a.bbe.replace("\\", "/"), a.games.replace("\\", "/"), a.weather.replace("\\", "/"))
    print("rows", len(df), "years", int(df.game_year.min()), "-", int(df.game_year.max()), flush=True)
    trm = df["game_year"] <= a.train_end
    vam = df["game_year"] == a.val_year
    tem = df["game_year"] >= a.test_from
    if a.sample < 1:
        keep = (~trm) | (np.random.default_rng(0).random(len(df)) < a.sample)
        df, trm, vam, tem = df[keep].reset_index(drop=True), trm[keep].reset_index(drop=True), vam[keep].reset_index(drop=True), tem[keep].reset_index(drop=True)
    notes = {}
    notes.update(add_bearing_hat(df, trm.to_numpy(), [vam.to_numpy(), tem.to_numpy()], BASE0 + PITCH + HIST + WX))
    print("bearing model:", {k: round(v, 3) for k, v in notes.items()}, flush=True)

    tr, va, te = df[trm], df[vam], df[tem]
    near = te["hit_distance_sc"].between(330, 430)
    sf = te["home_team"] == "SF"
    fly = te["launch_angle"].between(15, 45) & (te["launch_speed"] >= 90) & te["hit_distance_sc"].notna()

    rungs = [("L0 contact", BASE0, False), ("L1 + weather", BASE0 + WX, False), ("L2 + pitch", BASE0 + WX + PITCH, False),
             ("L3 + history", BASE0 + WX + PITCH + HIST, False), ("L4 + direction estimate", BASE0 + WX + PITCH + HIST + ["bearing_hat"], False),
             ("R1 LEAKY: L4 + true bearing", BASE0 + WX + PITCH + HIST + ["bearing_hat", "bearing"], True),
             ("R2 LEAKY: R1 + projected distance", BASE0 + WX + PITCH + HIST + ["bearing_hat", "bearing", "hit_distance_sc"], True)]
    results = []
    best_model = None
    for name, feats, ref in rungs:
        check(feats, reference=ref)
        m = fit_clf(tr, va, feats)
        p = m.predict_proba(te[feats])[:, 1]
        r = {"name": name, "n_features": len(feats), "trees": int(m.best_iteration_ or m.n_estimators), **metrics(te["y"], p),
             "near_brier": float(brier_score_loss(te["y"][near], p[near])), "sf_brier": float(brier_score_loss(te["y"][sf], p[sf]))}
        if not ref:
            dm = fit_reg(tr[tr["hit_distance_sc"].notna()], va[va["hit_distance_sc"].notna()],
                         [f for f in feats if f != "bearing"], "hit_distance_sc")
            r["fly_mae_ft"] = float(mean_absolute_error(te.loc[fly, "hit_distance_sc"], dm.predict(te.loc[fly, [f for f in feats if f != "bearing"]])))
            best_model = (name, m, feats)
        results.append(r)
        print({k: (round(v, 5) if isinstance(v, float) else v) for k, v in r.items()}, flush=True)

    imp = pd.Series(best_model[1].booster_.feature_importance("gain"), index=best_model[2]).sort_values(ascending=False)
    imp = (imp / imp.sum() * 100).round(1)

    # bat tracking: separate late split
    bt = df[df["game_date"] >= pd.Timestamp("2024-01-01")]
    cut = pd.Timestamp("2025-06-01")
    btr, bte = bt[bt["game_date"] < cut], bt[bt["game_date"] >= cut]
    bva = btr[btr["game_date"] >= pd.Timestamp("2025-03-01")]
    btr = btr[btr["game_date"] < pd.Timestamp("2025-03-01")]
    base_f = BASE0 + WX + PITCH + HIST + ["bearing_hat"]
    bat_rows = []
    for name, feats in [("same split, no bat tracking", base_f), ("same split, + bat tracking", base_f + BAT)]:
        check(feats)
        m = fit_clf(btr, bva, feats)
        p = m.predict_proba(bte[feats])[:, 1]
        nb = bte["hit_distance_sc"].between(330, 430)
        bat_rows.append({"name": name, **metrics(bte["y"], p), "near_brier": float(brier_score_loss(bte["y"][nb], p[nb]))})
        print(bat_rows[-1], flush=True)

    base = results[0]
    lines = [
        "# Information ladder", "",
        f"Generated {dt.datetime.now(dt.timezone.utc):%Y-%m-%d %H:%M} UTC. Train {int(df.game_year.min())}-{a.train_end} ({len(tr):,} rows), "
        f"validation {a.val_year}, test {a.test_from}+ ({len(te):,} rows). Test years all have Hawk-Eye tracking.", "",
        "Brier lower is better. 'Near wall' = projected distance 330-430 ft. 'SF home' = games at Oracle Park.", "",
        "| Rung | Features | HR Brier | Δ vs L0 | Near-wall Brier | SF-home Brier | AUC | Fly-ball distance MAE |", "|---|---|---|---|---|---|---|---|"]
    for r in results:
        d = r["brier"] - base["brier"]
        lines.append(f"| {r['name']} | {r['n_features']} | {r['brier']:.5f} | {d:+.5f} ({100 * d / base['brier']:+.1f}%) | "
                     f"{r['near_brier']:.4f} | {r['sf_brier']:.5f} | {r['auc']:.4f} | {r.get('fly_mae_ft', float('nan')):.1f} ft |")
    lines += ["", "## Launch direction estimate (legal features only)", "",
              f"Landing bearing MAE {notes['bearing_mae_deg']:.2f} degrees versus {notes['bearing_mae_constant_deg']:.2f} for a constant; R2 {notes['bearing_r2']:.3f}.", "",
              "## Bat tracking (train 2024 to Feb 2025, validate Mar-May 2025, test Jun 2025 on)", "",
              "| Setup | HR Brier | Near-wall Brier | AUC |", "|---|---|---|---|"]
    for r in bat_rows:
        lines.append(f"| {r['name']} | {r['brier']:.5f} | {r['near_brier']:.4f} | {r['auc']:.4f} |")
    lines += ["", f"## What the best legal model leans on ({best_model[0]}, share of gain %)", ""]
    lines += [f"- {k}: {v}" for k, v in imp.head(15).items()]
    open(a.out, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    json.dump({"rungs": results, "bat": bat_rows, "notes": notes, "importance": imp.to_dict()}, open(a.out.replace(".md", ".json"), "w"), indent=1)
    print("\n".join(lines))


if __name__ == "__main__":
    main()
