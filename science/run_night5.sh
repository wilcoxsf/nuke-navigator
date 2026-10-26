#!/bin/bash
# Night 5 (24 Oct). Findings so far: the wide v37 everything-heads net (512-256-128, 5 seeds, last-3-epoch averaging) scores 0.01268 on test, better than the whole stack (0.01286); 20 epochs also helped on v19 (-0.00011);
# trees on OOF-net-head features improve (xgb v39b 0.01278), but the stack saturates (0.01283). So: push the net, make its outputs stackable (mlp_aux3 now writes val AND test rows), push the OOF feature net, replicate the width gain on the 2024 forward split.
#   E49a: the wide net again with val rows (so it can be stacked)     E49b: wide AND long (20 epochs)     E51: wider still (1024-512-256, 3 seeds)
#   E50: OOF wide net (4 folds x 2 seeds) -> v39c -> xgb 3 seeds + lgb -> stack    F: wide net on the 2024 forward split (5 seeds) against the standard 3-seed net there
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
V37=$D/bakeoff_features_v37.parquet
F19=$D/bakeoff_features_fwd2024_v19.parquet
pairv() { $Z paired.py --data $1 --a $2 --b $3 --label-a $4 --label-b $5 2>&1 | cut -c1-200; }
w() { n=$1; shift; echo "== $n $(date +%H:%M)"; mkdir -p $D/$n; FEATSET=v37 $Z mlp_aux3.py --data $V37 --out-dir $D/$n --variant everything "$@" 2>&1 | grep -E "done|Error|Traceback" | cut -c1-300
      pairv $V37 $D/v37_wide/pred_mlp.parquet $D/$n/pred_mlp.parquet wide5_E44 $n; }
w e49a_wide --hidden 512,256,128 --seeds 5 --swa 3
w e49b_wide_long --hidden 512,256,128 --seeds 5 --swa 3 --epochs 20
w e51_wider --hidden 1024,512,256 --seeds 3 --swa 3
echo "== F forward 2024: wide net, 5 seeds $(date +%H:%M)"
mkdir -p $D/f_n2_wide
FEATSET=v19 $Z mlp_aux3.py --data $F19 --out-dir $D/f_n2_wide --variant all --hidden 512,256,128 --seeds 5 --swa 3 2>&1 | grep -E "done|Error|Traceback" | cut -c1-300
echo "== F paired (2024): wide 5 seeds vs the standard 3-seed all-heads net"; pairv $F19 $D/f_n2/pred_mlp.parquet $D/f_n2_wide/pred_mlp.parquet standard3 wide5
echo "== E50 OOF wide net, 4 folds x 2 seeds $(date +%H:%M)"
mkdir -p $D/e50_oof
FEATSET=v37 $Z mlp_aux3.py --data $V37 --out-dir $D/e50_oof --variant everything --hidden 512,256,128 --swa 3 --oof 4 --seeds 2 2>&1 | grep -E "fold . done|done|Error|Traceback|oof train" | cut -c1-300
$Z merge_mlp_oof.py --base $V37 --oof $D/e50_oof/mlp_oof.parquet --out $D/bakeoff_features_v39c.parquet 2>&1 | tail -2
for sd in 0 1 2; do
  mkdir -p $D/v39c_s$sd
  echo "== xgb v39c seed $sd $(date +%H:%M)"
  SEED=$sd FEATSET=v39 $Z bakeoff.py --data $D/bakeoff_features_v39c.parquet --out-dir $D/v39c_s$sd --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-200
done
mkdir -p $D/v39c_avg
$Z - <<'PY' 2>&1 | cut -c1-200
import numpy as np, pandas as pd
D = "../data/derived/"
P = [pd.read_parquet(D + f"v39c_s{s}/pred_xgb.parquet").set_index("rid").p_hr for s in range(3)]
ix = P[0].index
for p in P[1:]:
    ix = ix.intersection(p.index)
pd.DataFrame({"rid": ix, "p_hr": np.mean([p.loc[ix].to_numpy() for p in P], axis=0)}).to_parquet(D + "v39c_avg/pred_xgb.parquet")
print("averaged v39c", len(ix))
PY
echo "== v39c xgb 3 seeds vs v39b xgb 3 seeds"; pairv $D/bakeoff_features_v39c.parquet $D/v39b_avg/pred_xgb.parquet $D/v39c_avg/pred_xgb.parquet v39b v39c
mkdir -p $D/v39c_lgbm_phys
echo "== lgbm_phys v39c $(date +%H:%M)"
FEATSET=v39 $Z bakeoff.py --data $D/bakeoff_features_v39c.parquet --out-dir $D/v39c_lgbm_phys --entrant lgbm_phys 2>&1 | grep -E "done|Error|Traceback" | cut -c1-200
echo "== v39c lgbm vs v39b lgbm"; pairv $D/bakeoff_features_v39c.parquet $D/v39b_lgbm_phys/pred_lgbm_phys.parquet $D/v39c_lgbm_phys/pred_lgbm_phys.parquet v39b_lgbm v39c_lgbm
# stacks: the E37 stack against stacks that include the wide nets and the best trees
E37="xgb=$D/v37_avg/pred_xgb.parquet phys=$D/v7_stack/pred_diffphys_v3b.parquet lgb=$D/v37_lgbm_phys/pred_lgbm_phys.parquet cat=$D/v37_cat/pred_cat.parquet mlp=$D/v37_mlp_everything/pred_mlp.parquet"
V5=$D/bakeoff_features_v5r.parquet
echo "== stack S1: E37 stack with the wide net (E49a) replacing the 3-seed MLP $(date +%H:%M)"
$Z stack_eval.py --data $V5 --base $E37 --swap mlp=$D/e49a_wide/pred_mlp.parquet 2>&1 | cut -c1-200
echo "== stack S2: S1 plus v39c trees (xgb, lgb) and cat v39b"
$Z stack_eval.py --data $V5 --base $E37 --swap mlp=$D/e49a_wide/pred_mlp.parquet xgb=$D/v39c_avg/pred_xgb.parquet lgb=$D/v39c_lgbm_phys/pred_lgbm_phys.parquet cat=$D/v39b_cat/pred_cat.parquet 2>&1 | cut -c1-200
echo "== stack S3: S2 plus the long net (E49b) and the wider net (E51) as extra components"
$Z stack_eval.py --data $V5 --base $E37 --swap mlp=$D/e49a_wide/pred_mlp.parquet xgb=$D/v39c_avg/pred_xgb.parquet lgb=$D/v39c_lgbm_phys/pred_lgbm_phys.parquet cat=$D/v39b_cat/pred_cat.parquet mlplong=$D/e49b_wide_long/pred_mlp.parquet mlpwider=$D/e51_wider/pred_mlp.parquet --out $D/final_stack_night5.parquet 2>&1 | cut -c1-200
echo "== night 5 finished $(date +%H:%M)"
