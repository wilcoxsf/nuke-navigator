"""Round-3 stages that sit next to the feature sweep.

  memory      H12 feature builder: in-game residual memory. For every ball, the shrunk mean (and a decayed mean) of how far the
              out-of-fold model missed on strictly EARLIER balls of the same game, for fly-ball distance and for home-run probability.
              Residual models for pre-test games are out of fold by game; residual models for test-period games are trained on
              pre-test games only, so no test label reaches a test feature except through earlier balls of the same game, which is
              what a live system would have.
  ceiling     diagnostic: the same model given the true landing bearing, then the true bearing and projected distance (both leaky,
              reconstruct-mode only). Shows how far the legal model is from perfect direction and distance.
  specialist  a home-run model trained only on the balls that carry nearly all the loss (exit speed 85+, launch angle 10-50),
              compared with the general model and their average.

Usage: python round3.py memory|ceiling|specialist --data data/derived/exp_features.parquet [--out ...]
"""
from __future__ import annotations

import argparse
import time
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold

from experiments import BASE, HID, Targets, lgbm_params

V2 = BASE + HID["H1"]["cols"] + HID["H4"]["cols"]
K_DIST, K_HR, DECAY = 3.0, 10.0, 0.85


def quick_fit(df, T, feats, tr, te):
    """Light home-run and fly-ball-distance models; returns probabilities and distances for rows te."""
    prm = dict(lgbm_params(False), n_estimators=250, learning_rate=0.1)
    X = df[feats]
    hr = lgb.LGBMClassifier(**prm).fit(X.iloc[tr], T.y[tr]).predict_proba(X.iloc[te])[:, 1]
    td = tr[T.fly[tr]]
    ds = lgb.LGBMRegressor(**prm).fit(X.iloc[td], T.dist[td]).predict(X.iloc[te])
    return hr, ds


def memory(a):
    t0 = time.time()
    df = pd.read_parquet(a.data.replace("\\", "/"))
    T = Targets(df)
    n = len(df)
    nt = np.flatnonzero((df.pool != "test").to_numpy())
    te_idx = np.flatnonzero((df.pool == "test").to_numpy())
    p_hr, d_hat = np.full(n, np.nan), np.full(n, np.nan)
    for k, (a_, b_) in enumerate(GroupKFold(5).split(nt, groups=df.game_pk.to_numpy()[nt])):
        p_hr[nt[b_]], d_hat[nt[b_]] = quick_fit(df, T, V2, nt[a_], nt[b_])
        print(f"  out-of-fold {k + 1}/5 {time.time() - t0:.0f}s", flush=True)
    p_hr[te_idx], d_hat[te_idx] = quick_fit(df, T, V2, nt, te_idx)
    print(f"  test rows from pre-test models {time.time() - t0:.0f}s", flush=True)

    region = ((df.launch_speed >= 85) & df.launch_angle.between(10, 50)).to_numpy()
    dres = np.where(T.fly, T.dist - d_hat, np.nan)
    hres = np.where(region, T.y - p_hr, np.nan)
    game = df.game_pk.to_numpy()

    def prior_mean(res, k):
        s = pd.Series(np.nan_to_num(res)).groupby(game).cumsum().to_numpy() - np.nan_to_num(res)
        c = pd.Series(np.isfinite(res).astype(float)).groupby(game).cumsum().to_numpy() - np.isfinite(res)
        return s / (c + k), c

    df["gm_dist_resid"], df["gm_n"] = prior_mean(dres, K_DIST)
    df["gm_hr_resid"], _ = prior_mean(hres, K_HR)
    ew = np.zeros(n)
    m = w = 0.0
    last = -1
    for i in range(n):  # decayed mean of earlier fly-ball misses; resets at each new game
        if game[i] != last:
            m = w = 0.0
            last = game[i]
        ew[i] = m / (w + K_DIST)
        if np.isfinite(dres[i]):
            m, w = m * DECAY + dres[i], w * DECAY + 1.0
    df["gm_dist_ewm"] = ew
    df.to_parquet(a.out.replace("\\", "/"))
    chk = df.loc[T.fly, ["gm_dist_resid", "gm_n"]].assign(res=dres[T.fly])
    chk = chk[chk.gm_n >= 3]
    print(f"balls with 3+ earlier fly balls: {len(chk):,}; correlation of memory with the ball's own miss {np.corrcoef(chk.gm_dist_resid, chk.res)[0, 1]:+.3f}")
    print("wrote", a.out, f"{time.time() - t0:.0f}s", flush=True)


def clf_strong(df, T, feats, tr, extra=None):
    prm = lgbm_params(True)
    if extra:
        prm.update(extra)
    return lgb.LGBMClassifier(**prm).fit(df[feats].iloc[tr], T.y[tr])


def scores(df, T, te, p):
    y = T.y[te]
    near = df.hit_distance_sc.to_numpy()[te]
    near = (near >= 330) & (near <= 430)
    sf = df.home_team.astype(str).to_numpy()[te] == "SF"
    e = (p - y) ** 2
    return e.mean(), e[near].mean(), e[sf].mean()


def ceiling(a):
    df = pd.read_parquet(a.data.replace("\\", "/"))
    T = Targets(df)
    tr, te = np.flatnonzero((df.pool != "test").to_numpy()), np.flatnonzero((df.pool == "test").to_numpy())
    rows = []
    for name, feats in [("Legal features (round-2 set)", V2), ("+ true landing bearing (leaky)", V2 + ["bearing"]),
                        ("+ true bearing and projected distance (leaky)", V2 + ["bearing", "hit_distance_sc"])]:
        p = clf_strong(df, T, feats, tr).predict_proba(df[feats].iloc[te])[:, 1]
        rows.append((name,) + scores(df, T, te, p))
        print(rows[-1], flush=True)
    base = rows[0][1]
    L = ["# Ceiling diagnostic", "", f"Train: every game before 2025-06-01. Test: 2025-06-01 on ({len(te):,} balls). HR Brier, lower is better. The two leaky rows use "
         "information a prediction cannot have; they bound what better direction and distance estimates could buy.", "",
         "| Model | HR Brier | Near the wall (330-430 ft) | Oracle Park | Brier change vs the legal model |", "|---|---|---|---|---|"]
    for i, (n_, b, nw, sf) in enumerate(rows):
        L.append(f"| {n_} | {b:.5f} | {nw:.4f} | {sf:.5f} | {'' if i == 0 else f'{(b - base) / base:+.1%}'} |")
    Path(a.out).write_text("\n".join(L) + "\n", encoding="utf-8")
    print("\n".join(L))


def specialist(a):
    df = pd.read_parquet(a.data.replace("\\", "/"))
    T = Targets(df)
    tr, te = np.flatnonzero((df.pool != "test").to_numpy()), np.flatnonzero((df.pool == "test").to_numpy())
    region = ((df.launch_speed >= 85) & df.launch_angle.between(10, 50)).to_numpy()
    gen = clf_strong(df, T, V2, tr).predict_proba(df[V2].iloc[te])[:, 1]
    tr_r = tr[region[tr]]
    spec = clf_strong(df, T, V2, tr_r, dict(num_leaves=127, min_child_samples=50, n_estimators=900, learning_rate=0.04)).predict_proba(df[V2].iloc[te])[:, 1]
    inr = region[te]
    p_spec = np.where(inr, spec, gen)
    p_avg = np.where(inr, 0.5 * (spec + gen), gen)
    rows = [("General model", gen), ("Specialist on the 85+ mph, 10-50 degree region", p_spec), ("Average of the two in the region", p_avg)]
    L = ["# Near-wall specialist", "", f"Region: exit speed 85+ mph and launch angle 10-50 degrees ({region[tr].mean():.1%} of training balls, "
         f"{100 * T.y[tr][region[tr]].sum() / T.y[tr].sum():.1f}% of training home runs). Test: {len(te):,} balls from 2025-06-01.", "",
         "| Model | HR Brier | Near the wall | Oracle Park |", "|---|---|---|---|"]
    for n_, p in rows:
        b, nw, sf = scores(df, T, te, p)
        L.append(f"| {n_} | {b:.5f} | {nw:.4f} | {sf:.5f} |")
    Path(a.out).write_text("\n".join(L) + "\n", encoding="utf-8")
    print("\n".join(L))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("stage", choices=["memory", "ceiling", "specialist"])
    ap.add_argument("--data", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    {"memory": memory, "ceiling": ceiling, "specialist": specialist}[a.stage](a)


if __name__ == "__main__":
    main()
