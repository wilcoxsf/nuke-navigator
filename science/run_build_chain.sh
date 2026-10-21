#!/bin/bash
# Build chain while Andrew is away: learned fence + better spin teacher (physics net v3), then the landing-density model, then a scoreboard.
# Waits for bakeoff_features_v3.parquet. Each stage smoke-tests on a small sample first and only runs full size if the smoke test passes.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
export FEATSET=v2
until [ -f $D/bakeoff_features_v3.parquet ] && ! pgrep -f "bakeoff_data.py" > /dev/null 2>&1; do sleep 15; done
sleep 5
mkdir -p $D/bakeoff_v3

echo "== physics net v3 smoke"
if $PY -W ignore diffphys.py --data $D/bakeoff_features_v3.parquet --college $D/trackman_college_bbe.parquet --params flight_fit_results_params.json \
     --out-dir $D/bakeoff_v3_smoke --sample 0.03 --epochs 1 --name dp_smoke --teacher v3 --learn-fence 2>&1 | tail -3 | cut -c1-240; then
  echo "== physics net v3 full (learned fence, spin teacher v3)"
  $PY -W ignore diffphys.py --data $D/bakeoff_features_v3.parquet --college $D/trackman_college_bbe.parquet --params flight_fit_results_params.json \
      --out-dir $D/bakeoff_v3 --epochs 6 --seeds 1 --name diffphys_v3 --teacher v3 --learn-fence 2>&1 | grep -E "val Brier|done|Error|Traceback" | cut -c1-260
fi

echo "== density smoke"
$PY -W ignore density.py --data $D/bakeoff_features_v3.parquet --pred-dir $D/bakeoff_v2 --out density_smoke.md --sample 0.05 --epochs 1 2>&1 | tail -6 | cut -c1-200
echo "== density full"
$PY -W ignore density.py --data $D/bakeoff_features_v3.parquet --pred-dir $D/bakeoff_v2 --out density_results.md --epochs 12 2>&1 | tail -22 | cut -c1-260

echo "== scoreboard with physics net v3"
for f in $D/bakeoff_v2/pred_*.parquet; do cp -n "$f" $D/bakeoff_v3/; done
$PY -W ignore bakeoff_score.py --data $D/bakeoff_features_v3.parquet --pred-dir $D/bakeoff_v3 --out bakeoff_v3_results.md 2>&1 | grep -E "^\|" | cut -c1-230
echo "== finished"
