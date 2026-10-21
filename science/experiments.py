"""Round-2 feature sweep: hypothesis driven, screened on a grouped CV of the bat-tracking era, confirmed once on the test period.

Each hypothesis adds one feature group (or a training-weight scheme) to the baseline and is scored on three targets with the same
folds: home-run Brier, landing-direction error (bearing, degrees) and fly-ball distance error (feet). Differences are paired by game
and bootstrapped. The test period (pool == 'test') is not touched until `confirm`, and `confirm` is run once, on the survivors.

  screen   baseline + every hypothesis, 4-fold CV grouped by game on pool == 'screen'; writes exp_screen.md/.json, caches per-hypothesis results
  combine  all KEEP groups together, then drop one group at a time; drops groups that turn out redundant; writes exp_combine.md/.json
  confirm  baseline vs the final set trained on every pre-test row, scored on the test pool; writes exp_confirm.md/.json

Decision rule (screen), 99% interval over games because many hypotheses are tested:
  KEEP   home-run Brier improves by at least 0.0001 with the interval below zero, OR bearing error improves by more than 0.1 degrees
         with the interval below zero, OR fly-ball distance error improves by more than 0.1 ft with the interval below zero
  MAYBE  a point improvement on any target with the interval spanning zero (goes into `combine` once, dies there if it adds nothing)
  KILL   everything else

Usage: python experiments.py screen|combine|confirm --data data/derived/exp_features.parquet --out-dir data/derived/exp [--only H1,H4]
"""
from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold

from features import assert_clean
from ladder import BASE0, BAT, HIST, PITCH, WX

THREADS = int(os.environ.get("EXP_THREADS", "10"))
BASE = BASE0 + WX + PITCH + HIST + BAT

HYPOTHESES = [
    dict(id="H1", name="Contact point", cols=["intercept_x", "intercept_y", "intercept_x_field", "intercept_dist"],
         expect="Where the bat met the ball sets gear-effect spin and direction; expect direction and home-run gains."),
    dict(id="H2", name="Pitch approach and release", cols=["vaa", "haa", "plate_speed", "plate_z_rel", "release_pos_x", "release_pos_y", "release_pos_z",
                                                          "sz_top", "sz_bot", "vx0", "vy0", "vz0", "ax", "ay", "az"],
         expect="Approach angle sets how the swing path meets the pitch; expect a small gain on launch and distance."),
    dict(id="H3", name="Arm angle and break", cols=["arm_angle", "api_break_z_with_gravity", "api_break_x_arm", "api_break_x_batter_in"],
         expect="Mostly redundant with pitch type and movement already in; expect nothing."),
    dict(id="H4", name="Contact quality", cols=["dyn_loft", "attack_dir_field", "ev_over_pitch", "squared_up", "swing_speed_per_len", "ev_minus_bat", "bat_minus_pitch"],
         expect="Physics-shaped combinations of bat tracking; dynamic loft should help spin and distance, hand-signed attack direction should help direction."),
    dict(id="H5", name="Batter swing history", cols=["sw_attack_angle", "sw_attack_dir", "sw_length", "sw_bat_speed", "sw_intercept_x", "sw_intercept_y"],
         expect="A batter's typical swing denoises the single-swing measurement; expect a direction gain."),
    dict(id="H6", name="Game context", cols=["age_bat", "age_pit", "batter_days_since_prev_game", "pitcher_days_since_prev_game", "n_thruorder_pitcher",
                                             "n_priorpa_thisgame_player_at_bat", "score_diff", "outs_when_up", "runners_on", "inning"],
         expect="Should do nothing for a physical outcome; age may proxy for power. Likely kill."),
    dict(id="H7", name="Fielding alignment", cols=["if_fielding_alignment", "of_fielding_alignment"],
         expect="Shifts follow batter tendencies already captured; expect nothing."),
    dict(id="H8", name="Era trend", cols=["days_since_2015"],
         expect="Lets the model see ball and park drift; trees cannot extrapolate, so a screening gain may not survive confirmation."),
    dict(id="H9", name="Park-year", cols=["park_year"],
         expect="Fence and ball changes by season at each park; expect a small Oracle Park gain at best."),
    dict(id="H10", name="Long history windows", cols=["b_ev_500", "b_hard_500", "b_hr_500", "p_ev_500", "p_hr_500"],
         expect="More stable skill estimates than the 100-ball windows; expect a small gain."),
    dict(id="H11", name="Recency weights", cols=[], weight="recency",
         expect="Recent seasons count more (ball, tracking and park shifts); expect a small gain."),
    dict(id="H12", name="In-game residual memory", cols=["gm_dist_resid", "gm_dist_ewm", "gm_n", "gm_hr_resid"],
         expect="Balls in one game share a distance miss (wind, air, ball; split-half r +0.30); expect a small distance gain, larger near the wall. "
                "Needs exp_features_h12.parquet from round3.py memory."),
    dict(id="H13", name="Batter residual memory", cols=["bt_dist_resid", "bt_n"],
         expect="Batters carry a persistent distance miss (split-half r +0.42 to +0.50 on the test period, spread about 3 ft); expect a distance gain near the "
                "size of the contact-point gain (about 0.1 to 0.2 ft), plus a small near-wall gain. Residual-based, unlike the raw-average history groups that failed."),
    dict(id="H14", name="Pitcher residual memory", cols=["pt_dist_resid", "pt_n"],
         expect="Weaker than batters (split-half r +0.15 to +0.25); expect little. Likely kill."),
    dict(id="H15", name="League drift memory", cols=["lg_hr_resid", "lg_dist_resid"],
         expect="The model's near-wall home run rate is off by league-wide amounts that move by month (-3.0 points June 2025, +2.9 June 2026). "
                "A shrunk mean of the previous 30 days of home-run misses and 14 days of distance misses should absorb ball and season drift; expect a small Brier gain."),
    dict(id="H16", name="Park by geometry, not team", cols=["park_lf", "park_cf", "park_rf"], drop=["home_team"],
         expect="Team code does not identify a park (the Athletics moved to Sutter Health Park in 2025 and the model still reads Oakland). Dropping it and using "
                "fence distances, elevation, roof and turf should fix new-park and fence-change errors; expect a gain at the Athletics, Detroit and similar parks, "
                "possibly a loss at parks with idiosyncratic effects the geometry misses."),
]


def feats_for(sel):
    """Baseline features, minus anything a selected hypothesis drops, plus the selected groups' columns."""
    drop = {c for i in sel for c in HID[i].get("drop", [])}
    return [c for c in BASE if c not in drop] + [c for i in sel if not HID[i].get("weight") for c in HID[i]["cols"]]
HID = {h["id"]: h for h in HYPOTHESES}


def lgbm_params(strong: bool) -> dict:
    return dict(n_estimators=600 if strong else 350, learning_rate=0.06 if strong else 0.08, num_leaves=63, min_child_samples=100, subsample=0.8,
                subsample_freq=1, colsample_bytree=0.7, reg_lambda=2.0, n_jobs=THREADS, verbose=-1, random_state=0)


class Targets:
    def __init__(self, df: pd.DataFrame):
        self.y = df.y.to_numpy()
        self.bear = df.bearing.to_numpy()
        self.bear_ok = np.isfinite(self.bear)
        self.dist = df.hit_distance_sc.to_numpy()
        self.fly = (df.launch_angle.between(15, 45) & (df.launch_speed >= 90) & df.hit_distance_sc.notna()).to_numpy()


def fit_predict(df, T, feats, tr, te, weights=None, strong=False):
    """Fit the three models on rows `tr`, predict rows `te`. Returns hr probability, bearing estimate, distance estimate."""
    assert_clean(feats, job="experiments")
    X = df[feats]
    w = None if weights is None else weights[tr]
    prm = lgbm_params(strong)
    hr = lgb.LGBMClassifier(**prm).fit(X.iloc[tr], T.y[tr], sample_weight=w).predict_proba(X.iloc[te])[:, 1]
    tb = tr[T.bear_ok[tr]]
    br = lgb.LGBMRegressor(objective="l1", **prm).fit(X.iloc[tb], T.bear[tb], sample_weight=None if weights is None else weights[tb]).predict(X.iloc[te])
    td = tr[T.fly[tr]]
    ds = lgb.LGBMRegressor(**prm).fit(X.iloc[td], T.dist[td], sample_weight=None if weights is None else weights[td]).predict(X.iloc[te])
    return hr, br, ds


def errors(T, idx, hr, br, ds):
    """Per-ball errors for the rows idx: squared error of the home-run probability, absolute bearing error, absolute distance error (NaN if not scored)."""
    se = (hr - T.y[idx]) ** 2
    ab = np.where(T.bear_ok[idx], np.abs(br - T.bear[idx]), np.nan)
    ad = np.where(T.fly[idx], np.abs(ds - T.dist[idx]), np.nan)
    return np.column_stack([se, ab, ad])


def recency_weights(df, ref=None):
    d = df.game_date
    ref = d.max() if ref is None else ref
    return np.exp(-((ref - d).dt.days.to_numpy()) / 730.0)


def cv_errors(df, T, feats, folds, weights=None):
    out = np.full((len(df), 3), np.nan)
    for tr, te in folds:
        hr, br, ds = fit_predict(df, T, feats, tr, te, weights)
        out[te] = errors(T, te, hr, br, ds)
    return out


def boot_delta(E, E0, games, boots):
    """Mean difference E - E0 per metric with a 99% game-level bootstrap interval."""
    ug, gi = np.unique(games, return_inverse=True)
    res = []
    for k in range(3):
        ok = np.isfinite(E[:, k]) & np.isfinite(E0[:, k])
        s = np.bincount(gi[ok], weights=(E[ok, k] - E0[ok, k]), minlength=len(ug))
        n = np.bincount(gi[ok], minlength=len(ug)).astype(float)
        d = (boots @ s) / np.maximum(boots @ n, 1)
        res.append((float(np.nansum(E[ok, k] - E0[ok, k]) / ok.sum()), float(np.percentile(d, 0.5)), float(np.percentile(d, 99.5))))
    return res


def decide(d):
    (hr, hr_lo, hr_hi), (br, br_lo, br_hi), (ds, ds_lo, ds_hi) = d
    if (hr_hi < 0 and hr <= -1e-4) or br_hi < -0.1 or ds_hi < -0.1:
        return "KEEP"
    if hr < 0 or br < -0.1 or ds < -0.1:
        return "MAYBE"
    return "KILL"


def fmt(d):
    (hr, hl, hh), (br, bl, bh), (ds, dl, dh) = d
    return (f"{hr:+.5f} ({hl:+.5f}, {hh:+.5f}) | {br:+.2f} ({bl:+.2f}, {bh:+.2f}) | {ds:+.2f} ({dl:+.2f}, {dh:+.2f})")


def load_pool(path, pool_names, sample_games=1.0):
    df = pd.read_parquet(path.replace("\\", "/"))
    df = df[df.pool.isin(pool_names)]
    if sample_games < 1:  # smoke tests only: a deterministic share of whole games
        df = df[((df.game_pk.astype("int64") * 2654435761) % 1000) / 1000.0 < sample_games]
    return df.reset_index(drop=True)


def make_boots(n_games, reps=1000, seed=0):
    return np.random.default_rng(seed).multinomial(n_games, np.ones(n_games) / n_games, size=reps).astype(float)


def cached(cache_dir, name, fn):
    f = cache_dir / f"{name}.npy"
    if f.exists():
        return np.load(f)
    t0 = time.time()
    arr = fn()
    np.save(f, arr)
    print(f"  {name}: {time.time() - t0:.0f}s", flush=True)
    return arr


def screen(a):
    df = load_pool(a.data, ["screen"], a.sample_games)
    T = Targets(df)
    games = df.game_pk.to_numpy()
    folds = list(GroupKFold(4).split(np.arange(len(df)), groups=games))
    boots = make_boots(len(np.unique(games)))
    cache = Path(a.out_dir) / "screen"
    cache.mkdir(parents=True, exist_ok=True)
    print(f"screen pool: {len(df):,} balls, {int(T.y.sum()):,} home runs, {len(np.unique(games)):,} games; threads {THREADS}", flush=True)
    E0 = cached(cache, "B0", lambda: cv_errors(df, T, BASE, folds))
    base_line = (float(np.nanmean(E0[:, 0])), float(np.nanmean(E0[:, 1])), float(np.nanmean(E0[:, 2])))
    print("baseline Brier %.5f, bearing MAE %.2f deg, fly distance MAE %.2f ft" % base_line, flush=True)
    only = set(a.only.split(",")) if a.only else None
    rows = []
    for h in HYPOTHESES:
        if only and h["id"] not in only:
            continue
        if any(c not in df.columns for c in h["cols"]):
            print(f"{h['id']} skipped: columns missing from this table", flush=True)
            continue
        if h.get("weight") == "recency":
            E = cached(cache, h["id"], lambda: cv_errors(df, T, BASE, folds, weights=recency_weights(df)))
        else:
            E = cached(cache, h["id"], lambda: cv_errors(df, T, feats_for([h["id"]]), folds))
        d = boot_delta(E, E0, games, boots)
        rows.append({"id": h["id"], "name": h["name"], "cols": h["cols"], "expect": h["expect"], "delta": d, "decision": decide(d)})
        print(h["id"], h["name"], rows[-1]["decision"], fmt(d), flush=True)
    out = Path(a.out)
    L = ["# Feature sweep: screening", "",
         f"Pool: {len(df):,} balls from 2023-03-01 to 2025-05-31 ({int(T.y.sum()):,} home runs, {len(np.unique(games)):,} games); 4-fold CV grouped by game. "
         "Baseline = the current legal feature set with bat tracking, no direction estimate. "
         "Baseline: HR Brier %.5f, bearing MAE %.2f deg, fly-ball distance MAE %.2f ft." % base_line, "",
         "Differences against the baseline (negative is better), 99% interval over games. KEEP needs a Brier gain of at least 0.0001, or more than 0.1 degree or 0.1 ft, "
         "with the interval below zero.", "",
         "| ID | Hypothesis | Features | HR Brier diff | Bearing MAE diff (deg) | Distance MAE diff (ft) | Decision |", "|---|---|---|---|---|---|---|"]
    for r in rows:
        L.append(f"| {r['id']} | {r['name']} | {len(r['cols']) or 'weights'} | " + fmt(r["delta"]).replace(" | ", " | ") + f" | **{r['decision']}** |")
    L += ["", "Prior expectations, written before the run:", ""] + [f"- {r['id']} {r['name']}: {r['expect']}" for r in rows]
    out.write_text("\n".join(L) + "\n", encoding="utf-8")
    out.with_suffix(".json").write_text(json.dumps({"baseline": base_line, "rows": rows}, indent=1))
    print("\n".join(L))


def combine(a):
    prev = json.loads(Path(a.screen_json).read_text())
    keep = [r["id"] for r in prev["rows"] if r["decision"] == "KEEP"]
    maybe = [r["id"] for r in prev["rows"] if r["decision"] == "MAYBE"]
    ids = keep + maybe
    if not ids:
        raise SystemExit("nothing survived screening")
    df = load_pool(a.data, ["screen"])
    T = Targets(df)
    games = df.game_pk.to_numpy()
    folds = list(GroupKFold(4).split(np.arange(len(df)), groups=games))
    boots = make_boots(len(np.unique(games)))
    cache = Path(a.out_dir) / "screen"
    E0 = cached(cache, "B0", lambda: cv_errors(df, T, BASE, folds))

    def weights_for(sel):
        return recency_weights(df) if any(HID[i].get("weight") == "recency" for i in sel) else None

    def run(sel, name):
        return cached(cache, name, lambda: cv_errors(df, T, feats_for(sel), folds, weights_for(sel)))
    Eall = run(ids, "C_" + "_".join(ids))
    dall = boot_delta(Eall, E0, games, boots)
    L = ["# Feature sweep: combine and ablate", "", f"Survivors going in: KEEP {keep}, MAYBE {maybe}.", "",
         "| Set | HR Brier diff vs baseline | Bearing MAE diff (deg) | Distance MAE diff (ft) |", "|---|---|---|---|",
         f"| all survivors | {fmt(dall)} |", "", "Drop one group at a time (positive means that group was helping; interval spanning zero means it adds nothing):", "",
         "| Dropped | HR Brier diff vs all | Bearing MAE diff (deg) | Distance MAE diff (ft) | Verdict |", "|---|---|---|---|---|"]
    final = []
    for i in ids:
        rest = [j for j in ids if j != i]
        Er = run(rest, "C_" + "_".join(rest)) if rest else E0
        d = boot_delta(Er, Eall, games, boots)
        helps = (d[0][1] > 0) or (d[1][1] > 0.1) or (d[2][1] > 0.1)  # dropping it makes some target significantly worse
        if helps:
            final.append(i)
        L.append(f"| {i} {HID[i]['name']} | {fmt(d)} | {'stays' if helps else 'redundant, out'} |")
    L += ["", f"Final set for confirmation: {final}"]
    Path(a.out).write_text("\n".join(L) + "\n", encoding="utf-8")
    Path(a.out).with_suffix(".json").write_text(json.dumps({"final": final, "keep": keep, "maybe": maybe}, indent=1))
    print("\n".join(L))


def confirm(a):
    df = pd.read_parquet(a.data.replace("\\", "/"))
    sel = [s for s in a.keep.split(",") if s]
    if a.keep_from:
        sel = json.loads(Path(a.keep_from).read_text())["final"]
    tr = np.flatnonzero((df.pool != "test").to_numpy())
    te = np.flatnonzero((df.pool == "test").to_numpy())
    T = Targets(df)
    feats = feats_for(sel)
    w = recency_weights(df, df.loc[tr, "game_date"].max()) if any(HID[i].get("weight") == "recency" for i in sel) else None
    print(f"confirm: train {len(tr):,}, test {len(te):,}; final set {sel}", flush=True)
    t0 = time.time()
    r0 = fit_predict(df, T, BASE, tr, te, strong=True)
    r1 = fit_predict(df, T, feats, tr, te, weights=w, strong=True)
    print(f"fits done {time.time() - t0:.0f}s", flush=True)
    E0, E1 = errors(T, te, *r0), errors(T, te, *r1)
    games = df.game_pk.to_numpy()[te]
    boots = make_boots(len(np.unique(games)))
    d = boot_delta(E1, E0, games, boots)
    near = df.hit_distance_sc.to_numpy()[te]
    near = (near >= 330) & (near <= 430)
    sf = (df.home_team.astype(str).to_numpy()[te] == "SF")
    date = df.game_date.to_numpy()[te]
    half = date < np.datetime64("2026-01-01")
    L = ["# Feature sweep: confirmation on the held-out test", "",
         f"Train: every game before 2025-06-01 ({len(tr):,} balls). Test: 2025-06-01 on ({len(te):,} balls, {int(T.y[te].sum()):,} home runs). "
         f"Final set: {sel}. Features added: {sum(len(HID[i]['cols']) for i in sel)}. Differences are final minus baseline (negative is better), 99% interval over games.", "",
         "| Metric | Baseline | Final set | Difference (99% interval) |", "|---|---|---|---|"]
    names = [("HR Brier", 0, 5), ("Bearing MAE (deg)", 1, 2), ("Fly-ball distance MAE (ft)", 2, 2)]
    for (nm, k, p), dd in zip(names, d):
        L.append(f"| {nm} | {np.nanmean(E0[:, k]):.{p}f} | {np.nanmean(E1[:, k]):.{p}f} | {dd[0]:+.{p}f} ({dd[1]:+.{p}f}, {dd[2]:+.{p}f}) |")
    L.append(f"| HR Brier, near the wall | {E0[near, 0].mean():.4f} | {E1[near, 0].mean():.4f} | {E1[near, 0].mean() - E0[near, 0].mean():+.5f} |")
    L.append(f"| HR Brier, Oracle Park | {E0[sf, 0].mean():.5f} | {E1[sf, 0].mean():.5f} | {E1[sf, 0].mean() - E0[sf, 0].mean():+.5f} |")
    home = df.home_team.astype(str).to_numpy()[te]
    for team in ("ATH", "DET", "LAA", "CIN", "COL"):  # parks the segment scan flagged
        mt = home == team
        if mt.sum():
            L.append(f"| HR Brier, {team} home games ({int(mt.sum()):,} balls) | {E0[mt, 0].mean():.5f} | {E1[mt, 0].mean():.5f} | {E1[mt, 0].mean() - E0[mt, 0].mean():+.5f} |")
    L.append(f"| HR Brier, Jun-Dec 2025 | {E0[half, 0].mean():.5f} | {E1[half, 0].mean():.5f} | {E1[half, 0].mean() - E0[half, 0].mean():+.5f} |")
    L.append(f"| HR Brier, 2026 | {E0[~half, 0].mean():.5f} | {E1[~half, 0].mean():.5f} | {E1[~half, 0].mean() - E0[~half, 0].mean():+.5f} |")
    Path(a.out).write_text("\n".join(L) + "\n", encoding="utf-8")
    print("\n".join(L))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("stage", choices=["screen", "combine", "confirm"])
    ap.add_argument("--data", required=True)
    ap.add_argument("--out-dir", default="../data/derived/exp")
    ap.add_argument("--out", default=None)
    ap.add_argument("--only", default="")
    ap.add_argument("--keep", default="")
    ap.add_argument("--keep-from", default="", help="read the final set from a combine .json")
    ap.add_argument("--screen-json", default="exp_screen.json")
    ap.add_argument("--sample-games", type=float, default=1.0, help="smoke tests only")
    a = ap.parse_args()
    a.out = a.out or f"exp_{a.stage}.md"
    {"screen": screen, "combine": combine, "confirm": confirm}[a.stage](a)


if __name__ == "__main__":
    main()
