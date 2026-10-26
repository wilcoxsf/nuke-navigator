#!/bin/bash
# E15: give the other stack members the E10 carry features too (LightGBM-with-physics and CatBoost on v10), then the full stack with all three swapped (XGBoost three-seed v10 average, LightGBM v10, CatBoost v10).
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
for ent in lgbm_phys cat; do
  echo "== E15 $ent on v10 $(date +%H:%M)"
  mkdir -p $D/v15_$ent
  FEATSET=v10 $Z bakeoff.py --data $D/bakeoff_features_v10.parquet --out-dir $D/v15_$ent --entrant $ent 2>&1 | grep -E "done|Error|Traceback" | cut -c1-200
done
echo "== E15 stack: xgb swapped only (reference) $(date +%H:%M)"
B="xgb=$D/v7_stack/pred_xgb_v5r.parquet phys=$D/v7_stack/pred_diffphys_v3b.parquet lgb=$D/v7_stack/pred_lgbm_phys.parquet cat=$D/v7_stack/pred_cat.parquet mlp=$D/v7_stack/pred_mlp.parquet"
$Z stack_eval.py --data $D/bakeoff_features_v5r.parquet --base $B --swap xgb=$D/v12_avg/pred_xgb.parquet 2>&1 | cut -c1-200
echo "== E15 stack: xgb, lgb and cat swapped $(date +%H:%M)"
$Z stack_eval.py --data $D/bakeoff_features_v5r.parquet --base $B --swap xgb=$D/v12_avg/pred_xgb.parquet lgb=$D/v15_lgbm_phys/pred_lgbm_phys.parquet cat=$D/v15_cat/pred_cat.parquet --out $D/v15_cat/pred_stack_v10.parquet 2>&1 | cut -c1-200
echo "== finished $(date +%H:%M)"
