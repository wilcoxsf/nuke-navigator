#!/bin/bash
# Model research queue 2 (below normal priority via run_below_normal.ps1). Base = contact-surprise features (v5r, XGBoost 0.01333).
#  1. recalibration (isotonic, Platt) and a stack with the physics net; no retraining
#  2. a deeper, slower XGBoost
#  3. XGBoost fitted directly on squared error (the Brier objective)
#  4. left/right reflection symmetry in the direction model, then XGBoost on it
#  5. LightGBM and CatBoost on the v5r features, then a stack of all of them
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
pair() { $Z paired.py --data $1 --a $2 --b $3 --label-a $4 --label-b $5 2>&1 | cut -c1-200; }
echo "== 1. recalibration"
$Z calib_stack.py --data $D/bakeoff_features_v5r.parquet --pred $D/v5_v5r/pred_xgb.parquet --out-dir $D/v7_calib 2>&1 | cut -c1-200
for n in iso platt; do pair $D/bakeoff_features_v5r.parquet $D/v5_v5r/pred_xgb.parquet $D/v7_calib/pred_$n.parquet v5r v5r_$n; done
echo "== 1b. stack: v5r xgboost + physics net + older boosted models"
mkdir -p $D/v7_stack
cp -f $D/v5_v5r/pred_xgb.parquet $D/v7_stack/pred_xgb_v5r.parquet
for m in diffphys_v3b lgbm_phys cat mlp; do cp -f $D/bakeoff_v3/pred_$m.parquet $D/v7_stack/pred_$m.parquet 2>/dev/null || cp -f $D/bakeoff_v2/pred_$m.parquet $D/v7_stack/pred_$m.parquet; done
$Z bakeoff_score.py --data $D/bakeoff_features_v5r.parquet --pred-dir $D/v7_stack --out v7_stack.md --boot 300 2>&1 | grep -E "^\| (stack|xgb_v5r|diffphys_v3b)" | cut -c1-200
echo "== 2. deeper, slower XGBoost (depth 10, lr 0.03, min child weight 100, colsample 0.5, 3000 trees)"
mkdir -p $D/v7_deep
XGB_DEPTH=10 XGB_LR=0.03 XGB_MCW=100 XGB_CS=0.5 XGB_N=3000 FEATSET=v5r $Z bakeoff.py --data $D/bakeoff_features_v5r.parquet --out-dir $D/v7_deep --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-160
pair $D/bakeoff_features_v5r.parquet $D/v5_v5r/pred_xgb.parquet $D/v7_deep/pred_xgb.parquet v5r v5r_deep
echo "== 3. Brier objective (squared error)"
mkdir -p $D/v7_brier
XGB_OBJ=brier FEATSET=v5r $Z bakeoff.py --data $D/bakeoff_features_v5r.parquet --out-dir $D/v7_brier --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-160
pair $D/bakeoff_features_v5r.parquet $D/v5_v5r/pred_xgb.parquet $D/v7_brier/pred_xgb.parquet v5r v5r_brierobj
echo "== 4. direction with left/right symmetry"
$Z direction_sym.py --data $D/bakeoff_features_v5r.parquet --out $D/bakeoff_features_v7.parquet 2>&1 | cut -c1-200
mkdir -p $D/v7_sym
FEATSET=v7 $Z bakeoff.py --data $D/bakeoff_features_v7.parquet --out-dir $D/v7_sym --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-160
pair $D/bakeoff_features_v7.parquet $D/v5_v5r/pred_xgb.parquet $D/v7_sym/pred_xgb.parquet v5r v7_sym
echo "== 5. LightGBM and CatBoost on v5r, then a full stack"
mkdir -p $D/v7_ens
for e in lgbm_phys cat; do
  FEATSET=v5r $Z bakeoff.py --data $D/bakeoff_features_v5r.parquet --out-dir $D/v7_ens --entrant $e 2>&1 | grep -E "done|Error|Traceback" | cut -c1-160
done
cp -f $D/v5_v5r/pred_xgb.parquet $D/v7_ens/pred_xgb.parquet
cp -f $D/bakeoff_v3/pred_diffphys_v3b.parquet $D/v7_ens/
$Z bakeoff_score.py --data $D/bakeoff_features_v5r.parquet --pred-dir $D/v7_ens --out v7_ens.md --boot 300 2>&1 | grep -E "^\| " | cut -c1-200
echo "== finished"
