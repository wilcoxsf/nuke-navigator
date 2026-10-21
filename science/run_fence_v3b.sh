#!/bin/bash
# Physics net v3 again with the learned-fence offsets on their own step size (the first run left them at zero). Below Normal via run_below_normal.ps1.
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe
D=../data/derived
export FEATSET=v2
$PY -W ignore diffphys.py --data $D/bakeoff_features_v3.parquet --college $D/trackman_college_bbe.parquet --params flight_fit_results_params.json \
    --out-dir $D/bakeoff_v3 --epochs 6 --seeds 1 --name diffphys_v3b --teacher v3 --learn-fence 2>&1 | grep -E "val Brier|done|Error|Traceback" | cut -c1-230
$PY -W ignore -c "
import pandas as pd
d = pd.read_csv('$D/bakeoff_v3/fence_offsets_diffphys_v3b.csv')
bins = ['bin_left_line','bin_left_center','bin_center','bin_right_center','bin_right_line']
names = {2395:'Oracle Park', 19:'Coors Field', 2394:'Comerica Park', 2529:'Sutter Health Park', 3:'Fenway Park', 22:'Dodger Stadium', 3313:'Yankee Stadium'}
x = d[d.venue_id.isin(names)].copy(); x['park'] = x.venue_id.map(names)
print(x[['park','era_2020_on']+bins].sort_values(['park','era_2020_on']).to_string(index=False))
print('spread: sd', round(float(d[bins].stack().std()), 1), 'min', d[bins].stack().min(), 'max', d[bins].stack().max())
"
$PY -W ignore bakeoff_score.py --data $D/bakeoff_features_v3.parquet --pred-dir $D/bakeoff_v3 --out bakeoff_v3b_results.md 2>&1 | grep -E "^\| (stack|xgb|diffphys)" | cut -c1-230
echo "== finished"
