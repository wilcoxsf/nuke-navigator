"""What the rolling meta-learner corrects (8 Nov 2026): one fit on every validation and test ball (in-sample, for insight only, never scored), gain importance per
feature, and the mean correction (meta logit minus base logit) by near-wall band, park and launch-angle band. Usage: python science/meta_explain.py"""
import runpy
import sys

import numpy as np
import pandas as pd

sys.argv = ["meta_rolling.py", "--base", "S3", "--trees", "200", "--minleaf", "1500", "--tag", "explain_tmp"]
g = runpy.run_path("C:/Users/andrewwi/dev/nuke-navigator-new/science/meta_rolling.py", run_name="__main__")
import lightgbm as lgb
base, feats, P = g["base"], g["feats"], g["P"]
ds = lgb.Dataset(base[feats], base.y, init_score=base.l_base, categorical_feature=[c for c in ["venue"] if c in feats])
bst = lgb.train(P, ds, num_boost_round=200)
imp = pd.Series(bst.feature_importance("gain"), index=feats).sort_values(ascending=False)
print("\ngain importance (share):"); print((imp / imp.sum()).round(3).head(20).to_string())
corr = bst.predict(base[feats], raw_score=True)
b = base.assign(cx=corr)
b["band"] = pd.cut(b.margin_hat, [-999, -60, -30, -15, 0, 15, 30, 60, 999])
print("\nmean correction (logit) and count by predicted margin to the fence (ft):"); print(b.groupby("band", observed=True).cx.agg(["mean", "std", "count"]).round(3).to_string())
print("\nby park (busiest 12):"); top = b.venue.value_counts().index[:12]; print(b[b.venue.isin(top)].groupby("venue").cx.agg(["mean", "count"]).round(3).to_string())
b["laband"] = pd.cut(b.launch_angle, [-90, 15, 22, 28, 34, 40, 90])
print("\nby launch angle:"); print(b.groupby("laband", observed=True).cx.agg(["mean", "count"]).round(3).to_string())
