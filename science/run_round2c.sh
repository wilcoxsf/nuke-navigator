#!/bin/bash
# Round 2c: what the round 2b run could not do.
#   1. Exploratory test-period looks at H16 (park by geometry) and H15 (league drift memory) on top of H1+H4. The screening pool ends
#      2025-05-31 and barely contains the Athletics' new park, so the screen could not judge them. These are SECOND looks at the test
#      period (the first was the H1+H4+H13 confirmation); treat as diagnostics for a known problem, not as selection.
#   2. Bake-off v2 (the stage that crashed in 2b on a duplicate-column bug, now fixed).
# Launch at Below Normal priority: powershell -File run_below_normal.ps1 with RUN_SCRIPT=run_round2c.sh
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived

echo "== 1. H16 and H15 on the test period"
$PY -W ignore experiments.py confirm --data $D/exp_features_h12.parquet --keep H1,H4,H16 --out exp_confirm_h16.md 2>&1 | tail -18
$PY -W ignore experiments.py confirm --data $D/exp_features_h12.parquet --keep H1,H4,H15 --out exp_confirm_h15.md 2>&1 | tail -18

echo "== 2. bake-off v2"
export FEATSET=v2
$PY -W ignore bakeoff_data.py --exp $D/exp_features.parquet --games ../data/raw/game_context/games.parquet --college $D/trackman_college_bbe.parquet \
    --params flight_fit_results_params.json --out $D/bakeoff_features_v2.parquet 2>&1 | grep -E "^(bearing_hat|wrote)|Error"
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
