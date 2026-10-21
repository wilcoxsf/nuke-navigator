#!/bin/bash
# Smoke test: every bake-off entrant on a small training sample, into a scratch directory.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
DATA=../data/derived/bakeoff_features.parquet
OUT=../data/derived/bakeoff_smoke
rm -rf "$OUT"
for e in logit lgbm lgbm_phys xgb cat; do
  $PY -W ignore bakeoff.py --data $DATA --out-dir $OUT --entrant $e --sample 0.05 2>&1 | tail -3
done
$PY -W ignore bakeoff.py --data $DATA --out-dir $OUT --entrant mlp --sample 0.05 2>&1 | tail -4
$PY -W ignore diffphys.py --data $DATA --college ../data/derived/trackman_college_bbe.parquet --params flight_fit_results_params.json --out-dir $OUT --sample 0.03 --epochs 1 2>&1 | tail -6
$PY -W ignore bakeoff_score.py --data $DATA --pred-dir $OUT --out bakeoff_smoke.md --boot 50 2>&1 | tail -20
