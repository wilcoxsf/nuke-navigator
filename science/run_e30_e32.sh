#!/bin/bash
# Next wave, after E22. E19 showed that feeding the classifier a game-out-of-fold distance model is what helps, so:
#   E30  stronger and sharper distance supervision (full feature set, region model, quantile models; v30)    -> XGBoost, paired against the E19 model (v19) and v10
#   E31  more auxiliary targets (batted-ball type, fielder, outcome class, run value, landing coordinates; v31) -> XGBoost, paired against v19
#   E32  rebuild the stack members on the direct-distance features (LightGBM, CatBoost, MLP with the bearing head, two more XGBoost seeds) and test the stack
# One job at a time. Single-seed XGBoost differences under about 0.0002 are a screen, not a verdict.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
# (the wait for E22 is gone: run_resume.sh calls this script after E22)
pairv() { $Z paired.py --data $1 --a $2 --b $3 --label-a $4 --label-b $5 2>&1 | cut -c1-200; }
echo "== E30 distance models $(date +%H:%M)"
$Z distance_aux2.py --data $D/bakeoff_features_v19.parquet --out $D/bakeoff_features_v30.parquet 2>&1 | grep -E "out-of-fold|written|Error|Traceback" | cut -c1-240
mkdir -p $D/v30_x
echo "== E30 xgb $(date +%H:%M)"
FEATSET=v30 $Z bakeoff.py --data $D/bakeoff_features_v30.parquet --out-dir $D/v30_x --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-200
echo "== E30 paired vs v19 (E19 distance model)"; pairv $D/bakeoff_features_v30.parquet $D/v19_x/pred_xgb.parquet $D/v30_x/pred_xgb.parquet v19 v30
echo "== E30 paired vs v10"; pairv $D/bakeoff_features_v30.parquet $D/v10_x/pred_xgb.parquet $D/v30_x/pred_xgb.parquet v10 v30
echo "== E31 auxiliary targets $(date +%H:%M)"
$Z aux_targets.py --data $D/bakeoff_features_v19.parquet --out $D/bakeoff_features_v31.parquet 2>&1 | grep -E "^aux|written|Error|Traceback" | cut -c1-240
mkdir -p $D/v31_x
echo "== E31 xgb $(date +%H:%M)"
FEATSET=v31 $Z bakeoff.py --data $D/bakeoff_features_v31.parquet --out-dir $D/v31_x --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-200
echo "== E31 paired vs v19"; pairv $D/bakeoff_features_v31.parquet $D/v19_x/pred_xgb.parquet $D/v31_x/pred_xgb.parquet v19 v31
echo "== E32 members on v19 features $(date +%H:%M)"
for ent in lgbm_phys cat; do
  mkdir -p $D/v32_$ent
  FEATSET=v19 $Z bakeoff.py --data $D/bakeoff_features_v19.parquet --out-dir $D/v32_$ent --entrant $ent 2>&1 | grep -E "done|Error|Traceback" | cut -c1-200
done
mkdir -p $D/v32_mlp
MLP_BEARING=1 FEATSET=v19 $Z bakeoff.py --data $D/bakeoff_features_v19.parquet --out-dir $D/v32_mlp --entrant mlp 2>&1 | grep -E "done|Error|Traceback" | cut -c1-200
for sd in 1 2; do
  mkdir -p $D/seed_v19_$sd
  SEED=$sd FEATSET=v19 $Z bakeoff.py --data $D/bakeoff_features_v19.parquet --out-dir $D/seed_v19_$sd --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-200
done
mkdir -p $D/v32_avg
$Z - <<'PY' 2>&1 | cut -c1-200
import numpy as np, pandas as pd
D = "../data/derived/"
fs = [D + "v19_x/pred_xgb.parquet", D + "seed_v19_1/pred_xgb.parquet", D + "seed_v19_2/pred_xgb.parquet"]
P = [pd.read_parquet(f).set_index("rid").p_hr for f in fs]
ix = P[0].index
for p in P[1:]:
    ix = ix.intersection(p.index)
pd.DataFrame({"rid": ix, "p_hr": np.mean([p.loc[ix].to_numpy() for p in P], axis=0)}).to_parquet(D + "v32_avg/pred_xgb.parquet")
print("averaged", len(ix), "rows")
PY
echo "== E32 v19 three-seed vs v10 three-seed"; pairv $D/bakeoff_features_v19.parquet $D/v12_avg/pred_xgb.parquet $D/v32_avg/pred_xgb.parquet v10_3seed v19_3seed
B="xgb=$D/v7_stack/pred_xgb_v5r.parquet phys=$D/v7_stack/pred_diffphys_v3b.parquet lgb=$D/v7_stack/pred_lgbm_phys.parquet cat=$D/v7_stack/pred_cat.parquet mlp=$D/v7_stack/pred_mlp.parquet"
echo "== E32 stack C: all four members on v19 features (xgb 3 seeds, lgb, cat, mlp with bearing head) $(date +%H:%M)"
$Z stack_eval.py --data $D/bakeoff_features_v5r.parquet --base $B --swap xgb=$D/v32_avg/pred_xgb.parquet lgb=$D/v32_lgbm_phys/pred_lgbm_phys.parquet cat=$D/v32_cat/pred_cat.parquet mlp=$D/v32_mlp/pred_mlp.parquet --out $D/v32_mlp/pred_stack_c.parquet 2>&1 | cut -c1-200
echo "== E32 stack D: stack A (v16 xgb, v10 lgb, v10 cat, bearing-head mlp) against stack C"
$Z stack_eval.py --data $D/bakeoff_features_v5r.parquet --base xgb=$D/v17_avg/pred_xgb.parquet phys=$D/v7_stack/pred_diffphys_v3b.parquet lgb=$D/v15_lgbm_phys/pred_lgbm_phys.parquet cat=$D/v15_cat/pred_cat.parquet mlp=$D/v28_b1/pred_mlp.parquet --swap xgb=$D/v32_avg/pred_xgb.parquet lgb=$D/v32_lgbm_phys/pred_lgbm_phys.parquet cat=$D/v32_cat/pred_cat.parquet mlp=$D/v32_mlp/pred_mlp.parquet 2>&1 | cut -c1-200
echo "== finished $(date +%H:%M)"
