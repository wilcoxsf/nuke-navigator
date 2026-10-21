#!/bin/bash
# Learning curve: XGBoost home-run Brier on the same test balls as the training set grows (12.5%, 25%, 50%, 100% of the training rows).
# If the curve is still falling at 100%, more data (for example Triple-A Statcast) is worth adding; if it is flat, we are information-limited.
# Below Normal via run_below_normal.ps1.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
export FEATSET=v2
for f in 0.125 0.25 0.5 1.0; do
  echo "== train fraction $f"
  mkdir -p $D/lc_$f
  $PY -W ignore bakeoff.py --data $D/bakeoff_features_v3.parquet --out-dir $D/lc_$f --entrant xgb --sample $f 2>&1 | grep -E "^xgb (train|done)" | cut -c1-200
  $PY -W ignore bakeoff_score.py --data $D/bakeoff_features_v3.parquet --pred-dir $D/lc_$f --out learning_curve_$f.md --boot 200 2>&1 | grep -E "^\| xgb" | cut -c1-200
done
echo "== finished"
