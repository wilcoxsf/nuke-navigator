#!/bin/bash
# Night 7 (24 Oct): the stadium-reported wind, then the regularizer and architecture sweep on the v19 all-heads recipe (3 seeds, paired against the E34 net v34_all, test Brier 0.01299).
#   WIND: v41 = v37 + wind_out, wind_cross, wind_mph, roof_closed, temp_gd (MLB Stats API game-day weather). XGBoost v41 vs v37 (seed 0), and the v37 everything-heads MLP against itself with the wind columns added (3 seeds, vs 0.01285).
#   SWEEP: denoising head (15%, 30%), distance-bin and bearing-bin classification heads, residual body (2 blocks 256; 4 blocks 512), batch 2048, dropout 0.2, weight decay 1e-4, peak LR 1.5e-3.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
V19=$D/bakeoff_features_v19.parquet
V37=$D/bakeoff_features_v37.parquet
pairv() { $Z paired.py --data $1 --a $2 --b $3 --label-a $4 --label-b $5 2>&1 | cut -c1-200; }
until grep -q "== night 6 finished" ../scratch/night6.log 2>/dev/null; do sleep 60; done
until grep -q "with wind text" ../scratch/weather_pull2.log 2>/dev/null; do sleep 30; done
echo "== night 7 starting $(date +%H:%M)"
echo "== wind features $(date +%H:%M)"
$Z build_wind_features.py --base $V37 --out $D/bakeoff_features_v41.parquet 2>&1 | cut -c1-200
mkdir -p $D/v41_x
echo "== xgb v41 $(date +%H:%M)"
FEATSET=v41 $Z bakeoff.py --data $D/bakeoff_features_v41.parquet --out-dir $D/v41_x --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-200
echo "== WIND paired: xgb v41 vs xgb v37 (seed 0)"; pairv $D/bakeoff_features_v41.parquet $D/v37_x/pred_xgb.parquet $D/v41_x/pred_xgb.parquet v37 v41_wind
mkdir -p $D/v41_mlp
echo "== v41 everything-heads MLP, 3 seeds $(date +%H:%M)"
FEATSET=v41 $Z mlp_aux5.py --data $D/bakeoff_features_v41.parquet --out-dir $D/v41_mlp --variant everything 2>&1 | grep -E "done|Error|Traceback" | cut -c1-300
echo "== WIND paired: v41 MLP vs v37 MLP (everything heads, 3 seeds)"; pairv $D/bakeoff_features_v41.parquet $D/v37_mlp_everything/pred_mlp.parquet $D/v41_mlp/pred_mlp.parquet v37_everything v41_everything
s() { n=$1; shift; echo "== $n $(date +%H:%M)"; mkdir -p $D/$n; FEATSET=v19 $Z mlp_aux5.py --data $V19 --out-dir $D/$n --variant all "$@" 2>&1 | grep -E "done|Error|Traceback" | cut -c1-300; pairv $V19 $D/v34_all/pred_mlp.parquet $D/$n/pred_mlp.parquet mlp_all_v19 $n; }
s n7_dae15 --dae 0.15
s n7_dae30 --dae 0.30
s n7_bins --dist-bins 12 --brg-bins 9
s n7_res2 --res 2 --hidden 256,128
s n7_res4 --res 4 --hidden 512,256
s n7_bs2048 --bs 2048
s n7_drop2 --drop 0.2
s n7_wd --wd 1e-4
s n7_lr15 --lr 1.5e-3
echo "== night 7 finished $(date +%H:%M)"
