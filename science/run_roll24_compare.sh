#!/bin/sh
# Rolling retrain vs train-once on the 2024 forward split, raw and with the full recalibration layer (global + venue + in-game carry). Log: scratch/roll24_compare.log
cd /c/Users/andrewwi/dev/nuke-navigator-new/science
Z=../.venv/Scripts/python.exe
D=../data/derived
T=bakeoff_features_fwd2024_v19.parquet
echo "== raw: rolling vs frozen"
$Z paired.py --data $D/$T --a $D/roll24_frozen/pred_xgb.parquet --b $D/roll24_rolling/pred_xgb.parquet --label-a frozen --label-b rolling 2>&1 | cut -c1-200
for k in frozen rolling; do
  echo "== layer on $k"
  $Z posthoc_memory.py --table $T --pred data/derived/roll24_$k/pred_xgb.parquet --write data/derived/roll24_$k/pred_layer.parquet 2>&1 | grep -E "raw stack|^gm  |wrote" | cut -c1-200
done
echo "== layered: rolling vs frozen"
$Z paired.py --data $D/$T --a $D/roll24_frozen/pred_layer.parquet --b $D/roll24_rolling/pred_layer.parquet --label-a frozen_layer --label-b rolling_layer 2>&1 | cut -c1-200
echo "== compare finished"
