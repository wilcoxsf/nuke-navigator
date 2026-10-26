#!/bin/bash
# Night 8 (25 Oct): after night 5 (wide/long nets, v39c trees, the 2024 forward replication), build the final stacks WITH validation rows and put the monthly physical-venue offsets on each, then pair everything against the E37 stack.
#   stacks:  E37 (the old best), S1 (wide net in), S2 (+ v39c trees, cat v39b), S3 (+ long and wider nets)   offsets: recalibrate.py --key venue, ridge 30 and 100 (placebo: shuffled venue keys)
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
Z="$PY -W ignore"
until grep -q "== night 5 finished" ../scratch/night5.log 2>/dev/null; do sleep 60; done
echo "== night 8 starting $(date +%H:%M)"
V5=$D/bakeoff_features_v5r.parquet
E37="xgb=$D/v37_avg/pred_xgb.parquet phys=$D/v7_stack/pred_diffphys_v3b.parquet lgb=$D/v37_lgbm_phys/pred_lgbm_phys.parquet cat=$D/v37_cat/pred_cat.parquet mlp=$D/v37_mlp_everything/pred_mlp.parquet"
S1="xgb=$D/v37_avg/pred_xgb.parquet phys=$D/v7_stack/pred_diffphys_v3b.parquet lgb=$D/v37_lgbm_phys/pred_lgbm_phys.parquet cat=$D/v37_cat/pred_cat.parquet mlp=$D/e49a_wide/pred_mlp.parquet"
S2="xgb=$D/v39c_avg/pred_xgb.parquet phys=$D/v7_stack/pred_diffphys_v3b.parquet lgb=$D/v39c_lgbm_phys/pred_lgbm_phys.parquet cat=$D/v39b_cat/pred_cat.parquet mlp=$D/e49a_wide/pred_mlp.parquet"
S3="$S2 mlplong=$D/e49b_wide_long/pred_mlp.parquet mlpwider=$D/e51_wider/pred_mlp.parquet"
mkdir -p $D/final8
for s in E37 S1 S2 S3; do
  eval "C=\$$s"
  echo "== stack $s"
  $Z final_stack.py --comp $C --out $D/final8/$s.parquet 2>&1 | cut -c1-260
  for key in venue placebo; do
    echo "-- offsets on $s (key $key)"
    $Z recalibrate.py --pred $D/final8/$s.parquet --tag final8_${s}_$key --key $key --lams 30,100 --near "" 2>&1 | tail -n 5 | cut -c1-160
  done
done
echo "== paired: S3 raw vs E37 raw"; $Z paired.py --data $V5 --a $D/final8/E37.parquet --b $D/final8/S3.parquet --label-a E37 --label-b S3 2>&1 | cut -c1-200
echo "== paired: S3 + venue offsets (ridge 30) vs S3 raw"; $Z paired.py --data $V5 --a $D/final8/S3.parquet --b $D/recal_final8_S3_venue_roll_park_30/pred_recal.parquet --label-a S3 --label-b S3_offsets 2>&1 | cut -c1-200
echo "== paired: S3 + venue offsets vs E37 raw"; $Z paired.py --data $V5 --a $D/final8/E37.parquet --b $D/recal_final8_S3_venue_roll_park_30/pred_recal.parquet --label-a E37 --label-b S3_offsets 2>&1 | cut -c1-200
echo "== night 8 finished $(date +%H:%M)"
