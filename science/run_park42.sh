#!/bin/bash
# v42 = v39b + the venue's trailing home-run miss as model inputs. XGBoost seed 0 against the v39b seed 0 run (same everything else).
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
echo "== build v42 $(date +%H:%M)"
$Z build_park_resid.py --base $D/bakeoff_features_v39b.parquet --out $D/bakeoff_features_v42.parquet 2>&1 | cut -c1-200
mkdir -p $D/v42_s0
echo "== xgb v42 seed 0 $(date +%H:%M)"
SEED=0 FEATSET=v42 $Z bakeoff.py --data $D/bakeoff_features_v42.parquet --out-dir $D/v42_s0 --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-200
echo "== PARK paired: xgb v42 vs xgb v39b (seed 0) $(date +%H:%M)"
$Z paired.py --data $D/bakeoff_features_v42.parquet --a $D/v39b_s0/pred_xgb.parquet --b $D/v42_s0/pred_xgb.parquet --label-a v39b --label-b v42_park 2>&1 | cut -c1-200
echo "== park42 finished $(date +%H:%M)"
