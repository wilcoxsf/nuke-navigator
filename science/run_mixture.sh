#!/bin/bash
# GPT brief 7 question 2, phases A and B: the joint bearing-distance mixture (K=5) and its single-Gaussian control (K=1), then the paired comparisons of the guarded corrections against the wide net (e49a_wide, 0.01268).
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
for k in 5 1; do
  echo "== mixture K=$k $(date +%H:%M)"
  FEATSET=v37 $Z mixture_geo.py --k $k --epochs 8 --threads 4 --base $D/e49a_wide/pred_mlp.parquet --tag k$k 2>&1 | grep -v Warning | cut -c1-300
  for v in eta stack; do
    echo "-- paired: base vs K=$k $v"
    $Z paired.py --data $D/bakeoff_features_v5r.parquet --a $D/e49a_wide/pred_mlp.parquet --b $D/mixture_k$k/$v/pred.parquet --label-a wide --label-b k${k}_$v 2>&1 | cut -c1-200
  done
done
echo "== mixture finished $(date +%H:%M)"
