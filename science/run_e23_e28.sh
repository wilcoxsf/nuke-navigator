#!/bin/bash
# The cheap items from GPT's 60 (see Documents/NukeNavigator/GPT-BRIEF5-TRIAGE.md), one job at a time, each a single-seed XGBoost against the v10 single-seed baseline (differences under about 0.0002 are noise; a single seed is a screen, not a verdict):
#   E23 fence geometry (v23), E26 batter carry propensity (v26), E25 neighbour home-run rate (v25), E24 physics-versus-data disagreement (v24, needs E19's table), E28 MLP bearing head versus its control.
# E27 (residual expert) already ran: killed on its own rule.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
run_xgb() { # feature set, table
  mkdir -p $D/x_$1
  FEATSET=$1 $Z bakeoff.py --data $2 --out-dir $D/x_$1 --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-200
  $Z paired.py --data $2 --a $D/v10_x/pred_xgb.parquet --b $D/x_$1/pred_xgb.parquet --label-a v10 --label-b $1 2>&1 | cut -c1-200
}
echo "== E23 fence geometry $(date +%H:%M)"; run_xgb v23 $D/bakeoff_features_v23.parquet
echo "== E26 batter carry propensity $(date +%H:%M)"; run_xgb v26 $D/bakeoff_features_v26.parquet
echo "== E25 neighbours $(date +%H:%M)"
$Z knn_features.py --data $D/bakeoff_features_v10.parquet --out $D/bakeoff_features_v25.parquet 2>&1 | grep -E "written|Error|Traceback" | cut -c1-300
run_xgb v25 $D/bakeoff_features_v25.parquet
echo "== E24 disagreement $(date +%H:%M)"
if [ -f $D/bakeoff_features_v19.parquet ]; then
  $Z disagree_features.py --v10 $D/bakeoff_features_v10.parquet --v19 $D/bakeoff_features_v19.parquet --out $D/bakeoff_features_v24.parquet 2>&1 | grep -E "written|Error|Traceback" | cut -c1-300
  run_xgb v24 $D/bakeoff_features_v24.parquet
else
  echo "skipped: E19's table is missing"
fi
echo "== E28 MLP bearing head, control then head $(date +%H:%M)"
for flag in 0 1; do
  mkdir -p $D/v28_b$flag
  MLP_BEARING=$flag FEATSET=v10 $Z bakeoff.py --data $D/bakeoff_features_v10.parquet --out-dir $D/v28_b$flag --entrant mlp 2>&1 | grep -E "done|Error|Traceback" | cut -c1-200
done
$Z paired.py --data $D/bakeoff_features_v10.parquet --a $D/v28_b0/pred_mlp.parquet --b $D/v28_b1/pred_mlp.parquet --label-a mlp_control --label-b mlp_bearing_head 2>&1 | cut -c1-200
echo "== finished $(date +%H:%M)"
