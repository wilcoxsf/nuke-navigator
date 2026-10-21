"""T2: can a better dedicated direction model sharpen the landing-bearing estimate where it matters (balls at 330-430 ft)?

Configurations (all predict the landing bearing from legal features; the bearing is only ever a label):
  C0  current production model: LightGBM, L1 loss, trained on every ball
  C1  same model trained only on the balls that can leave the park (exit speed 70+ mph, launch angle 8-55 degrees)
  C2  C1 plus extra inputs: approach angles, plate location signed by batter hand, sine and cosine of the attack direction
  C3  C2 with a larger, slower, early-stopped model
  C4  XGBoost (absolute-error loss) on the C2 inputs
  C5  average of C3 and C4
Selected on the validation slice (2025-03-01 to 2025-05-31) near-wall error; reported on the test slice (2025-06-01 on) with a paired bootstrap
by game against C0.

Usage: python direction_lab.py --data data/derived/exp_features.parquet --out science/direction_lab.md
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd
import pyarrow.parquet as pq

from experiments import HID
from ladder import BASE0, BAT, HIST, PITCH, WX

THREADS = int(os.environ.get("EXP_THREADS", "10"))
F0 = BASE0 + PITCH + HIST + WX + BAT + HID["H1"]["cols"] + HID["H4"]["cols"]
EXTRA = ["vaa", "haa", "plate_x_hand", "ad_sin", "ad_cos"]
CATS = ["home_team", "roof", "turf", "pitch_type", "p_throws"]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    path = a.data.replace("\\", "/")
    need = sorted(set(F0) | {"vaa", "haa", "plate_x", "attack_direction", "stand_r", "bearing", "hit_distance_sc", "launch_speed", "launch_angle", "game_date", "game_pk"})
    df = pd.read_parquet(path, columns=[c for c in need if c in set(pq.read_schema(path).names)])
    for c in df.select_dtypes("float64").columns:
        df[c] = df[c].astype("float32")
    hand = np.where(df.stand_r == 1, 1.0, -1.0).astype("float32")
    df["plate_x_hand"] = df.plate_x * hand
    ang = np.deg2rad(df.attack_direction.astype("float32"))
    df["ad_sin"], df["ad_cos"] = np.sin(ang), np.cos(ang)
    tr = (df.game_date < "2025-03-01").to_numpy()
    va = ((df.game_date >= "2025-03-01") & (df.game_date < "2025-06-01")).to_numpy()
    te = (df.game_date >= "2025-06-01").to_numpy()
    ok = df.bearing.notna().to_numpy()
    region = ((df.launch_speed >= 70) & df.launch_angle.between(8, 55)).to_numpy()
    near = df.hit_distance_sc.between(330, 430).to_numpy()
    y = df.bearing.to_numpy()
    print(f"train {int((tr & ok).sum()):,} (region {int((tr & ok & region).sum()):,}), val {int((va & ok).sum()):,}, test {int((te & ok).sum()):,}", flush=True)

    base = dict(objective="l1", n_estimators=400, learning_rate=0.08, num_leaves=63, min_child_samples=200, subsample=0.8, subsample_freq=1,
                colsample_bytree=0.8, n_jobs=THREADS, verbose=-1, random_state=0)
    preds = {}

    def lgbfit(feats, mask, params, es=False):
        m = lgb.LGBMRegressor(**params)
        kw = {}
        if es:
            kw = dict(eval_set=[(df.loc[va & ok & region, feats], y[va & ok & region])], callbacks=[lgb.early_stopping(80, verbose=False)])
        m.fit(df.loc[mask, feats], y[mask], **kw)
        return m.predict(df[feats])

    preds["C0 current (all balls)"] = lgbfit(F0, tr & ok, base)
    print("C0 done", flush=True)
    preds["C1 region balls only"] = lgbfit(F0, tr & ok & region, base)
    print("C1 done", flush=True)
    preds["C2 + approach, plate, attack-direction trig"] = lgbfit(F0 + EXTRA, tr & ok & region, base)
    print("C2 done", flush=True)
    big = dict(base, n_estimators=2500, learning_rate=0.03, num_leaves=127, min_child_samples=100)
    preds["C3 larger, slower, early-stopped"] = lgbfit(F0 + EXTRA, tr & ok & region, big, es=True)
    print("C3 done", flush=True)
    import xgboost as xgb
    X = df[F0 + EXTRA]
    xm = xgb.XGBRegressor(tree_method="hist", enable_categorical=True, objective="reg:absoluteerror", n_estimators=2500, learning_rate=0.05, max_depth=8,
                          min_child_weight=50, subsample=0.8, colsample_bytree=0.7, n_jobs=THREADS, early_stopping_rounds=80)
    xm.fit(X[tr & ok & region], y[tr & ok & region], eval_set=[(X[va & ok & region], y[va & ok & region])], verbose=False)
    preds["C4 XGBoost"] = xm.predict(X)
    print("C4 done", flush=True)
    preds["C5 average of C3 and C4"] = 0.5 * (preds["C3 larger, slower, early-stopped"] + preds["C4 XGBoost"])

    games = df.game_pk.to_numpy()[te & ok & near]
    ug, gi = np.unique(games, return_inverse=True)
    boots = np.random.default_rng(0).multinomial(len(ug), np.ones(len(ug)) / len(ug), size=1000).astype(float)
    e0 = np.abs(preds["C0 current (all balls)"] - y)
    L = ["# T2: direction model lab", "", f"Near-wall = projected distance 330-430 ft with a known landing bearing. Validation {int((va & ok & near).sum()):,} balls, test {int((te & ok & near).sum()):,} balls. "
         "Errors are in degrees of landing bearing. Difference is against C0 on the test slice, 95% interval over games (negative is better).", "",
         "| Configuration | Val near-wall MAE | Test near-wall MAE | Test median | Test 90th pct | Change vs C0 (95% interval) | Test fly-ball MAE |", "|---|---|---|---|---|---|---|"]
    best = None
    fly = ((df.launch_angle.between(15, 45)) & (df.launch_speed >= 90)).to_numpy()
    for name, p in preds.items():
        e = np.abs(p - y)
        m = te & ok & near
        d = (e - e0)[m]
        s = np.bincount(gi, weights=d, minlength=len(ug))
        n = np.bincount(gi, minlength=len(ug)).astype(float)
        bd = (boots @ s) / np.maximum(boots @ n, 1)
        L.append(f"| {name} | {e[va & ok & near].mean():.3f} | {e[m].mean():.3f} | {np.median(e[m]):.2f} | {np.percentile(e[m], 90):.1f} | {d.mean():+.3f} ({np.percentile(bd, 2.5):+.3f}, {np.percentile(bd, 97.5):+.3f}) | {e[te & ok & fly].mean():.3f} |")
        v = e[va & ok & near].mean()
        if best is None or v < best[1]:
            best = (name, v)
    L += ["", f"Best on validation: {best[0]}."]
    Path(a.out).write_text("\n".join(L) + "\n", encoding="utf-8")
    Path(a.out).with_suffix(".json").write_text(json.dumps({"best_on_validation": best[0]}))
    print("\n".join(L))


if __name__ == "__main__":
    main()
