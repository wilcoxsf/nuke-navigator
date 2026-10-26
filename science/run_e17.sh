#!/bin/bash
# E17: (a) does E16 (flight-shape features, v16, -0.00005 / near-wall -0.00035 single seed, borderline) reproduce? seeds 1 and 2, three-seed average against the three-seed v10 average (v12_avg);
#      (b) the MLP on v10 features (the stack's MLP still has the old ones); (c) the full stack with the XGBoost v16 three-seed average, LightGBM v10, CatBoost v10 and MLP v10 swapped in.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
for sd in 1 2; do
  echo "== E17 v16 seed $sd $(date +%H:%M)"
  mkdir -p $D/seed_v16_$sd
  SEED=$sd FEATSET=v16 $Z bakeoff.py --data $D/bakeoff_features_v16.parquet --out-dir $D/seed_v16_$sd --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-200
done
mkdir -p $D/v17_avg
$Z - <<'PY' 2>&1 | cut -c1-200
import numpy as np, pandas as pd
D = "../data/derived/"
fs = [D + "v16_x/pred_xgb.parquet", D + "seed_v16_1/pred_xgb.parquet", D + "seed_v16_2/pred_xgb.parquet"]
P = [pd.read_parquet(f).set_index("rid").p_hr for f in fs]
ix = P[0].index
for p in P[1:]:
    ix = ix.intersection(p.index)
pd.DataFrame({"rid": ix, "p_hr": np.mean([p.loc[ix].to_numpy() for p in P], axis=0)}).to_parquet(D + "v17_avg/pred_xgb.parquet")
print("averaged", len(ix), "rows")
PY
echo "== E17 v16 three-seed vs v10 three-seed"
$Z paired.py --data $D/bakeoff_features_v16.parquet --a $D/v12_avg/pred_xgb.parquet --b $D/v17_avg/pred_xgb.parquet --label-a v10_3seed --label-b v16_3seed 2>&1 | cut -c1-200
echo "== E17 mlp on v10 $(date +%H:%M)"
mkdir -p $D/v17_mlp
FEATSET=v10 $Z bakeoff.py --data $D/bakeoff_features_v10.parquet --out-dir $D/v17_mlp --entrant mlp 2>&1 | grep -E "done|Error|Traceback" | cut -c1-200
B="xgb=$D/v7_stack/pred_xgb_v5r.parquet phys=$D/v7_stack/pred_diffphys_v3b.parquet lgb=$D/v7_stack/pred_lgbm_phys.parquet cat=$D/v7_stack/pred_cat.parquet mlp=$D/v7_stack/pred_mlp.parquet"
echo "== E17 stack: xgb v10 3-seed, lgb v10, cat v10, mlp v10 $(date +%H:%M)"
$Z stack_eval.py --data $D/bakeoff_features_v5r.parquet --base $B --swap xgb=$D/v12_avg/pred_xgb.parquet lgb=$D/v15_lgbm_phys/pred_lgbm_phys.parquet cat=$D/v15_cat/pred_cat.parquet mlp=$D/v17_mlp/pred_mlp.parquet 2>&1 | cut -c1-200
echo "== E17 stack: same with xgb v16 3-seed"
$Z stack_eval.py --data $D/bakeoff_features_v5r.parquet --base $B --swap xgb=$D/v17_avg/pred_xgb.parquet lgb=$D/v15_lgbm_phys/pred_lgbm_phys.parquet cat=$D/v15_cat/pred_cat.parquet mlp=$D/v17_mlp/pred_mlp.parquet --out $D/v17_mlp/pred_stack_v16.parquet 2>&1 | cut -c1-200
echo "== finished $(date +%H:%M)"
