"""Production vs research parity, per row (10 Nov 2026; GPT lockbox red team, finding 12): on the 2025-26 test balls (the same row ids in both), how far apart the
production and research predictions are, ball by ball (median, 95th and 99th percentile, maximum absolute difference), for the champion blend and each member,
and the worst months and venues. Predictions only; no outcome is read. Usage: NN_D=data/prod python science/prod_parity.py"""
import os

import numpy as np
import pandas as pd

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
R = ROOT + "data/derived/"
P = os.environ.get("NN_D", ROOT + "data/prod").rstrip("/").replace("../", ROOT) + "/"
t = pd.read_parquet(R + "bakeoff_features_v5r.parquet", columns=["rid", "split", "game_date", "venue_id"])
t = t[t.split == "test"]
PAIRS = {"champion blend": ("blend_c25_t200_m1500.parquet", "blend_prod.parquet"), "S3 stack": ("final8/S3.parquet", "final8/S3.parquet"),
         "xgb 3 seeds": ("v39c_avg/pred_xgb.parquet", "v39c_avg/pred_xgb.parquet"), "lgbm_phys": ("v39c_lgbm_phys/pred_lgbm_phys.parquet", "v39c_lgbm_phys/pred_lgbm_phys.parquet"),
         "cat": ("v39b_cat/pred_cat.parquet", "v39b_cat/pred_cat.parquet"), "diffphys": ("v7_stack/pred_diffphys_v3b.parquet", "v7_stack/pred_diffphys_v3b.parquet"),
         "wide net": ("e49a_wide/pred_mlp.parquet", "e49a_wide/pred_mlp.parquet"), "wide long net": ("e49b_wide_long/pred_mlp.parquet", "e49b_wide_long/pred_mlp.parquet"),
         "wider net": ("e51_wider/pred_mlp.parquet", "e51_wider/pred_mlp.parquet")}
worst = None
for name, (a, b) in PAIRS.items():
    try:
        x = pd.read_parquet(R + a).set_index("rid").p_hr; y = pd.read_parquet(P + b).set_index("rid").p_hr
    except FileNotFoundError as e:
        print(f"{name:15s} missing: {e.filename}"); continue
    ix = t.rid[t.rid.isin(x.index) & t.rid.isin(y.index)]
    d = (y.loc[ix] - x.loc[ix]).abs().to_numpy()
    print(f"{name:15s} {len(ix):,} balls: |prod - research| median {np.median(d):.6f}, 95th {np.percentile(d, 95):.5f}, 99th {np.percentile(d, 99):.5f}, max {d.max():.4f}")
    if name == "champion blend":
        worst = t.set_index("rid").loc[ix].assign(d=d)
if worst is not None:
    worst["month"] = pd.to_datetime(worst.game_date).dt.to_period("M")
    print("champion, by month (mean |diff|):", worst.groupby("month").d.mean().round(5).to_dict())
    print("champion, the five venues with the largest mean |diff|:", worst.groupby("venue_id").d.mean().sort_values(ascending=False).head(5).round(5).to_dict())
