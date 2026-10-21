#!/bin/bash
# Round 2b, start to finish. Full CPU, roughly 2.5 hours on an idle machine. Each step writes its own report, and entrant predictions are
# skipped if they already exist, so a crash resumes. Order is by importance: if you stop early, the early reports are still good.
#   1. H12 in-game memory: build features, screen against the cached baseline, confirm on the test period if it survives
#   2. ceiling diagnostic and near-wall specialist
#   3. full bake-off rebuilt on the round-2 features (contact point + contact quality): direction estimate re-derived, every entrant, stack
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived

echo "== 1. H12 in-game memory"
$PY -W ignore round3.py memory --data $D/exp_features.parquet --out $D/exp_features_h12.parquet 2>&1 | tail -3
$PY -W ignore experiments.py screen --only H12 --data $D/exp_features_h12.parquet --out-dir $D/exp --out exp_screen_h12.md 2>&1 | grep -E "^(baseline|H12)"
DEC=$($PY -c "import json;r=[x for x in json.load(open('exp_screen_h12.json'))['rows'] if x['id']=='H12'];print(r[0]['decision'] if r else 'NONE')")
echo "H12 screen decision: $DEC"
if [ "$DEC" = "KEEP" ] || [ "$DEC" = "MAYBE" ]; then
  $PY -W ignore experiments.py confirm --data $D/exp_features_h12.parquet --keep H1,H4,H12 --out exp_confirm_h12.md 2>&1 | tail -14
fi

echo "== 2. ceiling and specialist"
$PY -W ignore round3.py ceiling --data $D/exp_features.parquet --out round3_ceiling.md 2>&1 | tail -8
$PY -W ignore round3.py specialist --data $D/exp_features.parquet --out round3_specialist.md 2>&1 | tail -8

echo "== 3. bake-off v2"
export FEATSET=v2
$PY -W ignore bakeoff_data.py --exp $D/exp_features.parquet --games ../data/raw/game_context/games.parquet --college $D/trackman_college_bbe.parquet \
    --params flight_fit_results_params.json --out $D/bakeoff_features_v2.parquet 2>&1 | grep -E "^(bearing_hat|wrote)"
mkdir -p $D/bakeoff_v2
for e in logit lgbm lgbm_phys xgb mlp; do
  [ -f $D/bakeoff_v2/pred_$e.parquet ] && { echo "$e already done"; continue; }
  $PY -W ignore bakeoff.py --data $D/bakeoff_features_v2.parquet --out-dir $D/bakeoff_v2 --entrant $e 2>&1 | grep -E "done"
done
[ -f $D/bakeoff_v2/pred_diffphys.parquet ] || $PY -W ignore diffphys.py --data $D/bakeoff_features_v2.parquet --college $D/trackman_college_bbe.parquet \
    --params flight_fit_results_params.json --out-dir $D/bakeoff_v2 --epochs 6 --seeds 1 2>&1 | grep -E "done"
[ -f $D/bakeoff_v2/pred_cat.parquet ] || $PY -W ignore bakeoff.py --data $D/bakeoff_features_v2.parquet --out-dir $D/bakeoff_v2 --entrant cat 2>&1 | grep -E "done"
$PY -W ignore bakeoff_score.py --data $D/bakeoff_features_v2.parquet --pred-dir $D/bakeoff_v2 --out bakeoff_v2_results.md 2>&1 | tail -16
echo "== finished"
