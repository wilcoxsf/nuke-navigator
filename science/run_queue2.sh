#!/bin/bash
# Waits for the shared carry dataset, then runs the next experiments one at a time at low priority (each script lowers its own priority when it flies balls).
cd C:/Users/andrewwi/dev/nuke-navigator-new/science || exit 1
until [ -f ../data/derived/carry_dataset.parquet ]; do sleep 30; done
sleep 20
PY=../.venv/Scripts/python.exe
for s in pitch_aero_probe carry_conformal_hr; do
  echo "=== $s $(date +%H:%M)" >> ../scratch/queue2.log
  $PY -W ignore $s.py > ../scratch/$s.log 2>&1
  echo "done $s $(date +%H:%M)" >> ../scratch/queue2.log
done
echo ALLDONE >> ../scratch/queue2.log
