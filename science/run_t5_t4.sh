#!/bin/bash
# T5 (reconstruct-mode scoreboard) then T4 (Oracle weighting). Below Normal priority via run_below_normal.ps1 (RUN_SCRIPT=run_t5_t4.sh).
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived

echo "== T5 reconstruct mode"
export FEATSET=recon
mkdir -p $D/bakeoff_recon
for e in lgbm xgb; do
  [ -f $D/bakeoff_recon/pred_$e.parquet ] && { echo "$e already done"; continue; }
  $PY -W ignore bakeoff.py --data $D/bakeoff_features_v2.parquet --out-dir $D/bakeoff_recon --entrant $e 2>&1 | grep -E "done|Error"
done
$PY -W ignore bakeoff_score.py --data $D/bakeoff_features_v2.parquet --pred-dir $D/bakeoff_recon --out bakeoff_recon_results.md 2>&1 | grep -E "^\|" | cut -c1-220

echo "== T4 Oracle weighting"
export FEATSET=v2
$PY -W ignore oracle_weight.py --data $D/bakeoff_features_v2.parquet --out oracle_weight.md 2>&1 | tail -12
echo "== finished"
