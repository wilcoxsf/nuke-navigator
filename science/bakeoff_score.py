"""Score the bake-off: one scoreboard over every entrant's test predictions, a stack fitted on validation only, and paired bootstrap
intervals (resampling whole games) for each entrant against a reference entrant.

Usage: python bakeoff_score.py --data data/derived/bakeoff_features.parquet --pred-dir data/derived/bakeoff --out science/bakeoff_results.md
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.metrics import log_loss, roc_auc_score

REF = "lgbm"


def logit(p):
    p = np.clip(p, 1e-6, 1 - 1e-6)
    return np.log(p / (1 - p))


def ece(y, p, bins=10):
    q = pd.qcut(p, bins, duplicates="drop")
    g = pd.DataFrame({"y": y, "p": p, "q": q}).groupby("q", observed=True).agg(y=("y", "mean"), p=("p", "mean"), n=("y", "size"))
    return float((g.n * (g.y - g.p).abs()).sum() / g.n.sum())


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--pred-dir", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--boot", type=int, default=400)
    a = ap.parse_args()
    df = pd.read_parquet(a.data.replace("\\", "/"), columns=["rid", "split", "y", "hit_distance_sc", "launch_angle", "launch_speed", "home_team", "game_pk"])
    df["home_team"] = df.home_team.astype(str)
    preds = {}
    for f in sorted(Path(a.pred_dir).glob("pred_*.parquet")):
        preds[f.stem[5:]] = pd.read_parquet(f).set_index("rid")
    names = list(preds)
    va = df[df.split == "val"].set_index("rid")
    te = df[df.split == "test"].set_index("rid")

    # stack: logistic on entrant logits, fitted on validation, scored on test
    if len(names) >= 2:
        Xv = np.column_stack([logit(preds[n].loc[va.index, "p_hr"].to_numpy()) for n in names])
        stack = LogisticRegression(C=1.0, max_iter=500).fit(Xv, va.y)
        Xt = np.column_stack([logit(preds[n].loc[te.index, "p_hr"].to_numpy()) for n in names])
        preds["stack"] = pd.DataFrame({"p_hr": stack.predict_proba(Xt)[:, 1]}, index=te.index)
        weights = dict(zip(names, np.round(stack.coef_[0], 3)))
        fly_v = va[(va.launch_angle.between(15, 45)) & (va.launch_speed >= 90) & va.hit_distance_sc.notna()]
        dn = [n for n in names if "d_hat" in preds[n]]
        rg = Ridge(alpha=1.0).fit(np.column_stack([preds[n].loc[fly_v.index, "d_hat"].to_numpy() for n in dn]), fly_v.hit_distance_sc)
        # entrants with no distance outside the physics window (diffphys) give NaN there; only fly balls are scored, so fill with 0
        preds["stack"]["d_hat"] = rg.predict(np.nan_to_num(np.column_stack([preds[n].loc[te.index, "d_hat"].to_numpy() for n in dn])))
    else:
        weights = {}

    near = te.hit_distance_sc.between(330, 430).to_numpy()
    sf = (te.home_team == "SF").to_numpy()
    fly = ((te.launch_angle.between(15, 45)) & (te.launch_speed >= 90) & te.hit_distance_sc.notna()).to_numpy()
    y = te.y.to_numpy()
    games = te.game_pk.to_numpy()
    ug, gi = np.unique(games, return_inverse=True)
    rng = np.random.default_rng(0)
    boots = rng.multinomial(len(ug), np.ones(len(ug)) / len(ug), size=a.boot).astype(float)  # game weights per replicate

    rows, se = [], {}
    for n, p in preds.items():
        pr = p.loc[te.index, "p_hr"].to_numpy()
        e = (pr - y) ** 2
        se[n] = e
        r = {"name": n, "brier": float(e.mean()), "logloss": float(log_loss(y, np.clip(pr, 1e-6, 1 - 1e-6))), "auc": float(roc_auc_score(y, pr)),
             "near": float(e[near].mean()), "sf": float(e[sf].mean()), "ece": ece(y, pr)}
        if "d_hat" in p:
            r["fly_mae"] = float(np.abs(p.loc[te.index, "d_hat"].to_numpy()[fly] - te.hit_distance_sc.to_numpy()[fly]).mean())
        if "d_hat_resid" in p:
            r["fly_mae_resid"] = float(np.nanmean(np.abs(p.loc[te.index, "d_hat_resid"].to_numpy()[fly] - te.hit_distance_sc.to_numpy()[fly])))
        rows.append(r)

    def per_game(e, mask=None):
        m = np.ones(len(e), bool) if mask is None else mask
        return np.bincount(gi[m], weights=e[m], minlength=len(ug)), np.bincount(gi[m], minlength=len(ug)).astype(float)

    ref = REF if REF in se else rows[0]["name"]
    s_ref, n_all = per_game(se[ref])
    s_ref_sf, n_sf = per_game(se[ref], sf)
    for r in rows:
        s, _ = per_game(se[r["name"]])
        d = (boots @ (s - s_ref)) / (boots @ n_all)
        r["d_all"], r["d_lo"], r["d_hi"] = float(d.mean()), float(np.percentile(d, 2.5)), float(np.percentile(d, 97.5))
        s_sf, _ = per_game(se[r["name"]], sf)
        dsf = (boots @ (s_sf - s_ref_sf)) / np.maximum(boots @ n_sf, 1)
        r["dsf"], r["dsf_lo"], r["dsf_hi"] = float(dsf.mean()), float(np.percentile(dsf, 2.5)), float(np.percentile(dsf, 97.5))
    rows.sort(key=lambda r: r["brier"])

    L = ["# Bake-off scoreboard (predict mode, legal features only)", "",
         f"Test: games from 2025-06-01 on ({len(te):,} batted balls, {int(y.sum()):,} home runs, {len(ug):,} games; {int(sf.sum()):,} balls at Oracle Park). "
         f"Train before 2025-03-01, early stopping and the stack fitted on 2025-03-01 to 2025-05-31. Differences are against `{ref}` with a 95% interval from "
         f"{a.boot} resamples of whole games; an interval that excludes zero is a real difference.", "",
         "| Entrant | HR Brier | vs ref (95% CI) | Near-wall Brier | Oracle Park Brier | vs ref at Oracle Park | AUC | Calibration error | Fly-ball distance MAE (ft) |",
         "|---|---|---|---|---|---|---|---|---|"]
    for r in rows:
        mae = f"{r['fly_mae']:.2f}" if "fly_mae" in r else ""
        if "fly_mae_resid" in r:
            mae += f" ({r['fly_mae_resid']:.2f} as physics + correction)"
        L.append(f"| {r['name']} | {r['brier']:.5f} | {r['d_all']:+.5f} ({r['d_lo']:+.5f}, {r['d_hi']:+.5f}) | {r['near']:.4f} | {r['sf']:.5f} | "
                 f"{r['dsf']:+.5f} ({r['dsf_lo']:+.5f}, {r['dsf_hi']:+.5f}) | {r['auc']:.4f} | {r['ece']:.5f} | {mae} |")
    if weights:
        L += ["", "Stack weights on entrant logits (fitted on validation): " + ", ".join(f"{k} {v}" for k, v in weights.items())]
    Path(a.out).write_text("\n".join(L) + "\n", encoding="utf-8")
    Path(a.out.replace(".md", ".json")).write_text(json.dumps({"rows": rows, "stack_weights": {k: float(v) for k, v in weights.items()}}, indent=1))
    print("\n".join(L))


if __name__ == "__main__":
    main()
