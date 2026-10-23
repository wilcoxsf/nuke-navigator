#!/bin/bash
# E10: carry-corrected physics features for the production XGBoost (v10 = v5r + carry_hat, phys_dist_c, margin_c, carry_vs_prior). Waits for E9 to finish, then one job at a time.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
until [ -f e9_draws_in_stack.md ]; do sleep 30; done
echo "== E10 features $(date +%H:%M)"
$Z carry_features.py --data $D/bakeoff_features_v5r.parquet --out $D/bakeoff_features_v10.parquet 2>&1 | grep -E "R2|written|Error|Traceback|labels" | cut -c1-200
mkdir -p $D/v10_x
echo "== E10 xgb $(date +%H:%M)"
FEATSET=v10 $Z bakeoff.py --data $D/bakeoff_features_v10.parquet --out-dir $D/v10_x --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-200
echo "== E10 paired vs v5r $(date +%H:%M)"
$Z paired.py --data $D/bakeoff_features_v10.parquet --a $D/v5_v5r/pred_xgb.parquet --b $D/v10_x/pred_xgb.parquet --label-a v5r --label-b v10_carry 2>&1 | cut -c1-200
echo "== finished $(date +%H:%M)"
