#!/bin/bash
# Model research queue 3, runs after queue 2 finishes (below normal priority). Base = contact-surprise features (v5r).
#  1. average of three XGBoost seeds (free variance reduction)
#  2. monotone constraints on exit speed, physics distance and fence margin
#  3. recency weights (tau 4 years)
#  4. train on 2020 and later only
#  5. wall-crossing height from the physics flight (v8)
#  6. collision geometry features (v9)
cd "$(dirname "$0")"
until grep -q "== finished" v7.log; do sleep 45; done
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
pair() { $Z paired.py --data $1 --a $2 --b $3 --label-a $4 --label-b $5 2>&1 | cut -c1-200; }
echo "== 1. three-seed average"
mkdir -p $D/v8_avg
$Z - <<EOF
import pandas as pd
d = "$D"
ps = [pd.read_parquet(f).set_index("rid").p_hr for f in (f"{d}/v5_v5r/pred_xgb.parquet", f"{d}/seed_v5r_1/pred_xgb.parquet", f"{d}/seed_v5r_2/pred_xgb.parquet")]
m = pd.concat(ps, axis=1).mean(axis=1)
pd.DataFrame({"rid": m.index, "p_hr": m.to_numpy()}).to_parquet(f"{d}/v8_avg/pred_xgb.parquet")
print("averaged", len(m), "predictions")
EOF
pair $D/bakeoff_features_v5r.parquet $D/v5_v5r/pred_xgb.parquet $D/v8_avg/pred_xgb.parquet v5r_seed0 v5r_3seeds
echo "== 2. monotone constraints"
mkdir -p $D/v8_mono
XGB_MONO=1 FEATSET=v5r $Z bakeoff.py --data $D/bakeoff_features_v5r.parquet --out-dir $D/v8_mono --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-160
pair $D/bakeoff_features_v5r.parquet $D/v5_v5r/pred_xgb.parquet $D/v8_mono/pred_xgb.parquet v5r v5r_mono
echo "== 3. recency weights"
mkdir -p $D/v8_wt
WTAU=4 FEATSET=v5r $Z bakeoff.py --data $D/bakeoff_features_v5r.parquet --out-dir $D/v8_wt --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-160
pair $D/bakeoff_features_v5r.parquet $D/v5_v5r/pred_xgb.parquet $D/v8_wt/pred_xgb.parquet v5r v5r_recency
echo "== 4. train from 2020"
mkdir -p $D/v8_2020
FROM_YEAR=2020 FEATSET=v5r $Z bakeoff.py --data $D/bakeoff_features_v5r.parquet --out-dir $D/v8_2020 --entrant xgb 2>&1 | grep -E "^xgb (train|done)|Error|Traceback" | cut -c1-160
pair $D/bakeoff_features_v5r.parquet $D/v5_v5r/pred_xgb.parquet $D/v8_2020/pred_xgb.parquet v5r v5r_from2020
echo "== 6. collision geometry"
$Z collision_features.py --data $D/bakeoff_features_v5r.parquet --out $D/bakeoff_features_v9.parquet 2>&1 | cut -c1-200
mkdir -p $D/v8_coll
FEATSET=v9 $Z bakeoff.py --data $D/bakeoff_features_v9.parquet --out-dir $D/v8_coll --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-160
pair $D/bakeoff_features_v9.parquet $D/v5_v5r/pred_xgb.parquet $D/v8_coll/pred_xgb.parquet v5r v9_collision
echo "== 5. wall-crossing height"
$Z fence_height.py --data $D/bakeoff_features_v5r.parquet --v4 $D/bakeoff_features_v4.parquet --college $D/trackman_college_bbe.parquet --params flight_fit_results_params.json --out $D/bakeoff_features_v8.parquet 2>&1 | cut -c1-200
mkdir -p $D/v8_fh
FEATSET=v8 $Z bakeoff.py --data $D/bakeoff_features_v8.parquet --out-dir $D/v8_fh --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-160
pair $D/bakeoff_features_v8.parquet $D/v5_v5r/pred_xgb.parquet $D/v8_fh/pred_xgb.parquet v5r v8_fence_height
echo "== finished"
