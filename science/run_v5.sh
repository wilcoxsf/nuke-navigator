#!/bin/bash
# v5: (a) the better direction model (C5) propagated out of fold into the classifier table; (b) contact surprise on top of it.
# XGBoost on the same split as every earlier scoreboard (baseline v2: 0.01342). Below Normal via run_below_normal.ps1.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
echo "== direction C5, out of fold"
$PY -W ignore direction_c5_features.py --data $D/bakeoff_features_v3.parquet --out $D/bakeoff_features_v5.parquet 2>&1 | cut -c1-200
echo "== XGBoost on v5 (better direction estimate)"
mkdir -p $D/v5_v5
FEATSET=v5 $PY -W ignore bakeoff.py --data $D/bakeoff_features_v5.parquet --out-dir $D/v5_v5 --entrant xgb 2>&1 | grep -E "^xgb (train|done)|Error|Traceback" | cut -c1-200
FEATSET=v5 $PY -W ignore bakeoff_score.py --data $D/bakeoff_features_v5.parquet --pred-dir $D/v5_v5 --out v5_v5.md --boot 300 2>&1 | grep -E "^\| xgb" | cut -c1-200
echo "== contact surprise"
$PY -W ignore contact_surprise.py --data $D/bakeoff_features_v5.parquet --exp $D/exp_features.parquet --out $D/bakeoff_features_v5r.parquet 2>&1 | cut -c1-200
echo "== XGBoost on v5 plus contact-surprise residuals"
mkdir -p $D/v5_v5r
FEATSET=v5r $PY -W ignore bakeoff.py --data $D/bakeoff_features_v5r.parquet --out-dir $D/v5_v5r --entrant xgb 2>&1 | grep -E "^xgb (train|done)|Error|Traceback" | cut -c1-200
FEATSET=v5r $PY -W ignore bakeoff_score.py --data $D/bakeoff_features_v5r.parquet --pred-dir $D/v5_v5r --out v5_v5r.md --boot 300 2>&1 | grep -E "^\| xgb" | cut -c1-200
echo "== finished"
