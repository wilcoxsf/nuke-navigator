#!/bin/bash
# After the 22 Oct side-spin prior change (-864 x hand - 75 x direction): rebuild the replay and league data, then the carry dataset and the carry-draws test on the new prior, one at a time.
cd C:/Users/andrewwi/dev/nuke-navigator-new/science || exit 1
PY=../.venv/Scripts/python.exe
for s in build_replay build_dists carry_dataset carry_conformal_hr; do
  echo "=== $s $(date +%H:%M)" >> ../scratch/queue4.log
  $PY -W ignore $s.py > ../scratch/$s.log 2>&1
  echo "done $s exit $? $(date +%H:%M)" >> ../scratch/queue4.log
done
echo ALLDONE >> ../scratch/queue4.log
