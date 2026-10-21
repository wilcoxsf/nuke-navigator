#!/bin/bash
# T3 (structural probability), T1 (spin teacher inputs), T2 (direction model lab), one after another, after the T5/T4 chain has finished.
# Below Normal priority via run_below_normal.ps1 (RUN_SCRIPT=run_t1_t2_t3.sh).
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
until grep -q "== finished" t5_t4.log 2>/dev/null; do sleep 20; done

echo "== T3 structural"
FEATSET=v2 $PY -W ignore structural.py --data $D/bakeoff_features_v2.parquet --games ../data/raw/game_context/games.parquet --pred-dir $D/bakeoff_v2 --out structural_results.md 2>&1 | tail -14 | cut -c1-230

echo "== T1 spin teacher"
$PY -W ignore spin_teacher_v2.py --college $D/trackman_college_bbe.parquet --mlb $D/exp_features.parquet --params flight_fit_results_params.json --out spin_teacher_v2.md 2>&1 | tail -14 | cut -c1-260

echo "== T2 direction lab"
$PY -W ignore direction_lab.py --data $D/exp_features.parquet --out direction_lab.md 2>&1 | tail -14 | cut -c1-260
echo "== finished"
