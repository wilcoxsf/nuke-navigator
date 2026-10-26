#!/bin/bash
# E45: GPT brief-6 echo control. Is the all-heads MLP gain physical (distance, bearing, landing, batted-ball type) or an echo of the home-run label (the run-value head's target is partly DEFINED by the outcome, home runs included)?
# All on v19, all-heads recipe, 3 seeds, same epochs, paired on the main test. N2 is the E34 all-heads MLP (v34_all).
#   N0  HR only (no auxiliary head)          N0b HR only plus a second HR head (weight 0.5): extra HR gradient, no information
#   N1  distance + bearing + landing + batted-ball type, no run value
#   N2  N1 + run value (= E34)               N3  N2 with the run-value labels shuffled within (HR, EV/10, LA/10) strata (train rows)
#   N4  N2 with the run-value loss masked on actual home runs
# Then the rest of the chain (E40, E41, E43, E44, E42).
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
V19=$D/bakeoff_features_v19.parquet
pairv() { $Z paired.py --data $1 --a $2 --b $3 --label-a $4 --label-b $5 2>&1 | cut -c1-200; }
while ! grep -q "== finished" ../scratch/e37.log; do sleep 60; done
echo "== E37 finished, starting E45 echo factorial $(date +%H:%M)"
run() { n=$1; shift; echo "== $n $(date +%H:%M)"; FEATSET=v19 $Z mlp_aux2.py --data $V19 --out-dir $D/$n --variant all "$@" 2>&1 | grep -E "done|Error|Traceback|permuted" | cut -c1-300; }
run e45_n0 --w dist=0,brg=0,land=0,rv=0,bb=0
run e45_n1 --w rv=0
run e45_n3 --rv-perm
run e45_n4 --rv-nohr
run e45_n0b --w dist=0,brg=0,land=0,rv=0,bb=0,hr2=0.5
echo "== pairs"
pairv $V19 $D/e45_n0/pred_mlp.parquet $D/e45_n1/pred_mlp.parquet N0_hr_only N1_physical_heads
pairv $V19 $D/e45_n1/pred_mlp.parquet $D/v34_all/pred_mlp.parquet N1_no_runvalue N2_E34_all
pairv $V19 $D/v34_all/pred_mlp.parquet $D/e45_n3/pred_mlp.parquet N2_E34_all N3_runvalue_shuffled
pairv $V19 $D/v34_all/pred_mlp.parquet $D/e45_n4/pred_mlp.parquet N2_E34_all N4_runvalue_masked_on_HR
pairv $V19 $D/e45_n0/pred_mlp.parquet $D/e45_n0b/pred_mlp.parquet N0_hr_only N0b_double_HR
pairv $V19 $D/e45_n0/pred_mlp.parquet $D/v34_all/pred_mlp.parquet N0_hr_only N2_E34_all
echo "== E45 done $(date +%H:%M)"
bash run_e40_e45.sh
