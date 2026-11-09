"""The 2026 postseason lockbox (9 Nov 2026). The production chain (run_prod_chain.sh) predicts the sealed rows with the champion recipe (S3 stack, monthly layer
and meta-learner, 50/50 blend), every model fit only on regular-season rows. This script

  (default)  writes those predictions with their game, at-bat and pitch keys to data/prod/lockbox/pred_post.parquet, and prints only counts and the mean
             predicted rate. It does not read data/prod/lockbox/sealed.parquet.
  --open     ANDREW'S CALL ONLY (the freeze spec: opened once). Joins the predictions to the sealed outcomes and reports the Brier score, the calibration
             (predicted vs actual home runs, overall and by predicted-probability bin) and the near-wall and Oracle slices, against the plain S3 stack too.
             With about 1,900 balls the interval is wide: it checks calibration, it cannot rank recipes.

Usage: NN_D=data/prod python science/score_lockbox.py [--open]"""
import argparse
import os

import numpy as np
import pandas as pd

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
P = os.environ.get("NN_D", ROOT + "data/prod/").rstrip("/") + "/"
ap = argparse.ArgumentParser()
ap.add_argument("--open", action="store_true")
a = ap.parse_args()
t = pd.read_parquet(P + "bakeoff_features_v5r.parquet", columns=["rid", "split", "game_pk", "game_date", "venue_id", "margin_hat"])
t = t[t.split == "post"]
k = pd.read_parquet(P + "bakeoff_features.parquet", columns=["rid", "at_bat_number", "pitch_number"])
t = t.merge(k, on="rid")
bl = pd.read_parquet(P + "blend_prod.parquet").rename(columns={"p_hr": "p_blend"})
s3 = pd.read_parquet(P + "final8/S3.parquet").rename(columns={"p_hr": "p_s3"})
t = t.merge(bl, on="rid", how="left").merge(s3, on="rid", how="left")
out = t[["game_pk", "at_bat_number", "pitch_number", "game_date", "venue_id", "margin_hat", "p_blend", "p_s3"]]
os.makedirs(P + "lockbox", exist_ok=True)
out.to_parquet(P + "lockbox/pred_post.parquet")
print(f"lockbox predictions: {len(out):,} sealed balls from {out.game_pk.nunique()} games, {int(out.p_blend.isna().sum())} without a prediction; "
      f"mean predicted home-run chance {out.p_blend.mean():.4f} (expected home runs {out.p_blend.sum():.1f}) -> {P}lockbox/pred_post.parquet")
if not a.open:
    raise SystemExit(0)

# ---- opened: only on Andrew's word ----
s = pd.read_parquet(P + "lockbox/sealed.parquet")
d = out.merge(s[["game_pk", "at_bat_number", "pitch_number", "is_home_run"]], on=["game_pk", "at_bat_number", "pitch_number"], how="inner").dropna(subset=["p_blend"])
y = d.is_home_run.astype(float).to_numpy()
G = pd.factorize(d.game_pk)[0]; nG = G.max() + 1
rng = np.random.default_rng(7)


def ci(v):
    s_, c_ = np.bincount(G, weights=v, minlength=nG), np.bincount(G, minlength=nG)
    bs = [s_[i].sum() / c_[i].sum() for i in (rng.integers(0, nG, nG) for _ in range(2000))]
    return np.percentile(bs, [2.5, 97.5])


for name, p in (("blend", d.p_blend.to_numpy()), ("S3 stack", d.p_s3.to_numpy())):
    e = (p - y) ** 2; lo, hi = ci(e)
    print(f"{name:9s} Brier {e.mean():.5f} (95% {lo:.5f}, {hi:.5f}); predicted home runs {p.sum():.1f}, actual {int(y.sum())}")
dd = (d.p_blend - y) ** 2 - (d.p_s3 - y) ** 2
lo, hi = ci(dd.to_numpy())
print(f"blend minus S3: {dd.mean():+.5f} (95% {lo:+.5f}, {hi:+.5f})")
near = d.margin_hat.abs().lt(30).to_numpy(); orc = (d.venue_id == 2395).to_numpy()
for nm, m in (("near the wall", near), ("Oracle", orc)):
    if m.any():
        print(f"{nm}: {m.sum()} balls, blend Brier {((d.p_blend[m] - y[m]) ** 2).mean():.5f}, predicted {d.p_blend[m].sum():.1f} vs actual {int(y[m].sum())}")
bins = pd.cut(d.p_blend, [0, 0.01, 0.05, 0.2, 0.5, 0.8, 1.0], include_lowest=True)
print(pd.DataFrame({"bin": bins, "p": d.p_blend, "y": y}).groupby("bin", observed=True).agg(balls=("y", "size"), predicted=("p", "sum"), actual=("y", "sum")).round(1).to_string())
