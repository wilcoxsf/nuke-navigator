#!/bin/bash
# Model research chain, below normal priority (run via run_below_normal.ps1):
#  1. paired test: contact surprise (v5r) against the baseline XGBoost, same seed;
#  2. noise floor: XGBoost seeds 1 and 2 on the baseline and on v5r (how much does the seed alone move the Brier?);
#  3. boundary-aware direction: nine sector probabilities (v6) and XGBoost on them.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
echo "== paired: v5r vs baseline (seed 0)"
$PY -W ignore paired.py --data $D/bakeoff_features_v5r.parquet --a $D/bakeoff_v2/pred_xgb.parquet --b $D/v5_v5r/pred_xgb.parquet --label-a base --label-b v5r 2>&1 | cut -c1-200
for sd in 1 2; do
  echo "== seed $sd, baseline features (v2)"
  mkdir -p $D/seed_base_$sd
  SEED=$sd FEATSET=v2 $PY -W ignore bakeoff.py --data $D/bakeoff_features_v3.parquet --out-dir $D/seed_base_$sd --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-160
  $PY -W ignore paired.py --data $D/bakeoff_features_v3.parquet --a $D/bakeoff_v2/pred_xgb.parquet --b $D/seed_base_$sd/pred_xgb.parquet --label-a seed0 --label-b seed$sd 2>&1 | head -2 | cut -c1-200
  echo "== seed $sd, contact surprise (v5r)"
  mkdir -p $D/seed_v5r_$sd
  SEED=$sd FEATSET=v5r $PY -W ignore bakeoff.py --data $D/bakeoff_features_v5r.parquet --out-dir $D/seed_v5r_$sd --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-160
  $PY -W ignore paired.py --data $D/bakeoff_features_v5r.parquet --a $D/seed_base_$sd/pred_xgb.parquet --b $D/seed_v5r_$sd/pred_xgb.parquet --label-a base_s$sd --label-b v5r_s$sd 2>&1 | cut -c1-200
done
echo "== sector probabilities"
$PY -W ignore direction_sectors.py --data $D/bakeoff_features_v5r.parquet --out $D/bakeoff_features_v6.parquet 2>&1 | cut -c1-200
mkdir -p $D/v6_v6
FEATSET=v6 $PY -W ignore bakeoff.py --data $D/bakeoff_features_v6.parquet --out-dir $D/v6_v6 --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-160
echo "== paired: v6 vs v5r (seed 0), v6 vs baseline"
$PY -W ignore paired.py --data $D/bakeoff_features_v6.parquet --a $D/v5_v5r/pred_xgb.parquet --b $D/v6_v6/pred_xgb.parquet --label-a v5r --label-b v6 2>&1 | cut -c1-200
$PY -W ignore paired.py --data $D/bakeoff_features_v6.parquet --a $D/bakeoff_v2/pred_xgb.parquet --b $D/v6_v6/pred_xgb.parquet --label-a base --label-b v6 2>&1 | cut -c1-200
echo "== finished"
