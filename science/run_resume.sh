#!/bin/bash
# Resume after the 23 Oct laptop crash. E22's direction model, rebuilt carry features and table (bakeoff_features_v22.parquet) were already saved; only its XGBoost and paired comparison were lost. Then the next wave (run_e30_e32.sh, whose wait line is removed).
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
mkdir -p $D/v22_x
echo "== E22 xgb on v10 columns, new bearing $(date +%H:%M)"
FEATSET=v10 $Z bakeoff.py --data $D/bakeoff_features_v22.parquet --out-dir $D/v22_x --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-200
echo "== E22 paired vs v10"
$Z paired.py --data $D/bakeoff_features_v22.parquet --a $D/v10_x/pred_xgb.parquet --b $D/v22_x/pred_xgb.parquet --label-a v10 --label-b v22_weighted_direction 2>&1 | cut -c1-200
echo "== finished $(date +%H:%M)"
bash run_e30_e32.sh > ../scratch/e30_e32.log 2>&1
