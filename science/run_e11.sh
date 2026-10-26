#!/bin/bash
# E11: cheap shots on the headline model, run after E10 finishes, one at a time.
#   a) bat-tracking specialist: XGBoost trained only on balls from 2023-07-14 (every training ball has its swing features), then a logit blend with the full-data v5r model;
#   b) three hyperparameter variants of the full-data v5r XGBoost (shallower, smaller leaves, fewer columns per tree).
# Each is scored paired against v5r on the 2025-06+ test period (differences under about 0.0002 Brier are noise).
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
until grep -q "== finished" ../scratch/e10.log 2>/dev/null; do sleep 30; done
pair() { $Z paired.py --data $D/bakeoff_features_v5r.parquet --a $D/v5_v5r/pred_xgb.parquet --b $1 --label-a v5r --label-b $2 2>&1 | cut -c1-200; }
echo "== E11a bat-tracking specialist $(date +%H:%M)"
mkdir -p $D/v11_bat
FROM_DATE=2023-07-14 FEATSET=v5r $Z bakeoff.py --data $D/bakeoff_features_v5r.parquet --out-dir $D/v11_bat --entrant xgb 2>&1 | grep -E "^xgb (train|done)|Error|Traceback" | cut -c1-200
pair $D/v11_bat/pred_xgb.parquet v11_bat_only
$Z blend_preds.py --data $D/bakeoff_features_v5r.parquet --a $D/v5_v5r/pred_xgb.parquet --b $D/v11_bat/pred_xgb.parquet --out $D/v11_bat/pred_blend.parquet 2>&1 | cut -c1-200
pair $D/v11_bat/pred_blend.parquet v11_blend_full_and_bat
for cfg in "d6:XGB_DEPTH=6" "mcw20:XGB_MCW=20" "cs5:XGB_CS=0.5"; do
  name=${cfg%%:*}; envs=${cfg#*:}
  echo "== E11b $name $(date +%H:%M)"
  mkdir -p $D/v11_$name
  env $envs FEATSET=v5r $Z bakeoff.py --data $D/bakeoff_features_v5r.parquet --out-dir $D/v11_$name --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-200
  pair $D/v11_$name/pred_xgb.parquet v11_$name
done
echo "== finished $(date +%H:%M)"
