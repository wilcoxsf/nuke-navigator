"""T4: does weighting or fine-tuning for Oracle Park help Oracle Park?

Same LightGBM settings and tree count for every variant, so the only difference is how Oracle home games are treated:
  base        every game weight 1
  w3, w10     Oracle home games weighted 3x or 10x in training
  finetune    the base model plus 150 more trees trained on Oracle home games only at a small learning rate
Scored on Oracle home games in the test period (all balls and near the wall) and on every other park, paired by game against `base`.

Usage: FEATSET=v2 python oracle_weight.py --data data/derived/bakeoff_features_v2.parquet --out science/oracle_weight.md
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd

from bakeoff import L4, monotone
from features import assert_clean

THREADS = int(os.environ.get("EXP_THREADS", "10"))


def params(extra=None):
    p = dict(n_estimators=450, learning_rate=0.05, num_leaves=63, min_child_samples=200, subsample=0.8, subsample_freq=1, colsample_bytree=0.7,
             reg_lambda=2.0, monotone_constraints=monotone(L4), n_jobs=THREADS, random_state=0, verbose=-1)
    if extra:
        p.update(extra)
    return p


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    assert_clean(L4, job="oracle_weight")
    df = pd.read_parquet(a.data.replace("\\", "/"))
    tr, te = (df.split == "train").to_numpy(), (df.split == "test").to_numpy()
    sf = (df.home_team.astype(str) == "SF").to_numpy()
    X, y = df[L4], df.y.to_numpy()
    preds = {}
    base = lgb.LGBMClassifier(**params()).fit(X[tr], y[tr])
    preds["base"] = base.predict_proba(X[te])[:, 1]
    for k in (3, 10):
        w = np.where(sf[tr], float(k), 1.0)
        preds[f"w{k}"] = lgb.LGBMClassifier(**params()).fit(X[tr], y[tr], sample_weight=w).predict_proba(X[te])[:, 1]
    ft = lgb.LGBMClassifier(**params(dict(n_estimators=150, learning_rate=0.02))).fit(X[tr & sf], y[tr & sf], init_model=base.booster_)
    preds["finetune"] = ft.predict_proba(X[te])[:, 1]

    yt, games = y[te], df.game_pk.to_numpy()[te]
    dist = df.hit_distance_sc.to_numpy()[te]
    nw = (dist >= 330) & (dist <= 430)
    sft = sf[te]
    ug, gi = np.unique(games, return_inverse=True)
    boots = np.random.default_rng(0).multinomial(len(ug), np.ones(len(ug)) / len(ug), size=1000).astype(float)

    def diff(e1, e0, mask):
        s = np.bincount(gi[mask], weights=(e1 - e0)[mask], minlength=len(ug))
        n = np.bincount(gi[mask], minlength=len(ug)).astype(float)
        d = (boots @ s) / np.maximum(boots @ n, 1)
        return (e1 - e0)[mask].mean(), np.percentile(d, 2.5), np.percentile(d, 97.5)

    e0 = (preds["base"] - yt) ** 2
    L = ["# T4: Oracle Park weighting and fine-tuning", "",
         f"Test: games from 2025-06-01 on. Oracle home games: {int(sft.sum()):,} balls ({int((sft & nw).sum()):,} near the wall); other parks {int((~sft).sum()):,}. "
         "Differences against `base` (negative is better), 95% interval over games.", "",
         "| Variant | Oracle Brier (all) | vs base | Oracle near the wall | vs base | Other parks Brier | vs base |", "|---|---|---|---|---|---|---|"]
    for k, p in preds.items():
        e = (p - yt) ** 2
        d1, d2, d3 = diff(e, e0, sft), diff(e, e0, sft & nw), diff(e, e0, ~sft)
        L.append(f"| {k} | {e[sft].mean():.5f} | {d1[0]:+.5f} ({d1[1]:+.5f}, {d1[2]:+.5f}) | {e[sft & nw].mean():.4f} | {d2[0]:+.4f} ({d2[1]:+.4f}, {d2[2]:+.4f}) | "
                 f"{e[~sft].mean():.5f} | {d3[0]:+.5f} ({d3[1]:+.5f}, {d3[2]:+.5f}) |")
    Path(a.out).write_text("\n".join(L) + "\n", encoding="utf-8")
    print("\n".join(L))


if __name__ == "__main__":
    main()
