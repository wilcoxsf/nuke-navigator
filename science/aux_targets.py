"""Experiment E31 (GPT idea 5 in stacking form, plus the MLP bearing-head result): more game-out-of-fold auxiliary targets as features. The distance model (E19) and the bearing model are two such targets. The raw table also
holds other post-contact outcomes of the SAME ball: the batted-ball type (ground ball, line drive, fly ball, popup), the fielder who handled it (hit_location 1 to 9), the outcome class (out, single, double, triple), the run value of
the event and the landing coordinates (hc_x, hc_y). Each is predicted from the legal inputs only, out of fold by game (the label of a ball never informs its own feature), and given to the classifier:
  aux_bb_*      probabilities of ground ball, line drive, fly ball, popup
  aux_loc_*     probabilities that the ball goes to each of the nine fielders (a coarse landing zone)
  aux_ev_*      probabilities of out, single, double, triple (home runs are the label itself and are excluded from the classes)
  aux_rv        predicted run value of the event
  aux_hcx, aux_hcy  predicted landing coordinates
New columns on top of v19 (FEATSET v31). Usage: python aux_targets.py --data data/derived/bakeoff_features_v19.parquet --out data/derived/bakeoff_features_v31.parquet [--smoke]. About 45 minutes; --smoke about 3 minutes."""
import argparse
import os

os.environ["FEATSET"] = "v5r"
import lightgbm as lgb
import numpy as np
import pandas as pd

import bakeoff as B

try:
    import psutil
    psutil.Process(os.getpid()).nice(psutil.BELOW_NORMAL_PRIORITY_CLASS)
except Exception:
    pass
ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
ap = argparse.ArgumentParser()
ap.add_argument("--data", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--smoke", action="store_true")
a = ap.parse_args()
df = pd.read_parquet(a.data)
raw = pd.read_parquet(ROOT + "data/derived/exp_features.parquet", columns=["rid", "bb_type", "hit_location", "events", "delta_run_exp", "hc_x", "hc_y"]).set_index("rid").reindex(df.rid)
for c in raw.columns:
    df["raw_" + c] = raw[c].to_numpy()
if a.smoke:
    df = df.sample(frac=0.03, random_state=1).sort_index().reset_index(drop=True)
for c in B.CATS:
    if c in df.columns:
        df[c] = df[c].astype("category")
feats = [f for f in B.FEATS_PHYS if f in df.columns]
is_test = (df.split == "test").to_numpy()
fold = (df.game_pk.astype(int) % 4).to_numpy().copy()
fold[is_test] = -1
use = (df.launch_speed.notna()).to_numpy()
evmap = {"field_out": 0, "force_out": 0, "grounded_into_double_play": 0, "fielders_choice": 0, "fielders_choice_out": 0, "double_play": 0, "sac_fly": 0, "sac_bunt": 0, "field_error": 0, "single": 1, "double": 2, "triple": 3}
cls = {
    "bb": (df.raw_bb_type.map({"ground_ball": 0, "line_drive": 1, "fly_ball": 2, "popup": 3}), 4),
    "loc": (pd.to_numeric(df.raw_hit_location, errors="coerce").sub(1), 9),
    "ev": (df.raw_events.map(evmap), 4),
}
reg = {"rv": df.raw_delta_run_exp, "hcx": df.raw_hc_x, "hcy": df.raw_hc_y}
P = dict(n_estimators=40 if a.smoke else 250, learning_rate=0.12 if a.smoke else 0.06, num_leaves=15 if a.smoke else 31, min_child_samples=30 if a.smoke else 150, subsample=0.8, subsample_freq=1, colsample_bytree=0.8, verbose=-1, n_jobs=6)


def oof(model_fn, y, mask, ncols):
    out = np.full((len(df), ncols), np.nan)
    models = []
    for f in range(4):
        trn = mask & ~is_test & (fold != f)
        m = model_fn().fit(df.loc[trn, feats], y[trn])
        models.append(m)
        rows = (fold == f) & use
        out[rows] = m.predict_proba(df.loc[rows, feats]) if ncols > 1 else m.predict(df.loc[rows, feats]).reshape(-1, 1)
    rows = is_test & use
    out[rows] = np.mean([(m.predict_proba(df.loc[rows, feats]) if ncols > 1 else m.predict(df.loc[rows, feats]).reshape(-1, 1)) for m in models], axis=0)
    return out


for name, (ycol, k) in cls.items():
    y = ycol.to_numpy(float)
    mask = np.isfinite(y)
    res = oof(lambda: lgb.LGBMClassifier(objective="multiclass", num_class=k, **P), np.nan_to_num(y, nan=0).astype(int), mask, k)
    for j in range(k):
        df[f"aux_{name}_{j}"] = res[:, j]
    ok = mask & ~is_test & np.isfinite(res[:, 0])
    yi = np.nan_to_num(y, nan=0).astype(int)
    ll = -np.mean(np.log(np.clip(res[ok, :][np.arange(ok.sum()), yi[ok]], 1e-6, 1)))
    print("aux %-3s: %d classes, out-of-fold log loss %.4f on %d balls (uniform would be %.4f)" % (name, k, ll, ok.sum(), np.log(k)), flush=True)
for name, ycol in reg.items():
    y = ycol.to_numpy(float)
    mask = np.isfinite(y)
    res = oof(lambda: lgb.LGBMRegressor(objective="regression", **P), np.nan_to_num(y, nan=0.0), mask, 1)
    df[f"aux_{name}"] = res[:, 0]
    ok = mask & ~is_test & np.isfinite(res[:, 0])
    print("aux %-3s: out-of-fold R2 %.4f on %d balls" % (name, 1 - np.sum((y[ok] - res[ok, 0]) ** 2) / np.sum((y[ok] - y[ok].mean()) ** 2), ok.sum()), flush=True)
df = df.drop(columns=[c for c in df.columns if c.startswith("raw_")])
df.to_parquet(a.out)
print("written", a.out, df.shape, flush=True)
