#!/bin/bash
# Reruns the two scripts changed on 22 Oct (NaN fix in the pitch probe, widened-tail draws in the carry test), one at a time (each script lowers its own priority when it flies balls).
cd C:/Users/andrewwi/dev/nuke-navigator-new/science || exit 1
PY=../.venv/Scripts/python.exe
for s in pitch_aero_probe carry_conformal_hr; do
  echo "=== $s $(date +%H:%M)" >> ../scratch/queue3.log
  $PY -W ignore $s.py > ../scratch/$s.log 2>&1
  echo "done $s $(date +%H:%M)" >> ../scratch/queue3.log
done
echo ALLDONE >> ../scratch/queue3.log
