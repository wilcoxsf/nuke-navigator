#!/bin/bash
# E35 (our own drag dashboard: lagged league and park carry drift, v35 = v19 + 4 columns) and E36 (distance model specialized to the bat-tracking era, v36 = v30 + 2 columns).
# Starts itself when E34 has finished. Paired against v19 and v30 respectively (single seed screens).
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
until grep -q "== finished" ../scratch/e34.log 2>/dev/null; do sleep 30; done
pairv() { $Z paired.py --data $1 --a $2 --b $3 --label-a $4 --label-b $5 2>&1 | cut -c1-200; }
mkdir -p $D/v35_x
echo "== E35 xgb on v35 $(date +%H:%M)"
FEATSET=v35 $Z bakeoff.py --data $D/bakeoff_features_v35.parquet --out-dir $D/v35_x --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-200
echo "== E35 paired vs v19"; pairv $D/bakeoff_features_v35.parquet $D/v19_x/pred_xgb.parquet $D/v35_x/pred_xgb.parquet v19 v35
echo "== E36 bat-era distance model $(date +%H:%M)"
$Z distance_bat.py --data $D/bakeoff_features_v30.parquet --out $D/bakeoff_features_v36.parquet 2>&1 | grep -E "MAE|written|Error|Traceback" | cut -c1-300
mkdir -p $D/v36_x
echo "== E36 xgb on v36 $(date +%H:%M)"
FEATSET=v36 $Z bakeoff.py --data $D/bakeoff_features_v36.parquet --out-dir $D/v36_x --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-200
echo "== E36 paired vs v30"; pairv $D/bakeoff_features_v36.parquet $D/v30_x/pred_xgb.parquet $D/v36_x/pred_xgb.parquet v30 v36
echo "== E36 paired vs v19"; pairv $D/bakeoff_features_v36.parquet $D/v19_x/pred_xgb.parquet $D/v36_x/pred_xgb.parquet v19 v36
echo "== finished $(date +%H:%M)"
