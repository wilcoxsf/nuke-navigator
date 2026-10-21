#!/bin/bash
# T1 rerun after fixing a duplicate-keyword bug; waits for the T1/T2/T3 chain to finish first. Launch with RUN_SCRIPT=run_t1_again.sh.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
until grep -q "== finished" t1_t2_t3.log 2>/dev/null; do sleep 20; done
echo "== T1 spin teacher"
$PY -W ignore spin_teacher_v2.py --college $D/trackman_college_bbe.parquet --mlb $D/exp_features.parquet --params flight_fit_results_params.json --out spin_teacher_v2.md 2>&1 | tail -16 | cut -c1-260
echo "== finished"
