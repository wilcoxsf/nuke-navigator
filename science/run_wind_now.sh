#!/bin/bash
# The wind test, run now beside night 5 instead of waiting behind it (the weather pull finished at 28,187 games): v41 = v37 + stadium-reported wind, XGBoost seed 0 against the v37 seed-0 XGBoost.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
echo "== wind features $(date +%H:%M)"
$Z build_wind_features.py --base $D/bakeoff_features_v37.parquet --out $D/bakeoff_features_v41w.parquet 2>&1 | cut -c1-200
mkdir -p $D/v41w_x
echo "== xgb v41 $(date +%H:%M)"
FEATSET=v41 $Z bakeoff.py --data $D/bakeoff_features_v41w.parquet --out-dir $D/v41w_x --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-200
echo "== WIND paired: xgb v41 vs xgb v37 (seed 0) $(date +%H:%M)"
$Z paired.py --data $D/bakeoff_features_v41w.parquet --a $D/v37_x/pred_xgb.parquet --b $D/v41w_x/pred_xgb.parquet --label-a v37 --label-b v41_wind 2>&1 | cut -c1-200
echo "== wind now finished $(date +%H:%M)"
