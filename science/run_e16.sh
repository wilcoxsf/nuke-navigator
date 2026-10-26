#!/bin/bash
# E16: carry-corrected flight shape (height at the fence, clearance over the wall, apex, hang time) as XGBoost features on top of v10. Runs after E15; paired against v10 and v5r.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
until grep -q "== finished" ../scratch/e15.log 2>/dev/null; do sleep 30; done
echo "== E16 features $(date +%H:%M)"
$Z carry_features3.py --data $D/bakeoff_features_v10.parquet --out $D/bakeoff_features_v16.parquet 2>&1 | grep -E "written|Error|Traceback" | cut -c1-260
mkdir -p $D/v16_x
echo "== E16 xgb $(date +%H:%M)"
FEATSET=v16 $Z bakeoff.py --data $D/bakeoff_features_v16.parquet --out-dir $D/v16_x --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-200
echo "== E16 paired vs v10 $(date +%H:%M)"
$Z paired.py --data $D/bakeoff_features_v16.parquet --a $D/v10_x/pred_xgb.parquet --b $D/v16_x/pred_xgb.parquet --label-a v10 --label-b v16 2>&1 | cut -c1-200
echo "== finished $(date +%H:%M)"
