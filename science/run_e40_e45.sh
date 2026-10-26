#!/bin/bash
# E40-E45 (brief-6 ideas and Claude's own list), one at a time after E37 finishes (16 GB laptop, one heavy job at once). Control for every MLP idea is E34's all-heads MLP on v19 (data/derived/v34_all).
#   E40: out-of-fold multi-task MLP head outputs as XGBoost features (v38 = v19 + 10 columns), against XGBoost on v19 (v19_x)
#   E41: 30 counterfactual-park margin heads (weight 0.3)
#   E43: batter and pitcher ID embeddings with shrinkage
#   E44: wider net (512-256-128), five seeds, last-three-epoch averaging
#   E42: the foul balls as masked supervision (reduced feature set; its own control without fouls)
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
V19=$D/bakeoff_features_v19.parquet
pairv() { $Z paired.py --data $1 --a $2 --b $3 --label-a $4 --label-b $5 2>&1 | cut -c1-200; }
while ! grep -q "== finished" ../scratch/e37.log; do sleep 60; done
echo "== E37 finished, starting E40-E45 $(date +%H:%M)"
mlp() { # name, then extra args
  n=$1; shift
  echo "== $n $(date +%H:%M)"
  FEATSET=v19 $Z mlp_aux2.py --data $V19 --out-dir $D/$n --variant all "$@" 2>&1 | grep -E "done|Error|Traceback|oof train" | cut -c1-300
  [ -f $D/$n/pred_mlp.parquet ] && pairv $V19 $D/v34_all/pred_mlp.parquet $D/$n/pred_mlp.parquet mlp_all_v19 $n
}
# E40
echo "== E40 out-of-fold MLP heads (4 folds, 1 seed each) $(date +%H:%M)"
FEATSET=v19 $Z mlp_aux2.py --data $V19 --out-dir $D/e40_oof --variant all --oof 4 --seeds 1 2>&1 | grep -E "fold . done|done|Error|Traceback|oof train" | cut -c1-300
$Z merge_mlp_oof.py --base $V19 --oof $D/e40_oof/mlp_oof.parquet --out $D/bakeoff_features_v38.parquet
mkdir -p $D/v38_x
echo "== E40 xgb on v38 $(date +%H:%M)"
FEATSET=v38 $Z bakeoff.py --data $D/bakeoff_features_v38.parquet --out-dir $D/v38_x --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-200
echo "== E40 paired: xgb v38 vs xgb v19 (single seed)"; pairv $D/bakeoff_features_v38.parquet $D/v19_x/pred_xgb.parquet $D/v38_x/pred_xgb.parquet v19 v38
echo "== E40 paired: xgb v38 vs the E34 all-heads MLP"; pairv $D/bakeoff_features_v38.parquet $D/v34_all/pred_mlp.parquet $D/v38_x/pred_xgb.parquet mlp_all_v19 xgb_v38
mlp e41_park --park-w 0.3
mlp e43_ids --ids
mlp e44_wide --hidden 512,256,128 --seeds 5 --swa 3
# E42: control and treatment share the reduced feature set; the control is not comparable with v34_all, so pair it against its own control
echo "== E42 control (reduced features, no fouls) $(date +%H:%M)"
FEATSET=v19 $Z mlp_aux2.py --data $V19 --out-dir $D/e42_ctrl --variant all --reduced 2>&1 | grep -E "done|Error|Traceback|reduced" | cut -c1-300
echo "== E42 F1 (reduced features, fouls train fair/foul head only; same fair batches as control) $(date +%H:%M)"
FEATSET=v19 $Z mlp_aux2.py --data $V19 --out-dir $D/e42_f1 --variant all --reduced --fouls --no-foul-dist 2>&1 | grep -E "done|Error|Traceback|fair rows" | cut -c1-300
echo "== E42 F2 (fouls also train the distance head) $(date +%H:%M)"
FEATSET=v19 $Z mlp_aux2.py --data $V19 --out-dir $D/e42_fouls --variant all --reduced --fouls 2>&1 | grep -E "done|Error|Traceback|fair rows" | cut -c1-300
echo "== E42 paired: F1 vs control"; pairv $V19 $D/e42_ctrl/pred_mlp.parquet $D/e42_f1/pred_mlp.parquet reduced_ctrl F1_fair_foul_only
echo "== E42 paired: F2 vs control"; pairv $V19 $D/e42_ctrl/pred_mlp.parquet $D/e42_fouls/pred_mlp.parquet reduced_ctrl F2_with_foul_distance
echo "== finished $(date +%H:%M)"
