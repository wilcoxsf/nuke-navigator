#!/bin/bash
# v4: park identity (venue) and era-correct measured fence geometry with wall heights. XGBoost, same train/val/test split as the v2/v3 scoreboards.
#   v4a = v2 features + venue; v4b = v2 features + Savant fence and wall-height features; v4 = both. Below Normal via run_below_normal.ps1.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
$PY -W ignore savant_fence_features.py --data $D/bakeoff_features_v3.parquet --fence $D/parks/savant_fence_by_year.csv --out $D/bakeoff_features_v4.parquet 2>&1 | cut -c1-200
for fs in v4b v4a v4; do
  echo "== FEATSET $fs"
  mkdir -p $D/v4_$fs
  FEATSET=$fs $PY -W ignore bakeoff.py --data $D/bakeoff_features_v4.parquet --out-dir $D/v4_$fs --entrant xgb 2>&1 | grep -E "^xgb (train|done)|Error|Traceback" | cut -c1-200
  FEATSET=$fs $PY -W ignore bakeoff_score.py --data $D/bakeoff_features_v4.parquet --pred-dir $D/v4_$fs --out v4_$fs.md --boot 300 2>&1 | grep -E "^\| xgb" | cut -c1-200
done
echo "== finished"
