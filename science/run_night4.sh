#!/bin/bash
# Night 4, after night 3. E40 found that OUT-OF-FOLD NEURAL HEAD OUTPUTS help trees (xgb v38 0.01300 vs v19 0.01316, paired -0.00017, near the wall -0.00114), unlike the tree-made auxiliary predictions of E31.
#   v39  = v37 (85 features) + the 10 E40 head outputs (from the v19 all-heads net, 1 seed per fold)
#   v39b = v37 + head outputs from a stronger OOF net (v37 features, everything heads, 2 seeds per fold, 4 folds)
# xgb 3 seeds on each, LightGBM on each, CatBoost on v39b, then stacks against the E37 stack. Same train/val/test windows; game folds; train rows carry out-of-fold head outputs, val and test the fold average.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
V37=$D/bakeoff_features_v37.parquet
pairv() { $Z paired.py --data $1 --a $2 --b $3 --label-a $4 --label-b $5 2>&1 | cut -c1-200; }
until grep -q "== night 3 finished" ../scratch/night3.log 2>/dev/null; do sleep 60; done
echo "== night 4 starting $(date +%H:%M)"
$Z merge_mlp_oof.py --base $V37 --oof $D/e40_oof/mlp_oof.parquet --out $D/bakeoff_features_v39.parquet 2>&1 | tail -2
echo "== OOF everything-heads net on v37, 4 folds x 2 seeds $(date +%H:%M)"
mkdir -p $D/e48_oof
FEATSET=v37 $Z mlp_aux3.py --data $V37 --out-dir $D/e48_oof --variant everything --oof 4 --seeds 2 2>&1 | grep -E "fold . done|done|Error|Traceback|oof train" | cut -c1-300
$Z merge_mlp_oof.py --base $V37 --oof $D/e48_oof/mlp_oof.parquet --out $D/bakeoff_features_v39b.parquet 2>&1 | tail -2
for v in v39 v39b; do
  T=$D/bakeoff_features_$v.parquet
  for sd in 0 1 2; do
    mkdir -p $D/${v}_s$sd
    echo "== xgb $v seed $sd $(date +%H:%M)"
    SEED=$sd FEATSET=v39 $Z bakeoff.py --data $T --out-dir $D/${v}_s$sd --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-200
  done
  mkdir -p $D/${v}_avg
  $Z - $v <<'PY' 2>&1 | cut -c1-200
import sys, numpy as np, pandas as pd
v = sys.argv[1]
D = "../data/derived/"
P = [pd.read_parquet(D + f"{v}_s{s}/pred_xgb.parquet").set_index("rid").p_hr for s in range(3)]
ix = P[0].index
for p in P[1:]:
    ix = ix.intersection(p.index)
pd.DataFrame({"rid": ix, "p_hr": np.mean([p.loc[ix].to_numpy() for p in P], axis=0)}).to_parquet(D + f"{v}_avg/pred_xgb.parquet")
print("averaged", v, len(ix))
PY
  echo "== $v xgb 3 seeds vs v37 xgb 3 seeds"; pairv $T $D/v37_avg/pred_xgb.parquet $D/${v}_avg/pred_xgb.parquet v37_3seed ${v}_3seed
  mkdir -p $D/${v}_lgbm_phys
  echo "== lgbm_phys $v $(date +%H:%M)"
  FEATSET=v39 $Z bakeoff.py --data $T --out-dir $D/${v}_lgbm_phys --entrant lgbm_phys 2>&1 | grep -E "done|Error|Traceback" | cut -c1-200
  echo "== $v lgbm vs v37 lgbm"; pairv $T $D/v37_lgbm_phys/pred_lgbm_phys.parquet $D/${v}_lgbm_phys/pred_lgbm_phys.parquet v37_lgbm ${v}_lgbm
done
mkdir -p $D/v39b_cat
echo "== cat v39b $(date +%H:%M)"
FEATSET=v39 $Z bakeoff.py --data $D/bakeoff_features_v39b.parquet --out-dir $D/v39b_cat --entrant cat 2>&1 | grep -E "done|Error|Traceback" | cut -c1-200
E37="xgb=$D/v37_avg/pred_xgb.parquet phys=$D/v7_stack/pred_diffphys_v3b.parquet lgb=$D/v37_lgbm_phys/pred_lgbm_phys.parquet cat=$D/v37_cat/pred_cat.parquet mlp=$D/v37_mlp_everything6/pred_mlp.parquet"
for v in v39 v39b; do
  echo "== stack: E37 stack with xgb and lgb from $v (cat stays v37) $(date +%H:%M)"
  $Z stack_eval.py --data $D/bakeoff_features_v5r.parquet --base $E37 --swap xgb=$D/${v}_avg/pred_xgb.parquet lgb=$D/${v}_lgbm_phys/pred_lgbm_phys.parquet 2>&1 | cut -c1-220
done
echo "== stack: E37 stack with xgb, lgb, cat from v39b $(date +%H:%M)"
$Z stack_eval.py --data $D/bakeoff_features_v5r.parquet --base $E37 --swap xgb=$D/v39b_avg/pred_xgb.parquet lgb=$D/v39b_lgbm_phys/pred_lgbm_phys.parquet cat=$D/v39b_cat/pred_cat.parquet --out $D/final_stack_night4.parquet 2>&1 | cut -c1-220
echo "== night 4 finished $(date +%H:%M)"
