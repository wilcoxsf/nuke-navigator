#!/bin/bash
# E37: the winning feature blocks combined (v37 = v19 direct distance + E30 distance models + E36 bat-era distance + E35 league/park carry drift; 85 features) with the strongest models:
#   a) XGBoost on v37 (seeds 0, 1, 2) against v35, v36 and v19;
#   b) the multi-task MLP on v37 with the E34 heads (all) and with every head (everything: also the fielder and the outcome class), against the E34 MLP on v19;
#   c) LightGBM-with-physics and CatBoost on v37;
#   d) the stacks: (xgb 3 seeds, lgb, cat, MLP everything) and (... MLP all) against the old base stack.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
pairv() { $Z paired.py --data $1 --a $2 --b $3 --label-a $4 --label-b $5 2>&1 | cut -c1-200; }
T=$D/bakeoff_features_v37.parquet
mkdir -p $D/v37_x
echo "== E37 xgb on v37 $(date +%H:%M)"
FEATSET=v37 $Z bakeoff.py --data $T --out-dir $D/v37_x --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-200
echo "== E37 paired vs v35"; pairv $T $D/v35_x/pred_xgb.parquet $D/v37_x/pred_xgb.parquet v35 v37
echo "== E37 paired vs v36"; pairv $T $D/v36_x/pred_xgb.parquet $D/v37_x/pred_xgb.parquet v36 v37
echo "== E37 paired vs v19"; pairv $T $D/v19_x/pred_xgb.parquet $D/v37_x/pred_xgb.parquet v19 v37
for v in all everything; do
  echo "== E37 multi-task MLP ($v heads) on v37 $(date +%H:%M)"
  FEATSET=v37 $Z mlp_aux.py --data $T --out-dir $D/v37_mlp_$v --variant $v 2>&1 | grep -E "done|Error|Traceback" | cut -c1-240
done
echo "== E37 MLP all on v37 against MLP all on v19 (E34)"; pairv $T $D/v34_all/pred_mlp.parquet $D/v37_mlp_all/pred_mlp.parquet mlp_all_v19 mlp_all_v37
echo "== E37 MLP everything against MLP all (both on v37)"; pairv $T $D/v37_mlp_all/pred_mlp.parquet $D/v37_mlp_everything/pred_mlp.parquet mlp_all mlp_everything
for ent in lgbm_phys cat; do
  mkdir -p $D/v37_$ent
  echo "== E37 $ent on v37 $(date +%H:%M)"
  FEATSET=v37 $Z bakeoff.py --data $T --out-dir $D/v37_$ent --entrant $ent 2>&1 | grep -E "done|Error|Traceback" | cut -c1-200
done
for sd in 1 2; do
  mkdir -p $D/seed_v37_$sd
  echo "== E37 xgb seed $sd $(date +%H:%M)"
  SEED=$sd FEATSET=v37 $Z bakeoff.py --data $T --out-dir $D/seed_v37_$sd --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-200
done
mkdir -p $D/v37_avg
$Z - <<'PY' 2>&1 | cut -c1-200
import numpy as np, pandas as pd
D = "../data/derived/"
fs = [D + "v37_x/pred_xgb.parquet", D + "seed_v37_1/pred_xgb.parquet", D + "seed_v37_2/pred_xgb.parquet"]
P = [pd.read_parquet(f).set_index("rid").p_hr for f in fs]
ix = P[0].index
for p in P[1:]:
    ix = ix.intersection(p.index)
pd.DataFrame({"rid": ix, "p_hr": np.mean([p.loc[ix].to_numpy() for p in P], axis=0)}).to_parquet(D + "v37_avg/pred_xgb.parquet")
print("averaged", len(ix), "rows")
PY
echo "== E37 xgb v37 three seeds vs v19 three seeds"; pairv $T $D/v32_avg/pred_xgb.parquet $D/v37_avg/pred_xgb.parquet v19_3seed v37_3seed
B="xgb=$D/v7_stack/pred_xgb_v5r.parquet phys=$D/v7_stack/pred_diffphys_v3b.parquet lgb=$D/v7_stack/pred_lgbm_phys.parquet cat=$D/v7_stack/pred_cat.parquet mlp=$D/v7_stack/pred_mlp.parquet"
for v in everything all; do
  echo "== E37 stack with the $v MLP: xgb 3 seeds, lgb, cat on v37 $(date +%H:%M)"
  $Z stack_eval.py --data $D/bakeoff_features_v5r.parquet --base $B --swap xgb=$D/v37_avg/pred_xgb.parquet lgb=$D/v37_lgbm_phys/pred_lgbm_phys.parquet cat=$D/v37_cat/pred_cat.parquet mlp=$D/v37_mlp_$v/pred_mlp.parquet --out $D/v37_mlp_$v/pred_stack.parquet 2>&1 | cut -c1-200
done
echo "== E37 best new stack against the E34 stack (xgb v19 3 seeds, lgb v19, cat v19, MLP all v19)"
$Z stack_eval.py --data $D/bakeoff_features_v5r.parquet --base xgb=$D/v32_avg/pred_xgb.parquet phys=$D/v7_stack/pred_diffphys_v3b.parquet lgb=$D/v32_lgbm_phys/pred_lgbm_phys.parquet cat=$D/v32_cat/pred_cat.parquet mlp=$D/v34_all/pred_mlp.parquet --swap xgb=$D/v37_avg/pred_xgb.parquet lgb=$D/v37_lgbm_phys/pred_lgbm_phys.parquet cat=$D/v37_cat/pred_cat.parquet mlp=$D/v37_mlp_everything/pred_mlp.parquet 2>&1 | cut -c1-200
echo "== finished $(date +%H:%M)"
