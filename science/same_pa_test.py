"""Does knowing the earlier fouls in the plate appearance explain the direction error of our estimate? Target: pull-relative residual of the landing bearing against bearing_hat. Two
LightGBM models on identical rows and settings: A with the current swing, pitch and contact features, B adding the same-PA foul features. Trained on the train split (2023 to Feb 2025),
scored on the test split (2025-06 on) for balls that HAVE an earlier foul, and for the near-wall subset (predicted physics distance 330 to 430 ft). Game-grouped bootstrap on the MAE difference."""
import numpy as np
import pandas as pd
import lightgbm as lgb

D = "C:/Users/andrewwi/dev/nuke-navigator-new/data/derived/"
base = ["launch_speed", "launch_angle", "phys_dist", "bearing_hat", "stand_r", "bat_speed", "attack_direction", "attack_angle", "swing_path_tilt", "intercept_x_field", "intercept_y", "plate_x", "plate_z", "pfx_x", "pfx_z",
        "release_speed", "vaa", "haa", "squared_up", "res_ad", "res_ix", "res_iy", "res_aa", "res_bs", "air_density"]
cols = ["rid", "split", "game_pk", "game_year", "bearing", "y"] + base
v = pd.read_parquet(D + "bakeoff_features_v9.parquet", columns=cols)
v = v[(v.game_year >= 2023)]
pa = pd.read_parquet(D + "same_pa_features.parquet")
newc = [c for c in pa.columns if c != "rid"]
v = v.merge(pa, on="rid", how="left")
v = v[v.bearing.notna() & v.bearing_hat.notna()].copy()
v["pull_sign"] = np.where(v.stand_r == 1, -1.0, 1.0)  # a right-handed pull is toward left field (negative bearing)
v["tgt"] = (v.bearing - v.bearing_hat) * (-v.pull_sign)  # positive: more pulled than estimated
tr, te = v[v.split == "train"], v[v.split == "test"]
print("train", len(tr), "test", len(te), "test with a prior foul:", int((te.pa_n_fouls > 0).sum()))
def fit(feats, seed=0):
    m = lgb.LGBMRegressor(n_estimators=350, learning_rate=0.04, num_leaves=31, min_child_samples=120, subsample=0.8, subsample_freq=1, colsample_bytree=0.8, reg_lambda=5, verbosity=-1, n_jobs=4, random_state=seed, objective="huber", alpha=6.0)
    m.fit(tr[feats], tr.tgt)
    return m
mA, mB = fit(base), fit(base + newc)
pA, pB = mA.predict(te[base]), mB.predict(te[base + newc])
def report(mask, name):
    t = te[mask]
    e0 = np.abs(t.tgt).to_numpy()
    eA = np.abs(t.tgt.to_numpy() - pA[mask.to_numpy()]); eB = np.abs(t.tgt.to_numpy() - pB[mask.to_numpy()])
    # game-grouped bootstrap of the MAE difference B minus A
    g = t.game_pk.to_numpy(); ug = np.unique(g); idx = {k: np.flatnonzero(g == k) for k in ug}
    rng = np.random.default_rng(1); diffs = []
    for _ in range(300):
        pick = rng.choice(ug, len(ug)); ii = np.concatenate([idx[k] for k in pick])
        diffs.append(eB[ii].mean() - eA[ii].mean())
    lo, hi = np.percentile(diffs, [2.5, 97.5])
    print(f"{name:34s} n={len(t):6d}  MAE: zero {e0.mean():.3f}  A {eA.mean():.3f}  B {eB.mean():.3f}  B-A {eB.mean() - eA.mean():+.3f} (95% {lo:+.3f}, {hi:+.3f})")
has = te.pa_n_fouls > 0
near = te.phys_dist.between(330, 430)
report(has | ~has, "all test balls")
report(has, "balls with a prior foul")
report(has & near, "prior foul, near the wall")
report(has & te.pa_last_attack_dir_field.notna(), "prior foul with tracked swing")
report(near, "near the wall, any")
imp = pd.Series(mB.booster_.feature_importance("gain"), index=base + newc).sort_values(ascending=False)
print("top gain in B:", [(k, round(float(x / imp.sum()), 3)) for k, x in imp.head(10).items()])
print("share of B gain on same-PA features:", round(float(imp[newc].sum() / imp.sum()), 3))
