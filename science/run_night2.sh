#!/bin/bash
# Night 2 (23-24 Oct 2026), runs after the E45 + E40-E44 chain. One heavy job at a time.
#   F: forward replication on 2024 (train through 2023, val spring 2024, test 2024-05-16 to 09-30; the 2025-26 seasons are dropped): direct distance refit pre-2024 (E19 forward), then the MLP echo factorial forward
#   S: the all-heads MLP on v37 with 3 more seeds (6 seeds total)
#   M: TabM-mini-like input-adapter ensemble (K=4); H: heteroscedastic distance head; L: 20 epochs with last-3-epoch averaging; X2/X05: auxiliary weights doubled / halved
#   W: the v37 everything-heads net, wide, 5 seeds, last-3-epoch averaging
#   Final: stack with every new component that exists.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
V19=$D/bakeoff_features_v19.parquet
V37=$D/bakeoff_features_v37.parquet
F19=$D/bakeoff_features_fwd2024_v19.parquet
pairv() { $Z paired.py --data $1 --a $2 --b $3 --label-a $4 --label-b $5 2>&1 | cut -c1-200; }
until grep -q "^== finished" ../scratch/e45.log 2>/dev/null; do sleep 60; done
echo "== night 2 starting $(date +%H:%M)"
# F: forward
echo "== F direct distance on the 2024 forward table $(date +%H:%M)"
$Z direct_distance.py --data $D/bakeoff_features_fwd2024.parquet --out $F19 2>&1 | grep -E "MAE|written|Error|Traceback" | cut -c1-240
mkdir -p $D/v20_v19
echo "== F xgb v19 on the 2024 split $(date +%H:%M)"
FEATSET=v19 $Z bakeoff.py --data $F19 --out-dir $D/v20_v19 --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-200
echo "== F paired on 2024: v19 direct distance vs v5r"; pairv $F19 $D/v20_v5r/pred_xgb.parquet $D/v20_v19/pred_xgb.parquet v5r_2024 v19_2024
fmlp() { n=$1; shift; echo "== $n (2024 forward) $(date +%H:%M)"; FEATSET=v19 $Z mlp_aux3.py --data $F19 --out-dir $D/$n --variant all "$@" 2>&1 | grep -E "done|Error|Traceback|permuted" | cut -c1-300; }
fmlp f_n0 --w dist=0,brg=0,land=0,rv=0,bb=0
fmlp f_n1 --w rv=0
fmlp f_n2
fmlp f_n3 --rv-perm
echo "== F paired (2024): N1 physical heads vs N0 HR only"; pairv $F19 $D/f_n0/pred_mlp.parquet $D/f_n1/pred_mlp.parquet N0 N1
echo "== F paired (2024): N2 all heads vs N1"; pairv $F19 $D/f_n1/pred_mlp.parquet $D/f_n2/pred_mlp.parquet N1 N2
echo "== F paired (2024): N2 all heads vs N0 HR only"; pairv $F19 $D/f_n0/pred_mlp.parquet $D/f_n2/pred_mlp.parquet N0 N2
echo "== F paired (2024): N3 shuffled run value vs N2"; pairv $F19 $D/f_n2/pred_mlp.parquet $D/f_n3/pred_mlp.parquet N2 N3
echo "== F paired (2024): N2 all heads vs xgb v19"; pairv $F19 $D/v20_v19/pred_xgb.parquet $D/f_n2/pred_mlp.parquet xgb_v19_2024 N2_mlp_2024
# S: six seeds
echo "== S v37 everything heads, seeds 3-5 $(date +%H:%M)"
mkdir -p $D/v37_mlp_everything_s2
FEATSET=v37 $Z mlp_aux3.py --data $V37 --out-dir $D/v37_mlp_everything_s2 --variant everything --seed0 3 2>&1 | grep -E "done|Error|Traceback" | cut -c1-300
$Z - <<'PY' 2>&1 | cut -c1-200
import pandas as pd, os
D = "../data/derived/"
a = pd.read_parquet(D + "v37_mlp_everything/pred_mlp.parquet").set_index("rid")
b = pd.read_parquet(D + "v37_mlp_everything_s2/pred_mlp.parquet").set_index("rid").reindex(a.index)
os.makedirs(D + "v37_mlp_everything6", exist_ok=True)
pd.DataFrame({"rid": a.index, "p_hr": (a.p_hr + b.p_hr) / 2, "d_hat": (a.d_hat + b.d_hat) / 2}).to_parquet(D + "v37_mlp_everything6/pred_mlp.parquet")
print("averaged 6 seeds", len(a))
PY
echo "== S paired: 6 seeds vs 3 seeds"; pairv $V37 $D/v37_mlp_everything/pred_mlp.parquet $D/v37_mlp_everything6/pred_mlp.parquet 3seeds 6seeds
# the v19 variants, each paired against the E34 all-heads MLP
m3() { n=$1; shift; echo "== $n $(date +%H:%M)"; FEATSET=v19 $Z mlp_aux3.py --data $V19 --out-dir $D/$n --variant all "$@" 2>&1 | grep -E "done|Error|Traceback" | cut -c1-300; pairv $V19 $D/v34_all/pred_mlp.parquet $D/$n/pred_mlp.parquet mlp_all_v19 $n; }
m3 n2_mini4 --arch mini --k 4
m3 n2_distnll --dist-nll
m3 n2_long --epochs 20 --swa 3
m3 n2_x2 --w dist=1,brg=1,land=0.2,rv=0.2,bb=0.2
m3 n2_x05 --w dist=0.25,brg=0.25,land=0.05,rv=0.05,bb=0.05
# W: wide v37 everything
echo "== W v37 everything wide 5 seeds swa $(date +%H:%M)"
mkdir -p $D/v37_wide
FEATSET=v37 $Z mlp_aux3.py --data $V37 --out-dir $D/v37_wide --variant everything --hidden 512,256,128 --seeds 5 --swa 3 2>&1 | grep -E "done|Error|Traceback" | cut -c1-300
echo "== W paired: wide vs the 3-seed v37 everything net"; pairv $V37 $D/v37_mlp_everything/pred_mlp.parquet $D/v37_wide/pred_mlp.parquet everything3 wide5
# final: the E37 everything stack, swapping and adding whatever exists
B="xgb=$D/v7_stack/pred_xgb_v5r.parquet phys=$D/v7_stack/pred_diffphys_v3b.parquet lgb=$D/v7_stack/pred_lgbm_phys.parquet cat=$D/v7_stack/pred_cat.parquet mlp=$D/v7_stack/pred_mlp.parquet"
S="xgb=$D/v37_avg/pred_xgb.parquet lgb=$D/v37_lgbm_phys/pred_lgbm_phys.parquet cat=$D/v37_cat/pred_cat.parquet mlp=$D/v37_mlp_everything6/pred_mlp.parquet"
for pair in "mlpwide=$D/v37_wide/pred_mlp.parquet" "mlpall=$D/v37_mlp_all/pred_mlp.parquet" "mlpmini=$D/n2_mini4/pred_mlp.parquet" "mlppark=$D/e41_park/pred_mlp.parquet" "mlpids=$D/e43_ids/pred_mlp.parquet" "xgb38=$D/v38_x/pred_xgb.parquet"; do
  f="${pair#*=}"; [ -f "$f" ] && S="$S $pair"
done
echo "== final stack: E37 stack (everything MLP, 6 seeds) plus every new component that exists $(date +%H:%M)"
$Z stack_eval.py --data $D/bakeoff_features_v5r.parquet --base $B --swap $S --out $D/final_stack_night2.parquet 2>&1 | cut -c1-220
echo "== final stack against the E37 everything stack (3 seeds)"
$Z stack_eval.py --data $D/bakeoff_features_v5r.parquet --base xgb=$D/v37_avg/pred_xgb.parquet phys=$D/v7_stack/pred_diffphys_v3b.parquet lgb=$D/v37_lgbm_phys/pred_lgbm_phys.parquet cat=$D/v37_cat/pred_cat.parquet mlp=$D/v37_mlp_everything/pred_mlp.parquet --swap $S 2>&1 | cut -c1-220
echo "== night 2 finished $(date +%H:%M)"
