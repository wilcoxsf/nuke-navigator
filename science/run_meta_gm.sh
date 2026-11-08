#!/bin/bash
# 8 Nov: the in-game carry term's shrinkage and within-game decay, on 2024 forward only, each blended 50/50 with the layer and paired against round 1's blend.
cd "$(dirname "$0")/.."
P=.venv/Scripts/python.exe; D=data/derived; T=bakeoff_features_fwd2024.parquet; B="--table $T --pred $D/f_n2_wide/pred_mlp.parquet --members none --trees 200 --minleaf 1500"
pr() { $P -W ignore science/paired.py --data $D/$T --a $1 --b $2 --label-a A --label-b B 2>&1 | tail -3 | cut -c1-150; }
for v in "--gmk 2:k2" "--gmk 8:k8" "--gmdecay 0.05:d05" "--gmdecay 0.15:d15"; do
  args=${v%%:*}; tg=f24_gm_${v##*:}
  timeout 5400 $P -W ignore science/meta_rolling.py $B $args --tag $tg 2>&1 | grep -v "^\[" | tail -1
  $P -W ignore science/blend_preds.py --data $D/$T --a $D/fwd24_layer.parquet --b $D/meta_$tg.parquet --out $D/blend_$tg.parquet >/dev/null 2>&1
  echo "== $tg blend vs round 1 blend"; pr $D/blend_f24_t200_m1500.parquet $D/blend_$tg.parquet
done
echo "== gm sweep finished"
