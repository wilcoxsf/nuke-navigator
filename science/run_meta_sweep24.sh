#!/bin/bash
# 8 Nov: tune the rolling meta-learner on the 2024 forward split ONLY (base: the wide net trained through 2023), each alone and blended 50/50 with the monthly
# layer; the single best setting is then confirmed once on 2025-26. Log: scratch/meta24.log
cd "$(dirname "$0")/.."
P=.venv/Scripts/python.exe; D=data/derived; T=bakeoff_features_fwd2024.parquet
for cfg in "100 400" "200 400" "400 400" "100 1500" "200 1500" "400 1500"; do
  set -- $cfg; tag=f24_t$1_m$2
  for nv in "" "--no-venue"; do
    tg=$tag${nv:+_nv}
    timeout 2400 $P -W ignore science/meta_rolling.py --table $T --pred $D/f_n2_wide/pred_mlp.parquet --members none --trees $1 --minleaf $2 $nv --tag $tg 2>&1 | tail -1
    $P -W ignore science/blend_preds.py --data $D/$T --a $D/fwd24_layer.parquet --b $D/meta_$tg.parquet --out $D/blend_$tg.parquet >/dev/null 2>&1
    echo "   paired, meta $tg vs layer:"; $P -W ignore science/paired.py --data $D/$T --a $D/fwd24_layer.parquet --b $D/meta_$tg.parquet --label-a layer --label-b meta 2>&1 | tail -3 | cut -c1-160
    echo "   paired, blend $tg vs layer:"; $P -W ignore science/paired.py --data $D/$T --a $D/fwd24_layer.parquet --b $D/blend_$tg.parquet --label-a layer --label-b blend 2>&1 | tail -3 | cut -c1-160
  done
done
echo "== meta sweep 2024 finished"
