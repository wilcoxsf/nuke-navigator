#!/bin/bash
# E21 (direction-uncertainty features) and E22 (geometry-weighted direction model, fully nested). Starts itself when E19/E20 have finished.
#   E21: sigma_b, dir_unc_ft, margin_z2 on top of v10 -> XGBoost -> paired against v10 (single seed).
#   E22: direction_weighted.py (weights by fence steepness and closeness to the fence) -> carry features rebuilt on the NEW bearing from the cached labels -> XGBoost on the same 73 columns -> paired against v10.
#        The whole chain downstream of the direction is refit, per GPT's nested-OOF rule. If E22 wins, the follow-ups (seeds, flight-shape features on the new bearing, stack swap) go in run_e22b.sh.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
until grep -q "== finished" ../scratch/e19_e20.log 2>/dev/null; do sleep 30; done
bash run_e23_e28.sh > ../scratch/e23_e28.log 2>&1   # the cheap items first (about 80 minutes), then E21 and E22
echo "== E21 sigma features $(date +%H:%M)"
$Z sigma_bearing_features.py --data $D/bakeoff_features_v10.parquet --out $D/bakeoff_features_v21.parquet 2>&1 | grep -E "sigma model|written|Error|Traceback" | cut -c1-260
mkdir -p $D/v21_x
echo "== E21 xgb $(date +%H:%M)"
FEATSET=v21 $Z bakeoff.py --data $D/bakeoff_features_v21.parquet --out-dir $D/v21_x --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-200
echo "== E21 paired vs v10"
$Z paired.py --data $D/bakeoff_features_v21.parquet --a $D/v10_x/pred_xgb.parquet --b $D/v21_x/pred_xgb.parquet --label-a v10 --label-b v21_sigma 2>&1 | cut -c1-200
echo "== E22 weighted direction $(date +%H:%M)"
$Z direction_weighted.py --data $D/bakeoff_features_v10.parquet --out $D/bakeoff_features_v22a.parquet 2>&1 | grep -E "weights|fold|train|validation|test|wrote|Error|Traceback" | cut -c1-420
echo "== E22 carry features rebuilt on the new bearing $(date +%H:%M)"
$Z carry_features.py --data $D/bakeoff_features_v22a.parquet --out $D/bakeoff_features_v22.parquet --logm $D/bakeoff_features_v10.parquet.logm.npy 2>&1 | grep -E "R2|written|Error|Traceback" | cut -c1-240
mkdir -p $D/v22_x
echo "== E22 xgb on v10 columns, new bearing $(date +%H:%M)"
FEATSET=v10 $Z bakeoff.py --data $D/bakeoff_features_v22.parquet --out-dir $D/v22_x --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-200
echo "== E22 paired vs v10"
$Z paired.py --data $D/bakeoff_features_v22.parquet --a $D/v10_x/pred_xgb.parquet --b $D/v22_x/pred_xgb.parquet --label-a v10 --label-b v22_weighted_direction 2>&1 | cut -c1-200
echo "== finished $(date +%H:%M)"
