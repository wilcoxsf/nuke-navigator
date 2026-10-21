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
    """Light home-run, fly-ball-distance and landing-bearing models; returns probabilities, distances and bearings for rows te."""
    prm = dict(lgbm_params(False), n_estimators=250, learning_rate=0.1)
    X = df[feats]
    hr = lgb.LGBMClassifier(**prm).fit(X.iloc[tr], T.y[tr]).predict_proba(X.iloc[te])[:, 1]
    td = tr[T.fly[tr]]
    ds = lgb.LGBMRegressor(**prm).fit(X.iloc[td], T.dist[td]).predict(X.iloc[te])
    tb = tr[T.bear_ok[tr]]
    br = lgb.LGBMRegressor(objective="l1", **prm).fit(X.iloc[tb], T.bear[tb]).predict(X.iloc[te])
    return hr, ds, br


def memory(a):
    t0 = time.time()
    df = pd.read_parquet(a.data.replace("\\", "/"))
    T = Targets(df)
    n = len(df)
    nt = np.flatnonzero((df.pool != "test").to_numpy())
    te_idx = np.flatnonzero((df.pool == "test").to_numpy())
    p_hr, d_hat, b_hat = np.full(n, np.nan), np.full(n, np.nan), np.full(n, np.nan)
    for k, (a_, b_) in enumerate(GroupKFold(5).split(nt, groups=df.game_pk.to_numpy()[nt])):
        p_hr[nt[b_]], d_hat[nt[b_]], b_hat[nt[b_]] = quick_fit(df, T, V2, nt[a_], nt[b_])
        print(f"  out-of-fold {k + 1}/5 {time.time() - t0:.0f}s", flush=True)
    p_hr[te_idx], d_hat[te_idx], b_hat[te_idx] = quick_fit(df, T, V2, nt, te_idx)
    # kept for the Oracle calibration stage (not model inputs): out-of-fold for pre-test games, pre-test models for test games
    df["oof_p_hr"], df["oof_d_hat"], df["oof_bearing"] = p_hr, d_hat, b_hat
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
    # player residual memory (H13 batter, H14 pitcher): shrunk mean of the model's fly-ball distance miss over that player's strictly
    # earlier balls, across all earlier games. Split-half reliability of these player means on the test period: batters +0.42 to +0.50, pitchers +0.15 to +0.25.
    for key, k, tag in (("batter", 15.0, "bt"), ("pitcher", 25.0, "pt")):
        grp = df[key].to_numpy()
        s = pd.Series(np.nan_to_num(dres)).groupby(grp).cumsum().to_numpy() - np.nan_to_num(dres)
        c = pd.Series(np.isfinite(dres).astype(float)).groupby(grp).cumsum().to_numpy() - np.isfinite(dres)
        df[f"{tag}_dist_resid"], df[f"{tag}_n"] = s / (c + k), c
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


def oracle(a):
    """Does a small Oracle-Park-only correction on top of the general model help? Fitted on Oracle home games before 2025-06-01
    (out-of-fold probabilities from `memory`), scored on Oracle home games from 2025-06-01 on, paired by game."""
    from sklearn.linear_model import LogisticRegression
    df = pd.read_parquet(a.data.replace("\\", "/"))
    sf = (df.home_team.astype(str) == "SF").to_numpy()
    p = np.clip(df.oof_p_hr.to_numpy(), 1e-6, 1 - 1e-6)
    lg = np.log(p / (1 - p))
    region = df.oof_d_hat.between(300, 460).to_numpy()
    dir_bin = pd.cut(df.oof_bearing, [-91, -25, -10, 10, 25, 91], labels=False).fillna(2).astype(int).to_numpy()
    la_bin = pd.cut(df.launch_angle, [-91, 20, 25, 30, 35, 40, 91], labels=False).fillna(2).astype(int).to_numpy()
    X = np.column_stack([lg, np.eye(5)[dir_bin], np.eye(6)[la_bin]])
    pre = (df.pool != "test").to_numpy()
    tr = sf & pre & region
    te_all = sf & (~pre)
    y = df.y.to_numpy()
    clf = LogisticRegression(C=0.3, max_iter=500).fit(X[tr], y[tr])
    p_corr = p.copy()
    m = te_all & region
    p_corr[m] = clf.predict_proba(X[m])[:, 1]
    e0, e1 = (p - y) ** 2, (p_corr - y) ** 2
    games = df.game_pk.to_numpy()[te_all]
    ug, gi = np.unique(games, return_inverse=True)
    boots = np.random.default_rng(0).multinomial(len(ug), np.ones(len(ug)) / len(ug), size=1000).astype(float)
    d = e1[te_all] - e0[te_all]
    s = np.bincount(gi, weights=d, minlength=len(ug))
    nn = np.bincount(gi, minlength=len(ug)).astype(float)
    ci = np.percentile((boots @ s) / (boots @ nn), [2.5, 97.5])
    dist = df.hit_distance_sc.to_numpy()
    nw = te_all & (dist >= 330) & (dist <= 430)
    L = ["# Oracle Park calibration layer", "",
         f"Fit on {int(tr.sum()):,} Oracle home-game balls before 2025-06-01 whose predicted distance is 300-460 ft; scored on {int(te_all.sum()):,} Oracle home-game balls "
         f"from 2025-06-01 on ({int(nw.sum()):,} near the wall, {len(ug)} games). Inputs: the general model's logit, estimated direction (5 bins), launch angle (6 bins).", "",
         "| Version | Brier, all Oracle test balls | Near the wall |", "|---|---|---|",
         f"| General model | {e0[te_all].mean():.5f} | {e0[nw].mean():.4f} |",
         f"| With the Oracle layer | {e1[te_all].mean():.5f} | {e1[nw].mean():.4f} |", "",
         f"Difference in Brier, all Oracle test balls: {d.mean():+.5f} (95% interval over games {ci[0]:+.5f} to {ci[1]:+.5f}). Negative means the layer helps."]
    Path(a.out).write_text("\n".join(L) + "\n", encoding="utf-8")
    print("\n".join(L))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("stage", choices=["memory", "ceiling", "specialist", "oracle"])
    ap.add_argument("--data", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    {"memory": memory, "ceiling": ceiling, "specialist": specialist, "oracle": oracle}[a.stage](a)


if __name__ == "__main__":
    main()
