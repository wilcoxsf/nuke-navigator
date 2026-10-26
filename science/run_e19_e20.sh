#!/bin/bash
# E19 (E10 forensic ablation: direct-distance supervision vs the physics inversion) and E20 (forward replay on 2024). Runs after E18, one job at a time.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
until grep -q "== finished" ../scratch/e18.log 2>/dev/null; do sleep 30; done
echo "== E19 features $(date +%H:%M)"
$Z direct_distance.py --data $D/bakeoff_features_v5r.parquet --out $D/bakeoff_features_v19.parquet 2>&1 | grep -E "MAE|written|Error|Traceback" | cut -c1-240
mkdir -p $D/v19_x
echo "== E19 xgb $(date +%H:%M)"
FEATSET=v19 $Z bakeoff.py --data $D/bakeoff_features_v19.parquet --out-dir $D/v19_x --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-200
echo "== E19 paired: direct distance (v19) vs v5r"
$Z paired.py --data $D/bakeoff_features_v19.parquet --a $D/v5_v5r/pred_xgb.parquet --b $D/v19_x/pred_xgb.parquet --label-a v5r --label-b v19_direct 2>&1 | cut -c1-200
echo "== E19 paired: physics inversion (v10) vs direct distance (v19)"
$Z paired.py --data $D/bakeoff_features_v19.parquet --a $D/v19_x/pred_xgb.parquet --b $D/v10_x/pred_xgb.parquet --label-a v19_direct --label-b v10_physics 2>&1 | cut -c1-200
echo "== E20 forward replay features $(date +%H:%M)"
$Z forward_replay.py 2>&1 | grep -E "train |R2|written|Error|Traceback" | cut -c1-240
for fs in v5r v10; do
  mkdir -p $D/v20_$fs
  echo "== E20 xgb $fs on the 2024 split $(date +%H:%M)"
  FEATSET=$fs $Z bakeoff.py --data $D/bakeoff_features_fwd2024.parquet --out-dir $D/v20_$fs --entrant xgb 2>&1 | grep -E "^xgb (train|done)|Error|Traceback" | cut -c1-200
done
echo "== E20 paired on 2024: v10 vs v5r"
$Z paired.py --data $D/bakeoff_features_fwd2024.parquet --a $D/v20_v5r/pred_xgb.parquet --b $D/v20_v10/pred_xgb.parquet --label-a v5r_2024 --label-b v10_2024 2>&1 | cut -c1-200
echo "== finished $(date +%H:%M)"
