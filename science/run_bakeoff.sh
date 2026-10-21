#!/bin/bash
# Full bake-off: every entrant on the full training set, then the scoreboard. Entrants that already have predictions are skipped,
# so the script can be re-run after a crash.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
DATA=../data/derived/bakeoff_features.parquet
OUT=../data/derived/bakeoff
mkdir -p "$OUT"
for e in logit lgbm lgbm_phys xgb mlp cat; do
  if [ -f "$OUT/pred_$e.parquet" ]; then echo "$e already done"; continue; fi
  $PY -W ignore bakeoff.py --data $DATA --out-dir $OUT --entrant $e 2>&1 | grep -v "epoch" | tail -4
done
if [ -f "$OUT/pred_diffphys.parquet" ]; then
  echo "diffphys already done"
fi
$PY -W ignore bakeoff_score.py --data $DATA --pred-dir $OUT --out bakeoff_results.md 2>&1 | tail -25
