#!/bin/bash
# Round-2 feature sweep, start to finish: screen every hypothesis, combine and ablate the survivors, confirm once on the test period.
# Full CPU. Results: exp_screen.md, exp_combine.md, exp_confirm.md in this folder (per-hypothesis caches in data/derived/exp, so a crash
# resumes where it stopped). Expect roughly 45 minutes on an idle machine.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
DATA=../data/derived/exp_features.parquet
$PY -W ignore experiments.py screen --data $DATA --out-dir ../data/derived/exp --out exp_screen.md 2>&1 | grep -E "^(screen pool|baseline|H[0-9]+ )"
$PY -W ignore experiments.py combine --data $DATA --out-dir ../data/derived/exp --out exp_combine.md --screen-json exp_screen.json 2>&1 | tail -20
$PY -W ignore experiments.py confirm --data $DATA --keep-from exp_combine.json --out exp_confirm.md 2>&1 | tail -20
