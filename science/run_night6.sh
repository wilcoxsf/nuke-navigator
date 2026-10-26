#!/bin/bash
# E53: is the batted-ball-type head's gain information or only regularization? Same recipe as the head ablation h_bb (v19, HR + bb_type head weight 0.1, 3 seeds, test Brier 0.01313 against HR-only 0.01336).
#   real bb_type (h_bb, already run)   launch-angle band of the input (no new information)   bb_type shuffled within HR/EV/LA strata
# Waits for night 5 to finish.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
V19=$D/bakeoff_features_v19.parquet
pairv() { $Z paired.py --data $1 --a $2 --b $3 --label-a $4 --label-b $5 2>&1 | cut -c1-200; }
until grep -q "== night 5 finished" ../scratch/night5.log 2>/dev/null; do sleep 60; done
echo "== night 6 starting $(date +%H:%M)"
b() { n=$1; shift; echo "== $n $(date +%H:%M)"; mkdir -p $D/$n; FEATSET=v19 $Z mlp_aux4.py --data $V19 --out-dir $D/$n --variant all --w dist=0,brg=0,land=0,rv=0,bb=0.1 "$@" 2>&1 | grep -E "done|Error|Traceback|replaced|permuted" | cut -c1-300; }
b e53_bb_la --bb-from-la
b e53_bb_perm --bb-perm
echo "== E53 paired: real bb_type head vs launch-angle-band head (no new information)"; pairv $V19 $D/h_bb/pred_mlp.parquet $D/e53_bb_la/pred_mlp.parquet real_bb_type la_band
echo "== E53 paired: real bb_type head vs shuffled bb_type"; pairv $V19 $D/h_bb/pred_mlp.parquet $D/e53_bb_perm/pred_mlp.parquet real_bb_type shuffled_bb_type
echo "== E53 paired: launch-angle-band head vs HR only"; pairv $V19 $D/e45_n0/pred_mlp.parquet $D/e53_bb_la/pred_mlp.parquet HR_only la_band
echo "== E53 paired: shuffled bb_type vs HR only"; pairv $V19 $D/e45_n0/pred_mlp.parquet $D/e53_bb_perm/pred_mlp.parquet HR_only shuffled_bb
echo "== night 6 finished $(date +%H:%M)"
