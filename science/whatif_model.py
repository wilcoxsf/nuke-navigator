"""The what-if odds model for the browser (26 Oct 2026). A what-if swing only knows what the control strip sets, so this model sees only that:
exit speed, launch angle, landing bearing (the flight engine's landing bearing in the page; Statcast's landing bearing here), batter hand, temperature, park elevation,
and the fence distance and wall height at that bearing (Savant's five-bearing fences by venue-season, interpolated; in the page, the Oracle crest at that bearing).
LightGBM, early stopping on the validation slice, exported as plain arrays (feature index, threshold, children, leaf values) to apps/web/public/whatif_model.json;
the export is checked against LightGBM's own raw scores. Prints test Brier overall, near the wall and at Oracle Park, beside the final stack for scale.
Usage: python science/whatif_model.py"""
import json

import lightgbm as lgb
import numpy as np
import pandas as pd

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
D = ROOT + "data/derived/"
df = pd.read_parquet(D + "bakeoff_features_v5r.parquet", columns=["rid", "split", "y", "venue_id", "game_year", "launch_speed", "launch_angle", "bearing", "stand_r", "om_temp_f", "elevation_ft", "fence_true", "margin_hat"])
fz = pd.read_csv(D + "parks/savant_fence_by_year.csv")
B = np.array([-45, -22.5, 0, 22.5, 45.0])
HC = ["height_lf_line", "height_lf_gap", "height_cf", "height_rf_gap", "height_rf_line"]
fz = fz.sort_values("season")
key = {(int(r.venue_id), int(r.season)): r[HC].to_numpy(float) for _, r in fz.iterrows()}
latest = {int(v): g.iloc[-1][HC].to_numpy(float) for v, g in fz.groupby("venue_id")}
med = np.nanmedian(fz[HC].to_numpy(float), axis=0)


def heights(v, yr):
    return key.get((v, yr), latest.get(v, med))


H = np.stack([heights(int(v), int(y)) for v, y in zip(df.venue_id, df.game_year)])
b = np.clip(df.bearing.fillna(0).to_numpy(), -45, 45)
j = np.clip(np.searchsorted(B, b) - 1, 0, 3)
w = (b - B[j]) / (B[j + 1] - B[j])
df["wallh"] = H[np.arange(len(df)), j] * (1 - w) + H[np.arange(len(df)), j + 1] * w
df["hand"] = np.where(df.stand_r == 1, 1.0, -1.0)
X = pd.DataFrame({"ev": df.launch_speed, "la": df.launch_angle, "bear": df.bearing, "hand": df.hand, "temp": df.om_temp_f, "elev": df.elevation_ft, "fence": df.fence_true, "wallh": df.wallh})
FEATS = list(X.columns)
ok = X.notna().all(axis=1).to_numpy()
tr, va, te = [(df.split == s).to_numpy() & ok for s in ("train", "val", "test")]
print("rows train %d val %d test %d (dropped %d with a missing input)" % (tr.sum(), va.sum(), te.sum(), (~ok).sum()))
m = lgb.LGBMClassifier(n_estimators=3000, learning_rate=0.05, num_leaves=31, min_child_samples=200, subsample=0.8, subsample_freq=1, colsample_bytree=0.9, reg_lambda=2.0, verbose=-1, n_jobs=4)
m.fit(X[tr], df.y[tr], eval_set=[(X[va], df.y[va])], callbacks=[lgb.early_stopping(80, verbose=False)])
p = m.predict_proba(X[te])[:, 1]
y = df.y[te].to_numpy()
near = df.margin_hat[te].abs().lt(30).to_numpy()
orc = (df.venue_id[te] == 2395).to_numpy()
bri = lambda q, mk=slice(None): float(((q - y) ** 2)[mk].mean())
s3 = pd.read_parquet(D + "final8/S3_layer.parquet").set_index("rid").p_hr.reindex(df.rid[te]).to_numpy()
print("trees %d" % m.best_iteration_)
print("test Brier: what-if model %.5f (near wall %.5f, Oracle %.5f); final stack + layer %.5f (near wall %.5f, Oracle %.5f); constant %.5f" % (
    bri(p), bri(p, near), bri(p, orc), bri(s3), bri(s3, near), bri(s3, orc), bri(np.full(len(y), y.mean()))))

# export: one flat array set per tree; internal nodes first-come, leaves stored as nodes with f = -1
dump = m.booster_.dump_model(num_iteration=m.best_iteration_)
trees = []
for t in dump["tree_info"]:
    f, th, L, R, v = [], [], [], [], []

    def walk(n):
        i = len(f)
        f.append(None); th.append(0.0); L.append(-1); R.append(-1); v.append(0.0)
        if "leaf_value" in n and "split_feature" not in n:
            f[i] = -1; v[i] = round(float(n["leaf_value"]), 6)
            return i
        assert n["decision_type"] == "<=", n["decision_type"]
        f[i] = int(n["split_feature"]); th[i] = float(n["threshold"])
        L[i] = walk(n["left_child"]); R[i] = walk(n["right_child"])
        return i
    walk(t["tree_structure"])
    trees.append({"f": f, "t": th, "l": L, "r": R, "v": v})


def raw(row):
    z = 0.0
    for t in trees:
        n = 0
        while t["f"][n] != -1:
            n = t["l"][n] if row[t["f"][n]] <= t["t"][n] else t["r"][n]
        z += t["v"][n]
    return z


Xt = X[te].to_numpy()
idx = np.random.default_rng(0).choice(len(Xt), 2000, replace=False)
mine = np.array([raw(Xt[i]) for i in idx])
lg_ = m.booster_.predict(Xt[idx], raw_score=True, num_iteration=m.best_iteration_)
print("export check: max |raw score difference| over 2000 test balls %.2e" % np.abs(mine - lg_).max())
out = {"feats": FEATS, "base": 0.0, "le": True, "trees": trees, "note": "LightGBM over exit speed, launch angle, landing bearing, hand (1 right, -1 left), temperature F, elevation ft, fence ft and wall height ft at the bearing; trained 2015-2024, early stopping on 2025-03-18..05-31",
       "test_brier": round(bri(p), 5), "test_brier_oracle": round(bri(p, orc), 5)}
json.dump(out, open(ROOT + "apps/web/public/whatif_model.json", "w"), separators=(",", ":"))
print("wrote apps/web/public/whatif_model.json, %d trees" % len(trees))
