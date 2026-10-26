#!/bin/bash
# E12: does the E10 carry-feature gain (v10, -0.00012 single seed) reproduce? Seeds 1 and 2 of v10, a three-seed average against the three-seed average of v5r (v8_avg), and the production-style stack with the XGBoost swapped.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
until grep -q "== finished" ../scratch/e11.log 2>/dev/null; do sleep 30; done
for sd in 1 2; do
  echo "== E12 v10 seed $sd $(date +%H:%M)"
  mkdir -p $D/seed_v10_$sd
  SEED=$sd FEATSET=v10 $Z bakeoff.py --data $D/bakeoff_features_v10.parquet --out-dir $D/seed_v10_$sd --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-200
done
echo "== E12 three-seed average of v10 $(date +%H:%M)"
mkdir -p $D/v12_avg
$Z - <<'PY' 2>&1 | cut -c1-200
import numpy as np, pandas as pd
D = "../data/derived/"
fs = [D + "v10_x/pred_xgb.parquet", D + "seed_v10_1/pred_xgb.parquet", D + "seed_v10_2/pred_xgb.parquet"]
P = [pd.read_parquet(f).set_index("rid").p_hr for f in fs]
ix = P[0].index
for p in P[1:]:
    ix = ix.intersection(p.index)
avg = np.mean([p.loc[ix].to_numpy() for p in P], axis=0)
pd.DataFrame({"rid": ix, "p_hr": avg}).to_parquet(D + "v12_avg/pred_xgb.parquet")
print("averaged", len(ix), "rows")
PY
$Z paired.py --data $D/bakeoff_features_v10.parquet --a $D/v8_avg/pred_xgb.parquet --b $D/v12_avg/pred_xgb.parquet --label-a v5r_3seed --label-b v10_3seed 2>&1 | cut -c1-200
echo "== E12 stack swap $(date +%H:%M)"
$Z stack_eval.py --data $D/bakeoff_features_v5r.parquet --base xgb=$D/v7_stack/pred_xgb_v5r.parquet phys=$D/v7_stack/pred_diffphys_v3b.parquet lgb=$D/v7_stack/pred_lgbm_phys.parquet cat=$D/v7_stack/pred_cat.parquet mlp=$D/v7_stack/pred_mlp.parquet --swap xgb=$D/v12_avg/pred_xgb.parquet 2>&1 | cut -c1-200
echo "== finished $(date +%H:%M)"
