#!/bin/bash
# E13: standardized carry margin and closed-form clearance probability as XGBoost features (v13 = v10 + carry_sd, margin_z, p_clear). Runs after E12; scored paired against v10 and against v5r.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
until grep -q "== finished" ../scratch/e12.log 2>/dev/null; do sleep 30; done
echo "== E13 features $(date +%H:%M)"
$Z carry_features2.py --data $D/bakeoff_features_v10.parquet --out $D/bakeoff_features_v13.parquet 2>&1 | cut -c1-250
mkdir -p $D/v13_x
echo "== E13 xgb $(date +%H:%M)"
FEATSET=v13 $Z bakeoff.py --data $D/bakeoff_features_v13.parquet --out-dir $D/v13_x --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-200
echo "== E13 paired vs v10 $(date +%H:%M)"
$Z paired.py --data $D/bakeoff_features_v13.parquet --a $D/v10_x/pred_xgb.parquet --b $D/v13_x/pred_xgb.parquet --label-a v10 --label-b v13 2>&1 | cut -c1-200
echo "== E13 paired vs v5r"
$Z paired.py --data $D/bakeoff_features_v13.parquet --a $D/v5_v5r/pred_xgb.parquet --b $D/v13_x/pred_xgb.parquet --label-a v5r --label-b v13 2>&1 | cut -c1-200
echo "== finished $(date +%H:%M)"
