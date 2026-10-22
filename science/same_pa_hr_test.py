"""HR Brier with and without the same-PA foul features, LightGBM, 2023-and-later rows, identical settings and seeds, paired game bootstrap on the test split. A and B differ only in the
same-PA columns. (Our production XGBoost uses all years; this isolates the features on the era where bat tracking exists.)"""
import numpy as np
import pandas as pd
import lightgbm as lgb

D = "C:/Users/andrewwi/dev/nuke-navigator-new/data/derived/"
f = ["launch_speed", "launch_angle", "phys_dist", "phys_hang", "bearing_hat", "fence_hat", "margin_hat", "stand_r", "bat_speed", "swing_length", "attack_direction", "attack_angle", "swing_path_tilt", "intercept_x_field", "intercept_y",
     "plate_x", "plate_z", "pfx_x", "pfx_z", "release_speed", "vaa", "haa", "squared_up", "res_ad", "res_ix", "res_iy", "res_aa", "res_bs", "air_density", "om_temp_f", "om_wind_u", "om_wind_v", "balls", "strikes",
     "dim_left_line", "dim_left_center", "dim_center", "dim_right_center", "dim_right_line", "b_ev", "b_hr", "b_hard", "b_pull", "p_ev", "p_hr", "zone"]
v = pd.read_parquet(D + "bakeoff_features_v9.parquet", columns=["rid", "split", "game_pk", "game_year", "y"] + f)
v = v[v.game_year >= 2023]
pa = pd.read_parquet(D + "same_pa_features.parquet")
newc = [c for c in pa.columns if c != "rid"]
v = v.merge(pa, on="rid", how="left")
tr, va, te = v[v.split == "train"], v[v.split == "val"], v[v.split == "test"]
print("train", len(tr), "val", len(va), "test", len(te), "HR test", int(te.y.sum()))
def fit(feats):
    m = lgb.LGBMClassifier(n_estimators=900, learning_rate=0.03, num_leaves=63, min_child_samples=80, subsample=0.8, subsample_freq=1, colsample_bytree=0.7, reg_lambda=10, verbosity=-1, n_jobs=4, random_state=0)
    m.fit(tr[feats], tr.y, eval_set=[(va[feats], va.y)], callbacks=[lgb.early_stopping(60, verbose=False)])
    return m, m.predict_proba(te[feats])[:, 1]
mA, pA = fit(f)
mB, pB = fit(f + newc)
y = te.y.to_numpy(); eA = (pA - y) ** 2; eB = (pB - y) ** 2
near = te.phys_dist.between(330, 430).to_numpy()
g = te.game_pk.to_numpy(); ug = np.unique(g); idx = {k: np.flatnonzero(g == k) for k in ug}
rng = np.random.default_rng(2); d_all, d_near = [], []
for _ in range(400):
    ii = np.concatenate([idx[k] for k in rng.choice(ug, len(ug))])
    d_all.append(eB[ii].mean() - eA[ii].mean()); d_near.append(eB[ii][near[ii]].mean() - eA[ii][near[ii]].mean())
print(f"trees A {mA.best_iteration_}, B {mB.best_iteration_}")
print(f"HR Brier A {eA.mean():.5f}  B {eB.mean():.5f}  B-A {eB.mean() - eA.mean():+.5f} (95% {np.percentile(d_all, 2.5):+.5f}, {np.percentile(d_all, 97.5):+.5f})")
print(f"near wall  A {eA[near].mean():.5f}  B {eB[near].mean():.5f}  B-A {eB[near].mean() - eA[near].mean():+.5f} (95% {np.percentile(d_near, 2.5):+.5f}, {np.percentile(d_near, 97.5):+.5f})")
has = (te.pa_n_fouls > 0).to_numpy()
print(f"balls with a prior foul (n={has.sum()}): A {eA[has].mean():.5f} B {eB[has].mean():.5f} B-A {eB[has].mean() - eA[has].mean():+.5f}")
