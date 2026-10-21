#!/bin/bash
# Bake-off v2 on the round-2 features (contact point + contact quality), narrow-table version to keep memory down.
# Launch at Below Normal priority: RUN_SCRIPT=run_bakeoff_v2.sh powershell -File run_below_normal.ps1. Entrants with predictions already on disk are skipped.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
export FEATSET=v2
[ -f $D/bakeoff_features_v2.parquet ] || $PY -W ignore bakeoff_data.py --exp $D/exp_features.parquet --games ../data/raw/game_context/games.parquet \
    --college $D/trackman_college_bbe.parquet --params flight_fit_results_params.json --out $D/bakeoff_features_v2.parquet 2>&1 | grep -E "^(bearing_hat|wrote)|Error"
mkdir -p $D/bakeoff_v2
for e in logit lgbm lgbm_phys xgb mlp; do
  [ -f $D/bakeoff_v2/pred_$e.parquet ] && { echo "$e already done"; continue; }
  $PY -W ignore bakeoff.py --data $D/bakeoff_features_v2.parquet --out-dir $D/bakeoff_v2 --entrant $e 2>&1 | grep -E "done|Error"
done
[ -f $D/bakeoff_v2/pred_diffphys.parquet ] || $PY -W ignore diffphys.py --data $D/bakeoff_features_v2.parquet --college $D/trackman_college_bbe.parquet \
    --params flight_fit_results_params.json --out-dir $D/bakeoff_v2 --epochs 6 --seeds 1 2>&1 | grep -E "done|Error"
[ -f $D/bakeoff_v2/pred_cat.parquet ] || $PY -W ignore bakeoff.py --data $D/bakeoff_features_v2.parquet --out-dir $D/bakeoff_v2 --entrant cat 2>&1 | grep -E "done|Error"
$PY -W ignore bakeoff_score.py --data $D/bakeoff_features_v2.parquet --pred-dir $D/bakeoff_v2 --out bakeoff_v2_results.md 2>&1 | tail -16
echo "== finished"
