"""Model arena. Contact-legal features only (enforced by features.py); regenerates a scoreboard.

Usage:
    python arena.py --data <unified parquet> [--weather <weather parquet>] --out scoreboard.md [--train-from 2015]
Time split: train <= 2023 (from --train-from), validation 2024, test 2025 and later.
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

BASE = ["launch_speed", "launch_angle", "stand", "home_team", "weather_temp_f", "hawkeye"]
PREDICT_FEATURES = {
    "HR logistic (EV, LA, hand)": ["launch_speed", "launch_angle", "stand"],
    "HR boosted trees": BASE,
    "Distance boosted trees": BASE,
}


def load(data: str, weather: str | None) -> pd.DataFrame:
    join = f"LEFT JOIN read_parquet('{weather}') w USING (game_pk)" if weather else ""
    temp = "TRY_CAST(w.weather_temp_f AS DOUBLE)" if weather else "CAST(NULL AS DOUBLE)"
    q = f"""
    SELECT s.game_year::INT AS game_year, s.game_pk, s.home_team, s.stand,
           TRY_CAST(s.launch_speed AS DOUBLE) AS launch_speed,
           TRY_CAST(s.launch_angle AS DOUBLE) AS launch_angle,
           TRY_CAST(s.hit_distance_sc AS DOUBLE) AS hit_distance_sc,
           TRY_CAST(s.is_home_run AS DOUBLE) AS is_home_run,
           CAST(s.hawkeye AS DOUBLE) AS hawkeye,
           {temp} AS weather_temp_f
    FROM read_parquet('{data}') s
    {join}
    WHERE TRY_CAST(s.launch_speed AS DOUBLE) IS NOT NULL
      AND TRY_CAST(s.launch_angle AS DOUBLE) IS NOT NULL
      AND s.stand IN ('L', 'R') AND s.is_home_run IS NOT NULL
    """
    df = duckdb.sql(q).df()
    df["stand_r"] = (df["stand"] == "R").astype(float)
    df["home_team"] = df["home_team"].astype("category")
    return df


def hr_metrics(y, p) -> dict:
    p = np.clip(p, 1e-6, 1 - 1e-6)
    return {"brier": brier_score_loss(y, p), "logloss": log_loss(y, p), "auc": roc_auc_score(y, p)}


def logit_features(d: pd.DataFrame) -> np.ndarray:
    ev, la = d.launch_speed.to_numpy(), d.launch_angle.to_numpy()
    return np.column_stack([ev, la, ev * ev, la * la, ev * la, d.stand_r.to_numpy()])


def run(data: str, weather: str | None, out: str, train_from: int = 2015) -> None:
    for name, cols in PREDICT_FEATURES.items():
        assert_clean(cols, job=name)
    df = load(data, weather)
    tr = df[(df.game_year >= train_from) & (df.game_year <= 2023)]
    va = df[df.game_year == 2024]
    te = df[df.game_year >= 2025]
    rows = []

    rows.append(("HR constant (league rate)", hr_metrics(te.is_home_run, np.full(len(te), tr.is_home_run.mean()))))

    sc = StandardScaler().fit(logit_features(tr))
    lr = LogisticRegression(max_iter=500).fit(sc.transform(logit_features(tr)), tr.is_home_run)
    rows.append(("HR logistic (EV, LA, hand)", hr_metrics(te.is_home_run, lr.predict_proba(sc.transform(logit_features(te)))[:, 1])))

    feats = ["launch_speed", "launch_angle", "stand_r", "home_team", "weather_temp_f", "hawkeye"]
    if tr.hawkeye.nunique() < 2:
        feats.remove("hawkeye")
    mono = [1 if f == "launch_speed" else 0 for f in feats]
    gbm = lgb.LGBMClassifier(n_estimators=800, learning_rate=0.05, num_leaves=31, min_child_samples=100,
                             monotone_constraints=mono, verbose=-1)
    gbm.fit(tr[feats], tr.is_home_run, eval_set=[(va[feats], va.is_home_run)], callbacks=[lgb.early_stopping(50, verbose=False)])
    p_te = gbm.predict_proba(te[feats])[:, 1]
    rows.append(("HR boosted trees", hr_metrics(te.is_home_run, p_te)))

    # near-the-wall slice: distance only chooses which rows to score, never a feature
    near = te.hit_distance_sc.between(330, 430)
    near_rows = hr_metrics(te.is_home_run[near], p_te[near]) if near.sum() > 500 else None

    dtr, dva, dte = (d[d.hit_distance_sc.notna() & (d.hit_distance_sc > 0)] for d in (tr, va, te))
    reg = lgb.LGBMRegressor(n_estimators=800, learning_rate=0.05, num_leaves=63, min_child_samples=100, verbose=-1)
    reg.fit(dtr[feats], dtr.hit_distance_sc, eval_set=[(dva[feats], dva.hit_distance_sc)], callbacks=[lgb.early_stopping(50, verbose=False)])
    dist_mae = mean_absolute_error(dte.hit_distance_sc, reg.predict(dte[feats]))
    base_mae = mean_absolute_error(dte.hit_distance_sc, np.full(len(dte), dtr.hit_distance_sc.mean()))
    fly = (dte.launch_angle.between(15, 45)) & (dte.launch_speed >= 90)
    fly_mae = mean_absolute_error(dte.hit_distance_sc[fly], reg.predict(dte[feats])[fly])

    lines = [
        f"# Arena scoreboard: train from {train_from}",
        "",
        f"Generated {dt.datetime.now(dt.timezone.utc):%Y-%m-%d %H:%M} UTC. Contact-legal features only, enforced by `features.py`.",
        f"Rows: train {len(tr):,} ({train_from}-2023), validation {len(va):,} (2024), test {len(te):,} (2025+).",
        "No launch direction, pitch information or bat tracking is used yet, so this is a baseline, not a verdict. "
        "HR rates cover all batted balls (about 4.5% are home runs), so these are not comparable to the old four-park 0.06 figures.",
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
        "", "## Projected distance (test)", "",
        "| Model | MAE (ft) |", "|---|---|",
        f"| Constant (train mean) | {base_mae:.1f} |",
        f"| Boosted trees | {dist_mae:.1f} |",
        f"| Boosted trees, fly balls only (LA 15-45, EV 90+), n={int(fly.sum()):,} | {fly_mae:.1f} |",
    ]
    open(out, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--weather")
    ap.add_argument("--out", default="scoreboard.md")
    ap.add_argument("--train-from", type=int, default=2015)
    a = ap.parse_args()
    run(a.data.replace("\\", "/"), a.weather.replace("\\", "/") if a.weather else None, a.out, a.train_from)
