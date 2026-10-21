#!/bin/bash
# Foul-ball feature table (same columns as bakeoff_features_v3). Below Normal via run_below_normal.ps1.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
R=../data/raw
export FEATSET=v2
$PY -W ignore foul_features.py --fouls $R/fouls/fouls_2023_2026.parquet --games $R/game_context/games.parquet --weather $R/game_context/game_weather.parquet \
    --exp $D/exp_features.parquet --inplay $D/bakeoff_features_v3.parquet --college $D/trackman_college_bbe.parquet --params flight_fit_results_params.json \
    --out $D/fouls_features.parquet --scratch ../scratch 2>&1 | grep -vE "Warning|warn" | cut -c1-240
echo "== finished"
