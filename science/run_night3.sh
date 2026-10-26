#!/bin/bash
# Night 3, after night 2. Echo control answered (E45): the run-value head is not the source, the physical heads are. Now: WHICH physical head carries the gain, and what else the data can supervise.
#   H: head ablation on v19 (HR + one head, or pairs), weights as in the E34 recipe (dist 0.5, bearing 0.5, landing 0.1, batted-ball type 0.1), each paired against HR-only (N0) and against N1 (all four)
#   H3: landing and batted-ball weights tripled (0.3) to see if the small weights underuse them
#   R: regional stack (near-fence balls get their own stacker)
#   V: v37 features with the physical-heads-only recipe (no run value), 3 seeds, against the everything net (cheaper recipe, same result?)
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
V19=$D/bakeoff_features_v19.parquet
V37=$D/bakeoff_features_v37.parquet
pairv() { $Z paired.py --data $1 --a $2 --b $3 --label-a $4 --label-b $5 2>&1 | cut -c1-200; }
until grep -q "== night 2 finished" ../scratch/night2.log 2>/dev/null; do sleep 60; done
echo "== night 3 starting $(date +%H:%M)"
h() { n=$1; shift; echo "== $n $(date +%H:%M)"; FEATSET=v19 $Z mlp_aux3.py --data $V19 --out-dir $D/$n --variant all "$@" 2>&1 | grep -E "done|Error|Traceback" | cut -c1-300
      pairv $V19 $D/e45_n0/pred_mlp.parquet $D/$n/pred_mlp.parquet N0_hr_only $n; pairv $V19 $D/$n/pred_mlp.parquet $D/e45_n1/pred_mlp.parquet $n N1_all_four; }
h h_dist --w brg=0,land=0,bb=0,rv=0
h h_brg --w dist=0,land=0,bb=0,rv=0
h h_land --w dist=0,brg=0,bb=0,rv=0
h h_bb --w dist=0,brg=0,land=0,rv=0
h h_dist_brg --w land=0,bb=0,rv=0
h h_dist_brg_land --w bb=0,rv=0
h h_n1_x3 --w land=0.3,bb=0.3,rv=0
echo "== R regional stack on the E37 components $(date +%H:%M)"
$Z stack_region.py --data $D/bakeoff_features_v5r.parquet --comps xgb=$D/v37_avg/pred_xgb.parquet lgb=$D/v37_lgbm_phys/pred_lgbm_phys.parquet cat=$D/v37_cat/pred_cat.parquet mlp=$D/v37_mlp_everything6/pred_mlp.parquet 2>&1 | cut -c1-220
echo "== V v37 physical heads only (no run value, no fielder or outcome class), 3 seeds $(date +%H:%M)"
mkdir -p $D/v37_mlp_phys
FEATSET=v37 $Z mlp_aux3.py --data $V37 --out-dir $D/v37_mlp_phys --variant all --w rv=0 2>&1 | grep -E "done|Error|Traceback" | cut -c1-300
echo "== V paired: v37 physical-heads net vs the v37 everything net (3 seeds)"; pairv $V37 $D/v37_mlp_everything/pred_mlp.parquet $D/v37_mlp_phys/pred_mlp.parquet everything phys_only
echo "== night 3 finished $(date +%H:%M)"
