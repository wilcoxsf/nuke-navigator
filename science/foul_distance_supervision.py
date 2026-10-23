"""Experiment E1 (GPT round-3 idea 1): do foul balls help a flight-distance model? 144,868 airborne, hard-hit foul balls (2023-2026) have launch speed, angle, pitch and bat tracking and a Statcast projected
distance but no landing bearing, so they could not supervise the direction model; here only their DISTANCE label is used. Time split: train through 2025-05-31, test on FAIR airborne balls from
2025-06-01 (game-disjoint by construction). Models (LightGBM, same settings, features available for both fair and foul balls: no bearing, no weather join, park elevation from the home team):
  A fair only;  B fair + foul with an is_foul flag;  C fair + foul without the flag;  D fair + foul, foul balls weighted 0.5.
Reports distance MAE, bias, MAE near the wall (projected distance 340 to 420 ft), and 80% interval coverage and width from q10/q90 models for A and B. Kill rule from GPT: under 0.3 ft gain and
no better tails. Runs at normal speed for a few minutes (no flight simulation). Output: science/foul_distance_supervision.md."""
import lightgbm as lgb
import numpy as np
import pandas as pd

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
out = []


def say(s=""):
    print(s, flush=True)
    out.append(s)


FEATS = ["launch_speed", "launch_angle", "stand_r", "release_speed", "release_spin_rate", "spin_axis", "pfx_x", "pfx_z", "plate_x", "plate_z", "sz_top", "sz_bot", "bat_speed", "attack_angle", "swing_path_tilt", "swing_length", "elev"]
fx = pd.read_parquet(ROOT + "data/derived/exp_features.parquet", columns=["game_date", "game_pk", "type", "launch_speed", "launch_angle", "hit_distance_sc", "stand_r", "release_speed", "release_spin_rate", "spin_axis", "pfx_x", "pfx_z", "plate_x", "plate_z", "sz_top", "sz_bot", "bat_speed", "attack_angle", "swing_path_tilt", "swing_length", "home_team", "elevation_ft"])
elev = fx.groupby("home_team").elevation_ft.median().to_dict()
fx["game_date"] = fx.game_date.astype(str)
fair = fx[(fx.game_date >= "2023-03-01") & (fx.type == "X") & fx.launch_speed.between(70, 125) & fx.launch_angle.between(15, 50) & fx.hit_distance_sc.between(60, 480)].copy()
fair["elev"] = fair.home_team.map(elev)
del fx
fl = pd.read_parquet(ROOT + "data/raw/fouls/fouls_2023_2026.parquet", columns=["game_date", "launch_speed", "launch_angle", "hit_distance_sc", "stand", "release_speed", "release_spin_rate", "spin_axis", "pfx_x", "pfx_z", "plate_x", "plate_z", "sz_top", "sz_bot", "bat_speed", "attack_angle", "swing_path_tilt", "swing_length", "home_team"])
fl["game_date"] = fl.game_date.astype(str)
fl = fl[fl.launch_speed.between(70, 125) & fl.launch_angle.between(15, 50) & fl.hit_distance_sc.between(40, 480)].copy()
fl["stand_r"] = (fl.stand == "R").astype(float)
fl["elev"] = fl.home_team.map(elev)
fair["is_foul"], fl["is_foul"] = 0, 1
cut = "2025-06-01"
trF, teF = fair[fair.game_date < cut], fair[fair.game_date >= cut]
trX = fl[fl.game_date < cut]
say("# Foul-ball distance supervision (22 Oct 2026)")
say("train fair balls %d, train foul balls %d (airborne, 70+ mph, distance known), test fair balls %d (from %s)" % (len(trF), len(trX), len(teF), cut))
say("foul distance labels: mean %.0f ft; fair: mean %.0f ft (fouls are shorter and more varied; a domain flag lets the model tell them apart)" % (trX.hit_distance_sc.mean(), trF.hit_distance_sc.mean()))
P = dict(n_estimators=500, learning_rate=0.05, num_leaves=63, min_child_samples=60, subsample=0.8, subsample_freq=1, colsample_bytree=0.8, verbose=-1, n_jobs=3)


def fit(train, feats, w=None, **kw):
    return lgb.LGBMRegressor(**{**P, **kw}).fit(train[feats], train.hit_distance_sc, sample_weight=w)


def report(name, pred):
    e = pred - teF.hit_distance_sc.to_numpy()
    wall = teF.hit_distance_sc.between(340, 420).to_numpy()
    say("  %-44s MAE %.2f ft   bias %+.2f   MAE near the wall %.2f ft" % (name, np.mean(np.abs(e)), np.mean(e), np.mean(np.abs(e[wall]))))
    return np.mean(np.abs(e))


F = FEATS
comb = pd.concat([trF, trX], ignore_index=True)
say("\n## Distance error on held-out fair airborne balls")
mA = fit(trF, F)
a = report("A fair only", mA.predict(teF[F]))
mB = fit(comb, F + ["is_foul"])
tmp = teF.copy(); tmp["is_foul"] = 0
b = report("B fair + foul, with is_foul flag", mB.predict(tmp[F + ["is_foul"]]))
mC = fit(comb, F)
c = report("C fair + foul, no flag", mC.predict(teF[F]))
mD = fit(comb, F + ["is_foul"], w=np.where(comb.is_foul == 1, 0.5, 1.0))
d = report("D fair + foul (foul weight 0.5), with flag", mD.predict(tmp[F + ["is_foul"]]))
say("\n  gain of B over A: %+.2f ft   (kill rule: under 0.3 ft and no better tails)" % (a - b))
# without bat tracking, in case the foul balls' extra rows matter more when swing features are missing
G = [f for f in F if f not in ("bat_speed", "attack_angle", "swing_path_tilt", "swing_length")]
a2 = report("A2 fair only, no bat tracking", fit(trF, G).predict(teF[G]))
b2 = report("B2 fair + foul with flag, no bat tracking", fit(comb, G + ["is_foul"]).predict(tmp[G + ["is_foul"]]))
say("  gain without bat tracking: %+.2f ft" % (a2 - b2))
say("\n## 80% interval from q10 and q90 models (fair test balls)")
for name, train, feats, flag in (("A fair only", trF, F, False), ("B fair + foul with flag", comb, F + ["is_foul"], True)):
    lo = fit(train, feats, objective="quantile", alpha=0.1, n_estimators=300).predict((tmp if flag else teF)[feats])
    hi = fit(train, feats, objective="quantile", alpha=0.9, n_estimators=300).predict((tmp if flag else teF)[feats])
    y = teF.hit_distance_sc.to_numpy()
    wall = (y >= 340) & (y <= 420)
    say("  %-28s coverage %.3f (near the wall %.3f), mean width %.1f ft, below %.3f above %.3f" % (name, np.mean((y >= lo) & (y <= hi)), np.mean(((y >= lo) & (y <= hi))[wall]), np.mean(hi - lo), np.mean(y < lo), np.mean(y > hi)))
say("\nreading: B over A is the benefit of the foul balls' distance labels for a fair-ball distance model; C shows what the model does if it cannot tell fouls from fair balls.")
open(ROOT + "science/foul_distance_supervision.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
