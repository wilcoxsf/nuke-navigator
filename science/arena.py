"""Model arena, smoke version. Contact-legal features only; regenerates scoreboard.md.

Usage:
    python arena.py --data <statcast parquet> --weather <weather parquet> --out scoreboard.md
Time split: train <= 2023, validation 2024, test 2025 and later.
"""
from __future__ import annotations

import argparse
import datetime as dt

import duckdb
import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, log_loss, mean_absolute_error, roc_auc_score
from sklearn.preprocessing import StandardScaler

from features import assert_clean

BASE = ["launch_speed", "launch_angle", "stand", "home_team", "weather_temp_f"]
PREDICT_FEATURES = {
    "HR logistic (EV, LA, hand)": ["launch_speed", "launch_angle", "stand"],
    "HR boosted trees": BASE,
    "Distance boosted trees": BASE,
}


def load(data: str, weather: str) -> pd.DataFrame:
    q = f"""
    SELECT s.game_year::INT AS game_year, s.game_pk, s.home_team, s.stand,
           TRY_CAST(s.launch_speed AS DOUBLE) AS launch_speed,
           TRY_CAST(s.launch_angle AS DOUBLE) AS launch_angle,
           TRY_CAST(s.hit_distance_sc AS DOUBLE) AS hit_distance_sc,
           TRY_CAST(s.is_home_run AS DOUBLE) AS is_home_run,
           TRY_CAST(w.weather_temp_f AS DOUBLE) AS weather_temp_f
    FROM read_parquet('{data}') s
    LEFT JOIN read_parquet('{weather}') w USING (game_pk)
    WHERE TRY_CAST(s.launch_speed AS DOUBLE) IS NOT NULL
      AND TRY_CAST(s.launch_angle AS DOUBLE) IS NOT NULL
      AND s.stand IN ('L', 'R') AND s.is_home_run IS NOT NULL
    """
    df = duckdb.sql(q).df()
    df["stand_r"] = (df["stand"] == "R").astype(float)
    df["home_team"] = df["home_team"].astype("category")
    return df


def split(df: pd.DataFrame):
    return df[df.game_year <= 2023], df[df.game_year == 2024], df[df.game_year >= 2025]


def hr_metrics(y, p) -> dict:
    p = np.clip(p, 1e-6, 1 - 1e-6)
    return {"brier": brier_score_loss(y, p), "logloss": log_loss(y, p), "auc": roc_auc_score(y, p)}


def logit_features(d: pd.DataFrame) -> np.ndarray:
    ev, la = d.launch_speed.to_numpy(), d.launch_angle.to_numpy()
    return np.column_stack([ev, la, ev * ev, la * la, ev * la, d.stand_r.to_numpy()])


def run(data: str, weather: str, out: str) -> None:
    for name, cols in PREDICT_FEATURES.items():
        assert_clean(cols, job=name)
    df = load(data, weather)
    tr, va, te = split(df)
    rows = []

    p0 = np.full(len(te), tr.is_home_run.mean())
    rows.append(("HR constant (league rate)", hr_metrics(te.is_home_run, p0)))

    sc = StandardScaler().fit(logit_features(tr))
    lr = LogisticRegression(max_iter=500).fit(sc.transform(logit_features(tr)), tr.is_home_run)
    rows.append(("HR logistic (EV, LA, hand)", hr_metrics(te.is_home_run, lr.predict_proba(sc.transform(logit_features(te)))[:, 1])))

    feats = ["launch_speed", "launch_angle", "stand_r", "home_team", "weather_temp_f"]
    mono = [1, 0, 0, 0, 0]
    gbm = lgb.LGBMClassifier(
        n_estimators=800, learning_rate=0.05, num_leaves=31, min_child_samples=100,
        monotone_constraints=mono, verbose=-1,
    )
    gbm.fit(tr[feats], tr.is_home_run, eval_set=[(va[feats], va.is_home_run)],
            callbacks=[lgb.early_stopping(50, verbose=False)])
    p_te = gbm.predict_proba(te[feats])[:, 1]
    rows.append(("HR boosted trees", hr_metrics(te.is_home_run, p_te)))

    # near-the-wall slice: distance is used only to choose rows to score, never as a feature
    near = te.hit_distance_sc.between(330, 430)
    near_rows = hr_metrics(te.is_home_run[near], p_te[near]) if near.sum() > 500 else None

    # distance regression on balls that have a projected distance
    dtr, dva, dte = (d[d.hit_distance_sc.notna() & (d.hit_distance_sc > 0)] for d in (tr, va, te))
    reg = lgb.LGBMRegressor(n_estimators=800, learning_rate=0.05, num_leaves=63, min_child_samples=100, verbose=-1)
    reg.fit(dtr[feats], dtr.hit_distance_sc, eval_set=[(dva[feats], dva.hit_distance_sc)],
            callbacks=[lgb.early_stopping(50, verbose=False)])
    pred = reg.predict(dte[feats])
    dist_mae = mean_absolute_error(dte.hit_distance_sc, pred)
    base_mae = mean_absolute_error(dte.hit_distance_sc, np.full(len(dte), dtr.hit_distance_sc.mean()))
    no_temp = [f for f in feats if f != "weather_temp_f"]
    reg2 = lgb.LGBMRegressor(n_estimators=800, learning_rate=0.05, num_leaves=63, min_child_samples=100, verbose=-1)
    reg2.fit(dtr[no_temp], dtr.hit_distance_sc, eval_set=[(dva[no_temp], dva.hit_distance_sc)],
             callbacks=[lgb.early_stopping(50, verbose=False)])
    mae_no_temp = mean_absolute_error(dte.hit_distance_sc, reg2.predict(dte[no_temp]))

    lines = [
        "# Arena scoreboard (smoke run)",
        "",
        f"Generated {dt.datetime.now(dt.timezone.utc):%Y-%m-%d %H:%M} UTC. Inputs: contact-legal features only, enforced by `features.py`.",
        f"Rows: train {len(tr):,} (2020-2023), validation {len(va):,} (2024), test {len(te):,} (2025+).",
        "Caveat: this dataset has no launch direction, pitch type, speed, spin or location, and the bat-tracking columns it does have are not used yet, so this is a pipeline check, not a verdict. HR rates here cover all batted balls (about 4.5% are home runs), so these numbers are not comparable to the old four-park 0.06 figures.",
        "",
        "## Home run probability (test)",
        "",
        "| Model | Brier | Log loss | AUC |",
        "|---|---|---|---|",
    ]
    for name, m in rows:
        lines.append(f"| {name} | {m['brier']:.5f} | {m['logloss']:.5f} | {m['auc']:.4f} |")
    if near_rows:
        lines += ["", f"Near-wall slice (projected distance 330-430 ft, n={int(near.sum()):,}) for boosted trees: "
                      f"Brier {near_rows['brier']:.4f}, log loss {near_rows['logloss']:.4f}, AUC {near_rows['auc']:.4f}"]
    lines += [
        "", "## Projected distance (test, balls with a projected distance)", "",
        "| Model | MAE (ft) |", "|---|---|",
        f"| Constant (train mean) | {base_mae:.1f} |",
        f"| Boosted trees, no temperature | {mae_no_temp:.1f} |",
        f"| Boosted trees, with game temperature | {dist_mae:.1f} |",
        f"\nRows with a projected distance in test: {len(dte):,}",
    ]
    open(out, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--weather", required=True)
    ap.add_argument("--out", default="scoreboard.md")
    a = ap.parse_args()
    run(a.data.replace("\\", "/"), a.weather.replace("\\", "/"), a.out)
