#!/bin/bash
# Landing-density 2x2: fouls on/off (weight 1 / 0) by Oracle wall off/on. Weight 0 loads the fouls but trains on none, so all four share one evaluation.
# Below Normal via run_below_normal.ps1. Needs fouls_features.parquet (run_fouls_build.sh).
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
export FEATSET=v2
run() {  # name, foul weight, extra args
  echo "== density $1"
  $PY -W ignore density.py --data $D/bakeoff_features_v3.parquet --pred-dir $D/bakeoff_v3 --fouls $D/fouls_features.parquet --foul-weight $2 $3 \
      --out density_$1.md --epochs 12 2>&1 | grep -E "^(density training|epoch (0|5|11)|\||Error|Traceback)" | cut -c1-230
}
run base 0 ""
run fouls 1 ""
run base_wall 0 "--wall $D/oracle/oracle_wall_clean.csv"
run fouls_wall 1 "--wall $D/oracle/oracle_wall_clean.csv"
echo "== finished"
