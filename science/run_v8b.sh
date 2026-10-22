#!/bin/bash
# Rest of queue 3 after the system stopped run_v8.sh for low memory (steps 1 and 2 finished: three-seed average -0.00006, monotone -0.00003).
# Order by value: wall-crossing height (also the check on the Goner Grid engine), collision geometry, recency weights, train from 2020.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
pair() { $Z paired.py --data $1 --a $2 --b $3 --label-a $4 --label-b $5 2>&1 | cut -c1-200; }
echo "== 5. wall-crossing height"
$Z fence_height.py --data $D/bakeoff_features_v5r.parquet --v4 $D/bakeoff_features_v4.parquet --college $D/trackman_college_bbe.parquet --params flight_fit_results_params.json --out $D/bakeoff_features_v8.parquet 2>&1 | cut -c1-200
mkdir -p $D/v8_fh
FEATSET=v8 $Z bakeoff.py --data $D/bakeoff_features_v8.parquet --out-dir $D/v8_fh --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-160
pair $D/bakeoff_features_v8.parquet $D/v5_v5r/pred_xgb.parquet $D/v8_fh/pred_xgb.parquet v5r v8_fence_height
echo "== 6. collision geometry"
$Z collision_features.py --data $D/bakeoff_features_v5r.parquet --out $D/bakeoff_features_v9.parquet 2>&1 | cut -c1-200
mkdir -p $D/v8_coll
FEATSET=v9 $Z bakeoff.py --data $D/bakeoff_features_v9.parquet --out-dir $D/v8_coll --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-160
pair $D/bakeoff_features_v9.parquet $D/v5_v5r/pred_xgb.parquet $D/v8_coll/pred_xgb.parquet v5r v9_collision
echo "== 3. recency weights"
mkdir -p $D/v8_wt
WTAU=4 FEATSET=v5r $Z bakeoff.py --data $D/bakeoff_features_v5r.parquet --out-dir $D/v8_wt --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-160
pair $D/bakeoff_features_v5r.parquet $D/v5_v5r/pred_xgb.parquet $D/v8_wt/pred_xgb.parquet v5r v5r_recency
echo "== 4. train from 2020"
mkdir -p $D/v8_2020
FROM_YEAR=2020 FEATSET=v5r $Z bakeoff.py --data $D/bakeoff_features_v5r.parquet --out-dir $D/v8_2020 --entrant xgb 2>&1 | grep -E "^xgb (train|done)|Error|Traceback" | cut -c1-160
pair $D/bakeoff_features_v5r.parquet $D/v5_v5r/pred_xgb.parquet $D/v8_2020/pred_xgb.parquet v5r v5r_from2020
echo "== finished"
