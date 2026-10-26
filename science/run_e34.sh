#!/bin/bash
# E34: multi-task MLP heads (mlp_aux.py): bearing only (control), + landing coordinates, + landing coordinates, run value and batted-ball type; all on the v19 direct-distance features. Paired against the control, then the stack.
# Starts itself when E30 to E32 have finished (their log ends with "== finished").
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
until grep -q "== finished" ../scratch/e30_e32.log 2>/dev/null; do sleep 30; done
for v in bearing land all; do
  echo "== E34 mlp variant $v $(date +%H:%M)"
  FEATSET=v19 $Z mlp_aux.py --data $D/bakeoff_features_v19.parquet --out-dir $D/v34_$v --variant $v 2>&1 | grep -E "done|Error|Traceback" | cut -c1-240
done
for v in land all; do
  echo "== E34 paired: $v against the bearing-only control (MLP alone)"
  $Z paired.py --data $D/bakeoff_features_v19.parquet --a $D/v34_bearing/pred_mlp.parquet --b $D/v34_$v/pred_mlp.parquet --label-a mlp_bearing --label-b mlp_$v 2>&1 | cut -c1-200
done
B="xgb=$D/v7_stack/pred_xgb_v5r.parquet phys=$D/v7_stack/pred_diffphys_v3b.parquet lgb=$D/v7_stack/pred_lgbm_phys.parquet cat=$D/v7_stack/pred_cat.parquet mlp=$D/v7_stack/pred_mlp.parquet"
for v in bearing all; do
  echo "== E34 stack with the $v MLP (xgb 3 seeds, lgb, cat on v19 features) against the old base"
  $Z stack_eval.py --data $D/bakeoff_features_v5r.parquet --base $B --swap xgb=$D/v32_avg/pred_xgb.parquet lgb=$D/v32_lgbm_phys/pred_lgbm_phys.parquet cat=$D/v32_cat/pred_cat.parquet mlp=$D/v34_$v/pred_mlp.parquet 2>&1 | cut -c1-200
done
echo "== finished $(date +%H:%M)"
