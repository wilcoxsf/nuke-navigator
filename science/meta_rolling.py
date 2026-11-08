"""Rolling meta-learner (8 Nov 2026): a small boosted model refit before every test month on strictly earlier labeled balls, starting from a base prediction
(init_score = its logit) and learning a correction from the stack members' logits and legal ball, park and context features. It generalises the monthly
recalibration layer (slope, intercept, venue offsets, in-game carry) to any learned correction.

Bases: --base S3 (the raw S3 stack, trained on validation + earlier test months) or --base layer (S3 + the monthly layer; its predictions exist for test
months only, so it trains on earlier test months). Legal inputs only: nothing measured after contact (no true bearing, distance, fence at the true bearing).
Usage: python science/meta_rolling.py --base S3 --trees 200 --tag m2"""
import argparse

import lightgbm as lgb
import numpy as np
import pandas as pd

ap = argparse.ArgumentParser()
ap.add_argument("--base", default="S3")
ap.add_argument("--trees", type=int, default=200)
ap.add_argument("--lr", type=float, default=0.03)
ap.add_argument("--leaves", type=int, default=15)
ap.add_argument("--minleaf", type=int, default=400)
ap.add_argument("--l2", type=float, default=10.0)
ap.add_argument("--no-members", action="store_true", help="drop the member logits (features and context only)")
ap.add_argument("--no-venue", action="store_true", help="no park id as a feature (the park reaches the model only through its dimensions)")
ap.add_argument("--table", default="bakeoff_features_v5r.parquet")
ap.add_argument("--feat", default="bakeoff_features_v39c.parquet")
ap.add_argument("--pred", default="", help="override the base prediction file")
ap.add_argument("--members", default="S3", help="S3 or none or a comma list name=file")
ap.add_argument("--tag", default="m")
ap.add_argument("--seed", type=int, default=7)
ap.add_argument("--algo", default="lgb", help="lgb or cat (CatBoost, ordered boosting)")
ap.add_argument("--history", action="store_true", help="keep every ball that has a base prediction (e.g. a spliced 2024 season) as training history; test months are the table's test split")
a = ap.parse_args()
ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
D = ROOT + "data/derived/"
S3 = {"xgb": "v39c_avg/pred_xgb.parquet", "phys": "v7_stack/pred_diffphys_v3b.parquet", "lgb": "v39c_lgbm_phys/pred_lgbm_phys.parquet", "cat": "v39b_cat/pred_cat.parquet",
      "mlp": "e49a_wide/pred_mlp.parquet", "mlplong": "e49b_wide_long/pred_mlp.parquet", "mlpwider": "e51_wider/pred_mlp.parquet"}
LEGAL = ["launch_speed", "launch_angle", "margin_hat", "direct_margin", "dist_hat", "dist_q10", "dist_q90", "margin_q10", "margin_q90", "mlp_d", "mlp_b", "mlp_p",
         "bearing_hat", "fence_hat", "stand_r", "air_density", "om_temp_f", "om_wind_u", "om_wind_v", "elevation_ft", "roof", "lg_carry14", "pk_carry30",
         "bat_speed", "attack_angle", "squared_up", "park_lf", "park_cf", "park_rf"]
lg = lambda p: np.log(np.clip(p, 1e-6, 1 - 1e-6) / (1 - np.clip(p, 1e-6, 1 - 1e-6)))

base = pd.read_parquet(D + a.table, columns=["rid", "split", "y", "game_date", "game_pk", "venue_id", "hit_distance_sc", "launch_angle", "launch_speed"])
base = base.merge(pd.read_parquet(D + "bakeoff_features.parquet", columns=["rid", "at_bat_number", "pitch_number"]), on="rid")
f = pd.read_parquet(D + a.feat, columns=["rid"] + [c for c in LEGAL if c not in ("launch_speed", "launch_angle")])
base = base.merge(f, on="rid")
base = base.sort_values(["game_date", "game_pk", "at_bat_number", "pitch_number"]).reset_index(drop=True)
# in-game carry (as in posthoc_memory.py): shrunk mean distance miss of the same game's earlier fly balls against the out-of-fold distance head, k = 4
fly = (base.launch_angle >= 15) & (base.launch_speed >= 80) & base.hit_distance_sc.notna() & base.mlp_d.notna()
r0 = np.where(fly, base.hit_distance_sc - base.mlp_d, 0.0); ok = fly.to_numpy().astype(float)
g = base.game_pk.to_numpy()
base["gm"] = (pd.Series(r0).groupby(g).cumsum().to_numpy() - r0) / (pd.Series(ok).groupby(g).cumsum().to_numpy() - ok + 4.0)
base = base.copy() if a.history else base[base.split.isin(["val", "test"])].copy()
base["doy"] = pd.to_datetime(base.game_date).dt.dayofyear
base["venue"] = base.venue_id.astype(int)
feats = LEGAL + ["gm", "doy"] + ([] if a.no_venue else ["venue"])
mem = {}
if a.members == "S3" and not a.no_members: mem = S3
elif a.members not in ("S3", "none") and not a.no_members: mem = dict(x.split("=", 1) for x in a.members.split(","))
for k, fn in mem.items():
    base = base.merge(pd.read_parquet(D + fn).rename(columns={"p_hr": "p_" + k})[["rid", "p_" + k]], on="rid", how="left")
    base["l_" + k] = lg(base["p_" + k]); feats.append("l_" + k)
bp = a.pred or (D + ("final8/S3_layer.parquet" if a.base == "layer" else "final8/S3.parquet"))
base = base.merge(pd.read_parquet(bp).rename(columns={"p_hr": "p_base"})[["rid", "p_base"]], on="rid", how="inner").dropna(subset=["p_base"])
base["l_base"] = lg(base.p_base)
base["month"] = pd.to_datetime(base.game_date).dt.to_period("M")
months = sorted(base[base.split == "test"].month.unique())
out = []
P = dict(objective="binary", learning_rate=a.lr, num_leaves=a.leaves, min_data_in_leaf=a.minleaf, lambda_l2=a.l2, feature_fraction=0.8, bagging_fraction=0.8, bagging_freq=1, verbose=-1, seed=a.seed, num_threads=8)
for m in months:
    tr = base[base.month < m]; te = base[base.month == m]
    if len(tr) < 20000: out.append(te.assign(p_meta=te.p_base)[["rid", "p_meta"]]); continue
    if a.algo == "cat":
        from catboost import CatBoostClassifier, Pool
        cf = [c for c in feats if c == "venue" or str(tr[c].dtype) == "category"]
        mdl = CatBoostClassifier(iterations=a.trees, learning_rate=a.lr * 2, depth=5, l2_leaf_reg=a.l2, random_seed=a.seed, verbose=0, thread_count=8)
        mdl.fit(Pool(tr[feats], tr.y, cat_features=cf, baseline=tr.l_base.to_numpy()))
        z = te.l_base.to_numpy() + mdl.predict(Pool(te[feats], cat_features=cf), prediction_type="RawFormulaVal")
    else:
        ds = lgb.Dataset(tr[feats], tr.y, init_score=tr.l_base, categorical_feature=[c for c in ["venue"] if c in feats], free_raw_data=False)
        bst = lgb.train(P, ds, num_boost_round=a.trees)
        z = te.l_base.to_numpy() + bst.predict(te[feats], raw_score=True)
    out.append(pd.DataFrame({"rid": te.rid.to_numpy(), "p_meta": 1 / (1 + np.exp(-z))}))
o = pd.concat(out)
t = base[base.split == "test"].merge(o, on="rid")
near = t.margin_hat.abs() < 15
orc = t.venue == 2395
B = lambda p, m=slice(None): ((p[m] - t.y[m]) ** 2).mean()
print("%s base %s trees %d lr %.3f leaves %d: test Brier base %.5f -> meta %.5f (%+.5f); near wall %.4f -> %.4f; Oracle %.5f -> %.5f; %d balls" % (
    a.tag, a.base, a.trees, a.lr, a.leaves, B(t.p_base), B(t.p_meta), B(t.p_meta) - B(t.p_base), B(t.p_base, near), B(t.p_meta, near), B(t.p_base, orc), B(t.p_meta, orc), len(t)))
o.rename(columns={"p_meta": "p_hr"}).to_parquet(D + "meta_%s.parquet" % a.tag)
