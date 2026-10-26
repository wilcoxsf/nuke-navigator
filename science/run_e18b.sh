#!/bin/bash
# E18 rerun (soft-label fit fixed; the teacher's out-of-fold probabilities are cached in data/derived/v18_distill/teacher_oof.npy, so this is three student fits), then hands over to run_e21_e22.sh.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
until grep -q "== finished" ../scratch/e19_e20.log 2>/dev/null; do sleep 30; done
echo "== E18b distill (students) $(date +%H:%M)"
$Z distill.py 2>&1 | grep -vE "^\s*$" | cut -c1-240
for al in 1.00 0.50 0.25; do
  echo "== E18b paired alpha $al vs v10 single seed"
  $Z paired.py --data $D/bakeoff_features_v10.parquet --a $D/v10_x/pred_xgb.parquet --b $D/v18_distill/pred_a$al.parquet --label-a v10 --label-b distill_a$al 2>&1 | cut -c1-200
done
echo "== E18b paired alpha 0.50 vs alpha 1.00 (same script)"
$Z paired.py --data $D/bakeoff_features_v10.parquet --a $D/v18_distill/pred_a1.00.parquet --b $D/v18_distill/pred_a0.50.parquet --label-a a1.00 --label-b a0.50 2>&1 | cut -c1-200
echo "== E18b paired alpha 0.25 vs alpha 1.00"
$Z paired.py --data $D/bakeoff_features_v10.parquet --a $D/v18_distill/pred_a1.00.parquet --b $D/v18_distill/pred_a0.25.parquet --label-a a1.00 --label-b a0.25 2>&1 | cut -c1-200
echo "== finished $(date +%H:%M)"
bash run_e21_e22.sh > ../scratch/e21_e22.log 2>&1
